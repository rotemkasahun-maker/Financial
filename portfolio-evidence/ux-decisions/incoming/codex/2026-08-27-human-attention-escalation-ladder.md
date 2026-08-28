# Codex UX Decision Intake Packet

## Intake metadata

- **Date:** 2026-08-27
- **Commit / working-tree context:** `main`; behavioral UX backfill against current archive and repository history. No product implementation was changed by this audit.
- **Repository task/context:** Cross-cutting audit of when automation should act, abstain, or ask a person.
- **Proposed merge target:** UNCERTAIN — overlaps `exception-first-mobile-financial-file-import`, `learned-rules-before-weaker-heuristics`, `automated-gmail-receipt-processing`, and `receipt-review-link-before-create`, but the cross-product attention policy is not named canonically.
- **Packet type:** `NEW_DECISION_CANDIDATE`

## Finding

- **What changed:** The archive under-describes a consistent product policy: spend human attention only after cheaper, trustworthy resolution paths are exhausted. The system escalates from metadata and deterministic/saved rules through cross-source reconciliation and parsing/AI, and asks a person only for unresolved uncertainty.
- **Why it matters at UX/Product Architecture level:** Financial administration is easy to postpone when every import or receipt becomes a review chore. Removing already-known rows and questions lowers cognitive load while preserving human control where meaning is genuinely uncertain.
- **USER-STATED NEED:** KNOWN — project working rules explicitly require automation-first, exception-first UX, minimum user work, and user decisions as the last resort.
- **DESIGN INFERENCE:** Because repeated confirmation creates avoidable attention cost and distrust in automation, known high-confidence facts should disappear from the decision queue while medium, conflicting, incomplete, or integrity-critical cases remain visible.
- **IMPLEMENTED status:** PARTIALLY IMPLEMENTED — the policy appears across import review, learned rules, receipt/Gmail processing, reconciliation, and historical bootstrap; it is not represented as one formal shared orchestration layer.
- **VERIFIED status:** Synthetic tests verify high-confidence auto-resolution, exception-only import rendering, manual override retention, and review for uncertain/critical cases. No longitudinal household-effort study exists.
- **Strongest truthful validation level:** SYNTHETIC TEST

## Evidence

- **Exact code/history paths:** `CODEX_WORKING_RULES.md:12-18,27-35`; `src/services/fileImport.js:80-98`; `src/views/fileImportView.js:7-25`; `src/services/dataService.js:29,33`; `backend/receiptValidator.ts`; `tests/staleReviewState.test.js`; `tests/reviewLifecycle.test.js`.
- **Tests and results:** Existing repository history records passing tests for exception-first imports, stale high-confidence review removal, learned-rule precedence, receipt validation, and Gmail processing. This backfill did not rerun product tests because it changed documentation only.
- **Commit(s):** `06c11a9`, `5af6015`, `d026a06`, `50e8adb`, `02558cf`.
- **Screenshots/browser/device artifacts:** Existing import preview captures are referenced canonically; no new artifact was created.
- **Handoff/reference sections:** `FAMILY_FINANCE_MASTER_HANDOFF.md` §§1,7,10; `FAMILY_FINANCE_FULL_CONTINUITY_HANDOFF_2026-08-27.md` §§1,7.
- **Evidence safety:** PUBLIC-SAFE — source, tests, docs, and commit identifiers only. Existing real financial fixtures remain private.
- **Duplicate aliases:** NONE

## Interpretation

- **Rejected or failed approach:** Review-everything import, reconfirming resolved facts, AI-first processing, amount-only resolution, and blocking on noncritical ambiguity.
- **Limitations and unverified claims:** The policy is strongly documented and synthetically tested in several flows, but reduced user effort and trust have not been measured in sustained household use.
- **Conflict with current canonical record:** NONE. The behavior is fragmented across several canonical records, making the human-attention rationale easy to miss.
- **Missing historical evidence:** No comparative usability study or authentic pre-exception-first interaction recording exists.
- **Open questions for semantic merge review:** Whether this is a new cross-cutting decision or a behavioral framing section shared by the existing import, learned-rule, Gmail, and receipt-review decisions.

## Queue status

- **Status:** QUEUED — NOT CANONICAL
- **Suggested merge-rule outcome:** NEW_DECISION
