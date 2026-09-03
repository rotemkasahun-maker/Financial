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
        assertEquals("SECURITY_CODE", result.decisionCode)
    }

    @Test
    fun discountTransferAuthorizationCode_isRejectedAsSecurityNoise() {
        val sanitizedSms =
            "שלום, בהמשך לבקשתך להעברת כסף מצורף קוד האימות לביצוע הפעולה. הקוד תקף לזמן קצר. קוד האימות הוא: 000000"

        val result = SmsEvidenceMapper.analyze(
            body = sanitizedSms,
            sender = "Discount",
            originalTimestamp = 1787906975785L
        )

        assertEquals(SmsCandidateType.NOISE, result.candidateType)
        assertEquals("SECURITY_CODE", result.decisionCode)
        assertNull(result.evidence)
    }

    @Test
    fun sanitizedCompletedTransferFormat_isAcceptedWithStableIdentity() {
        val sanitizedSms = "העברת כסף בסך 125.00 ₪ בוצעה בהצלחה"
        val timestamp = 1787906975785L

        val first = SmsEvidenceMapper.analyze(sanitizedSms, "Discount", timestamp)
        val second = SmsEvidenceMapper.analyze(sanitizedSms, "Discount", timestamp)

        assertEquals(SmsCandidateType.TRANSACTION, first.candidateType)
        assertEquals("AMOUNT_AND_FINANCIAL_KEYWORD", first.decisionCode)
        assertEquals(125.0, first.normalizedData.amount!!, 0.001)
        assertEquals("bank_transfer", first.normalizedData.transactionType)
        assertEquals(first.evidence?.externalSourceId, second.evidence?.externalSourceId)
        assertNotNull(first.evidence)
    }

    @Test
    fun discountPromotionWithoutFinancialSignal_remainsNoise() {
        val result = SmsEvidenceMapper.analyze(
            body = "לקוחות דיסקונט נהנים מהטבה חדשה באפליקציה",
            sender = "Discount"
        )

        assertEquals(SmsCandidateType.NOISE, result.candidateType)
        assertEquals("UNSUPPORTED_NO_FINANCIAL_SIGNAL", result.decisionCode)
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
