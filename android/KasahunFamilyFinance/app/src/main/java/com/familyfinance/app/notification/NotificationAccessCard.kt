package com.familyfinance.app.notification

import android.content.Intent
import android.provider.Settings
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.app.NotificationManagerCompat

@Composable
fun NotificationAccessCard() {
    val context = LocalContext.current
    var enabled by remember {
        mutableStateOf(
            NotificationManagerCompat
                .getEnabledListenerPackages(context)
                .contains(context.packageName)
        )
    }

    Card(modifier = Modifier.fillMaxWidth()) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            Text(
                text = "Financial Notifications",
                style = MaterialTheme.typography.titleMedium
            )

            Text(
                text = if (enabled) {
                    "Notification Access: Enabled"
                } else {
                    "Notification Access: Disabled"
                }
            )

            Text(
                text = "MVP source: Google Wallet. Unrelated notifications are discarded locally."
            )

            if (!enabled) {
                Button(
                    onClick = {
                        context.startActivity(
                            Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
                                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                        )
                    },
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text("Enable Notification Access")
                }
            }

            Button(
                onClick = {
                    enabled = NotificationManagerCompat
                        .getEnabledListenerPackages(context)
                        .contains(context.packageName)
                },
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Refresh Notification Access")
            }
        }
    }
}
