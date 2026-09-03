package com.familyfinance.app.maintenance

import android.content.Context
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class MaintenanceWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {
    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        MaintenanceRunMarker.started(applicationContext)
        try {
            val snapshot = MaintenanceSyncClient(applicationContext).sync()
            val decision = MaintenanceNotifier.notifyIfNeeded(applicationContext, snapshot)
            MaintenanceRunMarker.completed(applicationContext, snapshot, decision = decision)
            Result.success()
        } catch (error: Exception) {
            MaintenanceRunMarker.failed(applicationContext, retry = true)
            Log.w("MaintenanceWorker", "Maintenance fetch failed; WorkManager will retry", error)
            Result.retry()
        }
    }
}
