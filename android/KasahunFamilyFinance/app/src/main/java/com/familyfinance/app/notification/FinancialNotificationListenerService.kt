package com.familyfinance.app.notification

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import com.familyfinance.app.evidence.FinancialEvidence
import com.familyfinance.app.evidence.FinancialEvidenceCandidateType
import com.familyfinance.app.evidence.FinancialEvidencePersistence
import com.familyfinance.app.evidence.EvidenceSyncWorkScheduler
import com.familyfinance.app.evidence.FinancialNormalizedData

class FinancialNotificationListenerService : NotificationListenerService() {
    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        val item = sbn ?: return

        if (item.packageName != GoogleWalletNotificationParser.GOOGLE_WALLET_PACKAGE) {
            return
        }

        val extras = item.notification.extras
        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()
        val body = (
            extras.getCharSequence(Notification.EXTRA_BIG_TEXT)
                ?: extras.getCharSequence(Notification.EXTRA_TEXT)
            )?.toString()

        val parsed = GoogleWalletNotificationParser.parse(
            sourcePackage = item.packageName,
            notificationKey = item.key,
            postedAt = item.postTime,
            title = title,
            body = body
        ) ?: run {
            WalletEventDiagnostic.received(applicationContext, item.postTime, false, "unsupported_or_parse_failure")
            return
        }

        val evidence = FinancialEvidence(
            sourceType = "notification",
            candidateType = FinancialEvidenceCandidateType.TRANSACTION,
            sender = "Google Wallet",
            bodyHash = parsed.contentHash,
            externalSourceId = parsed.externalSourceId,
            normalized = FinancialNormalizedData(
                merchant = parsed.merchant,
                date = parsed.purchaseDate,
                amount = parsed.amount,
                currency = parsed.currency
            ),
            sourceTimestamp = parsed.originalTimestamp,
            metadata = buildMap {
                put("sourcePackage", item.packageName)
                parsed.paymentMethodLabel?.let { put("paymentMethodLabel", it) }
            }
        )

        val added = FinancialEvidencePersistence.addToQueue(applicationContext, evidence)
        if (added) EvidenceSyncWorkScheduler.schedule(applicationContext, evidence.externalSourceId)
        WalletEventDiagnostic.record(applicationContext, org.json.JSONObject()
            .put("eventAt", parsed.originalTimestamp).put("source", "google_wallet")
            .put("notificationReceived", true).put("parserDecision", "accepted")
            .put("reason", "financial_candidate").put("normalizedType", "transaction")
            .put("externalSourceId", parsed.externalSourceId.take(12))
            .put("persistence", if (added) "queued" else "duplicate")
            .put("syncScheduling", if (added) "scheduled" else "not_scheduled_duplicate")
            .put("receiptExpectation", "not_reached"))

        Log.d(
            TAG,
            if (added) "Google Wallet financial notification queued"
            else "Duplicate Google Wallet notification ignored"
        )
    }

    companion object {
        private const val TAG = "FinanceNotification"
    }
}
