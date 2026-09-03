package com.familyfinance.app.sms

data class FinancialSyncConfig(
    val backendUrl: String,
    val connectorToken: String,
    val householdUser: String = "",
    val householdCredential: String = ""
)
