# Codex UX Decision Intake Packet

## Intake metadata

- **Date:** 2026-08-28
- **Commit / working-tree context:** `main` at `91ea8a4`; financial-state semantics, reconciliation helper, and regression tests are implemented in the preserved uncommitted mixed working tree.
- **Repository task/context:** Validate reconstructed account state against real household truth points before exposing any user-facing balance promise.
- **Proposed merge target:** NONE — related to `truthful-household-financial-semantics`, but the candidate has a distinct exposure/validation decision and rejected-scope history.
- **Packet type:** `NEW_DECISION_CANDIDATE`

## Finding

- **What changed:** The Alpha now has internal canonical posting states (`posted`, `pending`, `unknown`), preserved raw bank status/account/running-balance metadata, and an account-scoped posted-movement reconciliation helper that treats incomplete, pending, ambiguous, misattributed, invalid, or duplicate movements as coverage gaps. Real household account checkpoints were used internally to distinguish calculation correctness from source completeness and live-bank state. No Balance UI was added.
- **Why it matters at UX/Product Architecture level:** A plausible reconstructed balance can create false precision when source coverage or posting state is incomplete. The product decision is to withhold a confident user-facing balance until an authoritative data path and explicit uncertainty model can support it.
- **USER-STATED NEED:** KNOWN — represent financial reality accurately enough for trustworthy decisions without adding a temporary Balance workflow, recurring manual balance maintenance, scraping workaround, Safe-to-Spend promise, or premature Open Banking substitute.
- **DESIGN INFERENCE:** Internal real-world reconciliation checkpoints can expose semantic and coverage gaps while keeping the validation burden out of the household's ordinary workflow. Bank impact must remain separate from household economic classification.
- **IMPLEMENTED status:** IMPLEMENTED internally in the current uncommitted source. No user-facing Balance feature is implemented.
- **VERIFIED status:** Two private real-household account scenarios informed the validation: one exactly reconciled when posted movement coverage was complete; the other exposed a narrow difference consistent with pending/same-day activity, whose exact cause remains unverified without an authoritative live feed. Focused reconciliation/import tests pass 25/25; full Node suite passes 243/243.
- **Strongest truthful validation level:** REAL HOUSEHOLD USE — narrow validation of the reconciliation approach and uncertainty boundary only.

## Evidence

- **Exact code/history paths:** `src/services/finance.js`; `src/services/fileImport.js`; `src/services/reconciliation.js`; `src/services/dataService.js`; `backend/financeDataService.ts`; `tests/bankBalanceReconciliation.test.js`; `tests/fileImport.test.js`; `tests/serverIntegration.test.js`.
- **Tests and results:** Focused `node --test tests/bankBalanceReconciliation.test.js tests/fileImport.test.js` PASS, 25/25. Full `npm test` PASS, 243/243. Tests cover posted/pending/unknown normalization, raw status/account/running-balance preservation, account-scoped bank impact independent of economic classification, duplicate and ambiguity coverage gaps, exact reconciliation under complete coverage, and separation between posted reconstructed state and an observed live state.
- **Commit(s):** NONE for this implementation; changes remain uncommitted in the mixed working tree.
- **Screenshots/browser/device artifacts:** NONE. The QA truth points are private observations, not public visual evidence.
- **Handoff/reference sections:** Current user-supplied intake source; current AGENTS.md Alpha scope for `QA יתרות` as manual truth points only.
- **Evidence safety:** MIXED — source semantics, sanitized synthetic regression fixtures, and generalized test outcomes are PUBLIC-SAFE. Exact account names, balances, dates, movement descriptions, and raw household truth points are PRIVATE-NON-PUBLIC and were not copied into this packet. The original household-derived regression fixtures were replaced with linked synthetic values while preserving exact reconciliation, pending/live divergence, account scoping, metadata retention, duplicate handling, and coverage-gap assertions.
- **Duplicate aliases:** NONE

## Interpretation

- **Rejected or failed approach:** A user-facing Balance feature, manual recurring balance entry, Safe-to-Spend, bank scraping, a temporary Open Banking substitute, and trusting plausible totals were rejected for Alpha. The QA mechanism remains internal and temporary.
- **Limitations and unverified claims:** This does not validate a Balance UI, long-term household use, Open Banking behavior, Safe-to-Spend, complete reconstruction across accounts/institutions, or the exact cause of the remaining live-versus-posted difference. Real-world evidence is narrow and private. Passing synthetic tests do not broaden that household validation.
- **Conflict with current canonical record:** NONE directly. `truthful-household-financial-semantics` covers truthful economic meaning and abstention; this candidate adds a distinct decision about validating account state against reality and withholding user-facing exposure when source authority is insufficient. Semantic merge review must still determine whether that distinction warrants a new canonical record.
- **Missing historical evidence:** No public-safe screenshot or authentic user-facing BEFORE exists because no Balance feature was exposed. Do not recreate one.
- **Open questions for semantic merge review:** Whether this remains a standalone exposure/validation decision; what authority and coverage threshold should permit a future balance; how pending/current/available balance semantics should be represented after direct bank access; whether internal reconciliation remains useful after Open Banking.

## Queue status

- **Status:** QUEUED — NOT CANONICAL
- **Suggested merge-rule outcome:** NEW_DECISION
