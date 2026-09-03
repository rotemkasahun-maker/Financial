package com.familyfinance.app.sms

object SmsEvidenceMapper {

    fun analyze(
        body: String,
        sender: String? = null,
        originalTimestamp: Long = System.currentTimeMillis()
    ): SmsAnalysisResult {
        val decision = SmsCandidateDetector.decide(body)
        val candidateType = decision.candidateType
        val normalizedData = SmsNormalizer.normalize(body)

        val reason = when (candidateType) {
            SmsCandidateType.TRANSACTION ->
                "Financial transaction candidate detected locally"

            SmsCandidateType.RECEIPT_LINK ->
                "Receipt or invoice link detected locally"

            SmsCandidateType.AMBIGUOUS ->
                "Possibly financial, but not safe to classify automatically"

            SmsCandidateType.NOISE ->
                "No financial evidence needed"
        }

        val evidence = when (candidateType) {
            SmsCandidateType.NOISE -> null

            else -> SmsEvidence(
                candidateType = candidateType,
                sender = sender,
                bodyHash = SmsNormalizer.sha256(body),
                externalSourceId = SmsNormalizer.generateExternalSourceId(
                    sender = sender,
                    timestamp = originalTimestamp,
                    body = body
                ),
                normalizedData = normalizedData,
                originalSmsTimestamp = originalTimestamp,

                // MVP privacy rule:
                // raw SMS text is NOT included in evidence by default.
                text = null
            )
        }

        return SmsAnalysisResult(
            candidateType = candidateType,
            normalizedData = normalizedData,
            evidence = evidence,
            reason = reason,
            decisionCode = decision.reasonCode
        )
    }
}
