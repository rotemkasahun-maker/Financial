package com.familyfinance.app.sms

import android.content.Context
import android.util.Log
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

    /**
     * Synchronizes the pending SMS evidence queue with the backend.
     * Returns a [FinancialSyncResult] with details.
     */
    fun syncSmsQueue(context: Context): FinancialSyncResult {
        val queue = SmsPersistence.getQueue(context)
        val initialPending = queue.size
        
        if (queue.isEmpty()) {
            return FinancialSyncResult(0, 0, 0)
        }

        var successCount = 0
        var errorCount = 0
        
        for (evidence in queue) {
            val payload = mapToPayload(evidence)
            val success = client.sendEvidence(payload)
            
            if (success) {
                SmsPersistence.removeFromQueue(context, evidence.externalSourceId)
                successCount++
            } else {
                Log.w(TAG, "Sync failed for item ${evidence.externalSourceId}. Stopping batch.")
                errorCount = initialPending - successCount
                break
            }
        }
        
        return FinancialSyncResult(
            pendingCount = initialPending,
            successCount = successCount,
            errorCount = errorCount
        )
    }

    fun mapToPayload(evidence: SmsEvidence): JSONObject {
        val obj = JSONObject()
        obj.put("externalSourceId", evidence.externalSourceId)
        obj.put("sourceType", evidence.sourceType)
        obj.put("candidateType", evidence.candidateType.name)
        obj.put("sender", evidence.sender ?: JSONObject.NULL)
        obj.put("originalSmsTimestamp", evidence.originalSmsTimestamp)
        
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

    companion object {
        private const val TAG = "FinancialSyncService"
    }
}
