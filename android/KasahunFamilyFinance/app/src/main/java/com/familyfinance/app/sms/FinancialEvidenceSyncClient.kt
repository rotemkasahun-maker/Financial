package com.familyfinance.app.sms

import android.util.Log
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

open class FinancialEvidenceSyncClient(private val config: FinancialSyncConfig) {

    /**
     * Sends a financial evidence payload to the backend.
     * Returns true if successful (HTTP 200 or 201), false otherwise.
     */
    open fun sendEvidence(payload: JSONObject): Boolean {
        var connection: HttpURLConnection? = null
        return try {
            val householdSession = postHouseholdSession()
            val url = URL("${config.backendUrl}/api/ingestion/evidence")
            connection = url.openConnection() as HttpURLConnection
            connection.requestMethod = "POST"
            connection.doOutput = true
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setRequestProperty("Authorization", "Bearer ${config.connectorToken}")
            householdSession?.let { connection.setRequestProperty("X-Household-Session", it) }
            connection.connectTimeout = 10000
            connection.readTimeout = 10000

            OutputStreamWriter(connection.outputStream).use { writer ->
                writer.write(payload.toString())
                writer.flush()
            }

            val responseCode = connection.responseCode
            Log.d(TAG, "Backend response code: $responseCode")
            
            responseCode == HttpURLConnection.HTTP_OK || 
            responseCode == HttpURLConnection.HTTP_CREATED
        } catch (e: Exception) {
            Log.e(TAG, "Error sending evidence to backend", e)
            false
        } finally {
            connection?.disconnect()
        }
    }

    private fun postHouseholdSession(): String? {
        if (config.householdUser.isBlank() || config.householdCredential.isBlank()) return null
        val connection = URL("${config.backendUrl}/api/auth/session").openConnection() as HttpURLConnection
        return try {
            connection.requestMethod = "POST"
            connection.doOutput = true
            connection.setRequestProperty("Content-Type", "application/json")
            connection.connectTimeout = 10000
            connection.readTimeout = 10000
            val request = JSONObject()
                .put("userId", config.householdUser)
                .put("credential", config.householdCredential)
            OutputStreamWriter(connection.outputStream).use { it.write(request.toString()) }
            check(connection.responseCode in 200..299) {
                "Household authentication failed: ${connection.responseCode}"
            }
            JSONObject(connection.inputStream.bufferedReader().readText()).getString("session")
        } finally {
            connection.disconnect()
        }
    }

    companion object {
        private const val TAG = "FinancialSyncClient"
    }
}
