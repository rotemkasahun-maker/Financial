package com.familyfinance.app.notification

import java.security.MessageDigest

object NotificationEvidenceId {
    fun sha256(value: String): String =
        MessageDigest.getInstance("SHA-256")
            .digest(value.toByteArray(Charsets.UTF_8))
            .joinToString("") { "%02x".format(it) }

    fun create(
        sourcePackage: String,
        notificationKey: String?,
        originalTimestamp: Long,
        contentHash: String
    ): String {
        return sha256(
            listOf(
                sourcePackage,
                notificationKey.orEmpty(),
                originalTimestamp.toString(),
                contentHash
            ).joinToString("\u001F")
        )
    }
}
