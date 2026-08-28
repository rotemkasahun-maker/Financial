# Portfolio UI UX Decision Intake Packet

## Intake metadata

- **Date:** 2026-08-27
- **Context:** Behavioral UX backfill from receipt-classification conversation history.
- **Proposed merge target:** NONE
- **Packet type:** `NEW_DECISION_CANDIDATE`

## Finding

- **What changed:** When an exact receipt item name cannot be identified confidently, category-level understanding is sufficient if it already satisfies the household’s spending-analysis goal.
- **Why it matters:** This is calibrated precision. Optimize for useful certainty rather than maximal certainty and avoid unnecessary human questions.
- **USER-STATED NEED:** KNOWN — exact identity is preferable, but when only category is reliable, classify the category rather than requiring clarification.
- **DESIGN INFERENCE:** Distinguish exact identity unknown from useful classification unknown. Do not escalate the first when the actual task is safely solved.
- **IMPLEMENTED status:** UNCERTAIN as a distinct stop-condition rule.
- **VERIFIED status:** NOT VERIFIED as a distinct behavior.
- **Strongest truthful validation:** DESIGN DECISION ONLY

## Evidence and interpretation

- **Evidence:** Product conversation history around 2026-08-14; no dedicated implementation, test or screenshot evidence. Original household receipts remain private/non-public.
- **Rejected approach:** Requiring exact item-name recognition before categorization continues.
- **Related decisions:** `learned-rules-before-weaker-heuristics`, `human-attention-escalation-ladder`.
- **Conflict:** NONE.
- **Evidence safety:** PUBLIC-SAFE summary; original receipt evidence is PRIVATE / LOCAL ONLY and is not included.
- **Status:** PRESERVED PROVENANCE — canonicalized after semantic review.
- **Merge-rule outcome:** NEW_DECISION
