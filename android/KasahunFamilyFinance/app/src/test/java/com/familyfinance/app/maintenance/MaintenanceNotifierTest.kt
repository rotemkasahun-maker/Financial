package com.familyfinance.app.maintenance

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class MaintenanceNotifierTest {
    @Test
    fun `reposts once when an existing key has no recorded route`() {
        assertTrue(MaintenanceNotifier.shouldNotify("task-1", null, "task-1", "https://web/?page=attention"))
    }

    @Test
    fun `suppresses an unchanged key delivered to the current route`() {
        assertFalse(
            MaintenanceNotifier.shouldNotify(
                "task-1",
                "https://web/?page=attention",
                "task-1",
                "https://web/?page=attention"
            )
        )
    }

    @Test
    fun `reposts when the notification destination changes`() {
        assertTrue(
            MaintenanceNotifier.shouldNotify(
                "task-1",
                "http://backend/",
                "task-1",
                "https://web/?page=attention"
            )
        )
    }
}
