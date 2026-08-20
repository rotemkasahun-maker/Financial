package com.familyfinance.app.sms

import android.content.Context
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

object SmsPersistence {
    private const val PREFS_NAME = "sms_idempotency_prefs"
    private const val PROCESSED_HASHES_KEY = "processed_hashes"
    private const val QUEUE_FILE_NAME = "pending_sms_evidence.json"
    private const val TAG = "SmsPersistence"

    fun isProcessed(context: Context, hash: String): Boolean {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val hashes = prefs.getStringSet(PROCESSED_HASHES_KEY, emptySet()) ?: emptySet()
        return hashes.contains(hash)
    }

    private fun markAsProcessed(context: Context, hash: String) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val hashes = prefs.getStringSet(PROCESSED_HASHES_KEY, emptySet())?.toMutableSet() ?: mutableSetOf()
        hashes.add(hash)
        prefs.edit().putStringSet(PROCESSED_HASHES_KEY, hashes).apply()
    }

    fun addToQueue(context: Context, evidence: SmsEvidence) {
        val queue = readQueue(context).toMutableList()
        queue.add(evidence)
        writeQueue(context, queue)
        markAsProcessed(context, evidence.bodyHash)
    }

    fun removeFromQueue(context: Context, externalSourceId: String) {
        val queue = readQueue(context).toMutableList()
        val removed = queue.removeIf { it.externalSourceId == externalSourceId }
        if (removed) {
            writeQueue(context, queue)
        }
    }

    fun getQueue(context: Context): List<SmsEvidence> {
        return readQueue(context)
    }

    private fun readQueue(context: Context): List<SmsEvidence> {
        val file = File(context.filesDir, QUEUE_FILE_NAME)
        if (!file.exists()) return emptyList()

        val jsonString = file.readText()
        if (jsonString.isBlank()) return emptyList()

        return try {
            val jsonArray = JSONArray(jsonString)
            val list = mutableListOf<SmsEvidence>()
            for (i in 0 until jsonArray.length()) {
                val obj = jsonArray.getJSONObject(i)
                list.add(fromJson(obj))
            }
            list
        } catch (e: Exception) {
            // Log specific error to help with development transitions
            Log.e(TAG, "Schema corruption in queue file: ${e.message}. Manual reset may be required.")
            // Rethrow or return a marked empty to let the caller distinguish if needed
            // For now, we return empty but the log is visible.
            emptyList()
        }
    }

    /**
     * DEVELOPMENT ONLY / TODO: Ensure this is guarded or removed in production.
     * Clears all local SMS persistence state (queue and idempotency).
     */
    fun resetLocalState(context: Context) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().clear().apply()
        val file = File(context.filesDir, QUEUE_FILE_NAME)
        if (file.exists()) {
            file.delete()
        }
        Log.i(TAG, "Local SMS state reset successfully (Development only)")
    }

    private fun writeQueue(context: Context, queue: List<SmsEvidence>) {
        val file = File(context.filesDir, QUEUE_FILE_NAME)
        try {
            val jsonArray = JSONArray()
            queue.forEach { jsonArray.put(toJson(it)) }
            file.writeText(jsonArray.toString())
        } catch (e: Exception) {
            Log.e(TAG, "Error writing queue", e)
        }
    }

    private fun toJson(evidence: SmsEvidence): JSONObject {
        val obj = JSONObject()
        obj.put("candidateType", evidence.candidateType.name)
        obj.put("sender", evidence.sender ?: JSONObject.NULL)
        obj.put("bodyHash", evidence.bodyHash)
        obj.put("externalSourceId", evidence.externalSourceId)
        obj.put("originalSmsTimestamp", evidence.originalSmsTimestamp)
        obj.put("timestamp", evidence.timestamp)
        
        val normalized = JSONObject()
        normalized.put("amount", evidence.normalizedData.amount ?: JSONObject.NULL)
        normalized.put("currency", evidence.normalizedData.currency ?: JSONObject.NULL)
        normalized.put("cardLastFour", evidence.normalizedData.cardLastFour ?: JSONObject.NULL)
        val urls = JSONArray()
        evidence.normalizedData.urls.forEach { urls.put(it) }
        normalized.put("urls", urls)
        
        obj.put("normalizedData", normalized)
        return obj
    }

    private fun fromJson(obj: JSONObject): SmsEvidence {
        val candidateType = SmsCandidateType.valueOf(obj.getString("candidateType"))
        val sender = if (obj.isNull("sender")) null else obj.getString("sender")
        val bodyHash = obj.getString("bodyHash")
        val externalSourceId = obj.getString("externalSourceId")
        val originalSmsTimestamp = obj.getLong("originalSmsTimestamp")
        val timestamp = obj.getLong("timestamp")
        
        val normalizedObj = obj.getJSONObject("normalizedData")
        val amount = if (normalizedObj.isNull("amount")) null else normalizedObj.getDouble("amount")
        val currency = if (normalizedObj.isNull("currency")) null else normalizedObj.getString("currency")
        val cardLastFour = if (normalizedObj.isNull("cardLastFour")) null else normalizedObj.getString("cardLastFour")
        val urlsArray = normalizedObj.getJSONArray("urls")
        val urls = mutableListOf<String>()
        for (i in 0 until urlsArray.length()) {
            urls.add(urlsArray.getString(i))
        }
        
        return SmsEvidence(
            candidateType = candidateType,
            sender = sender,
            bodyHash = bodyHash,
            externalSourceId = externalSourceId,
            normalizedData = SmsNormalizedData(amount, currency, cardLastFour, urls),
            originalSmsTimestamp = originalSmsTimestamp,
            timestamp = timestamp
        )
    }
}
