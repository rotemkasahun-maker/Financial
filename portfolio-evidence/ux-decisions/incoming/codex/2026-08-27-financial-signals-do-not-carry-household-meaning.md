# Codex UX Decision Intake Packet

## Intake metadata

- **Date:** 2026-08-27
- **Commit / working-tree context:** `main`; behavioral UX backfill only.
- **Repository task/context:** Audit of uncertainty and user trust in classification/reconciliation behavior.
- **Proposed merge target:** `truthful-household-financial-semantics`
- **Packet type:** `DECISION_CHANGE`

## Finding

- **What changed:** The canonical financial-semantics record describes correct accounting outcomes but underplays the human mental-model decision: a transaction signal reports movement, not household meaning. An incoming wallet/bank credit might be income, reimbursement, refund, family support, gift, settlement, or own-account transfer; when context is insufficient, the system deliberately abstains instead of presenting false certainty.
- **Why it matters at UX/Product Architecture level:** Confidently mislabeling money erodes trust and makes correction costly. Preserving “unknown” and asking only when evidence cannot establish meaning respects how households actually interpret money through relationships and purpose, not amount/direction alone.
- **USER-STATED NEED:** KNOWN — project rules require truthful gross/net semantics, prohibit amount-only matching, and require medium/low/conflicting cases to review.
- **DESIGN INFERENCE:** Use identity, counterparty, source, direction, recurrence, linked evidence, and learned explicit corrections before assigning meaning. If those signals conflict or remain weak, do nothing financially consequential and keep the item reviewable.
- **IMPLEMENTED status:** IMPLEMENTED across wallet reconciliation, bank/card settlement, classification rules, reimbursement/refund logic, and import review.
- **VERIFIED status:** Synthetic tests verify that incoming Bit money is not automatically income, amount alone is insufficient, ambiguous/conflicting cases remain in review, own transfers have zero totals impact, and explicit rules outrank weaker heuristics.
- **Strongest truthful validation level:** SYNTHETIC TEST

## Evidence

- **Exact code/history paths:** `AGENTS.md` financial logic; `CODEX_WORKING_RULES.md:5-17`; `src/services/reconciliation.js`; `src/services/classificationRules.js`; `src/services/reviewReconciliation.js`; `tests/walletReconciliation.test.js:5-7`; `tests/classificationRules.test.js`; `tests/cardSettlement.test.js`; `tests/reviewLifecycle.test.js`.
- **Tests and results:** Existing synthetic suites cover abstention, ambiguity, rule precedence, transfers, refunds, reimbursements, and settlements. This documentation-only audit did not rerun product tests.
- **Commit(s):** `8253310`, `7ad79f5`, `879e4a0`, `d026a06`, `06c11a9`, `a0ccccf`.
- **Screenshots/browser/device artifacts:** No complete visual evidence set; current review UI shows unresolved classifications.
- **Handoff/reference sections:** `FAMILY_FINANCE_MASTER_HANDOFF.md` §§1,6-7; continuity §§1,6-7.
- **Evidence safety:** PUBLIC-SAFE — synthetic source/test evidence only; household-specific rules remain private.
- **Duplicate aliases:** NONE

## Interpretation

- **Rejected or failed approach:** Treat every incoming transfer as income, infer meaning from amount alone, allow weak heuristics to override explicit corrections, or force unresolved values into totals.
- **Limitations and unverified claims:** Classification accuracy and household trust have not been validated on a representative real dataset. The claim is limited to designed and synthetically tested behavior.
- **Conflict with current canonical record:** NONE in behavior. The canonical title/rationale are accounting-centric and do not foreground uncertainty, abstention, trust, mental models, or correction cost.
- **Missing historical evidence:** No authentic incorrect-classification BEFORE capture or user-trust research exists.
- **Open questions for semantic merge review:** Whether to reframe the existing financial-semantics record around “movement is not meaning,” retaining accounting rules as consequences of that behavioral insight.

## Queue status

- **Status:** QUEUED — NOT CANONICAL
- **Suggested merge-rule outcome:** MERGE_INTO_EXISTING
