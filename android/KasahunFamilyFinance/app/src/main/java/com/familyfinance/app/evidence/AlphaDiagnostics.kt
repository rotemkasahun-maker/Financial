package com.familyfinance.app.evidence

import android.content.Context
import android.content.pm.PackageManager
import androidx.core.app.NotificationManagerCompat
import com.familyfinance.app.BuildConfig

data class AlphaDiagnostics(val appVersion: String, val backendHost: String, val environment: String, val outbox: OutboxHealth, val workerStates: Map<String, Int>, val lastSync: SyncOutcome?, val smsPermission: Boolean, val notificationsPermission: Boolean, val listenerEnabled: Boolean, val recoveryStatus: String?)

object AlphaDiagnosticsReader {
    fun read(context: Context): AlphaDiagnostics {
        val info = context.packageManager.getPackageInfo(context.packageName, 0)
        val states = FinancialEvidencePersistence.getQueue(context).flatMap { EvidenceWorkDiagnostics.read(context, it.externalSourceId) }.groupingBy { it.state }.eachCount()
        return AlphaDiagnostics("${info.versionName ?: "unknown"} (${info.longVersionCode})", runCatching { java.net.URI(BuildConfig.FAMILY_FINANCE_BACKEND_URL).host ?: "unknown" }.getOrDefault("unknown"), if (BuildConfig.FAMILY_FINANCE_ALPHA) "ALPHA" else "NON_ALPHA", FinancialEvidencePersistence.health(context), states, SyncOutcomeStore.latest(context), context.checkSelfPermission("android.permission.RECEIVE_SMS") == PackageManager.PERMISSION_GRANTED, android.os.Build.VERSION.SDK_INT < 33 || context.checkSelfPermission("android.permission.POST_NOTIFICATIONS") == PackageManager.PERMISSION_GRANTED, NotificationManagerCompat.getEnabledListenerPackages(context).contains(context.packageName), context.getSharedPreferences("alpha_recovery", Context.MODE_PRIVATE).getString("last_status", null))
    }
}
