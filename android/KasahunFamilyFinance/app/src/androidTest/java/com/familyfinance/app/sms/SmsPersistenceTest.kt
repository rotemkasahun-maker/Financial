package com.familyfinance.app.sms

import androidx.test.platform.app.InstrumentationRegistry
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File

@RunWith(AndroidJUnit4::class)
class SmsPersistenceTest {

    private val context = InstrumentationRegistry.getInstrumentation().targetContext

    @Before
    fun setup() {
        SmsPersistence.resetLocalState(context)
    }

    @Test
    fun testPersistenceAndIdempotency() {
        val evidence = SmsEvidence(
            candidateType = SmsCandidateType.TRANSACTION,
            sender = "TEST_BANK",
            bodyHash = "hash123",
            externalSourceId = "ext123",
            normalizedData = SmsNormalizedData(amount = 100.0, currency = "ILS"),
            originalSmsTimestamp = 1000L
        )

        // 1. Add to queue
        SmsPersistence.addToQueue(context, evidence)

        // 2. Check if processed
        assertTrue(SmsPersistence.isProcessed(context, "hash123"))

        // 3. Verify queue size
        val queue = SmsPersistence.getQueue(context)
        assertEquals(1, queue.size)
        assertEquals("hash123", queue[0].bodyHash)
        assertEquals("ext123", queue[0].externalSourceId)
        assertEquals(1000L, queue[0].originalSmsTimestamp)
    }

    @Test
    fun testQueuePersistenceAcrossInstances() {
        val evidence = SmsEvidence(
            candidateType = SmsCandidateType.RECEIPT_LINK,
            sender = "STORE",
            bodyHash = "hash456",
            externalSourceId = "ext456",
            normalizedData = SmsNormalizedData(urls = listOf("http://receipt.com")),
            originalSmsTimestamp = 2000L
        )

        SmsPersistence.addToQueue(context, evidence)

        // Simulate new instance by reading again
        val queue = SmsPersistence.getQueue(context)
        assertEquals(1, queue.size)
        assertEquals("hash456", queue[0].bodyHash)
        assertEquals("STORE", queue[0].sender)
        assertEquals("ext456", queue[0].externalSourceId)
    }
}
