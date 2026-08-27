# Shared-truth Android reminders with stable-key dedupe

- **Validation:** DEVICE E2E — foreground/shared-state only; natural background not verified
- **USER-STATED NEED:** Reminders reflect current household Attention, avoid repeats and disappear after completion.
- **DESIGN INFERENCE:** Fetch shared truth, derive stable eligible-set key, notify once, cancel empty, route to Web Attention.
- **IMPLEMENTED:** Maintenance client/notifier, unique WorkManager, fresh session, retry, key state and Attention route.
- **VERIFIED:** Physical foreground fetch/dedupe, permission UX and periodic registration; not background proof.
- **Evidence:** continuity §§9,11–23; current maintenance sources/tests; `.local/device-e2e/ff-after-sync.xml`, notifications and phase-A XML are non-public.
- **Failure/learning:** Stale cache and foreground-as-background rejected; forced jobs platform-limited; stale APK tap targeted backend.
- **Open:** Natural background/dedupe, fresh tap, zero-task suppression.

