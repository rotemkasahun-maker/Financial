package com.familyfinance.app.sms

import android.content.Context
import android.util.Log
import com.familyfinance.app.evidence.FinancialEvidence
import com.familyfinance.app.evidence.FinancialEvidencePersistence
import org.json.JSONArray
import org.json.JSONObject

data class FinancialSyncResult(
    val pendingCount: Int,
    val successCount: Int,
    val errorCount: Int
)

class FinancialEvidenceSyncService(
    private val client: FinancialEvidenceSyncClient
) {
    fun syncEvidenceQueue(context: Context): FinancialSyncResult {
        val queue = FinancialEvidencePersistence.getQueue(context)
        val initialPending = queue.size
        if (queue.isEmpty()) return FinancialSyncResult(0, 0, 0)

        var successCount = 0
        var errorCount = 0

        for (evidence in queue) {
            val success = client.sendEvidence(mapToPayload(evidence))
            if (success) {
                FinancialEvidencePersistence.removeFromQueue(context, evidence.externalSourceId)
                successCount++
            } else {
                Log.w(TAG, "Sync failed for item ${evidence.externalSourceId}. Stopping batch.")
                errorCount = initialPending - successCount
                break
            }
        }

        return FinancialSyncResult(initialPending, successCount, errorCount)
    }

    fun syncSmsQueue(context: Context): FinancialSyncResult = syncEvidenceQueue(context)

    fun mapToPayload(evidence: FinancialEvidence): JSONObject {
        val obj = JSONObject()
        obj.put("externalSourceId", evidence.externalSourceId)
        obj.put("sourceType", evidence.sourceType)
        obj.put("candidateType", evidence.candidateType.name)
        obj.put("sender", evidence.sender ?: JSONObject.NULL)
        obj.put("originalSmsTimestamp", evidence.sourceTimestamp)

        val normalized = JSONObject()
        normalized.put("merchant", evidence.normalized.merchant ?: JSONObject.NULL)
        normalized.put("date", evidence.normalized.date ?: JSONObject.NULL)
        normalized.put("amount", evidence.normalized.amount ?: JSONObject.NULL)
        normalized.put("currency", evidence.normalized.currency ?: JSONObject.NULL)
        normalized.put("cardLastFour", evidence.normalized.cardLastFour ?: JSONObject.NULL)
        normalized.put("urls", JSONArray(evidence.normalized.urls))
        obj.put("normalized", normalized)

        if (evidence.normalized.urls.isNotEmpty()) {
            obj.put("documentUrls", JSONArray(evidence.normalized.urls))
        }
        evidence.bodyHash?.let { obj.put("bodyHash", it) }

        val metadata = JSONObject()
        evidence.metadata.forEach { (k, v) -> metadata.put(k, v) }
        obj.put("metadata", metadata)
        return obj
    }

    companion object {
        private const val TAG = "FinancialSyncService"
    }
}
