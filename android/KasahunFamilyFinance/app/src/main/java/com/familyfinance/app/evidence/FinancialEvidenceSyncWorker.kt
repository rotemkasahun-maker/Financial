package com.familyfinance.app.evidence

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.familyfinance.app.BuildConfig
import com.familyfinance.app.sms.FinancialEvidenceSyncClient
import com.familyfinance.app.sms.FinancialEvidenceSyncService
import com.familyfinance.app.sms.FinancialSyncConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class FinancialEvidenceSyncWorker(
    appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {
    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        val service = FinancialEvidenceSyncService(
            FinancialEvidenceSyncClient(
                FinancialSyncConfig(
                    BuildConfig.FAMILY_FINANCE_BACKEND_URL,
                    BuildConfig.FAMILY_FINANCE_CONNECTOR_TOKEN,
                    BuildConfig.FAMILY_FINANCE_HOUSEHOLD_USER,
                    BuildConfig.FAMILY_FINANCE_HOUSEHOLD_CREDENTIAL
                )
            )
        )
        val result = service.syncEvidenceQueue(applicationContext)
        if (result.errorCount > 0) Result.retry() else Result.success()
    }
}
