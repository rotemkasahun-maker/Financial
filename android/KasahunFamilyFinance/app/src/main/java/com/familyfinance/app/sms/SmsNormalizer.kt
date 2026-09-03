package com.familyfinance.app.sms

import java.security.MessageDigest

object SmsNormalizer {

    private val urlRegex =
        Regex("""https?://\S+""", RegexOption.IGNORE_CASE)

    private val amountRegex = Regex(
        """(?:₪|ש"ח|ש״ח|\bILS\b)\s*([\d,.]+)|([\d,.]+)\s*(?:₪|ש"ח|ש״ח|\bILS\b)""",
        RegexOption.IGNORE_CASE
    )

    private val lastFourRegex = Regex(
        """(?:מסתיים|המסתיים|ספרות אחרונות|ending|ends in)\D{0,20}(\d{4})""",
        RegexOption.IGNORE_CASE
    )

    fun normalize(body: String): SmsNormalizedData {
        return SmsNormalizedData(
            amount = extractAmount(body),
            currency = extractCurrency(body),
            cardLastFour = extractLastFour(body),
            urls = extractUrls(body),
            transactionType = extractTransactionType(body)
        )
    }

    fun sha256(text: String): String {
        val digest = MessageDigest.getInstance("SHA-256")
            .digest(text.toByteArray(Charsets.UTF_8))

        return digest.joinToString("") { byte ->
            "%02x".format(byte)
        }
    }

    fun generateExternalSourceId(
        sender: String?,
        timestamp: Long,
        body: String
    ): String {
        val payload = "${sender.orEmpty()}$timestamp$body"
        return sha256(payload)
    }

    private fun extractAmount(body: String): Double? {
        val match = amountRegex.find(body) ?: return null

        val rawAmount =
            match.groupValues[1].ifBlank { match.groupValues[2] }

        return parseNumber(rawAmount)
    }

    private fun parseNumber(value: String): Double? {
        val cleaned = value.replace(",", "")
        return cleaned.toDoubleOrNull()
    }

    private fun extractCurrency(body: String): String? {
        return if (
            body.contains("₪") ||
            body.contains("ש\"ח") ||
            body.contains("ש״ח") ||
            body.contains("ILS", ignoreCase = true)
        ) {
            "ILS"
        } else {
            null
        }
    }

    private fun extractLastFour(body: String): String? {
        return lastFourRegex.find(body)?.groupValues?.get(1)
    }

    private fun extractUrls(body: String): List<String> {
        return urlRegex.findAll(body)
            .map { match ->
                match.value.trimEnd('.', ',', ';', ')', ']', '}')
            }
            .distinct()
            .toList()
    }

    private fun extractTransactionType(body: String): String? = when {
        Regex("העברה|העברת|הועבר|bank transfer|transfer", RegexOption.IGNORE_CASE)
            .containsMatchIn(body) -> "bank_transfer"
        else -> null
    }
}
