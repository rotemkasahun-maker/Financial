package com.familyfinance.app.evidence

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject
import java.security.MessageDigest

data class SyncOutcome(val hashedEvidenceId: String, val attemptTimestamp: Long, val backendHost: String?, val sessionAttempted: Boolean, val sessionHttpStatus: Int?, val uploadAttempted: Boolean, val uploadHttpStatus: Int?, val sanitizedFailureCategory: String?, val finalOutcome: String)

object SyncOutcomeStore {
    private const val PREFS = "financial_sync_outcomes"
    private const val KEY = "outcomes"
    private const val MAX = 50

    fun record(context: Context, outcome: SyncOutcome) = runCatching {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val old = JSONArray(prefs.getString(KEY, "[]"))
        val item = JSONObject().put("hashedEvidenceId", outcome.hashedEvidenceId).put("attemptTimestamp", outcome.attemptTimestamp).put("backendHost", outcome.backendHost ?: JSONObject.NULL).put("sessionAttempted", outcome.sessionAttempted).put("sessionHttpStatus", outcome.sessionHttpStatus ?: JSONObject.NULL).put("uploadAttempted", outcome.uploadAttempted).put("uploadHttpStatus", outcome.uploadHttpStatus ?: JSONObject.NULL).put("sanitizedFailureCategory", outcome.sanitizedFailureCategory ?: JSONObject.NULL).put("finalOutcome", outcome.finalOutcome)
        val next = JSONArray().put(item)
        for (i in 0 until minOf(old.length(), MAX - 1)) next.put(old.getJSONObject(i))
        prefs.edit().putString(KEY, next.toString()).apply()
    }

    fun latest(context: Context): SyncOutcome? = runCatching {
        val item = JSONArray(context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, "[]")).optJSONObject(0) ?: return null
        SyncOutcome(item.optString("hashedEvidenceId"), item.optLong("attemptTimestamp"), item.optString("backendHost").ifBlank { null }, item.optBoolean("sessionAttempted"), item.optInt("sessionHttpStatus").takeIf { item.has("sessionHttpStatus") && !item.isNull("sessionHttpStatus") }, item.optBoolean("uploadAttempted"), item.optInt("uploadHttpStatus").takeIf { item.has("uploadHttpStatus") && !item.isNull("uploadHttpStatus") }, item.optString("sanitizedFailureCategory").ifBlank { null }, item.optString("finalOutcome"))
    }.getOrNull()

    fun hashIdentity(value: String): String = MessageDigest.getInstance("SHA-256").digest(value.toByteArray()).joinToString("") { "%02x".format(it) }.take(24)
}
