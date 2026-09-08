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
        schedule(context, externalSourceId, ExistingWorkPolicy.KEEP)
    }

    private fun schedule(context: Context, externalSourceId: String, policy: ExistingWorkPolicy) {
        val request = OneTimeWorkRequestBuilder<FinancialEvidenceSyncWorker>()
            .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
            .setInputData(Data.Builder().putString("externalSourceId", externalSourceId).build())
            .build()
        WorkManager.getInstance(context).enqueueUniqueWork(
            uniqueWorkName(externalSourceId),
            policy,
            request
        )
    }

    /** Re-enqueues pending evidence after process start/reboot without changing queue data. */
    fun schedulePending(context: Context) {
        FinancialEvidencePersistence.getQueue(context)
            .forEach { evidence ->
                val name = uniqueWorkName(evidence.externalSourceId)
                val infos = runCatching { WorkManager.getInstance(context).getWorkInfosForUniqueWork(name).get() }.getOrDefault(emptyList())
                val active = infos.any { !it.state.isFinished }
                if (!active) schedule(context, evidence.externalSourceId, ExistingWorkPolicy.REPLACE)
                else schedule(context, evidence.externalSourceId, ExistingWorkPolicy.KEEP)
            }
    }

    private fun stableHash(value: String): String = MessageDigest.getInstance("SHA-256")
        .digest(value.toByteArray())
        .joinToString("") { "%02x".format(it) }
        .take(24)
}
