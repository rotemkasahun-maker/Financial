package com.familyfinance.app

import android.app.Application
import com.familyfinance.app.maintenance.MaintenanceWorkScheduler
import com.familyfinance.app.evidence.EvidenceSyncWorkScheduler

class FamilyFinanceApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        MaintenanceWorkScheduler.schedule(this)
        EvidenceSyncWorkScheduler.schedulePending(this)
    }
}
