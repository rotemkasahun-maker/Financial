package com.familyfinance.app.evidence

enum class FinancialEvidenceCandidateType {
    TRANSACTION,
    RECEIPT_LINK,
    AMBIGUOUS
}

data class FinancialNormalizedData(
    val merchant: String? = null,
    val date: String? = null,
    val amount: Double? = null,
    val currency: String? = null,
    val cardLastFour: String? = null,
    val urls: List<String> = emptyList()
)

data class FinancialEvidence(
    val sourceType: String,
    val candidateType: FinancialEvidenceCandidateType,
    val sender: String? = null,
    val bodyHash: String? = null,
    val externalSourceId: String,
    val normalized: FinancialNormalizedData = FinancialNormalizedData(),
    val sourceTimestamp: Long,
    val metadata: Map<String, String> = emptyMap(),
    val timestamp: Long = System.currentTimeMillis()
)
