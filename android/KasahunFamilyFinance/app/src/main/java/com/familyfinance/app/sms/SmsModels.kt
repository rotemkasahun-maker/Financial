
package com.familyfinance.app.sms

enum class SmsCandidateType {
    TRANSACTION,
    RECEIPT_LINK,
    AMBIGUOUS,
    NOISE
}

data class SmsNormalizedData(
    val amount: Double? = null,
    val currency: String? = null,
    val cardLastFour: String? = null,
    val urls: List<String> = emptyList(),
    val transactionType: String? = null
)

data class SmsEvidence(
    val sourceType: String = "sms",
    val candidateType: SmsCandidateType,
    val sender: String? = null,
    val bodyHash: String,
    val externalSourceId: String,
    val normalizedData: SmsNormalizedData,
    val text: String? = null,
    val originalSmsTimestamp: Long,
    val timestamp: Long = System.currentTimeMillis()
)

data class SmsAnalysisResult(
    val candidateType: SmsCandidateType,
    val normalizedData: SmsNormalizedData,
    val evidence: SmsEvidence?,
    val reason: String,
    val decisionCode: String
)
