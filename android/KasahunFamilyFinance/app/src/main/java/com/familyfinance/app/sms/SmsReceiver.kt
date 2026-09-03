package com.familyfinance.app.sms

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.util.Log
import com.familyfinance.app.evidence.EvidenceSyncWorkScheduler

class SmsReceiver : BroadcastReceiver() {

    override fun onReceive(
        context: Context,
        intent: Intent
    ) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) {
            return
        }

        val messages =
            Telephony.Sms.Intents.getMessagesFromIntent(intent)

        if (messages.isEmpty()) {
            Log.w(TAG, "SMS extraction rejected: reason=NO_MESSAGES")
            return
        }

        val sender = messages.firstOrNull()
            ?.displayOriginatingAddress

        val timestamp = messages.firstOrNull()
            ?.timestampMillis ?: System.currentTimeMillis()

        val body = messages
            .joinToString(separator = "") { message ->
                message.displayMessageBody.orEmpty()
            }

        if (body.isBlank()) {
            Log.w(
                TAG,
                "SMS extraction rejected: reason=EMPTY_BODY sender=${safeSenderLabel(sender)} chars=0 parts=${messages.size}"
            )
            return
        }

        val bodyHash = SmsNormalizer.sha256(body)

        // Idempotency check: only for financial evidence.
        // NOISE is not tracked persistently.
        if (SmsPersistence.isProcessed(context, bodyHash)) {
            Log.d(
                TAG,
                "SMS rejected: reason=ALREADY_PROCESSED sender=${safeSenderLabel(sender)} chars=${body.length} parts=${messages.size}"
            )
            return
        }

        val result = SmsEvidenceMapper.analyze(
            body = body,
            sender = sender,
            originalTimestamp = timestamp
        )

        when (result.candidateType) {
            SmsCandidateType.NOISE -> {
                // Privacy-first:
                // discard NOISE immediately. Do not persist hash.
                Log.d(
                    TAG,
                    "SMS rejected: candidate=NOISE reason=${result.decisionCode} sender=${safeSenderLabel(sender)} chars=${body.length} parts=${messages.size}"
                )
            }

            else -> {
                val evidence = result.evidence
                if (evidence != null) {
                    val added = SmsPersistence.addToQueue(context, evidence)
                    val persisted = added && SmsPersistence.getQueue(context)
                        .any { it.externalSourceId == evidence.externalSourceId }
                    if (!persisted) {
                        Log.e(
                            TAG,
                            "SMS persistence rejected: candidate=${result.candidateType.name} reason=${if (added) "QUEUE_VERIFICATION_FAILED" else "NOT_ADDED"} sender=${safeSenderLabel(sender)} chars=${body.length} parts=${messages.size}"
                        )
                        return
                    }
                    EvidenceSyncWorkScheduler.schedule(context, evidence.externalSourceId)
                    Log.d(
                        TAG,
                        "SMS accepted: candidate=${result.candidateType.name} reason=${result.decisionCode} sender=${safeSenderLabel(sender)} chars=${body.length} parts=${messages.size} persisted=true syncScheduled=true"
                    )
                }
            }
        }
    }

    private fun safeSenderLabel(sender: String?): String {
        val value = sender?.trim().orEmpty()
        if (value.isBlank()) return "UNKNOWN"
        if (value.contains("discount", ignoreCase = true) || value.contains("דיסקונט")) return "DISCOUNT"
        if (value.any(Char::isDigit)) return "PHONE_OR_NUMERIC"
        return "ALPHANUMERIC"
    }

    companion object {
        private const val TAG = "FamilyFinanceSms"
    }
}
