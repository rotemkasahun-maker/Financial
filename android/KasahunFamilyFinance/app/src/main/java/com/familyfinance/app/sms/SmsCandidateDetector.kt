
package com.familyfinance.app.sms

object SmsCandidateDetector {

    private val urlRegex =
        Regex("""https?://[^\s]+""", RegexOption.IGNORE_CASE)

    private val amountRegex =
        Regex("""(?:₪|ש"ח|ש״ח|\bILS\b)\s*\d|\d(?:[\d,.]*\d)?\s*(?:₪|ש"ח|ש״ח|\bILS\b)""",
            RegexOption.IGNORE_CASE
        )

    private val financialKeywords = listOf(
        "עסקה",
        "רכישה",
        "חיוב",
        "זיכוי",
        "העברה",
        "הועבר",
        "התקבל",
        "תשלום",
        "שולם",
        "כרטיס",
        "חשבון",
        "יתרה",
        "משיכה",
        "הפקדה"
    )

    private val documentKeywords = listOf(
        "קבלה",
        "חשבונית",
        "מסמך",
        "receipt",
        "invoice"
    )

    private val otpKeywords = listOf(
        "קוד אימות",
        "קוד חד פעמי",
        "קוד אבטחה",
        "otp",
        "verification code",
        "security code"
    )

    fun detect(body: String): SmsCandidateType {
        val text = body.trim()

        if (text.isBlank()) {
            return SmsCandidateType.NOISE
        }

        val lower = text.lowercase()

        if (otpKeywords.any { lower.contains(it) }) {
            return SmsCandidateType.NOISE
        }

        val hasUrl = urlRegex.containsMatchIn(text)
        val hasDocumentKeyword =
            documentKeywords.any { lower.contains(it) }

        if (hasUrl && hasDocumentKeyword) {
            return SmsCandidateType.RECEIPT_LINK
        }

        val hasAmount = amountRegex.containsMatchIn(text)
        val hasFinancialKeyword =
            financialKeywords.any { lower.contains(it) }

        if (hasAmount && hasFinancialKeyword) {
            return SmsCandidateType.TRANSACTION
        }

        if (hasUrl || hasAmount || hasFinancialKeyword) {
            return SmsCandidateType.AMBIGUOUS
        }

        return SmsCandidateType.NOISE
    }
}