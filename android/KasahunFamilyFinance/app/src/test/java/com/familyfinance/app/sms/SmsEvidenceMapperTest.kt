package com.familyfinance.app.sms

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class SmsEvidenceMapperTest {

    @Test
    fun transactionSms_isDetectedAndNormalized() {
        val sms =
            "בוצעה עסקה בסך 149.90 ₪ בכרטיס המסתיים ב-1234"
        val timestamp = 1724140000000L

        val result = SmsEvidenceMapper.analyze(
            body = sms,
            sender = "TEST_CARD",
            originalTimestamp = timestamp
        )

        assertEquals(
            SmsCandidateType.TRANSACTION,
            result.candidateType
        )
        assertEquals(149.90, result.normalizedData.amount!!, 0.001)
        assertEquals("ILS", result.normalizedData.currency)
        assertEquals("1234", result.normalizedData.cardLastFour)

        assertNotNull(result.evidence)
        assertEquals("TEST_CARD", result.evidence?.sender)
        assertEquals(timestamp, result.evidence?.originalSmsTimestamp)
        assertTrue(result.evidence!!.timestamp > 0)
        assertTrue(result.evidence!!.externalSourceId.isNotBlank())

        // Privacy: raw SMS is not copied into evidence.
        assertNull(result.evidence?.text)

        // We still retain a deterministic hash for dedupe/audit.
        assertTrue(result.evidence!!.bodyHash.isNotBlank())
    }

    @Test
    fun externalSourceId_isDeterministic() {
        val body = "Test body"
        val sender = "Sender"
        val timestamp = 123456789L

        val id1 = SmsNormalizer.generateExternalSourceId(sender, timestamp, body)
        val id2 = SmsNormalizer.generateExternalSourceId(sender, timestamp, body)
        val id3 = SmsNormalizer.generateExternalSourceId(sender, timestamp + 1, body)

        assertEquals(id1, id2)
        assertTrue(id1 != id3)
    }

    @Test
    fun receiptLinkSms_isDetectedAndUrlExtracted() {
        val sms =
            "החשבונית שלך זמינה כאן https://example.com/receipt/123"

        val result = SmsEvidenceMapper.analyze(
            body = sms,
            sender = "TEST_STORE"
        )

        assertEquals(
            SmsCandidateType.RECEIPT_LINK,
            result.candidateType
        )
        assertEquals(
            listOf("https://example.com/receipt/123"),
            result.normalizedData.urls
        )
        assertNotNull(result.evidence)
        assertNull(result.evidence?.text)
    }

    @Test
    fun otpSms_isRejectedAsNoise() {
        val sms =
            "קוד האימות שלך הוא 482193. אין למסור את הקוד לאחר."

        val result = SmsEvidenceMapper.analyze(body = sms)

        assertEquals(
            SmsCandidateType.NOISE,
            result.candidateType
        )
        assertNull(result.evidence)
    }

    @Test
    fun unrelatedSms_isRejectedAsNoise() {
        val sms =
            "היי, אנחנו מגיעים בערך בשמונה. נתראה!"

        val result = SmsEvidenceMapper.analyze(body = sms)

        assertEquals(
            SmsCandidateType.NOISE,
            result.candidateType
        )
        assertNull(result.evidence)
    }

    @Test
    fun uncertainFinancialSms_goesToAmbiguous() {
        val sms =
            "לתשומת לבך בוצע חיוב בכרטיס"

        val result = SmsEvidenceMapper.analyze(body = sms)

        assertEquals(
            SmsCandidateType.AMBIGUOUS,
            result.candidateType
        )
        assertNotNull(result.evidence)
    }
}