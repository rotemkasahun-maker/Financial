# Category-level sufficiency under uncertain item identity

- **Validation:** DESIGN DECISION ONLY
- **USER-STATED NEED:** During receipt-classification work, the user stated that exact product identification is preferable, but category classification is sufficient when the exact item cannot be identified confidently.
- **DESIGN INFERENCE:** Distinguish “exact identity unknown” from “useful classification unknown.” Do not escalate the first case when category-level understanding already satisfies the household’s spending-analysis goal.
- **IMPLEMENTED:** UNCERTAIN as a distinct stop-condition rule.
- **VERIFIED:** NOT VERIFIED as a distinct behavior. No dedicated implementation test, screenshot or real-household validation establishes this decision.

## Why it matters

This is calibrated precision: optimize for useful certainty rather than maximal certainty, reducing unnecessary human questions without inventing an exact item name.

## Evidence, rejected approach, and limits

- Evidence is Product conversation history from receipt-categorization work around 2026-08-14. Original household receipts remain private/non-public.
- Rejected requiring exact item-name recognition before safe category analysis can continue.
- Related decisions include `learned-rules-before-weaker-heuristics` and `human-attention-escalation-ladder`, but neither records this category-level stop condition.
- No historical BEFORE state should be reconstructed.
