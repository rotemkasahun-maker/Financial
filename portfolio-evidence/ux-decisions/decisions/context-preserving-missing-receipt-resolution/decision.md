# Context-preserving missing-receipt resolution

- **Validation:** SYNTHETIC TEST
- **USER-STATED NEED:** A reminder should open capture for the correct transaction.
- **DESIGN INFERENCE:** Preserve merchant/amount and stable transaction identity through task, capture, matching and save.
- **IMPLEMENTED:** Contextual task/action and transaction deep link/preselection.
- **VERIFIED:** Task/view tests and synthetic browser E2E closed the intended task for both clients.
- **Evidence:** task engine, ingestion view, app; `tests/taskEngine.test.js`, `tests/missingReceiptSlice.test.js`; commit `bc2362f`; `fresh-missing-receipt-after.png`, Client B counterpart.
- **Failure/learning:** No-match handling once lost context; boundary preservation fixed it. Failure screenshot unavailable.
- **Open:** Every route/session deep-link variant.

