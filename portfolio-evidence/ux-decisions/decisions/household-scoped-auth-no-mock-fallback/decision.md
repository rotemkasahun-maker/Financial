# Household-scoped authentication and no silent mock fallback

- **Validation:** SYNTHETIC TEST
- **USER-STATED NEED:** Private finance must not expose or substitute another household/demo state.
- **DESIGN INFERENCE:** Server derives scope from session; failures are explicit, not mock fallback.
- **IMPLEMENTED:** Login/session, `/api/auth/me`, server-derived household and query-gated demo mode.
- **VERIFIED:** Auth tests reject missing/invalid sessions and client scope switching; captures show mock-before, login and authenticated empty ledger.
- **Evidence:** auth backend, `src/app.js`, `tests/auth.test.js`; commits `8073672`, `2ebde11`, `40def4e`; bootstrap screenshots. Before image aliases `family-finance-proof.png`.
- **Rejected/learning:** Client-selected household and silent mock fallback.
- **Open:** Alpha scope is not production identity hardening.

