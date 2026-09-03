package com.familyfinance.app.maintenance

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
import com.familyfinance.app.R
import com.familyfinance.app.BuildConfig

object MaintenanceNotifier {
    private const val channelId = "family_finance_maintenance"
    private const val notificationId = 4101

    internal fun shouldNotify(
        notifiedKey: String?,
        notifiedRoute: String?,
        currentKey: String,
        currentRoute: String
    ): Boolean = notifiedKey != currentKey || notifiedRoute != currentRoute

    fun notifyIfNeeded(context: Context, snapshot: MaintenanceSnapshot): String {
        if (snapshot.attentionCount <= 0 || snapshot.notificationKey.isBlank()) {
            NotificationManagerCompat.from(context).cancel(notificationId)
            return "cancelled"
        }
        val attentionUrl = Uri.parse(BuildConfig.FAMILY_FINANCE_WEB_URL.trimEnd('/') + "/")
            .buildUpon()
            .appendQueryParameter("page", "attention")
            .appendQueryParameter("backendOrigin", BuildConfig.FAMILY_FINANCE_BACKEND_URL.trimEnd('/'))
            .build()
        val prefs = context.getSharedPreferences("maintenance_snapshot", Context.MODE_PRIVATE)
        if (!shouldNotify(
                prefs.getString("notifiedKey", null),
                prefs.getString("notifiedRoute", null),
                snapshot.notificationKey,
                attentionUrl.toString()
            )
        ) return "suppressed_deduped"
        val manager = context.getSystemService(NotificationManager::class.java)
        manager.createNotificationChannel(NotificationChannel(channelId, "Family Finance reminders", NotificationManager.IMPORTANCE_DEFAULT))
        if (android.os.Build.VERSION.SDK_INT >= 33 && context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return "none_required"
        val title = if (snapshot.attentionCount == 1) "יש דבר אחד שמחכה לסידור" else "${snapshot.attentionCount} דברים מחכים לסידור"
        val contentIntent = PendingIntent.getActivity(
            context,
            0,
            Intent(Intent.ACTION_VIEW, attentionUrl),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        NotificationManagerCompat.from(context).notify(notificationId, NotificationCompat.Builder(context, channelId).setSmallIcon(R.mipmap.ic_launcher).setContentTitle(title).setContentText("אפשר לפתוח את Family Finance ולבדוק את Attention").setContentIntent(contentIntent).setAutoCancel(true).build())
        prefs.edit()
            .putString("notifiedKey", snapshot.notificationKey)
            .putString("notifiedRoute", attentionUrl.toString())
            .apply()
        return "posted"
    }
}
