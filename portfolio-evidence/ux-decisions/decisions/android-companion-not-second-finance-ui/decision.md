# Android companion rather than second finance UI

- **Validation:** DEVICE E2E
- **USER-STATED NEED:** Phone-native evidence/reminders with one coherent finance product.
- **DESIGN INFERENCE:** Web is full UI; Android is private collector/companion, not parallel ledger.
- **IMPLEMENTED:** SMS/notification capture, queue/sync, diagnostics and maintenance routing.
- **VERIFIED:** Android builds/tests and emulator/physical flows show companion capabilities; diagnostic harness is not full UI evidence.
- **Evidence:** `ANDROID_CONTRACT.md`, handoff architecture, Android sources/reports, commits `7c0e93f`, `b5bd13c`, `815f74d`; device XML non-public.
- **Rejected/learning:** Native rewrite, WebView/TWA, FCM, auth redesign for Alpha.
- **Open:** Post-Alpha native scope; polished companion capture absent.

