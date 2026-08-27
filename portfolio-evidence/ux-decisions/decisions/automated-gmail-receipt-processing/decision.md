# Automated Gmail receipt processing

- **Validation:** SYNTHETIC TEST
- **USER-STATED NEED:** Reduce manual emailed-receipt work while preserving safe matching/evidence.
- **DESIGN INFERENCE:** Metadata/determinism before AI/OCR; validate, preserve PDF identity, escalate ambiguity.
- **IMPLEMENTED:** Gmail ingestion, PDF/text extraction, structured extraction/validation and shared match/import pipeline.
- **VERIFIED:** Gmail/receipt processor tests cover supported synthetic paths; no UI E2E screenshot.
- **Evidence:** Gmail/receipt backend and tests `gmailBackend`, `gmailReceiptProcessor`, `gmailLinkedReceipt`, `receiptProcessingService`; commits `e7323f2`–`a80d7d0`.
- **Rejected/learning:** AI-first processing, fatal informational notes, lost PDF identity.
- **Open:** Real mailbox reliability and public visuals.

