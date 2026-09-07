package com.familyfinance.app.evidence

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import androidx.work.Constraints
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import java.security.MessageDigest

data class EventTrace(val traceId: String, val detectorType: String, val stage: String, val timestamp: Long, val outcome: String, val failureCode: String? = null)

object EventTraceRecorder {
    private const val PREFS = "financial_event_traces"
    private const val KEY = "events"
    private const val MAX = 50

    fun record(context: Context, sourceIdentity: String?, detectorType: String, stage: String, outcome: String, failureCode: String? = null) {
        runCatching {
            val trace = EventTrace(hash(sourceIdentity ?: "$detectorType:$stage"), detectorType, stage, System.currentTimeMillis(), outcome, failureCode)
            val old = JSONArray(context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, "[]"))
            val next = JSONArray().put(JSONObject().put("traceId", trace.traceId).put("detectorType", trace.detectorType).put("stage", trace.stage).put("timestamp", trace.timestamp).put("outcome", trace.outcome).apply { trace.failureCode?.let { put("failureCode", it) } })
            for (i in 0 until minOf(old.length(), MAX - 1)) next.put(old.getJSONObject(i))
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, next.toString()).apply()
            WorkManager.getInstance(context).enqueueUniqueWork("family-finance-diagnostics-upload", ExistingWorkPolicy.KEEP, OneTimeWorkRequestBuilder<DiagnosticsUploadWorker>().setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()).build())
        }
    }

    private fun hash(value: String): String = MessageDigest.getInstance("SHA-256").digest(value.toByteArray()).joinToString("") { "%02x".format(it) }.take(24)
}
