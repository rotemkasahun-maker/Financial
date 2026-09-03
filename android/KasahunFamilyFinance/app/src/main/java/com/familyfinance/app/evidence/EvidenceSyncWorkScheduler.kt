package com.familyfinance.app.evidence

import android.content.Context
import androidx.work.Constraints
import androidx.work.Data
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import java.security.MessageDigest

object EvidenceSyncWorkScheduler {
    private const val prefix = "family-finance-evidence-sync-"

    fun uniqueWorkName(externalSourceId: String): String = prefix + stableHash(externalSourceId)

    fun schedule(context: Context, externalSourceId: String) {
        val request = OneTimeWorkRequestBuilder<FinancialEvidenceSyncWorker>()
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .setInputData(Data.Builder().putString("externalSourceId", externalSourceId).build())
            .build()
        WorkManager.getInstance(context).enqueueUniqueWork(
            uniqueWorkName(externalSourceId),
            ExistingWorkPolicy.KEEP,
            request
        )
    }

    private fun stableHash(value: String): String = MessageDigest.getInstance("SHA-256")
        .digest(value.toByteArray())
        .joinToString("") { "%02x".format(it) }
        .take(24)
}
