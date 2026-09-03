package com.familyfinance.app.receipt

import android.content.Context
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class ReceiptReminderWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {
    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val externalSourceId = inputData.getString("externalSourceId") ?: return@withContext Result.failure()
        try {
            val status = ReceiptStatusClient().fetch(externalSourceId)
            if (ReceiptReminderDecision.shouldNotify(status)) {
                ReceiptReminderNotifier.notifyOnce(applicationContext, externalSourceId, status.transactionId!!)
            }
            Result.success()
        } catch (error: Exception) {
            Log.w("ReceiptReminderWorker", "Authoritative receipt check failed; WorkManager will retry", error)
            Result.retry()
        }
    }
}
