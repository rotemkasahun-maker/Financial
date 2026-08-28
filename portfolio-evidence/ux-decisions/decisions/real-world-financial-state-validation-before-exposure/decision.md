# Real-world financial-state validation before exposure

## Decision type

Product / Validation / System Trust / UX Architecture

## Context and trigger

Internal account-state reconstruction could appear plausible while source coverage, posting state, or current-bank state remained incomplete. The risk was turning an uncertain calculation into a confident user-facing promise.

## User-stated need

Represent household financial reality accurately enough for trustworthy decisions without adding a temporary Balance workflow, recurring manual balance maintenance, scraping workaround, Safe-to-Spend promise, or premature Open Banking substitute.

## Design inference

Validate account-state semantics internally against real household truth points, while keeping that validation burden out of the ordinary household workflow. Separate calculation correctness, data completeness, posted account state, and live/current bank state. Keep bank impact separate from economic classification.

## Previous assumption / rejected approaches

Plausible totals were not sufficient evidence of a trustworthy balance. A user-facing Balance feature, manual recurring balance entry, Safe-to-Spend, scraping, and a temporary Open Banking substitute were rejected for Alpha. No Balance UI was exposed.

## Final decision and resulting logic

Do not expose a confident balance promise until an authoritative data path and explicit uncertainty model support it. Internally, the implementation:

- normalizes canonical posting states as `posted`, `pending`, or `unknown`;
- preserves raw bank status, account attribution, and running balance as metadata;
- reconciles posted movements within an account scope;
- reports coverage gaps for incomplete, pending, ambiguous, misattributed, invalid, or duplicate movements;
- distinguishes posted reconstructed state from an observed live/current state;
- keeps bank impact independent from household economic classification.

## Implementation and ownership

**IMPLEMENTED:** Internal semantics and reconciliation support are implemented; no user-facing Balance feature is implemented.

The user identified the product/system risk, designed the validation approach, defined acceptance criteria and semantics, directed the AI-assisted implementation, and reviewed the resulting implementation and tests. This record does not claim that the user personally coded the implementation.

## Verification and validation ceiling

**VERIFIED:** Narrow private real-household checkpoints informed the validation: one scenario reconciled when posted coverage was complete; another exposed a limited difference consistent with pending or same-day activity, whose exact cause remains unverified without an authoritative live feed.

**Strongest truthful status: REAL HOUSEHOLD USE — narrow.** This applies only to the reconciliation method and uncertainty boundary. It does not validate Balance UI, Safe-to-Spend, Open Banking, sustained household use of balances, or perfect cross-bank reconstruction.

Sanitized automated checks also pass:

- focused financial-state tests: 29/29 PASS;
- full Node suite: 243/243 PASS;
- implementation commit: [`f3d8181`](https://github.com/rotemkasahun-maker/Financial/commit/f3d8181).

## Evidence and provenance

Implementation and test paths:

- `src/services/finance.js`
- `src/services/fileImport.js`
- `src/services/reconciliation.js`
- `backend/financeDataService.ts`
- `tests/bankBalanceReconciliation.test.js`
- `tests/fileImport.test.js`
- `tests/sharedFinance.test.js`
- `tests/fixtures/bank-signed-amount-trailing-delimiter.csv`

Historical provenance: [`incoming/codex/2026-08-28-real-world-financial-state-validation-before-exposure.md`](../../incoming/codex/2026-08-28-real-world-financial-state-validation-before-exposure.md). The incoming packet remains preserved and non-canonical.

No screenshots, browser captures, or public visual evidence exist for a Balance feature. Exact household account identifiers, values, dates, movement descriptions, and raw truth points are private/non-public and are not reproduced here.

## Outcome, limitations, and open questions

The decision creates a system-trust boundary: internal correctness and coverage can be tested without implying current-bank authority. The exact cause of the remaining live-versus-posted difference is unresolved. Future work must define the authority and coverage threshold for any balance exposure and the semantics of pending/current/available balances after direct bank access.

## Portfolio sufficiency

**PRESENT BUT UNDEREXPLAINED** in the public case-study material. The decision is suitable for a case-study section only when described as a narrow validation/system-trust decision, without exposing private household evidence or overstating validation.
