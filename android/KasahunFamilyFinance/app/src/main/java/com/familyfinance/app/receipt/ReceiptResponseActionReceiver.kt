package com.familyfinance.app.receipt

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.work.Constraints
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import com.familyfinance.app.evidence.EventTraceRecorder

class ReceiptResponseActionReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        val id = intent.getStringExtra("externalSourceId") ?: return
        val response = intent.getStringExtra("response") ?: return
        ReceiptResponseStore.put(context, id, response)
        EventTraceRecorder.record(context, id, "notification", if (response == "DIGITAL_AWAITING_DOCUMENT") "receipt_action_digital" else "receipt_action_no_receipt", "accepted")
        WorkManager.getInstance(context).enqueueUniqueWork("receipt-response-$id", ExistingWorkPolicy.REPLACE, OneTimeWorkRequestBuilder<ReceiptResponseWorker>().setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()).setInputData(androidx.work.Data.Builder().putString("externalSourceId", id).putString("response", response).build()).build())
    }
}
