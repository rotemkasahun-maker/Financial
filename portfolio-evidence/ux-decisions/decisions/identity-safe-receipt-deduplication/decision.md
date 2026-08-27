# Identity-safe receipt deduplication

- **Validation:** SYNTHETIC TEST
- **USER-STATED NEED:** Deduplicate without linking the wrong evidence or leaving the intended expense unresolved.
- **DESIGN INFERENCE:** Content hash alone is unsafe when that receipt is linked elsewhere; transaction identity constrains reuse.
- **IMPLEMENTED:** Preserve deep-linked transaction identity; do not reuse a colliding receipt linked to another transaction.
- **VERIFIED:** Fresh synthetic E2E closed the intended task, converged for Client B and created no duplicate transaction/task/receipt/reward.
- **Evidence:** master handoff §9; continuity §§8,30; current `backend/financeDataService.ts`; `fresh-missing-receipt-after.png`, `fresh-missing-receipt-client-b-after.png`. `missing-receipt-client-a-completed.png` aliases `missing-receipt-fixed-after.png`.
- **Failure/learning:** Same-hash reuse caused the historical blocker. Visual BEFORE unavailable.
- **Open:** More real-source collision coverage.

