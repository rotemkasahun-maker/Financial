package com.familyfinance.app.evidence

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class AlphaRecoveryReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action != Intent.ACTION_BOOT_COMPLETED && intent.action != Intent.ACTION_MY_PACKAGE_REPLACED) return
        EvidenceSyncWorkScheduler.schedulePending(context)
        context.getSharedPreferences("alpha_recovery", Context.MODE_PRIVATE).edit().putString("last_status", "${intent.action}:success").apply()
    }
}
