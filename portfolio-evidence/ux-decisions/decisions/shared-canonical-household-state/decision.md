# Shared canonical household state and cross-client convergence

- **Validation:** SYNTHETIC TEST
- **USER-STATED NEED:** Both users see durable common truth after finance actions.
- **DESIGN INFERENCE:** Canonical events require household backend state, stable IDs, provenance, versioning, dedupe and idempotency.
- **IMPLEMENTED:** Authenticated finance state, versioned mutations, shared receipts/import/maintenance.
- **VERIFIED:** Synthetic two-client flows persisted across re-authentication for import, edit, cash, receipt and maintenance without duplicates.
- **Evidence:** backend finance services, data adapter, `tests/sharedFinance.test.js`; commits `65d8908`, `b730a3a`, `7eeea06`, `5a71c4d`; persisted/Client-B screenshots.
- **Rejected/learning:** Per-client truth, mock promotion, stale writes and retry duplicates.
- **Open:** Long-term real conflicts/convergence.

