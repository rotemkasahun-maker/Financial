package com.familyfinance.app.receipt

import com.familyfinance.app.evidence.FinancialEvidence
import com.familyfinance.app.evidence.FinancialEvidenceCandidateType

enum class ReceiptExpectation { EXPECTED_NOW, DIGITAL_LATER, NOT_EXPECTED }

object ReceiptExpectationClassifier {
    private val notExpected = Regex(
        "transfer|bank fee|standing order|mortgage|loan|refund|credit|deposit|withdraw|investment|saving|bit|paybox|" +
            "העברה|עמלת|הוראת קבע|משכנת|הלווא|זיכוי|הפקד|משיכ|השקע|חיסכון",
        RegexOption.IGNORE_CASE
    )
    private val digitalLater = Regex(
        "online|web|app|digital|invoice|subscription|e-?commerce|אונליין|אינטרנט|אפליקציה|דיגיטל|חשבונית|מנוי",
        RegexOption.IGNORE_CASE
    )
    private val physicalMerchant = Regex(
        "super|market|kiosk|restaurant|cafe|coffee|pharm|clothing|fashion|store|shop|retail|" +
            "סופר|מרכול|קיוסק|מסעד|קפה|בית מרקחת|פארם|ביגוד|אופנה|חנות|רמי לוי|שופרסל",
        RegexOption.IGNORE_CASE
    )

    fun classify(evidence: FinancialEvidence): ReceiptExpectation {
        if (evidence.candidateType != FinancialEvidenceCandidateType.TRANSACTION) {
            return ReceiptExpectation.NOT_EXPECTED
        }
        val declared = evidence.metadata["receiptExpectation"]?.lowercase()
        if (declared == "not_expected") return ReceiptExpectation.NOT_EXPECTED
        if (declared == "digital_later") return ReceiptExpectation.DIGITAL_LATER
        if (declared == "expected_now") return ReceiptExpectation.EXPECTED_NOW

        val text = listOfNotNull(
            evidence.normalized.merchant,
            evidence.sender,
            evidence.metadata["transactionType"],
            evidence.metadata["channel"]
        ).joinToString(" ")
        if (notExpected.containsMatchIn(text)) return ReceiptExpectation.NOT_EXPECTED
        if (evidence.normalized.urls.isNotEmpty() || digitalLater.containsMatchIn(text)) {
            return ReceiptExpectation.DIGITAL_LATER
        }
        if (physicalMerchant.containsMatchIn(text)) return ReceiptExpectation.EXPECTED_NOW
        return ReceiptExpectation.DIGITAL_LATER
    }
}
