package com.familyfinance.app.sms

import androidx.test.ext.junit.runners.AndroidJUnit4
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class FinancialEvidenceSyncClientTest {

    @Test
    fun testPayloadMappingDoesNotIncludeRawBody() {
        val evidence = SmsEvidence(
            candidateType = SmsCandidateType.TRANSACTION,
            sender = "BANK",
            bodyHash = "hash123",
            externalSourceId = "ext123",
            normalizedData = SmsNormalizedData(amount = 100.0),
            originalSmsTimestamp = 1000L,
            text = "RAW SMS BODY" // Should be ignored in mapping
        )

        val service = FinancialEvidenceSyncService(FinancialEvidenceSyncClient(FinancialSyncConfig("", "")))
        val payload = service.mapToPayload(evidence)
        
        assertTrue("externalSourceId should be present", payload.has("externalSourceId"))
        assertTrue("sender should be present", payload.has("sender"))
        assertTrue("originalSmsTimestamp should be present", payload.has("originalSmsTimestamp"))
        assertTrue("normalizedData should be present", payload.has("normalizedData"))
        
        assertTrue("text (raw body) should NOT be present", !payload.has("text"))
        assertTrue("bodyHash should NOT be present", !payload.has("bodyHash"))
        assertTrue("timestamp should NOT be present", !payload.has("timestamp"))
    }
    
    @Test
    fun testPayloadStructure() {
        val evidence = SmsEvidence(
            candidateType = SmsCandidateType.RECEIPT_LINK,
            sender = "STORE",
            bodyHash = "hash456",
            externalSourceId = "ext456",
            normalizedData = SmsNormalizedData(urls = listOf("http://receipt.com")),
            originalSmsTimestamp = 2000L
        )
        
        val service = FinancialEvidenceSyncService(FinancialEvidenceSyncClient(FinancialSyncConfig("", "")))
        val payload = service.mapToPayload(evidence)
        
        assertEquals("ext456", payload.getString("externalSourceId"))
        assertEquals("RECEIPT_LINK", payload.getString("candidateType"))
        
        val normalized = payload.getJSONObject("normalizedData")
        val urls = normalized.getJSONArray("urls")
        assertEquals(1, urls.length())
        assertEquals("http://receipt.com", urls.getString(0))
    }
}
