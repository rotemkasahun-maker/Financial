package com.familyfinance.app.auth

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.nio.charset.StandardCharsets
import java.security.KeyStore
import java.util.UUID
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

data class DeviceAuth(val deviceId: String, val secret: String)

class DeviceAuthStore(private val context: Context) {
    private val prefs = context.getSharedPreferences("device_auth", Context.MODE_PRIVATE)
    private val alias = "family-finance-device-auth"

    fun read(): DeviceAuth? {
        val deviceId = prefs.getString("device_id", null) ?: return null
        val encoded = prefs.getString("secret", null) ?: return null
        return runCatching { DeviceAuth(deviceId, decrypt(encoded)) }.getOrNull()
    }

    fun save(auth: DeviceAuth) {
        prefs.edit().putString("device_id", auth.deviceId).putString("secret", encrypt(auth.secret)).apply()
    }

    fun newDeviceId(): String = prefs.getString("device_id", null) ?: UUID.randomUUID().toString().also { prefs.edit().putString("device_id", it).apply() }

    private fun key(): SecretKey {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (store.getKey(alias, null) as? SecretKey)?.let { return it }
        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").apply {
            init(KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build())
        }.generateKey()
    }

    private fun encrypt(value: String): String { val cipher = Cipher.getInstance("AES/GCM/NoPadding"); cipher.init(Cipher.ENCRYPT_MODE, key()); return Base64.encodeToString(cipher.iv + cipher.doFinal(value.toByteArray(StandardCharsets.UTF_8)), Base64.NO_WRAP) }
    private fun decrypt(value: String): String { val bytes = Base64.decode(value, Base64.NO_WRAP); val cipher = Cipher.getInstance("AES/GCM/NoPadding"); cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, bytes.copyOfRange(0, 12))); return String(cipher.doFinal(bytes.copyOfRange(12, bytes.size)), StandardCharsets.UTF_8) }
}
