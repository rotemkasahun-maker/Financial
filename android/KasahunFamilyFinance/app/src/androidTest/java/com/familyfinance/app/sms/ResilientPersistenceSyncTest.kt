package com.familyfinance.app.sms

import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File

@RunWith(AndroidJUnit4::class)
class ResilientPersistenceSyncTest {

    private val context = InstrumentationRegistry.getInstrumentation().targetContext

    @Before
    fun setup() {
        SmsPersistence.resetLocalState(context)
    }

    @Test
    fun testResetClearsState() {
        val evidence = SmsEvidence(
            candidateType = SmsCandidateType.TRANSACTION,
            bodyHash = "hash1",
            externalSourceId = "ext1",
            normalizedData = SmsNormalizedData(),
            originalSmsTimestamp = 1000L
        )
        SmsPersistence.addToQueue(context, evidence)
        assertEquals(1, SmsPersistence.getQueue(context).size)
        assertTrue(SmsPersistence.isProcessed(context, "hash1"))

        SmsPersistence.resetLocalState(context)
        assertEquals(0, SmsPersistence.getQueue(context).size)
        assertFalse(SmsPersistence.isProcessed(context, "hash1"))
    }

    @Test
    fun testCorruptQueueReturnsEmptyButIsRecoverable() {
        val file = File(context.filesDir, "pending_sms_evidence.json")
        file.writeText("{ invalid json }")

        val queue = SmsPersistence.getQueue(context)
        assertTrue("Corrupt queue should return empty list gracefully", queue.isEmpty())

        // Verify we can still write to it and recover
        val evidence = SmsEvidence(
            candidateType = SmsCandidateType.TRANSACTION,
            bodyHash = "hash2",
            externalSourceId = "ext2",
            normalizedData = SmsNormalizedData(),
            originalSmsTimestamp = 2000L
        )
        SmsPersistence.addToQueue(context, evidence)
        assertEquals(1, SmsPersistence.getQueue(context).size)
    }

    @Test
    fun testSyncResultCounts() {
        val evidence1 = SmsEvidence(
            candidateType = SmsCandidateType.TRANSACTION,
            bodyHash = "h1",
            externalSourceId = "e1",
            normalizedData = SmsNormalizedData(),
            originalSmsTimestamp = 100L
        )
        val evidence2 = SmsEvidence(
            candidateType = SmsCandidateType.TRANSACTION,
            bodyHash = "h2",
            externalSourceId = "e2",
            normalizedData = SmsNormalizedData(),
            originalSmsTimestamp = 200L
        )
        
        SmsPersistence.addToQueue(context, evidence1)
        SmsPersistence.addToQueue(context, evidence2)

        // Mock client that succeeds once then fails
        val client = object : FinancialEvidenceSyncClient(FinancialSyncConfig("http://fake", "token")) {
            var calls = 0
            override fun sendEvidence(payload: JSONObject): Boolean {
                calls++
                return calls == 1
            }
        }

        val service = FinancialEvidenceSyncService(client)
        val result = service.syncSmsQueue(context)

        assertEquals(2, result.pendingCount)
        assertEquals(1, result.successCount)
        assertEquals(1, result.errorCount)
        
        // Check persistence: e1 removed, e2 retained
        val finalQueue = SmsPersistence.getQueue(context)
        assertEquals(1, finalQueue.size)
        assertEquals("e2", finalQueue[0].externalSourceId)
    }
}
