# Read-only historical-learning bootstrap

- **Validation:** SYNTHETIC TEST
- **USER-STATED NEED:** Learn from history without rewriting live truth or cluttering daily UX.
- **DESIGN INFERENCE:** Internal read-only bootstrap must not affect totals, XP, tasks, completeness or Madrid.
- **IMPLEMENTED:** Historical/receipt learning and document reconciliation behind internal setup route.
- **VERIFIED:** Historical-learning tests cover reconciliation/isolation.
- **Evidence:** historical services, `documentReconciliation.js`; tests `historicalLearning`, `historicalReceiptLearning`; commits `505ce12`, `b444750`, `8744fa9`, `c73e2cd`.
- **Rejected/learning:** Live mutations and daily navigation exposure.
- **Open:** No suitable visual evidence; historical UI cannot be reconstructed.

