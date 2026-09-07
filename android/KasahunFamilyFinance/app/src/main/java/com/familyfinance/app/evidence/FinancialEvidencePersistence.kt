package com.familyfinance.app.evidence

import android.content.Context
import androidx.core.util.AtomicFile
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.IOException

class OutboxStorageException(message: String, cause: Throwable? = null) : IOException(message, cause)
data class OutboxHealth(val storage: String, val schemaVersion: Int?, val migrationStatus: String, val pendingCount: Int, val oldestPendingTimestamp: Long?)

object FinancialEvidencePersistence {
    const val CURRENT_SCHEMA_VERSION = 2
    private const val PREFS_NAME = "financial_evidence_idempotency_prefs"
    private const val PROCESSED_IDS_KEY = "processed_external_source_ids"
    const val QUEUE_FILE_NAME = "pending_financial_evidence.json"

    @Synchronized fun isProcessed(context: Context, id: String): Boolean = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).getStringSet(PROCESSED_IDS_KEY, emptySet())?.contains(id) == true
    @Synchronized fun addToQueue(context: Context, evidence: FinancialEvidence): Boolean {
        if (isProcessed(context, evidence.externalSourceId)) return false
        val queue = readQueue(context).toMutableList()
        if (queue.any { it.externalSourceId == evidence.externalSourceId }) { markAsProcessed(context, evidence.externalSourceId); return false }
        queue.add(evidence); writeQueue(context, queue); markAsProcessed(context, evidence.externalSourceId); return true
    }
    @Synchronized fun removeFromQueue(context: Context, id: String) { val queue = readQueue(context).toMutableList(); if (queue.removeIf { it.externalSourceId == id }) writeQueue(context, queue) }
    @Synchronized fun getQueue(context: Context): List<FinancialEvidence> = readQueue(context)
    @Synchronized fun health(context: Context): OutboxHealth = try { val q = readQueue(context); OutboxHealth("healthy", CURRENT_SCHEMA_VERSION, migrationStatus(context), q.size, q.minOfOrNull { it.timestamp }) } catch (e: OutboxStorageException) { OutboxHealth("corrupt", null, "failed:${e.message ?: "unknown"}", -1, null) }
    @Synchronized fun resetLocalState(context: Context) { context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit().clear().apply(); AtomicFile(File(context.filesDir, QUEUE_FILE_NAME)).delete() }

    private fun atomic(context: Context) = AtomicFile(File(context.filesDir, QUEUE_FILE_NAME))
    private fun migrationStatus(context: Context) = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).getString("last_migration", "none") ?: "none"
    private fun markMigration(context: Context, value: String) { context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit().putString("last_migration", value).apply() }
    private fun markAsProcessed(context: Context, id: String) { val p = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE); val ids = p.getStringSet(PROCESSED_IDS_KEY, emptySet())?.toMutableSet() ?: mutableSetOf(); ids.add(id); p.edit().putStringSet(PROCESSED_IDS_KEY, ids).apply() }

    private fun readQueue(context: Context): List<FinancialEvidence> {
        val file = File(context.filesDir, QUEUE_FILE_NAME); if (!file.exists()) return emptyList()
        val text = try { atomic(context).readFully().toString(Charsets.UTF_8) } catch (e: Exception) { throw OutboxStorageException("read_failed", e) }
        if (text.isBlank()) throw OutboxStorageException("empty_storage")
        try {
            if (text.trimStart().startsWith("[")) {
                val records = parseRecords(JSONArray(text))
                writeQueue(context, records)
                markMigration(context, "migrated_v1_to_v$CURRENT_SCHEMA_VERSION")
                return records
            }
            val root = JSONObject(text); val version = root.optInt("schemaVersion", 0)
            if (version > CURRENT_SCHEMA_VERSION || (version != 0 && version != CURRENT_SCHEMA_VERSION)) throw OutboxStorageException("unsupported_schema_$version")
            if (version == 0) { val records = parseRecords(JSONArray(text)); writeQueue(context, records); markMigration(context, "migrated_v1_to_v$CURRENT_SCHEMA_VERSION"); return records }
            return parseRecords(root.optJSONArray("records") ?: throw OutboxStorageException("missing_records"))
        } catch (e: OutboxStorageException) { throw e } catch (e: Exception) { throw OutboxStorageException("parse_failed", e) }
    }
    private fun parseRecords(a: JSONArray): List<FinancialEvidence> = buildList { for (i in 0 until a.length()) add(fromJson(a.getJSONObject(i))) }
    private fun writeQueue(context: Context, queue: List<FinancialEvidence>) {
        val root = JSONObject().put("schemaVersion", CURRENT_SCHEMA_VERSION).put("records", JSONArray().also { a -> queue.forEach { a.put(toJson(it)) } }); val f = atomic(context); var out: java.io.FileOutputStream? = null
        try { out = f.startWrite(); out.write(root.toString().toByteArray(Charsets.UTF_8)); f.finishWrite(out); markMigration(context, "v$CURRENT_SCHEMA_VERSION") } catch (e: Exception) { out?.let { f.failWrite(it) }; throw OutboxStorageException("write_failed", e) }
    }
    private fun toJson(e: FinancialEvidence) = JSONObject().apply { put("recordVersion", 1); put("state", "pending"); put("sourceType", e.sourceType); put("candidateType", e.candidateType.name); put("sender", e.sender ?: JSONObject.NULL); put("bodyHash", e.bodyHash ?: JSONObject.NULL); put("externalSourceId", e.externalSourceId); put("sourceTimestamp", e.sourceTimestamp); put("timestamp", e.timestamp); put("normalized", JSONObject().apply { put("merchant", e.normalized.merchant ?: JSONObject.NULL); put("date", e.normalized.date ?: JSONObject.NULL); put("amount", e.normalized.amount ?: JSONObject.NULL); put("currency", e.normalized.currency ?: JSONObject.NULL); put("cardLastFour", e.normalized.cardLastFour ?: JSONObject.NULL); put("urls", JSONArray(e.normalized.urls)) }); put("metadata", JSONObject().apply { e.metadata.forEach { (k, v) -> put(k, v) } }) }
    private fun fromJson(o: JSONObject): FinancialEvidence {
        val n = o.optJSONObject("normalized") ?: throw OutboxStorageException("missing_normalized")
        val ua = n.optJSONArray("urls")
        val urls = if (ua == null) emptyList() else buildList { for (i in 0 until ua.length()) add(ua.getString(i)) }
        val m = o.optJSONObject("metadata") ?: JSONObject()
        val md = mutableMapOf<String, String>()
        val keys = m.keys()
        while (keys.hasNext()) { val k = keys.next(); md[k] = m.optString(k) }
        fun value(obj: JSONObject, k: String): String? = if (!obj.has(k) || obj.isNull(k)) null else obj.getString(k)
        return FinancialEvidence(
            o.getString("sourceType"), FinancialEvidenceCandidateType.valueOf(o.getString("candidateType")), value(o, "sender"), value(o, "bodyHash"), o.getString("externalSourceId"),
            FinancialNormalizedData(value(n, "merchant"), value(n, "date"), if (!n.has("amount") || n.isNull("amount")) null else n.getDouble("amount"), value(n, "currency"), value(n, "cardLastFour"), urls),
            o.getLong("sourceTimestamp"), md, o.optLong("timestamp", System.currentTimeMillis())
        )
    }
}
