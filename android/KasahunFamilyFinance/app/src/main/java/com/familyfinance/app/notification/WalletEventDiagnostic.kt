package com.familyfinance.app.notification

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/** Bounded, app-private metadata for reconstructing Wallet processing without raw content. */
object WalletEventDiagnostic {
    private const val prefs = "wallet_event_diagnostics"
    private const val key = "events"
    private const val maxEvents = 20

    fun record(context: Context, event: JSONObject) {
        val store = context.getSharedPreferences(prefs, Context.MODE_PRIVATE)
        val previous = JSONArray(store.getString(key, "[]"))
        val next = JSONArray()
        next.put(event)
        for (i in 0 until minOf(previous.length(), maxEvents - 1)) next.put(previous.getJSONObject(i))
        store.edit().putString(key, next.toString()).apply()
    }

    fun received(context: Context, postedAt: Long, accepted: Boolean, reason: String) = record(context, JSONObject()
        .put("eventAt", postedAt).put("source", "google_wallet").put("notificationReceived", true)
        .put("parserDecision", if (accepted) "accepted" else "rejected")
        .put("reason", reason).put("receiptExpectation", "not_reached"))
}
