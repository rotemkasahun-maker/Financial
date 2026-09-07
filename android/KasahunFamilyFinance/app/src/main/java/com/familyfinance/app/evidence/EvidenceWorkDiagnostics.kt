package com.familyfinance.app.evidence

import android.content.Context
import androidx.work.WorkInfo
import androidx.work.WorkManager
import java.security.MessageDigest

data class EvidenceWorkDiagnostic(
    val uniqueWorkName: String,
    val workIdHash: String,
    val state: String,
    val runAttemptCount: Int,
    val terminal: Boolean,
    val tags: List<String>,
    val multipleHistoricalRecords: Boolean = false
)

object EvidenceWorkDiagnostics {
    fun read(context: Context, externalSourceId: String): List<EvidenceWorkDiagnostic> = runCatching {
        val name = EvidenceSyncWorkScheduler.uniqueWorkName(externalSourceId)
        val infos = WorkManager.getInstance(context).getWorkInfosForUniqueWork(name).get()
        infos.map { info -> EvidenceWorkDiagnostic(name, hash(info.id.toString()), info.state.name, info.runAttemptCount, info.state.isFinished, info.tags.toList(), infos.size > 1) }
    }.getOrDefault(emptyList())

    /** Safe aggregate projection for all queued evidence; never includes payloads or IDs. */
    fun readPending(context: Context): List<EvidenceWorkDiagnostic> = FinancialEvidencePersistence.getQueue(context).flatMap { read(context, it.externalSourceId) }

    private fun hash(value: String) = MessageDigest.getInstance("SHA-256").digest(value.toByteArray()).joinToString("") { "%02x".format(it) }.take(16)
}
