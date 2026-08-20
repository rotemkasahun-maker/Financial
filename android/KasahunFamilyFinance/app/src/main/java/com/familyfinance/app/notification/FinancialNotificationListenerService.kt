package com.familyfinance.app.notification

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import com.familyfinance.app.evidence.FinancialEvidence
import com.familyfinance.app.evidence.FinancialEvidenceCandidateType
import com.familyfinance.app.evidence.FinancialEvidencePersistence
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
        ) ?: return

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
