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
            val url = URL("${config.backendUrl}/api/ingestion/evidence")
            connection = url.openConnection() as HttpURLConnection
            connection.requestMethod = "POST"
            connection.doOutput = true
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setRequestProperty("Authorization", "Bearer ${config.connectorToken}")
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

    companion object {
        private const val TAG = "FinancialSyncClient"
    }
}
