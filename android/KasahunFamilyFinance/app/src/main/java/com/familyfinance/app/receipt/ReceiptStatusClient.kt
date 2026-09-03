package com.familyfinance.app.receipt

import com.familyfinance.app.BuildConfig
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

data class AuthoritativeReceiptStatus(
    val ingestionStatus: String,
    val receiptStatus: String,
    val transactionId: String?
)

class ReceiptStatusClient {
    fun fetch(externalSourceId: String): AuthoritativeReceiptStatus {
        val session = postSession()
        val encodedId = java.net.URLEncoder.encode(externalSourceId, Charsets.UTF_8.name())
        val connection = open("/api/finance/evidence-status/$encodedId", "GET")
        return try {
            connection.setRequestProperty("Authorization", "Bearer $session")
            check(connection.responseCode in 200..299) { "Evidence status failed: ${connection.responseCode}" }
            val json = JSONObject(connection.inputStream.bufferedReader().readText())
            AuthoritativeReceiptStatus(
                ingestionStatus = json.optString("ingestionStatus", "not_found"),
                receiptStatus = json.optString("receiptStatus", "unknown"),
                transactionId = json.optString("transactionId").ifBlank { null }
            )
        } finally {
            connection.disconnect()
        }
    }

    private fun postSession(): String {
        require(BuildConfig.FAMILY_FINANCE_HOUSEHOLD_USER.isNotBlank() && BuildConfig.FAMILY_FINANCE_HOUSEHOLD_CREDENTIAL.isNotBlank())
        val connection = open("/api/auth/session", "POST")
        return try {
            connection.doOutput = true
            connection.outputStream.use {
                it.write(JSONObject()
                    .put("userId", BuildConfig.FAMILY_FINANCE_HOUSEHOLD_USER)
                    .put("credential", BuildConfig.FAMILY_FINANCE_HOUSEHOLD_CREDENTIAL)
                    .toString().toByteArray())
            }
            check(connection.responseCode in 200..299) { "Authentication failed: ${connection.responseCode}" }
            JSONObject(connection.inputStream.bufferedReader().readText()).getString("session")
        } finally {
            connection.disconnect()
        }
    }

    private fun open(path: String, method: String): HttpURLConnection =
        (URL(BuildConfig.FAMILY_FINANCE_BACKEND_URL.trimEnd('/') + path).openConnection() as HttpURLConnection).apply {
            requestMethod = method
            connectTimeout = 10000
            readTimeout = 10000
            setRequestProperty("Content-Type", "application/json")
        }
}
