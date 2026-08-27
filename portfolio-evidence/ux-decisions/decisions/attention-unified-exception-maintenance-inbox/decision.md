# Attention as unified exception and maintenance inbox

- **Validation:** SYNTHETIC TEST
- **USER-STATED NEED:** Prioritized unresolved work without hunting across screens.
- **DESIGN INFERENCE:** Missing receipts, ingestion issues, SMS staging and documents belong in one contextual inbox.
- **IMPLEMENTED:** Attention count, priority, urgency cards and existing actions.
- **VERIFIED:** Rendering tests and shared-maintenance E2E show prioritization and all-clear convergence.
- **Evidence:** ingestion views, completeness/task engine; tests `attentionSummary`, `missingReceiptSlice`, `monthlyExpectedDocuments`; commits `ce998ee`, `bc2362f`, `2f826be`, `1f88ee3`; `attention-after.png`, `shared-maintenance-after.png`, final Attention capture.
- **Rejected/learning:** Scattered states and generic reminders. Pre-Attention BEFORE unavailable.
- **Open:** Real household prioritization quality.

