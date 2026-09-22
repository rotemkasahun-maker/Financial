# Codex UX Decision Intake Packet

## Intake metadata

- **Date:** 2026-08-28
- **Commit / working-tree context:** `main`; mixed working tree based on last-observed `b6051a424b1c96e4b717676b2d956b790b1516ae`; not committed
- **Repository task/context:** Investigate why a real Discount transfer-related SMS delivered to the Android receiver did not become financial evidence.
- **Proposed merge target:** `privacy-preserving-financial-evidence-pipeline` (with possible cross-reference to `truthful-household-financial-semantics`)
- **Packet type:** `VALIDATION_UPDATE`

## Finding

- **What changed:** Private device inspection established that the observed SMS was a short-lived authorization/security-code message for performing a requested transfer, not confirmation that a transfer completed. The OTP-first rejection is now represented by an explicit privacy-safe `SECURITY_CODE` diagnostic. A separate sanitized completed-transfer form remains eligible as financial evidence and is normalized as `bank_transfer`.
- **Why it matters at UX/Product Architecture level:** A message mentioning a financial action is not necessarily evidence that the action occurred. Treating an authorization challenge as a transaction would create a false household event and could trigger incorrect downstream work. The collector should deliberately do nothing financially consequential for security codes while retaining completed-transfer signals.
- **USER-STATED NEED:** KNOWN — real transfer evidence should be ingested, classified as receipt-not-expected, and should not produce a receipt reminder; private household message content must not be exposed.
- **DESIGN INFERENCE:** Separate intent/authentication messages from durable outcome evidence. Financial wording alone is insufficient when the message's function is security authorization.
- **IMPLEMENTED status:** IMPLEMENTED — explicit decision codes and privacy-safe receiver diagnostics; completed-transfer normalization to `bank_transfer`; security-code rejection retained.
- **VERIFIED status:** A real household SMS was delivered to `SmsReceiver`; private local visual inspection established its authorization-code structure. Synthetic Android tests verify `SECURITY_CODE` rejection, completed-transfer acceptance/stable identity, `bank_transfer` normalization, receipt expectation `NOT_EXPECTED`, no grace work, and promotional-noise rejection.
- **Strongest truthful validation level:** REAL HOUSEHOLD USE — narrowly limited to recognizing that this one observed Discount authorization-code format is not transaction evidence. Completed-transfer ingestion remains SYNTHETIC TEST only.

## Evidence

- **Exact code/history paths:** `android/KasahunFamilyFinance/app/src/main/java/com/familyfinance/app/sms/SmsCandidateDetector.kt`; `SmsEvidenceMapper.kt`; `SmsNormalizer.kt`; `SmsReceiver.kt`; `SmsPersistence.kt`; `app/src/test/java/com/familyfinance/app/sms/SmsEvidenceMapperTest.kt`; `app/src/test/java/com/familyfinance/app/receipt/ReceiptReminderFlowTest.kt`.
- **Tests and results:** `:app:testDebugUnitTest :app:assembleDebug` — PASS, 23 JVM tests; APK assembled. The first diagnostic run exposed the missing definite-article phrase `קוד האימות`; the narrow phrase was added and the full suite then passed.
- **Commit(s):** NONE — uncommitted mixed working tree.
- **Screenshots/browser/device artifacts:** Private device screenshots were inspected locally and deleted immediately; Android broadcast history recorded delivery at 2026-08-28 11:49:35 +03:00. No public screenshot retained.
- **Handoff/reference sections:** Live Discount SMS investigation in the continuing Alpha thread on 2026-08-28.
- **Evidence safety:** MIXED — code and sanitized fixtures are public-safe; original SMS/code, device screenshots, and household details are private and not retained.
- **Duplicate aliases:** NONE

## Interpretation

- **Rejected or failed approach:** Accepting the observed SMS merely because it mentions a transfer. That would turn an authorization request into a fabricated completed transaction.
- **Limitations and unverified claims:** This does not validate all Discount formats, any completed Discount transfer notification, other banks, production backend ingestion, or the complete 60-second reminder slice. No new real SMS was generated solely for testing.
- **Conflict with current canonical record:** NONE. This adds a narrow real-household edge case and sharper validation detail to the existing privacy/truthfulness decisions.
- **Missing historical evidence:** The original SMS is intentionally not retained as repository evidence; only its sanitized structural meaning is recorded.
- **Open questions for semantic merge review:** Whether this belongs solely under the private evidence pipeline or should also be cited by truthful financial semantics as real-household evidence for abstaining when a signal represents authorization rather than outcome.

## Queue status

- **Status:** QUEUED — NOT CANONICAL
- **Suggested merge-rule outcome:** VALIDATION_UPDATE
