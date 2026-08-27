# Privacy-preserving SMS/financial-notification evidence pipeline

- **Validation:** DEVICE E2E
- **USER-STATED NEED:** Capture signals without raw sensitive text, data loss or duplicates.
- **DESIGN INFERENCE:** Normalize locally, retain structured evidence on failure, stable-ID dedupe and stage ambiguity.
- **IMPLEMENTED:** SMS/notification listeners/parsers, shared persistent queue, migration and sync/staging contract.
- **VERIFIED:** Emulator/physical SMS plus tests verify capture, privacy, retention, dedupe and staging. Wallet parser tests are not a natural Wallet event.
- **Evidence:** both Android E2E reports, Android sources/tests; commits `7c0e93f`, `b5bd13c`, `9c35c14`, `815f74d`; device state non-public.
- **Failure/learning:** Initial backend 500 retained evidence correctly; raw storage/delete-on-failure rejected.
- **Open:** Natural post-listener Wallet event platform-blocked.

