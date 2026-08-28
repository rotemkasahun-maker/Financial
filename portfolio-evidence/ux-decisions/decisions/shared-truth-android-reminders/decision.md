# Shared-truth Android reminders with stable-key dedupe

- **Validation:** DEVICE E2E (partial) — Phase A tap routing passed; Phase B/C remain open
- **USER-STATED NEED:** Reminders reflect current household Attention, avoid repeats and disappear after completion.
- **DESIGN INFERENCE:** Fetch shared truth, derive stable eligible-set key, notify once, cancel empty, route to Web Attention.
- **IMPLEMENTED:** Maintenance client/notifier, unique WorkManager, fresh session, retry, stable-key state and authenticated Web Attention route.
- **VERIFIED:** Physical foreground fetch/dedupe, permission UX and periodic registration were observed. **Phase A PASS:** a fresh current-APK notification opened the correct Web `page=attention` route, preserved it through household authentication, and rendered authenticated Attention. The foreground/manual refresh used to generate that notification is not background WorkManager evidence.
- **Evidence:** continuity §§9,11–23; current maintenance sources/tests; queued Phase A evidence packet. `.local/device-e2e/ff-after-sync.xml`, `ff-phase-a-*.xml`, device/browser state and LAN/auth details are private/non-public and are referenced only, not archived.
- **Failure/learning:** Stale cache and foreground-as-background claims were rejected; forced jobs were platform-limited; the old stale APK tap targeted the backend. Fresh current-APK tap routing is now CLOSED by Phase A device evidence.
- **Open:** **Phase B:** natural background WorkManager execution and background dedupe. **Phase C:** zero-task cancellation/suppression after completion. Google Wallet remains separately platform-blocked.
