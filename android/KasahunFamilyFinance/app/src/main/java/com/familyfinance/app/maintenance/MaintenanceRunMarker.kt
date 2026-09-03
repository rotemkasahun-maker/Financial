package com.familyfinance.app.maintenance

import android.content.Context

/** App-private, privacy-safe evidence that the maintenance worker itself ran. */
object MaintenanceRunMarker {
    private const val prefsName = "maintenance_run_marker"

    fun started(context: Context, startedAt: Long = System.currentTimeMillis()) {
        context.getSharedPreferences(prefsName, Context.MODE_PRIVATE).edit()
            .putString("worker", "MaintenanceWorker")
            .putLong("startedAt", startedAt)
            .putString("result", "running")
            .putBoolean("foreground", false)
            .apply()
    }

    fun completed(context: Context, snapshot: MaintenanceSnapshot, completedAt: Long = System.currentTimeMillis(), decision: String) {
        context.getSharedPreferences(prefsName, Context.MODE_PRIVATE).edit()
            .putLong("completedAt", completedAt)
            .putString("result", "success")
            .putString("snapshotAt", snapshot.updatedAt)
            .putString("snapshotKey", snapshot.notificationKey)
            .putInt("openTasks", snapshot.openTaskCount)
            .putInt("expectedDocuments", snapshot.expectedDocumentCount)
            .putInt("attention", snapshot.attentionCount)
            .putString("notificationDecision", decision)
            .apply()
    }

    fun failed(context: Context, retry: Boolean, completedAt: Long = System.currentTimeMillis()) {
        context.getSharedPreferences(prefsName, Context.MODE_PRIVATE).edit()
            .putLong("completedAt", completedAt)
            .putString("result", if (retry) "retry" else "failure")
            .apply()
    }
}
