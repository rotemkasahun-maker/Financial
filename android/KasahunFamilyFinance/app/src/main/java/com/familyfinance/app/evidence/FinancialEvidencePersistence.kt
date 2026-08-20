package com.familyfinance.app.evidence

import android.content.Context
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

object FinancialEvidencePersistence {
    private const val PREFS_NAME = "financial_evidence_idempotency_prefs"
    private const val PROCESSED_IDS_KEY = "processed_external_source_ids"
    private const val QUEUE_FILE_NAME = "pending_financial_evidence.json"
    private const val TAG = "FinancialEvidenceStore"

    @Synchronized
    fun isProcessed(context: Context, externalSourceId: String): Boolean {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val ids = prefs.getStringSet(PROCESSED_IDS_KEY, emptySet()) ?: emptySet()
        return ids.contains(externalSourceId)
    }

    @Synchronized
    fun addToQueue(context: Context, evidence: FinancialEvidence): Boolean {
        if (isProcessed(context, evidence.externalSourceId)) return false
        val queue = readQueue(context).toMutableList()
        if (queue.any { it.externalSourceId == evidence.externalSourceId }) {
            markAsProcessed(context, evidence.externalSourceId)
            return false
        }
        queue.add(evidence)
        writeQueue(context, queue)
        markAsProcessed(context, evidence.externalSourceId)
        return true
    }

    @Synchronized
    fun removeFromQueue(context: Context, externalSourceId: String) {
        val queue = readQueue(context).toMutableList()
        if (queue.removeIf { it.externalSourceId == externalSourceId }) {
            writeQueue(context, queue)
        }
    }

    @Synchronized
    fun getQueue(context: Context): List<FinancialEvidence> = readQueue(context)

    @Synchronized
    fun resetLocalState(context: Context) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit().clear().apply()
        File(context.filesDir, QUEUE_FILE_NAME).delete()
        Log.i(TAG, "Local financial evidence state reset (development only)")
    }

    private fun markAsProcessed(context: Context, externalSourceId: String) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val ids = prefs.getStringSet(PROCESSED_IDS_KEY, emptySet())?.toMutableSet() ?: mutableSetOf()
        ids.add(externalSourceId)
        prefs.edit().putStringSet(PROCESSED_IDS_KEY, ids).apply()
    }

    private fun readQueue(context: Context): List<FinancialEvidence> {
        val file = File(context.filesDir, QUEUE_FILE_NAME)
        if (!file.exists() || file.readText().isBlank()) return emptyList()
        return try {
            val array = JSONArray(file.readText())
            buildList {
                for (i in 0 until array.length()) add(fromJson(array.getJSONObject(i)))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Schema error in financial evidence queue: ${e.message}")
            emptyList()
        }
    }

    private fun writeQueue(context: Context, queue: List<FinancialEvidence>) {
        try {
            val array = JSONArray()
            queue.forEach { array.put(toJson(it)) }
            File(context.filesDir, QUEUE_FILE_NAME).writeText(array.toString())
        } catch (e: Exception) {
            Log.e(TAG, "Error writing financial evidence queue", e)
        }
    }

    private fun toJson(e: FinancialEvidence): JSONObject {
        val obj = JSONObject()
        obj.put("sourceType", e.sourceType)
        obj.put("candidateType", e.candidateType.name)
        obj.put("sender", e.sender ?: JSONObject.NULL)
        obj.put("bodyHash", e.bodyHash ?: JSONObject.NULL)
        obj.put("externalSourceId", e.externalSourceId)
        obj.put("sourceTimestamp", e.sourceTimestamp)
        obj.put("timestamp", e.timestamp)

        val n = JSONObject()
        n.put("merchant", e.normalized.merchant ?: JSONObject.NULL)
        n.put("date", e.normalized.date ?: JSONObject.NULL)
        n.put("amount", e.normalized.amount ?: JSONObject.NULL)
        n.put("currency", e.normalized.currency ?: JSONObject.NULL)
        n.put("cardLastFour", e.normalized.cardLastFour ?: JSONObject.NULL)
        n.put("urls", JSONArray(e.normalized.urls))
        obj.put("normalized", n)

        val metadata = JSONObject()
        e.metadata.forEach { (k, v) -> metadata.put(k, v) }
        obj.put("metadata", metadata)
        return obj
    }

    private fun fromJson(obj: JSONObject): FinancialEvidence {
        val n = obj.optJSONObject("normalized") ?: JSONObject()
        val urlsArray = n.optJSONArray("urls") ?: JSONArray()
        val urls = buildList {
            for (i in 0 until urlsArray.length()) add(urlsArray.getString(i))
        }

        val metadataObj = obj.optJSONObject("metadata") ?: JSONObject()
        val metadata = mutableMapOf<String, String>()
        val keys = metadataObj.keys()
        while (keys.hasNext()) {
            val key = keys.next()
            metadata[key] = metadataObj.optString(key)
        }

        fun JSONObject.nullableString(key: String): String? =
            if (!has(key) || isNull(key)) null else getString(key)

        return FinancialEvidence(
            sourceType = obj.getString("sourceType"),
            candidateType = FinancialEvidenceCandidateType.valueOf(obj.getString("candidateType")),
            sender = obj.nullableString("sender"),
            bodyHash = obj.nullableString("bodyHash"),
            externalSourceId = obj.getString("externalSourceId"),
            normalized = FinancialNormalizedData(
                merchant = n.nullableString("merchant"),
                date = n.nullableString("date"),
                amount = if (!n.has("amount") || n.isNull("amount")) null else n.getDouble("amount"),
                currency = n.nullableString("currency"),
                cardLastFour = n.nullableString("cardLastFour"),
                urls = urls
            ),
            sourceTimestamp = obj.getLong("sourceTimestamp"),
            metadata = metadata,
            timestamp = obj.optLong("timestamp", System.currentTimeMillis())
        )
    }
}
