# Receipt-expectation grace window

- **Validation:** SYNTHETIC TEST
- **USER-STATED NEED:** Allow cross-source receipt matching time before surfacing a transaction as missing a receipt.
- **DESIGN INFERENCE:** Earlier UX archive history proposed an approximately 60-second matching/grace window. No repository implementation, test, commit, or handoff found in this audit establishes that value.
- **IMPLEMENTED:** Commit `84cbcb6` introduced `ensureMissingReceiptTask` with a configurable `waitingPeriodHours` parameter defaulting to 24. The same commit added a missing-receipt notification rule with `waitingPeriodHours: 24` and `firstReminderAfterHours: 24`. This value remains in the current local/mock task path. The later shared backend path in `backend/financeDataService.ts` does **not** apply an age/grace check and can create a missing-receipt task immediately; therefore 24 hours is not established as consistent current Alpha behavior across architectures.
- **VERIFIED:** Module/service tests synthetically verify suppression for a transaction approximately six hours old, task creation for transactions approximately 48 hours old, and deduplication on repeated scans. They do not test the exact 24-hour boundary, do not validate why 24 hours is appropriate, and do not verify that the shared backend honors the window.

## Timing history

1. **Approximately 60 seconds:** preserved as an earlier DESIGN DECISION ONLY proposal from UX archive history. Repository evidence does not show that it was ever implemented.
2. **24 hours from 2026-08-14:** introduced directly in commit `84cbcb6` with the task engine and notification-rule fixture; no earlier repository version of this task engine exists.
3. **Shared backend divergence from 2026-08-22:** commit `65d8908` introduced backend missing-receipt task creation without the 24-hour check; the current backend still lacks it.

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

## Rejected approaches, gaps, and open questions

- Immediate task creation conflicts with the documented matching-window intent, but it remains present in the shared backend; this archive record does not claim that the product currently enforces 24 hours everywhere.
- The approximately 60-second value cannot be classified as an implemented earlier state from available repository evidence; it is either an earlier proposal that never reached this repository or an outdated archive statement.
- There is no REAL HOUSEHOLD USE evidence for grace-period timing itself.
- The appropriate duration, the reason for selecting 24 hours, the exact boundary behavior, and reconciliation of the local/mock and shared-backend paths remain unresolved.
- No authentic historical BEFORE screenshot exists, and none should be reconstructed.
