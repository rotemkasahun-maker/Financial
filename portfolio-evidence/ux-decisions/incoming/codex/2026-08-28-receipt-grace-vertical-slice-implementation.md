# Codex UX Decision Intake Packet

## Intake metadata

- **Date:** 2026-08-28
- **Commit / working-tree context:** Work began from `main` at archive commit `a04b3d8`; current HEAD advanced independently to `6a9e7ed` with an unrelated Portfolio UI intake packet while this task was running. The product implementation remains uncommitted in the preserved mixed tree.
- **Repository task/context:** Daily-use Alpha implementation of the event-triggered approximately 60-second missing-receipt reminder.
- **Proposed merge target:** `receipt-expectation-grace-window`
- **Packet type:** `DECISION_CHANGE`

## Finding

- **What changed:** The Android vertical slice is now implemented in source. Newly queued SMS/financial-notification evidence receives unique immediate one-time sync work. After successful household-scoped ingestion, only evidence classified `EXPECTED_NOW` receives separate unique one-time grace work, delayed relative to the original signal timestamp. The worker queries authoritative shared status and posts once only for `resolved + absent`; `present`, `pending`, `not_found`, and `unknown` suppress the reminder. Tap routes through authenticated Web bootstrap into the existing receipt capture with the durable transaction ID.
- **Why it matters at UX/Product Architecture level:** The reminder can reach the user near the purchase without minute polling or confusing slow maintenance work, while deliberately doing nothing when a receipt may arrive digitally, is not expected, is already present, or shared truth is unresolved.
- **USER-STATED NEED:** KNOWN — remind near the purchase after a short cross-source grace period, only when a consumer receipt is expected and authoritative shared truth still says it is absent.
- **DESIGN INFERENCE:** Conservative classification defaults unknown merchant situations away from an immediate physical-receipt prompt. Stable unique work names and persisted notified evidence IDs prevent duplicate work/reminders without creating local receipt truth.
- **IMPLEMENTED status:** IMPLEMENTED in the current uncommitted source.
- **VERIFIED status:** Android JVM tests, backend HTTP integration tests, Web deep-link source regression, full Web tests, build validation, and debug APK assembly pass. No emulator or physical-device execution of the new slice occurred because no authorized device/emulator was connected.
- **Strongest truthful validation level:** SYNTHETIC TEST

## Evidence

- **Exact code/history paths:** `android/KasahunFamilyFinance/app/src/main/java/com/familyfinance/app/evidence/EvidenceSyncWorkScheduler.kt`; `evidence/FinancialEvidenceSyncWorker.kt`; `receipt/ReceiptExpectationClassifier.kt`; `receipt/ReceiptReminderScheduler.kt`; `receipt/ReceiptStatusClient.kt`; `receipt/ReceiptReminderWorker.kt`; `receipt/ReceiptReminderNotifier.kt`; `sms/FinancialEvidenceSyncClient.kt`; `sms/FinancialEvidenceSyncService.kt`; `sms/SmsReceiver.kt`; `notification/FinancialNotificationListenerService.kt`; `src/app.js`; `tests/receiptReminderDeepLink.test.js`; `tests/androidReceiptReminderArchitecture.test.js`; Android `ReceiptReminderFlowTest.kt`.
- **Tests and results:** Android JVM PASS: 19/19, including 5 receipt-flow tests; debug APK assembly PASS. Focused Node/backend PASS: 16/16. Full Web/backend PASS: 237/237. Web build PASS: 31 core files, RTL, 12 screens, four primary destinations.
- **Commit(s):** NONE for this implementation; changes are uncommitted by instruction.
- **Screenshots/browser/device artifacts:** NONE for the new vertical slice. ADB reported no connected device.
- **Handoff/reference sections:** Full continuity handoff §§9,20,23,28-30; current user-defined exact Alpha task.
- **Evidence safety:** PUBLIC-SAFE for source/tests; local provisioning and any future device/backend artifacts remain private.
- **Duplicate aliases:** NONE

## Interpretation

- **Rejected or failed approach:** The 12-hour periodic worker, minute polling, exact alarms, fabricated local receipt state, and treating unresolved authoritative states as absent remain rejected. Scheduling before successful ingestion was also rejected because it could observe truthful `not_found` before the evidence reached shared state and then miss the reminder.
- **Limitations and unverified claims:** WorkManager timing is best effort, not exact-second delivery. Physical notification posting, authoritative network fetch after real device delay, duplicate suppression on-device, and tap-to-capture behavior remain unverified on emulator/physical hardware.
- **Conflict with current canonical record:** The canonical record says the Android grace worker, reminder, dedupe, and transaction-specific tap flow are unimplemented. Source implementation and synthetic validation now materially supersede that status, but DEVICE E2E validation must not be claimed.
- **Missing historical evidence:** No authentic historical BEFORE or device capture exists for this new slice.
- **Open questions for semantic merge review:** Update implementation status while retaining SYNTHETIC TEST validation until an actual emulator/physical-device end-to-end run is observed.

## Queue status

- **Status:** QUEUED — NOT CANONICAL
- **Suggested merge-rule outcome:** MERGE_INTO_EXISTING
