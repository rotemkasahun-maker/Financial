# Codex UX Decision Intake Packet

## Intake metadata

- **Date:** 2026-08-27
- **Commit / working-tree context:** `main` at `e0ee1f3`; mixed Alpha working tree preserved; authoritative-state contract implemented and tested in the uncommitted working tree.
- **Repository task/context:** Daily-use Alpha continuation; audit and minimum implementation of authoritative receipt state for existing Android SMS/financial-notification ingestion.
- **Proposed merge target:** `receipt-expectation-grace-window`
- **Packet type:** `DECISION_CHANGE`

## Finding

- **What changed:** The user explicitly made near-real-time, event-driven missing-receipt prompting a Daily-use Alpha acceptance requirement, targeting roughly 1–2 minutes after a real transaction signal when Android execution conditions allow. The backend now persists the durable transaction result and server-derived household scope for newly authenticated evidence ingestion, and exposes authenticated authoritative status as `resolved`, `pending`, or `not_found` with receipt state `present`, `absent`, or `unknown`. The existing 12-hour periodic maintenance worker remains reserved for slow maintenance reminders and is explicitly rejected as the trigger for this flow.
- **Why it matters at UX/Product Architecture level:** The grace window is no longer merely an unresolved earlier proposal versus a 24-hour fixture. The required experience is now point-of-purchase prompting after a short evidence-arrival window, using the existing Android collector and shared receipt truth without minute polling, FCM, exact alarms, or a second native finance UI.
- **USER-STATED NEED:** KNOWN — remind the user about a missing receipt while still at or near the purchase, after a short grace period, suppressing the reminder when evidence is already linked and avoiding duplicates.
- **DESIGN INFERENCE:** Use an event-triggered delayed one-time check from the existing collector while retaining the periodic worker for slow maintenance. The delayed check must consult authoritative receipt/link state rather than inventing a parallel local receipt state.
- **IMPLEMENTED status:** PARTIALLY IMPLEMENTED — the authoritative backend resolution contract is implemented; the delayed Android check and reminder are not.
- **VERIFIED status:** The backend contract is covered by focused service and HTTP integration tests for known ingestion, linked and absent receipt states, pending/unknown truth, duplicate consistency, authentication, and household isolation. No physical-device use of this new contract has occurred.
- **Strongest truthful validation level:** SYNTHETIC TEST

## Evidence

- **Exact code/history paths:** `android/KasahunFamilyFinance/app/src/main/java/com/familyfinance/app/sms/SmsReceiver.kt`; `notification/FinancialNotificationListenerService.kt`; `evidence/FinancialEvidence.kt`; `evidence/FinancialEvidencePersistence.kt`; `sms/FinancialEvidenceSyncClient.kt`; `sms/FinancialEvidenceSyncService.kt`; `backend/financeIngestionService.ts` (`processEvidence`, `getEvidenceReceiptStatus`); `backend/financeDataService.ts` (`getTransactionReceiptState`); `backend/server.ts` (`GET /api/finance/evidence-status/:externalSourceId` and scoped ingestion); `tests/financeIngestionService.test.js`; `tests/ingestion.test.js`; `src/app.js` (`openReceiptForTransaction`).
- **Tests and results:** Focused backend suite PASS: 26/26 (`financeIngestionService`, `ingestion`, `financeDataService`, `auth`, `sharedFinance`). Full repository suite PASS: 234/234. Web build validation PASS: 31 core files, RTL, 12 screens, four primary destinations. No near-real-time Android reminder test exists and no device behavior is claimed verified.
- **Commit(s):** No implementation commit for this requirement. Historical grace-window commits remain `84cbcb6`, `bc2362f`, and shared-backend divergence `65d8908` as recorded canonically.
- **Screenshots/browser/device artifacts:** NONE for the new capability.
- **Handoff/reference sections:** Full continuity handoff §§2, 20, 23, 28–30 establishes the companion/maintenance boundaries; the new user scope update supersedes the prior classification of this timing requirement as unresolved/postponed.
- **Evidence safety:** MIXED — repository code paths and commit identifiers are public-safe; the attached user request under the local Codex attachments directory is private/non-public and should not be published verbatim without review.
- **Duplicate aliases:** NONE

## Interpretation

- **Rejected or failed approach:** Using the 12-hour periodic worker, minute polling, FCM, exact-alarm permission, a new native finance UI, or fabricated local receipt state were explicitly rejected. The initial API audit proved the old processed-evidence record did not retain a transaction mapping or household scope, so treating ingestion success as receipt absence was rejected.
- **Limitations and unverified claims:** The delayed Android worker, reminder, reminder dedupe, and transaction-specific tap flow remain unimplemented and unverified. Existing legacy ingestion records without server-derived household scope deliberately resolve as `not_found`/`unknown`, never as receipt absent. Android cannot guarantee exact-second delivery.
- **Conflict with current canonical record:** The canonical record says the approximately 60-second value is an earlier unimplemented proposal and leaves the appropriate duration unresolved. The user has now explicitly selected roughly 1–2 minutes as the Alpha target and made it required. The authoritative backend prerequisite is now implemented and synthetically verified, but the reminder behavior remains absent. The canonical record also documents inconsistent 24-hour/immediate task behavior; this new event-driven reminder must not be conflated with those slow task-generation paths.
- **Missing historical evidence:** No authentic historical implementation, test, or BEFORE capture exists for the earlier ~60-second proposal; do not reconstruct one.
- **Open questions for semantic merge review:** Whether the canonical record should distinguish the new point-of-purchase event reminder from slower missing-receipt task creation; whether the synthetically verified authoritative contract should be merged now or alongside later physical-device validation of the complete vertical slice.

## Queue status

- **Status:** QUEUED — NOT CANONICAL
- **Suggested merge-rule outcome:** MERGE_INTO_EXISTING
