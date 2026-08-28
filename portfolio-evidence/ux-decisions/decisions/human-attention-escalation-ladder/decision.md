# Human-attention escalation ladder

- **Validation:** SYNTHETIC TEST
- **USER-STATED NEED:** Project working rules require automation-first, exception-first UX, minimum user work, and a user decision only after cheaper trustworthy resolution paths are exhausted.
- **DESIGN INFERENCE:** Escalate from metadata and deterministic or saved rules through cross-source reconciliation, parsing and AI/OCR only as needed. Known high-confidence facts disappear from the decision queue; medium, conflicting, incomplete or integrity-critical cases remain visible to a person.
- **IMPLEMENTED:** PARTIAL — the policy appears across import review, learned rules, receipt/Gmail processing, reconciliation and historical bootstrap, but is not one shared orchestration service.
- **VERIFIED:** Synthetic tests cover high-confidence auto-resolution, exception-only import rendering, explicit-rule precedence, manual-override retention, receipt validation, automatic closure of resolved review work, and review/blocking for uncertain or critical cases.

## Applications and evidence

- `CODEX_WORKING_RULES.md` documents the escalation order and minimum-attention boundary.
- Import/review: file import, review reconciliation, stale-review tests; commits `06c11a9`, `5af6015`.
- Learned rules: classification-rule precedence; commit `d026a06`.
- Receipt/Gmail processing: receipt validation and Gmail processing; commits `50e8adb`, `02558cf`.
- Related canonical applications: `exception-first-mobile-financial-file-import`, `learned-rules-before-weaker-heuristics`, `automated-gmail-receipt-processing`, and `receipt-review-link-before-create`.

## Rejected approaches, limitations, and open questions

- Rejected review-everything imports, reconfirming resolved facts, AI-first processing, amount-only resolution, and blocking on noncritical ambiguity.
- A passing implementation path does not establish reduced cognitive load, trust or household effort. No longitudinal household study, comparative usability evidence or authentic pre-exception-first recording exists.
- The policy remains distributed across features; whether a formal shared orchestration layer is needed is open.
