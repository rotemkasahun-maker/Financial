# Receipt-expectation grace window

- **Validation:** SYNTHETIC TEST
- **USER-STATED NEED:** Allow cross-source receipt matching time, then remind near the point of purchase—targeting approximately 1–2 minutes after a real Android transaction signal when execution conditions allow—while suppressing the reminder when authoritative shared state says a receipt is present or truth remains unknown.
- **DESIGN INFERENCE:** Use an event-triggered delayed one-time authoritative check for the near-real-time experience. Keep the 12-hour periodic worker for slow maintenance only; do not use minute polling, FCM, exact alarms, a second native finance UI or fabricated parallel receipt state.
- **IMPLEMENTED:** PARTIAL. Historical local/mock missing-receipt task generation still has a configurable 24-hour default, while shared-backend maintenance task generation still lacks that age check. The newer backend now persists server-derived household scope and durable transaction resolution for authenticated evidence ingestion and exposes authoritative evidence/receipt status. The delayed Android check, point-of-purchase reminder, reminder dedupe and transaction-specific tap flow are not implemented.
- **VERIFIED:** Historical module/service tests cover six-hour suppression, roughly 48-hour creation and task dedupe. New focused service/HTTP integration tests cover authoritative `resolved`, `pending` and `not_found` outcomes; receipt `present`, `absent` and `unknown`; duplicate consistency; authentication; and household isolation. No near-real-time Android reminder or physical-device use of the new contract is verified.

## Timing history

1. **Approximately 60 seconds:** preserved as an earlier DESIGN DECISION ONLY proposal from UX archive history. Repository evidence does not show that it was ever implemented.
2. **24 hours from 2026-08-14:** introduced directly in commit `84cbcb6` with the task engine and notification-rule fixture; no earlier repository version of this task engine exists.
3. **Shared backend divergence from 2026-08-22:** commit `65d8908` introduced backend missing-receipt task creation without the 24-hour check; the current backend still lacks it.
4. **Later Daily-use Alpha requirement:** the user explicitly selected an approximately 1–2-minute point-of-purchase target for real Android transaction signals. This is a separate near-real-time event prompt, not the slow missing-receipt maintenance task.
5. **Authoritative-state prerequisite:** implemented and synthetically verified in the current mixed working tree. The prior blocker—no trustworthy transaction/household/receipt resolution boundary—is CLOSED. The Android reminder vertical slice remains open.

The repository contains rationale for having a configurable waiting window—`GAMIFICATION.md` says automatic Gmail/SMS/digital/upload matching should have its configured window before task creation—but contains no recorded reasoning for choosing 24 hours instead of approximately 60 seconds or another duration.

## Exact evidence

- `src/services/taskEngine.js:7-13` — default `waitingPeriodHours=24` and `ageHours < waitingPeriodHours` suppression.
- `src/data/gamificationMockData.js:34` — 24-hour waiting and first-reminder values.
- `GAMIFICATION.md:19-21` — configured matching-window lifecycle and intent.
- `tests/taskEngine.test.js:4-5` — creation after 48 hours and repeat-task dedupe; it passes 24 explicitly in the first test and relies on the 24-hour default in the second.
- `tests/missingReceiptSlice.test.js:8-9` — service scan creates an eligible old task, deduplicates repeated scans, and suppresses a transaction about six hours old along with receipt-present/non-expense cases.
- Commit `84cbcb6` (`Add tasks rewards and smart reminders`) — first repository introduction of both the task engine and the 24-hour values.
- Commit `bc2362f` (`Surface missing receipts in Attention`) — wires the local/mock service scan into engagement/Attention and adds waiting-period coverage.
- `backend/financeDataService.ts:92-95`; commit `65d8908` — shared-backend task generation without an age/grace condition.
- `backend/financeIngestionService.ts` — durable evidence-to-transaction result and authoritative status resolution.
- `backend/financeDataService.ts` — household-scoped transaction receipt state.
- `backend/server.ts` — authenticated `GET /api/finance/evidence-status/:externalSourceId` and server-derived ingestion scope.
- `tests/financeIngestionService.test.js`, `tests/ingestion.test.js` — authoritative status, receipt truth, authentication, duplicate consistency and household-isolation coverage in the current mixed working tree.

## Rejected approaches, gaps, and open questions

- Immediate maintenance-task creation conflicts with the historical matching-window intent, but remains in the shared backend. It must not be confused with the newer near-real-time event prompt.
- The approximately 60-second value cannot be classified as an implemented earlier state from available repository evidence; it is either an earlier proposal that never reached this repository or an outdated archive statement.
- There is no REAL HOUSEHOLD USE evidence for grace-period timing itself.
- The repository contains no rationale for the historical 24-hour value. The later approximately 1–2-minute Alpha target is user-stated, but Android cannot guarantee exact-second delivery.
- Authoritative state is implemented and synthetically verified; the delayed Android worker, reminder, dedupe, transaction-specific tap flow and device behavior remain unimplemented/unverified.
- No authentic historical BEFORE screenshot exists, and none should be reconstructed.
