package com.familyfinance.app.sms

import androidx.test.ext.junit.runners.AndroidJUnit4
import com.familyfinance.app.evidence.FinancialEvidence
import com.familyfinance.app.evidence.FinancialEvidenceCandidateType
import com.familyfinance.app.evidence.FinancialNormalizedData
import org.json.JSONObject
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class FinancialEvidenceSyncServiceTest {
    class FakeClient(private val success: Boolean) :
        FinancialEvidenceSyncClient(FinancialSyncConfig("http://fake", "token")) {
        override fun sendEvidence(payload: JSONObject): Boolean = success
    }

    @Test
    fun payloadUsesBackendNormalizedContract() {
        val payload = FinancialEvidenceSyncService(FakeClient(true)).mapToPayload(
            FinancialEvidence(
                sourceType = "sms",
                candidateType = FinancialEvidenceCandidateType.TRANSACTION,
                sender = "Bank",
                bodyHash = "hash",
                externalSourceId = "id",
                normalized = FinancialNormalizedData(amount = 100.0, currency = "ILS"),
                sourceTimestamp = 123L
            )
        )

        assertTrue(payload.has("normalized"))
        assertFalse(payload.has("normalizedData"))
    }
}
