# Truthful household financial semantics

- **Validation:** SYNTHETIC TEST
- **USER-STATED NEED:** Gross/net cost must distinguish expenses, reimbursements, refunds, transfers and savings without presenting uncertain household meaning as fact.
- **DESIGN INFERENCE:** A financial signal describes movement, not household meaning. Use identity, counterparty, source, direction, recurrence, linked evidence and explicit learned corrections before assigning meaning. Count one event once; reimbursements/refunds offset expenses; own transfers/capital are not income/spend. When evidence remains weak or conflicting, abstain from consequential classification and keep the item reviewable.
- **IMPLEMENTED:** Financial types, links, reconciliation, savings-aware cash flow, gross/net logic, explicit-rule precedence and reviewable unknown/conflicting states across wallet, bank/card, reimbursement and import flows.
- **VERIFIED:** Synthetic finance, reimbursement, wallet, settlement, classification and review tests cover abstention, amount-alone insufficiency, transfer neutrality, rule precedence and review of ambiguity. No complete visual evidence or representative real-data accuracy set exists.
- **Evidence:** `AGENTS.md`, `CODEX_WORKING_RULES.md`, finance/reconciliation/classification services; tests `finance`, `walletReconciliation`, `reimbursementTracking`, `cardSettlement`, `classificationRules`, `reviewLifecycle`; commits `2f02dbe`, `8253310`, `7ad79f5`, `879e4a0`, `d026a06`, `06c11a9`, `a0ccccf`.
- **Rejected/learning:** Treating every incoming credit as income, inferring meaning from amount alone, weak heuristics overriding explicit corrections, inflated income and miscounted transfers/savings. Preserving unknown is safer than false certainty.
- **Open:** Classification accuracy, correction cost and household trust are not validated on a representative real dataset; visual evidence and authentic incorrect-total BEFORE are unavailable.
