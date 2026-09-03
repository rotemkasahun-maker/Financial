package com.familyfinance.app.sms

import android.content.Context
import android.util.Log
import com.familyfinance.app.evidence.FinancialEvidence
import com.familyfinance.app.evidence.FinancialEvidenceCandidateType
import com.familyfinance.app.evidence.FinancialEvidencePersistence
import com.familyfinance.app.evidence.FinancialNormalizedData
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

object SmsPersistence {
    private const val PREFS_NAME = "sms_idempotency_prefs"
    private const val PROCESSED_HASHES_KEY = "processed_hashes"
    private const val LEGACY_QUEUE_FILE_NAME = "pending_sms_evidence.json"
    private const val TAG = "SmsPersistence"

    fun isProcessed(context: Context, hash: String): Boolean {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        return (prefs.getStringSet(PROCESSED_HASHES_KEY, emptySet()) ?: emptySet()).contains(hash)
    }

    fun addToQueue(context: Context, evidence: SmsEvidence): Boolean {
        migrateLegacyQueueIfNeeded(context)
        val added = FinancialEvidencePersistence.addToQueue(context, evidence.toFinancialEvidence())
        markAsProcessed(context, evidence.bodyHash)
        return added
    }

    fun removeFromQueue(context: Context, externalSourceId: String) {
        migrateLegacyQueueIfNeeded(context)
        FinancialEvidencePersistence.removeFromQueue(context, externalSourceId)
    }

    fun getQueue(context: Context): List<SmsEvidence> {
        migrateLegacyQueueIfNeeded(context)
        return FinancialEvidencePersistence.getQueue(context)
            .filter { it.sourceType == "sms" }
            .mapNotNull { it.toSmsEvidence() }
    }

    fun resetLocalState(context: Context) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE).edit().clear().apply()
        File(context.filesDir, LEGACY_QUEUE_FILE_NAME).delete()
        FinancialEvidencePersistence.resetLocalState(context)
        Log.i(TAG, "Local SMS/shared evidence state reset (development only)")
    }

    private fun markAsProcessed(context: Context, hash: String) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val hashes = prefs.getStringSet(PROCESSED_HASHES_KEY, emptySet())?.toMutableSet() ?: mutableSetOf()
        hashes.add(hash)
        prefs.edit().putStringSet(PROCESSED_HASHES_KEY, hashes).apply()
    }

    @Synchronized
    private fun migrateLegacyQueueIfNeeded(context: Context) {
        val file = File(context.filesDir, LEGACY_QUEUE_FILE_NAME)
        if (!file.exists()) return

        try {
            val text = file.readText()
            if (text.isNotBlank()) {
                val array = JSONArray(text)
                for (i in 0 until array.length()) {
                    val legacy = fromLegacyJson(array.getJSONObject(i))
                    FinancialEvidencePersistence.addToQueue(context, legacy.toFinancialEvidence())
                    markAsProcessed(context, legacy.bodyHash)
                }
            }
            file.delete()
            Log.i(TAG, "Migrated legacy SMS queue into shared financial evidence queue")
        } catch (e: Exception) {
            Log.e(TAG, "Unable to migrate legacy SMS queue: ${e.message}")
        }
    }

    private fun fromLegacyJson(obj: JSONObject): SmsEvidence {
        val n = obj.getJSONObject("normalizedData")
        val urlsArray = n.optJSONArray("urls") ?: JSONArray()
        val urls = buildList {
            for (i in 0 until urlsArray.length()) add(urlsArray.getString(i))
        }

        return SmsEvidence(
            candidateType = SmsCandidateType.valueOf(obj.getString("candidateType")),
            sender = if (obj.isNull("sender")) null else obj.getString("sender"),
            bodyHash = obj.getString("bodyHash"),
            externalSourceId = obj.getString("externalSourceId"),
            normalizedData = SmsNormalizedData(
                amount = if (n.isNull("amount")) null else n.getDouble("amount"),
                currency = if (n.isNull("currency")) null else n.getString("currency"),
                cardLastFour = if (n.isNull("cardLastFour")) null else n.getString("cardLastFour"),
                urls = urls,
                transactionType = if (!n.has("transactionType") || n.isNull("transactionType")) null else n.getString("transactionType")
            ),
            originalSmsTimestamp = obj.getLong("originalSmsTimestamp"),
            timestamp = obj.optLong("timestamp", System.currentTimeMillis())
        )
    }

    private fun SmsEvidence.toFinancialEvidence() = FinancialEvidence(
        sourceType = sourceType,
        candidateType = FinancialEvidenceCandidateType.valueOf(candidateType.name),
        sender = sender,
        bodyHash = bodyHash,
        externalSourceId = externalSourceId,
        normalized = FinancialNormalizedData(
            amount = normalizedData.amount,
            currency = normalizedData.currency,
            cardLastFour = normalizedData.cardLastFour,
            urls = normalizedData.urls
        ),
        sourceTimestamp = originalSmsTimestamp,
        metadata = buildMap {
            put("source", "sms")
            normalizedData.transactionType?.let { put("transactionType", it) }
        },
        timestamp = timestamp
    )

    private fun FinancialEvidence.toSmsEvidence(): SmsEvidence? {
        val smsCandidate = runCatching { SmsCandidateType.valueOf(candidateType.name) }.getOrNull() ?: return null
        return SmsEvidence(
            sourceType = "sms",
            candidateType = smsCandidate,
            sender = sender,
            bodyHash = bodyHash ?: return null,
            externalSourceId = externalSourceId,
            normalizedData = SmsNormalizedData(
                amount = normalized.amount,
                currency = normalized.currency,
                cardLastFour = normalized.cardLastFour,
                urls = normalized.urls,
                transactionType = metadata["transactionType"]
            ),
            originalSmsTimestamp = sourceTimestamp,
            timestamp = timestamp
        )
    }
}
