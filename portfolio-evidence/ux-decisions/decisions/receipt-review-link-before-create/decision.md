# Receipt review and link-before-create

- **Validation:** SYNTHETIC TEST
- **USER-STATED NEED:** Preserve originals/item detail, edit extracted fields and avoid duplicate expenses.
- **DESIGN INFERENCE:** Extraction is a proposal; review it and check imported transactions before creating expense data.
- **IMPLEMENTED:** Image/PDF ingestion, editable review, matching and shared save/link flow.
- **VERIFIED:** Synthetic browser E2E linked an existing transaction, survived re-authentication and appeared for Client B without duplicate transaction.
- **Evidence:** `PRODUCT_SPEC.md`, `src/shared/receiptMatching.js`, receipt services; commits `ac06599`, `d993295`, `ceb2507`, `1b66161`, `7eeea06`; `core-receipt-after.png`, `local-receipt-after.png`, `local-receipt-linked-after.png`, `local-receipt-client-b-after.png`.
- **Rejected/learning:** OCR-as-truth, create-before-match, discarding originals. Real household files are private; historical BEFORE unavailable.
- **Open:** Real extraction accuracy/adoption.

