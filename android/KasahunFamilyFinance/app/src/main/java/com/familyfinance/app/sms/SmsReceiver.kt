package com.familyfinance.app.sms

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.provider.Telephony
import android.util.Log

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
            return
        }

        val bodyHash = SmsNormalizer.sha256(body)

        // Idempotency check: only for financial evidence.
        // NOISE is not tracked persistently.
        if (SmsPersistence.isProcessed(context, bodyHash)) {
            Log.d(TAG, "SMS already processed (idempotency check)")
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
                Log.d(TAG, "SMS discarded locally as NOISE")
            }

            else -> {
                val evidence = result.evidence
                if (evidence != null) {
                    SmsPersistence.addToQueue(context, evidence)
                    Log.d(TAG, "Financial SMS candidate queued: ${result.candidateType.name}")
                }
            }
        }
    }

    companion object {
        private const val TAG = "FamilyFinanceSms"
    }
}