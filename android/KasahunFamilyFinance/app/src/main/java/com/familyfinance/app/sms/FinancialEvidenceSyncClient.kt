package com.familyfinance.app.sms

import android.util.Log
import org.json.JSONObject
import com.familyfinance.app.evidence.SyncOutcome
import com.familyfinance.app.evidence.SyncOutcomeStore
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

open class FinancialEvidenceSyncClient(private val config: FinancialSyncConfig, private val outcomeObserver: (SyncOutcome) -> Unit = {}) {

    /**
     * Sends a financial evidence payload to the backend.
     * Returns true if successful (HTTP 200 or 201), false otherwise.
     */
    open fun sendEvidence(payload: JSONObject): Boolean {
        var connection: HttpURLConnection? = null
        val started = System.currentTimeMillis()
        var sessionStatus: Int? = null
        var uploadStatus: Int? = null
        var sessionAttempted = false
        return try {
            sessionAttempted = config.householdUser.isNotBlank() && config.householdCredential.isNotBlank()
            val householdSession = postHouseholdSession { sessionStatus = it }
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
            uploadStatus = responseCode
            Log.d(TAG, "Backend response code: $responseCode")
            
            val success = responseCode == HttpURLConnection.HTTP_OK || responseCode == HttpURLConnection.HTTP_CREATED
            emit(payload, started, sessionAttempted, sessionStatus, true, uploadStatus, if (success) null else category(responseCode), success)
            success
        } catch (e: Exception) {
            Log.e(TAG, "Error sending evidence to backend", e)
            emit(payload, started, sessionAttempted, sessionStatus, uploadStatus != null, uploadStatus, category(e), false)
            false
        } finally {
            connection?.disconnect()
        }
    }

    private fun postHouseholdSession(onStatus: (Int) -> Unit = {}): String? {
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
            val status = connection.responseCode
            onStatus(status)
            check(status in 200..299) { "Household authentication failed" }
            JSONObject(connection.inputStream.bufferedReader().readText()).getString("session")
        } finally {
            connection.disconnect()
        }
    }

    private fun emit(payload: JSONObject, timestamp: Long, sessionAttempted: Boolean, sessionStatus: Int?, uploadAttempted: Boolean, uploadStatus: Int?, failure: String?, success: Boolean) { val id = payload.optString("externalSourceId", "unknown"); outcomeObserver(SyncOutcome(SyncOutcomeStore.hashIdentity(id), timestamp, runCatching { URL(config.backendUrl).host }.getOrNull(), sessionAttempted, sessionStatus, uploadAttempted, uploadStatus, failure, if (success) "SUCCESS" else "FAILURE")) }
    private fun category(status: Int?): String? = status?.let { if (it == 401 || it == 403) "AUTH_FAILED" else if (it >= 500) "HTTP_5XX" else "HTTP_${it}" }
    private fun category(error: Exception): String = when (error) { is java.net.SocketTimeoutException -> "TIMEOUT"; is java.net.UnknownHostException -> "DNS_FAILURE"; is javax.net.ssl.SSLException -> "TLS_FAILURE"; else -> "UNKNOWN_NETWORK" }

    companion object {
        private const val TAG = "FinancialSyncClient"
    }
}
