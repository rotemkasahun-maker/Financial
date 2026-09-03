package com.familyfinance.app.receipt

import com.familyfinance.app.evidence.FinancialEvidence
import com.familyfinance.app.evidence.FinancialEvidenceCandidateType
import com.familyfinance.app.evidence.FinancialNormalizedData
import com.familyfinance.app.maintenance.MaintenanceWorkScheduler
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ReceiptReminderFlowTest {
    private fun evidence(
        id: String = "wallet-1",
        merchant: String = "Rami Levy Supermarket",
        metadata: Map<String, String> = emptyMap(),
        urls: List<String> = emptyList()
    ) = FinancialEvidence(
        sourceType = "notification",
        candidateType = FinancialEvidenceCandidateType.TRANSACTION,
        externalSourceId = id,
        normalized = FinancialNormalizedData(merchant = merchant, amount = 42.0, currency = "ILS", urls = urls),
        sourceTimestamp = 1_000L,
        metadata = metadata
    )

    @Test
    fun `eligible physical purchase schedules one delayed authoritative check`() {
        val enqueued = mutableListOf<ReceiptGraceWork>()
        val scheduler = ReceiptGraceScheduler(enqueued::add, graceMillis = 60_000L, nowMillis = { 1_000L })
        val work = scheduler.onIngested(evidence())
        assertEquals(1, enqueued.size)
        assertEquals(60_000L, work?.delayMillis)
        assertNotEquals(MaintenanceWorkScheduler.uniqueWorkName, work?.uniqueName)
    }

    @Test
    fun `receipt-not-expected transaction schedules nothing`() {
        val enqueued = mutableListOf<ReceiptGraceWork>()
        val scheduler = ReceiptGraceScheduler(enqueued::add)
        assertNull(scheduler.onIngested(evidence(metadata = mapOf("receiptExpectation" to "not_expected"))))
        assertTrue(enqueued.isEmpty())
    }

    @Test
    fun `bank transfer SMS schedules no receipt reminder`() {
        val enqueued = mutableListOf<ReceiptGraceWork>()
        val scheduler = ReceiptGraceScheduler(enqueued::add)
        val transfer = evidence(
            id = "discount-transfer",
            merchant = "Discount",
            metadata = mapOf("transactionType" to "bank_transfer")
        )

        assertEquals(ReceiptExpectation.NOT_EXPECTED, ReceiptExpectationClassifier.classify(transfer))
        assertNull(scheduler.onIngested(transfer))
        assertTrue(enqueued.isEmpty())
    }

    @Test
    fun `digital-later purchase schedules no immediate physical reminder`() {
        val enqueued = mutableListOf<ReceiptGraceWork>()
        val scheduler = ReceiptGraceScheduler(enqueued::add)
        assertNull(scheduler.onIngested(evidence(merchant = "Online order", urls = listOf("https://example.test/invoice"))))
        assertTrue(enqueued.isEmpty())
    }

    @Test
    fun `only authoritative resolved absent may notify`() {
        assertTrue(ReceiptReminderDecision.shouldNotify(AuthoritativeReceiptStatus("resolved", "absent", "tx-1")))
        assertFalse(ReceiptReminderDecision.shouldNotify(AuthoritativeReceiptStatus("resolved", "present", "tx-1")))
        assertFalse(ReceiptReminderDecision.shouldNotify(AuthoritativeReceiptStatus("pending", "unknown", null)))
        assertFalse(ReceiptReminderDecision.shouldNotify(AuthoritativeReceiptStatus("not_found", "unknown", null)))
        assertFalse(ReceiptReminderDecision.shouldNotify(AuthoritativeReceiptStatus("resolved", "unknown", "tx-1")))
    }

    @Test
    fun `duplicate evidence shares one unique work identity and one notification identity`() {
        val first = ReceiptGraceScheduler.uniqueWorkName("same-evidence")
        val second = ReceiptGraceScheduler.uniqueWorkName("same-evidence")
        assertEquals(first, second)
        assertTrue(ReceiptReminderDedupe.shouldPost(emptySet(), "same-evidence"))
        assertFalse(ReceiptReminderDedupe.shouldPost(setOf("same-evidence"), "same-evidence"))
    }
}
