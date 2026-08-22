# Portfolio evidence index

Generated locally with the reusable Playwright capture script. These files are untracked evidence only and are not product code.

## Captures

- Family Finance proof: `family-finance/screenshots/family-finance-proof.png`
- Attention AFTER: `family-finance/screenshots/attention-after.png`
- Quick Cash Transactions AFTER: `family-finance/screenshots/quick-cash-after.png`
- Quick Cash form AFTER: `family-finance/screenshots/quick-cash-form-after.png`
- Quick Edit AFTER: `family-finance/screenshots/quick-edit-after.png`
- Portfolio proof: `portfolio-website/screenshots/family-finance-portfolio-proof.png`

## Current milestone

**Daily-use friction bundle — current AFTER evidence** (working tree, not a commit).

- Verified Attention renders open-item count, prioritized cards, and urgency signals.
- Verified Transactions exposes the contextual `שילמתי במזומן` action and compact form.
- Verified Transactions exposes Quick Edit for an existing transaction. The optional classification-learning confirmation is a native confirmation state and was verified in the current flow, but authentic historical BEFORE screenshots remain unavailable.
- Limitation: screenshots are current AFTER evidence only; no historical BEFORE state was fabricated.

## Sources

- Family Finance: local development server at `http://127.0.0.1:4173`
- Portfolio: `C:\Users\gaya\Documents\ChatGPT\פורטפוליו\family-finance.html`, served locally at `http://127.0.0.1:4174`

The Portfolio source was confidently identified by its exact `family-finance.html` filename and rendered title `Family Finance — Rotem Kasahun`. Both captures use local demo/redacted content only.

## Household auth gate

This milestone adds a minimal pre-provisioned, household-scoped Web session boundary. Verified by focused request tests: authenticated users map to `household-alpha`, unauthenticated/invalid requests return 401, and client household claims cannot switch the server-derived household. Shared ledger state, two-device synchronization, and household adoption remain unverified.

## Shared finance backend slice

**Verified:** household-scoped backend finance state, versioned transaction mutation, stale-write protection, idempotent manual cash creation, and the backend Web adapter boundary.

**Not yet verified:** Web login/bootstrap, Web daily-use activation of the backend adapter, ledger bootstrap, shared receipt UI flow, shared tasks/reminders, and two-device daily use.

## Web authenticated bootstrap

- BEFORE: `family-finance/screenshots/backend-bootstrap-before.png` showed the prior mock/demo dashboard.
- AFTER: `family-finance/screenshots/backend-bootstrap-after-login.png` shows the explicit login boundary. The authenticated backend ledger view is not claimed because no local pre-provisioned auth environment was available for safe screenshot capture.
- Verified by code/tests: explicit demo mode is query-gated, login requests `/api/auth/session`, identity is checked through `/api/auth/me`, and successful login selects `BackendFinanceDataService` without mock fallback.

## Real ledger import

**Verified:** authenticated real import persists canonical household transactions, re-import is idempotent, household scope is enforced, and mock data is never promoted.

**Not yet verified:** browser import against a configured real household, browser rendering of a populated backend ledger, two-client browser verification, shared receipt UI persistence, and shared tasks/reminders.
