package com.familyfinance.app

import android.app.Application
import com.familyfinance.app.maintenance.MaintenanceWorkScheduler

class FamilyFinanceApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        MaintenanceWorkScheduler.schedule(this)
    }
}
