
package com.familyfinance.app.sms

object SmsCandidateDetector {

    data class Decision(
        val candidateType: SmsCandidateType,
        val reasonCode: String
    )

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
        "העברת",
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
        "קוד האימות",
        "קוד חד פעמי",
        "קוד אבטחה",
        "otp",
        "verification code",
        "security code"
    )

    fun detect(body: String): SmsCandidateType = decide(body).candidateType

    fun decide(body: String): Decision {
        val text = body.trim()

        if (text.isBlank()) {
            return Decision(SmsCandidateType.NOISE, "EMPTY_BODY")
        }

        val lower = text.lowercase()

        if (otpKeywords.any { lower.contains(it) }) {
            return Decision(SmsCandidateType.NOISE, "SECURITY_CODE")
        }

        val hasUrl = urlRegex.containsMatchIn(text)
        val hasDocumentKeyword =
            documentKeywords.any { lower.contains(it) }

        if (hasUrl && hasDocumentKeyword) {
            return Decision(SmsCandidateType.RECEIPT_LINK, "DOCUMENT_LINK")
        }

        val hasAmount = amountRegex.containsMatchIn(text)
        val hasFinancialKeyword =
            financialKeywords.any { lower.contains(it) }

        if (hasAmount && hasFinancialKeyword) {
            return Decision(SmsCandidateType.TRANSACTION, "AMOUNT_AND_FINANCIAL_KEYWORD")
        }

        if (hasUrl || hasAmount || hasFinancialKeyword) {
            return Decision(SmsCandidateType.AMBIGUOUS, "PARTIAL_FINANCIAL_SIGNAL")
        }

        return Decision(SmsCandidateType.NOISE, "UNSUPPORTED_NO_FINANCIAL_SIGNAL")
    }
}
