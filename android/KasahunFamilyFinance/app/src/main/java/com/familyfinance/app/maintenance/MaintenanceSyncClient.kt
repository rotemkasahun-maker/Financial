package com.familyfinance.app.maintenance

import android.content.Context
import com.familyfinance.app.BuildConfig
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

data class MaintenanceSnapshot(val openTaskCount: Int, val expectedDocumentCount: Int, val attentionCount: Int, val highestPriority: String?, val roughEffortMinutes: Int, val updatedAt: String?, val notificationKey: String = "")

class MaintenanceSyncClient(private val context: Context) {
    private val prefs = context.getSharedPreferences("maintenance_snapshot", Context.MODE_PRIVATE)

    fun sync(): MaintenanceSnapshot {
        prefs.edit().remove("session").apply()
        return getState(postSession()).also { save(it) }
    }

    fun cached(): MaintenanceSnapshot? = if (!prefs.contains("openTasks")) null else MaintenanceSnapshot(prefs.getInt("openTasks", 0), prefs.getInt("expectedDocs", 0), prefs.getInt("attention", 0), prefs.getString("priority", null), prefs.getInt("effort", 0), prefs.getString("updatedAt", null), prefs.getString("notificationKey", "").orEmpty())

    private fun postSession(): String {
        require(BuildConfig.FAMILY_FINANCE_HOUSEHOLD_USER.isNotBlank() && BuildConfig.FAMILY_FINANCE_HOUSEHOLD_CREDENTIAL.isNotBlank()) { "Household Android provisioning is not configured" }
        val connection = open("/api/auth/session", null, "POST")
        connection.outputStream.use { it.write(JSONObject().put("userId", BuildConfig.FAMILY_FINANCE_HOUSEHOLD_USER).put("credential", BuildConfig.FAMILY_FINANCE_HOUSEHOLD_CREDENTIAL).toString().toByteArray()) }
        val status = connection.responseCode
        check(status in 200..299) { "Authentication failed: $status" }
        val responseText = connection.inputStream.bufferedReader().readText()
        val responseJson = JSONObject(responseText)
        return responseJson.getString("session")
    }

    private fun getState(token: String): MaintenanceSnapshot {
        val connection = open("/api/maintenance/state", token, "GET")
        check(connection.responseCode in 200..299) { "Maintenance sync failed: ${connection.responseCode}" }
        val json = JSONObject(connection.inputStream.bufferedReader().readText()); val attention = json.optJSONObject("attention") ?: JSONObject(); val ids = mutableListOf<String>(); json.optJSONArray("tasks")?.let { for (i in 0 until it.length()) ids += it.getJSONObject(i).optString("id") }; json.optJSONArray("expectedDocuments")?.let { for (i in 0 until it.length()) ids += it.getJSONObject(i).optString("id") }
        return MaintenanceSnapshot(json.optJSONArray("tasks")?.length() ?: 0, json.optJSONArray("expectedDocuments")?.length() ?: 0, attention.optInt("openCount", 0), attention.optString("highestPriority").ifBlank { null }, attention.optInt("roughEffortMinutes", 0), json.optString("updatedAt").ifBlank { null }, ids.filter { it.isNotBlank() }.sorted().joinToString("|"))
    }

    private fun open(path: String, token: String?, method: String): HttpURLConnection = (URL(BuildConfig.FAMILY_FINANCE_BACKEND_URL.trimEnd('/') + path).openConnection() as HttpURLConnection).apply { requestMethod = method; connectTimeout = 5000; readTimeout = 5000; setRequestProperty("Content-Type", "application/json"); token?.let { setRequestProperty("Authorization", "Bearer $it") }; if (method == "POST") doOutput = true }
    private fun save(snapshot: MaintenanceSnapshot) { prefs.edit().putInt("openTasks", snapshot.openTaskCount).putInt("expectedDocs", snapshot.expectedDocumentCount).putInt("attention", snapshot.attentionCount).putString("priority", snapshot.highestPriority).putInt("effort", snapshot.roughEffortMinutes).putString("updatedAt", snapshot.updatedAt).putString("notificationKey", snapshot.notificationKey).apply() }
}
