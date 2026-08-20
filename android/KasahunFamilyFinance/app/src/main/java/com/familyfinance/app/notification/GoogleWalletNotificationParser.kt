package com.familyfinance.app.notification

import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * Google Wallet parsing approach adapted for Family Finance from the
 * MIT-licensed fanis/expense-notification project.
 *
 * Raw notification title/body are used transiently for local parsing only.
 */
object GoogleWalletNotificationParser {
    const val GOOGLE_WALLET_PACKAGE = "com.google.android.apps.walletnfcrel"

    data class Parsed(
        val merchant: String?,
        val amount: Double,
        val currency: String,
        val paymentMethodLabel: String?,
        val purchaseDate: String,
        val originalTimestamp: Long,
        val contentHash: String,
        val externalSourceId: String
    )

    private data class AmountResult(val amount: Double, val currency: String)

    private val patterns = listOf(
        Regex("""₪\s*([0-9][0-9.,]*)""") to "ILS",
        Regex("""([0-9][0-9.,]*)\s*₪""") to "ILS",
        Regex("""\bILS\s*([0-9][0-9.,]*)""", RegexOption.IGNORE_CASE) to "ILS",
        Regex("""([0-9][0-9.,]*)\s*ILS\b""", RegexOption.IGNORE_CASE) to "ILS",
        Regex("""€\s*([0-9][0-9.,]*)""") to "EUR",
        Regex("""£\s*([0-9][0-9.,]*)""") to "GBP",
        Regex("""\bUSD\s*([0-9][0-9.,]*)""", RegexOption.IGNORE_CASE) to "USD",
        Regex("""([0-9][0-9.,]*)\s*USD\b""", RegexOption.IGNORE_CASE) to "USD"
    )

    private val walletMethodRegex = Regex(
        """(?mi)^\s*(?:(?:₪|€|£)\s*)?(?:ILS|EUR|GBP|USD)?\s*[0-9][0-9.,]*\s+with\s+([^\n\r]+?)\s*$"""
    )

    fun parse(
        sourcePackage: String,
        notificationKey: String?,
        postedAt: Long,
        title: String?,
        body: String?
    ): Parsed? {
        if (sourcePackage != GOOGLE_WALLET_PACKAGE) return null

        val safeTitle = title.orEmpty().trim()
        val safeBody = body.orEmpty().trim()
        val combined = listOf(safeTitle, safeBody)
            .filter { it.isNotBlank() }
            .joinToString("\n")

        val amount = extractAmount(combined) ?: return null
        val contentHash = NotificationEvidenceId.sha256(
            listOf(safeTitle, safeBody).joinToString("\u001F")
        )

        return Parsed(
            merchant = cleanMerchant(safeTitle),
            amount = amount.amount,
            currency = amount.currency,
            paymentMethodLabel = extractFriendlyPaymentMethod(safeBody),
            purchaseDate = dateFor(postedAt),
            originalTimestamp = postedAt,
            contentHash = contentHash,
            externalSourceId = NotificationEvidenceId.create(
                sourcePackage,
                notificationKey,
                postedAt,
                contentHash
            )
        )
    }

    private fun extractAmount(text: String): AmountResult? {
        for ((regex, currency) in patterns) {
            val match = regex.find(text) ?: continue
            val value = normalizeNumber(match.groupValues[1]) ?: continue
            return AmountResult(value, currency)
        }
        return null
    }

    private fun normalizeNumber(raw: String): Double? {
        var value = raw.trim().replace(" ", "")
        if (value.contains(',') && value.contains('.')) {
            value = if (value.lastIndexOf(',') > value.lastIndexOf('.')) {
                value.replace(".", "").replace(",", ".")
            } else {
                value.replace(",", "")
            }
        } else if (
            value.count { it == ',' } == 1 &&
            value.substringAfter(',').length in 1..2
        ) {
            value = value.replace(",", ".")
        } else {
            value = value.replace(",", "")
        }
        return value.toDoubleOrNull()
    }

    private fun cleanMerchant(title: String): String? {
        val value = title.trim().replace(Regex("""\s+"""), " ")
        if (value.isBlank()) return null
        val lower = value.lowercase(Locale.ROOT)
        return value.takeUnless {
            lower.contains("google wallet") || lower == "view your purchase"
        }
    }

    private fun extractFriendlyPaymentMethod(body: String): String? {
        val match = walletMethodRegex.find(body) ?: return null
        val method = match.groupValues[1].trim().replace(Regex("""\s+"""), " ")
        if (method.isBlank() || method.equals("Google Wallet", true)) return null
        val lower = method.lowercase(Locale.ROOT)
        val generic =
            lower.contains("visa") ||
            lower.contains("mastercard") ||
            lower.contains("maestro") ||
            lower.contains("amex") ||
            lower.contains("american express") ||
            method.contains("*") ||
            method.contains("•")
        return method.takeUnless { generic }
    }

    private fun dateFor(timestamp: Long): String =
        SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
            timeZone = TimeZone.getTimeZone("UTC")
        }.format(Date(timestamp))
}
