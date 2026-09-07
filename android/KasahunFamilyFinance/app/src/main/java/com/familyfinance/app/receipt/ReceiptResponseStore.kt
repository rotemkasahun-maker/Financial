package com.familyfinance.app.receipt

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

object ReceiptResponseStore {
    private const val PREFS = "receipt_response_state"
    private const val KEY = "responses"
    private const val MAX = 100
    fun put(context: Context, externalSourceId: String, response: String) {
        if (response !in setOf("DIGITAL_AWAITING_DOCUMENT", "NO_RECEIPT_RECEIVED")) return
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val old = JSONArray(prefs.getString(KEY, "[]")); val next = JSONArray(); var replaced = false
        for (i in 0 until old.length()) { val item = old.getJSONObject(i); if (item.optString("externalSourceId") == externalSourceId) { if (!replaced) { next.put(JSONObject().put("externalSourceId", externalSourceId).put("response", response).put("timestamp", System.currentTimeMillis())); replaced = true } } else next.put(item) }
        if (!replaced) next.put(JSONObject().put("externalSourceId", externalSourceId).put("response", response).put("timestamp", System.currentTimeMillis()))
        val bounded = JSONArray(); for (i in maxOf(0, next.length() - MAX) until next.length()) bounded.put(next.getJSONObject(i)); prefs.edit().putString(KEY, bounded.toString()).apply()
    }
}
