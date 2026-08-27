# Shared expected-document maintenance

- **Validation:** REAL HOUSEHOLD USE — narrow: one real rehabilitation-document completion only
- **USER-STATED NEED:** Recurring documents should be expected, visible, completable and shared.
- **DESIGN INFERENCE:** Household maintenance state updates Attention and exactly-once completion/rewards.
- **IMPLEMENTED:** Monthly records/due dates, upload completion, shared state and Attention integration.
- **VERIFIED:** Synthetic initialization/cross-client tests plus one manually selected real July 2026 rehabilitation document; credit-card document remained open. This is not whole-product adoption.
- **Evidence:** monthly/shared tests; commits `2f826be`, `5a71c4d`; continuity §§9,16,18,21; shared-document/maintenance captures. Duplicate aliases are in master index. Real document/state are private.
- **Failure/learning:** Browser file chooser automation failed before request; manual use passed. Fake backend completion rejected.
- **Open:** Recurring real-use reliability.

