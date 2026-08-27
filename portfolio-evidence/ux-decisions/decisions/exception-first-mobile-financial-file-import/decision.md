# Exception-first mobile financial-file import

- **Validation:** SYNTHETIC TEST
- **USER-STATED NEED:** Safely import Hebrew bank/card files on mobile without reviewing every known-good row.
- **DESIGN INFERENCE:** Support local formats, auto-apply high confidence, surface exceptions and defer noncritical ambiguity.
- **IMPLEMENTED:** Mobile chooser, Hebrew CSV/signed fields, preview/approval, deferred review, stable identity and idempotent backend import.
- **VERIFIED:** Synthetic fixture reached approval, persistence, reload, Client B and idempotent re-import.
- **Evidence:** file-import/review services and tests; commits `977ece9`, `3f8e488`, `a43a7ab`, `2b462da`, `06c11a9`, `5af6015`, `7eeea06`; `core-import-after.png`, `local-browser-import-after.png`, `local-browser-import-persisted-after.png`.
- **Rejected/learning:** Desktop chooser assumptions, review-everything, reconfirming resolved facts. BEFOREs unavailable.
- **Open:** Additional real-bank variants.

