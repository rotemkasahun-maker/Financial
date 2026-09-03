package com.familyfinance.app.receipt

import android.content.Context
import androidx.work.Constraints
import androidx.work.Data
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import com.familyfinance.app.evidence.FinancialEvidence
import java.security.MessageDigest
import java.util.concurrent.TimeUnit

data class ReceiptGraceWork(
    val uniqueName: String,
    val delayMillis: Long,
    val externalSourceId: String
)

fun interface ReceiptGraceEnqueuer {
    fun enqueue(work: ReceiptGraceWork)
}

class ReceiptGraceScheduler(
    private val enqueuer: ReceiptGraceEnqueuer,
    private val graceMillis: Long = 60_000L,
    private val nowMillis: () -> Long = System::currentTimeMillis
) {
    fun onIngested(evidence: FinancialEvidence): ReceiptGraceWork? {
        if (ReceiptExpectationClassifier.classify(evidence) != ReceiptExpectation.EXPECTED_NOW) return null
        val work = ReceiptGraceWork(
            uniqueName = uniqueWorkName(evidence.externalSourceId),
            delayMillis = (evidence.sourceTimestamp + graceMillis - nowMillis()).coerceAtLeast(0L),
            externalSourceId = evidence.externalSourceId
        )
        enqueuer.enqueue(work)
        return work
    }

    companion object {
        fun uniqueWorkName(externalSourceId: String): String =
            "family-finance-receipt-grace-" + MessageDigest.getInstance("SHA-256")
                .digest(externalSourceId.toByteArray())
                .joinToString("") { "%02x".format(it) }
                .take(24)
    }
}

object ReceiptReminderScheduler {
    fun schedule(context: Context, evidence: FinancialEvidence) {
        ReceiptGraceScheduler(ReceiptGraceEnqueuer { work ->
            val request = OneTimeWorkRequestBuilder<ReceiptReminderWorker>()
                .setInitialDelay(work.delayMillis, TimeUnit.MILLISECONDS)
                .setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build())
                .setInputData(Data.Builder().putString("externalSourceId", work.externalSourceId).build())
                .build()
            WorkManager.getInstance(context).enqueueUniqueWork(
                work.uniqueName,
                ExistingWorkPolicy.KEEP,
                request
            )
        }).onIngested(evidence)
    }
}
