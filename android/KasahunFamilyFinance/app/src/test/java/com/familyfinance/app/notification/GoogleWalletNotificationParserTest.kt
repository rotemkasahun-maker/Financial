package com.familyfinance.app.notification

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertNull
import org.junit.Test

class GoogleWalletNotificationParserTest {
    @Test
    fun parsesIlsWalletPurchase() {
        val result = GoogleWalletNotificationParser.parse(
            GoogleWalletNotificationParser.GOOGLE_WALLET_PACKAGE,
            "wallet-key-1",
            1_777_000_000_000,
            "RAMI LEVY",
            "₪117.40 with Family Card\nView your purchase"
        )!!
        assertEquals(117.40, result.amount, 0.001)
        assertEquals("ILS", result.currency)
        assertEquals("RAMI LEVY", result.merchant)
        assertEquals("Family Card", result.paymentMethodLabel)
    }

    @Test
    fun stableIdForSameNotification() {
        fun parse() = GoogleWalletNotificationParser.parse(
            GoogleWalletNotificationParser.GOOGLE_WALLET_PACKAGE,
            "same-key",
            1_777_000_000_000,
            "SHOP",
            "₪25.90 with Family Card"
        )!!
        assertEquals(parse().externalSourceId, parse().externalSourceId)
    }

    @Test
    fun differentTimestampChangesId() {
        val a = GoogleWalletNotificationParser.parse(
            GoogleWalletNotificationParser.GOOGLE_WALLET_PACKAGE, "key", 1000,
            "SHOP", "₪25.90 with Family Card"
        )!!
        val b = GoogleWalletNotificationParser.parse(
            GoogleWalletNotificationParser.GOOGLE_WALLET_PACKAGE, "key", 2000,
            "SHOP", "₪25.90 with Family Card"
        )!!
        assertNotEquals(a.externalSourceId, b.externalSourceId)
    }

    @Test
    fun unrelatedPackageIgnored() {
        assertNull(
            GoogleWalletNotificationParser.parse(
                "com.example.social", "x", 123, "Hello", "₪50.00"
            )
        )
    }
}
