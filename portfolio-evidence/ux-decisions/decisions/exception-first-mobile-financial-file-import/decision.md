# Exception-first mobile financial-file import

- **Validation:** SYNTHETIC TEST
- **USER-STATED NEED:** Safely import Hebrew bank/card files on mobile without reviewing every known-good row.
- **DESIGN INFERENCE:** Support local formats, auto-apply high confidence, and surface exceptions. Noncritical uncertainty should offer an honest “check later” path instead of blocking safe progress or forcing a guess; integrity-critical uncertainty still blocks.
- **IMPLEMENTED:** Mobile chooser, Hebrew CSV/signed fields, preview/approval, stable identity and idempotent backend import. In the local/mock review lifecycle, deferred ambiguity is excluded from totals while unknown, retained as one deduplicated follow-up task, and may close automatically when stronger receipt/Gmail/SMS evidence resolves it.
- **VERIFIED:** Synthetic fixtures reached approval, persistence, reload, Client B and idempotent re-import. Review lifecycle tests cover nonblocking defer, one later task, batched reminder behavior, automatic evidence resolution and task closure without XP/streak reward; critical integrity risks remain blocking.
- **Evidence:** file-import/review/task services; `tests/reviewLifecycle.test.js`, `tests/staleReviewState.test.js`; commits `977ece9`, `3f8e488`, `a43a7ab`, `2b462da`, `06c11a9`, `5af6015`, `7eeea06`; `core-import-after.png`, `local-browser-import-after.png`, `local-browser-import-persisted-after.png`.
- **Rejected/learning:** Desktop chooser assumptions, review-everything, forcing a guess, permanently excluding an unknown row, reconfirming resolved facts, and repeated reminders for one ambiguity. Authentic BEFORE and abandonment evidence are unavailable.
- **Open:** Additional real-bank variants, shared-backend parity for the defer lifecycle, and real-household use remain unverified.
