package com.familyfinance.app

import android.Manifest
import android.content.pm.PackageManager
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.core.content.ContextCompat
import com.familyfinance.app.evidence.FinancialEvidencePersistence
import com.familyfinance.app.notification.NotificationAccessCard
import com.familyfinance.app.sms.FinancialEvidenceSyncClient
import com.familyfinance.app.sms.FinancialEvidenceSyncService
import com.familyfinance.app.sms.FinancialSyncConfig
import com.familyfinance.app.sms.FinancialSyncResult
import com.familyfinance.app.sms.SmsAnalysisResult
import com.familyfinance.app.sms.SmsCandidateType
import com.familyfinance.app.sms.SmsEvidenceMapper
import com.familyfinance.app.sms.SmsPersistence
import com.familyfinance.app.ui.theme.KasahunFamilyFinanceTheme
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        setContent {
            KasahunFamilyFinanceTheme {
                SmsTestScreen()
            }
        }
    }
}

@Composable
fun SmsTestScreen() {
    val context = LocalContext.current

    var smsText by remember {
        mutableStateOf(
            "בוצעה עסקה בסך 149.90 ₪ בכרטיס המסתיים ב-1234"
        )
    }

    var sender by remember {
        mutableStateOf("TEST_SMS")
    }

    var result by remember {
        mutableStateOf<SmsAnalysisResult?>(null)
    }

    var syncStatus by remember {
        mutableStateOf("")
    }

    var pendingCount by remember {
        mutableStateOf(FinancialEvidencePersistence.getQueue(context).size)
    }

    val coroutineScope = rememberCoroutineScope()

    var smsPermissionGranted by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.RECEIVE_SMS
            ) == PackageManager.PERMISSION_GRANTED
        )
    }

    val permissionLauncher =
        rememberLauncherForActivityResult(
            contract = ActivityResultContracts.RequestPermission()
        ) { granted ->
            smsPermissionGranted = granted
        }

    Scaffold(
        modifier = Modifier.fillMaxSize()
    ) { innerPadding ->

        Column(
            modifier = Modifier
                .padding(innerPadding)
                .padding(16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {

            Text(
                text = "Family Finance – SMS Test",
                style = MaterialTheme.typography.headlineSmall
            )

            Text(
                text = "הסינון מתבצע מקומית. הודעות שאינן פיננסיות לא נשמרות ולא נשלחות."
            )

            Card(
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {

                    Text(
                        text = "SMS Connector",
                        style = MaterialTheme.typography.titleMedium
                    )

                    Text(
                        text = if (smsPermissionGranted) {
                            "Permission status: Enabled"
                        } else {
                            "Permission status: Disabled"
                        }
                    )

                    if (!smsPermissionGranted) {
                        Text(
                            text = "האפליקציה מבקשת גישה רק להודעות SMS חדשות כדי לזהות אירועים פיננסיים. היא אינה קוראת את היסטוריית ה-SMS."
                        )

                        Button(
                            onClick = {
                                permissionLauncher.launch(
                                    Manifest.permission.RECEIVE_SMS
                                )
                            },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Text("Enable SMS Connector")
                        }
                    }
                }
            }

            NotificationAccessCard()

            OutlinedTextField(
                value = sender,
                onValueChange = { sender = it },
                modifier = Modifier.fillMaxWidth(),
                label = {
                    Text("Sender")
                }
            )

            OutlinedTextField(
                value = smsText,
                onValueChange = { smsText = it },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(160.dp),
                label = {
                    Text("SMS text")
                }
            )

            Button(
                onClick = {
                    result = SmsEvidenceMapper.analyze(
                        body = smsText,
                        sender = sender.ifBlank { null }
                    )
                    // Update pending count after possible addition (though analyze doesn't queue yet, Receiver does)
                    // For manual test screen logic, analyze is pure.
                },
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Analyze SMS")
            }

            // Simple polling/refresh for the manual test screen
            Button(
                onClick = { pendingCount = FinancialEvidencePersistence.getQueue(context).size },
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Refresh Queue Count")
            }

            result?.let { analysis ->
                SmsAnalysisCard(analysis)
            }

            Spacer(modifier = Modifier.height(24.dp))

            Card(
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = "Local Sync Test",
                        style = MaterialTheme.typography.titleMedium
                    )

                    Text(
                        text = "יוזם סנכרון ידני של תור ה-SMS הממתינים לשרת המקומי."
                    )

                    Text(
                        text = "Pending in queue: $pendingCount",
                        style = MaterialTheme.typography.bodyLarge,
                        color = if (pendingCount > 0) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface
                    )

                    Button(
                        onClick = {
                            syncStatus = "Syncing..."
                            coroutineScope.launch {
                                val config = FinancialSyncConfig(
                                    backendUrl = BuildConfig.FAMILY_FINANCE_BACKEND_URL,
                                    connectorToken = BuildConfig.FAMILY_FINANCE_CONNECTOR_TOKEN
                                )
                                val client = FinancialEvidenceSyncClient(config)
                                val service = FinancialEvidenceSyncService(client)

                                val syncResult = withContext(Dispatchers.IO) {
                                    service.syncEvidenceQueue(context)
                                }

                                pendingCount = FinancialEvidencePersistence.getQueue(context).size

                                syncStatus = when {
                                    syncResult.pendingCount == 0 -> "Empty queue. Nothing to sync."
                                    syncResult.errorCount > 0 -> "Sync failed. Sent: ${syncResult.successCount}. Error: ${syncResult.errorCount}. Items retained."
                                    else -> "Sync completed. All ${syncResult.successCount} items sent."
                                }
                            }
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Text("SYNC PENDING EVIDENCE")
                    }

                    if (context.applicationInfo.flags and android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE != 0) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Button(
                            onClick = {
                                SmsPersistence.resetLocalState(context)
                                pendingCount = 0
                                syncStatus = "Local state RESET (Queue + Idempotency cleared)"
                            },
                            modifier = Modifier.fillMaxWidth(),
                            colors = androidx.compose.material3.ButtonDefaults.buttonColors(
                                containerColor = MaterialTheme.colorScheme.error
                            )
                        ) {
                            Text("RESET LOCAL STATE (DEBUG ONLY)")
                        }
                    }

                    if (syncStatus.isNotBlank()) {
                        Text(
                            text = syncStatus,
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.primary
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(24.dp))
        }
    }
}

@Composable
private fun SmsAnalysisCard(
    result: SmsAnalysisResult
) {
    Card(
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {

            Text(
                text = "Result",
                style = MaterialTheme.typography.titleMedium
            )

            Text(
                text = "Type: ${result.candidateType.displayName()}"
            )

            Text(
                text = "Reason: ${result.reason}"
            )

            Text(
                text = "Amount: ${result.normalizedData.amount ?: "—"}"
            )

            Text(
                text = "Currency: ${result.normalizedData.currency ?: "—"}"
            )

            Text(
                text = "Card last 4: ${result.normalizedData.cardLastFour ?: "—"}"
            )

            Text(
                text = "URLs: ${
                    if (result.normalizedData.urls.isEmpty()) {
                        "—"
                    } else {
                        result.normalizedData.urls.joinToString()
                    }
                }"
            )

            Text(
                text = "Evidence created: ${
                    if (result.evidence != null) "Yes" else "No"
                }"
            )

            Text(
                text = "Raw SMS stored in evidence: ${
                    if (result.evidence?.text != null) "Yes" else "No"
                }"
            )

            result.evidence?.let { evidence ->
                Text(
                    text = "Body hash: ${evidence.bodyHash.take(16)}..."
                )
            }
        }
    }
}

private fun SmsCandidateType.displayName(): String {
    return when (this) {
        SmsCandidateType.TRANSACTION -> "TRANSACTION"
        SmsCandidateType.RECEIPT_LINK -> "RECEIPT_LINK"
        SmsCandidateType.AMBIGUOUS -> "AMBIGUOUS"
        SmsCandidateType.NOISE -> "NOISE"
    }
}
