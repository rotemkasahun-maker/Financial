# Truthful household financial semantics

- **Validation:** SYNTHETIC TEST
- **USER-STATED NEED:** Gross/net cost must distinguish expenses, reimbursements, refunds, transfers and savings.
- **DESIGN INFERENCE:** Count one event once; reimbursements/refunds offset expenses; own transfers/capital are not income/spend.
- **IMPLEMENTED:** Financial types, links, reconciliation, savings-aware cash flow and gross/net logic.
- **VERIFIED:** Finance, reimbursement, wallet and settlement tests cover rules; no complete visual evidence set exists.
- **Evidence:** `AGENTS.md`, working rules, finance/reconciliation services; tests `finance`, `walletReconciliation`, `reimbursementTracking`, `cardSettlement`; commits `2f02dbe`, `8253310`, `7ad79f5`, `a0ccccf`.
- **Rejected/learning:** Inflated income and miscounted transfers/savings.
- **Open:** Visual evidence; incorrect-total BEFORE unavailable.

