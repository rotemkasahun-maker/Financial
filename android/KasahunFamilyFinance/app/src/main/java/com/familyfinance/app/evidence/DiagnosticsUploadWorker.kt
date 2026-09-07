package com.familyfinance.app.evidence

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.familyfinance.app.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

class DiagnosticsUploadWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        runCatching {
            val traces = JSONArray(applicationContext.getSharedPreferences("financial_event_traces", Context.MODE_PRIVATE).getString("events", "[]"))
            val session = authenticate() ?: return@runCatching false
            for (i in 0 until traces.length()) {
                val trace = traces.getJSONObject(i)
                post(session, trace)
            }
            true
        }.fold({ if (it) Result.success() else Result.retry() }, { Result.retry() })
    }

    private fun authenticate(): String? {
        val connection = URL("${BuildConfig.FAMILY_FINANCE_BACKEND_URL}/api/auth/session").openConnection() as HttpURLConnection
        return try {
            connection.requestMethod = "POST"; connection.doOutput = true; connection.setRequestProperty("Content-Type", "application/json")
            OutputStreamWriter(connection.outputStream).use { it.write(JSONObject().put("userId", BuildConfig.FAMILY_FINANCE_HOUSEHOLD_USER).put("credential", BuildConfig.FAMILY_FINANCE_HOUSEHOLD_CREDENTIAL).toString()) }
            if (connection.responseCode !in 200..299) return null
            JSONObject(connection.inputStream.bufferedReader().readText()).getString("session")
        } finally { connection.disconnect() }
    }

    private fun post(session: String, trace: JSONObject) {
        val connection = URL("${BuildConfig.FAMILY_FINANCE_BACKEND_URL}/api/diagnostics/events").openConnection() as HttpURLConnection
        try {
            connection.requestMethod = "POST"; connection.doOutput = true; connection.setRequestProperty("Content-Type", "application/json"); connection.setRequestProperty("Authorization", "Bearer $session"); connection.connectTimeout = 5000; connection.readTimeout = 5000
            OutputStreamWriter(connection.outputStream).use { it.write(trace.toString()) }
            check(connection.responseCode in 200..299)
        } finally { connection.disconnect() }
    }
}
