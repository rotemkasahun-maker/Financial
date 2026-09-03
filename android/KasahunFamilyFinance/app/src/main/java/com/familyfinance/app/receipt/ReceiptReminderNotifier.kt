package com.familyfinance.app.receipt

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.familyfinance.app.BuildConfig
import com.familyfinance.app.R

object ReceiptReminderDecision {
    fun shouldNotify(status: AuthoritativeReceiptStatus): Boolean =
        status.ingestionStatus == "resolved" &&
            status.receiptStatus == "absent" &&
            !status.transactionId.isNullOrBlank()
}

object ReceiptReminderDedupe {
    fun shouldPost(notifiedExternalSourceIds: Set<String>, externalSourceId: String): Boolean =
        externalSourceId !in notifiedExternalSourceIds
}

object ReceiptReminderNotifier {
    private const val channelId = "family_finance_receipts"
    private const val prefsName = "receipt_reminder_state"

    fun notifyOnce(context: Context, externalSourceId: String, transactionId: String): Boolean {
        val prefs = context.getSharedPreferences(prefsName, Context.MODE_PRIVATE)
        val notified = prefs.getStringSet("notifiedExternalSourceIds", emptySet()) ?: emptySet()
        if (!ReceiptReminderDedupe.shouldPost(notified, externalSourceId)) return false
        if (android.os.Build.VERSION.SDK_INT >= 33 &&
            context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) return false

        val manager = context.getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(
            NotificationChannel(channelId, "Missing receipt reminders", NotificationManager.IMPORTANCE_DEFAULT)
        )
        val url = Uri.parse(BuildConfig.FAMILY_FINANCE_WEB_URL.trimEnd('/') + "/")
            .buildUpon()
            .appendQueryParameter("page", "receiptCapture")
            .appendQueryParameter("transactionId", transactionId)
            .appendQueryParameter("externalSourceId", externalSourceId)
            .appendQueryParameter("backendOrigin", BuildConfig.FAMILY_FINANCE_BACKEND_URL.trimEnd('/'))
            .build()
        val id = 5100 + (externalSourceId.hashCode() and 0x7fffffff) % 100_000
        val intent = PendingIntent.getActivity(
            context,
            id,
            Intent(Intent.ACTION_VIEW, url),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        NotificationManagerCompat.from(context).notify(
            id,
            NotificationCompat.Builder(context, channelId)
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentTitle("לשמור את הקבלה?")
                .setContentText("אפשר לצלם אותה עכשיו לפני שממשיכים")
                .setContentIntent(intent)
                .setAutoCancel(true)
                .build()
        )
        prefs.edit().putStringSet("notifiedExternalSourceIds", notified.toMutableSet().apply { add(externalSourceId) }).apply()
        return true
    }
}
