package com.familyfinance.app.receipt

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.familyfinance.app.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL

class ReceiptResponseWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result = withContext(Dispatchers.IO) { runCatching { val id = inputData.getString("externalSourceId") ?: return@runCatching false; val response = inputData.getString("response") ?: return@runCatching false; val auth = URL("${BuildConfig.FAMILY_FINANCE_BACKEND_URL}/api/auth/session").openConnection() as HttpURLConnection; auth.requestMethod="POST"; auth.doOutput=true; auth.setRequestProperty("Content-Type","application/json"); OutputStreamWriter(auth.outputStream).use { it.write(JSONObject().put("userId",BuildConfig.FAMILY_FINANCE_HOUSEHOLD_USER).put("credential",BuildConfig.FAMILY_FINANCE_HOUSEHOLD_CREDENTIAL).toString()) }; if(auth.responseCode !in 200..299)return@runCatching false; val token=JSONObject(auth.inputStream.bufferedReader().readText()).getString("session"); auth.disconnect(); val c=URL("${BuildConfig.FAMILY_FINANCE_BACKEND_URL}/api/finance/receipt-response").openConnection() as HttpURLConnection; c.requestMethod="POST"; c.doOutput=true; c.setRequestProperty("Content-Type","application/json"); c.setRequestProperty("Authorization","Bearer $token"); OutputStreamWriter(c.outputStream).use { it.write(JSONObject().put("externalSourceId",id).put("response",response).toString()) }; val ok=c.responseCode in 200..299; c.disconnect(); ok }.fold({if(it)Result.success() else Result.retry()},{Result.retry()}) }
}
