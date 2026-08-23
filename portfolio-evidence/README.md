# Portfolio evidence index

Generated locally with the reusable Playwright capture script. These files are evidence captures, not product code.

## Captures

- Family Finance proof: `family-finance/screenshots/family-finance-proof.png`
- Attention AFTER: `family-finance/screenshots/attention-after.png`
- Quick Cash Transactions AFTER: `family-finance/screenshots/quick-cash-after.png`
- Quick Cash form AFTER: `family-finance/screenshots/quick-cash-form-after.png`
- Quick Edit AFTER: `family-finance/screenshots/quick-edit-after.png`
- Backend bootstrap BEFORE: `family-finance/screenshots/backend-bootstrap-before.png`
- Backend bootstrap AFTER login boundary: `family-finance/screenshots/backend-bootstrap-after-login.png`
- Portfolio proof: `portfolio-website/screenshots/family-finance-portfolio-proof.png`

## Daily-use friction bundle

**Current AFTER evidence captured from the working application.**

- Attention renders open-item count, prioritized cards, and urgency signals.
- Transactions exposes the contextual `שילמתי במזומן` action and compact form.
- Transactions exposes Quick Edit for an existing transaction.
- Limitation: these are current AFTER states; no historical BEFORE state was fabricated.

## Sources and privacy

- Family Finance was served locally at `http://127.0.0.1:4173`.
- The Portfolio case study was served locally at `http://127.0.0.1:4174`.
- Captures use demo/redacted content only.

## Web authenticated bootstrap

- BEFORE: `family-finance/screenshots/backend-bootstrap-before.png` shows the prior mock/demo dashboard.
- AFTER: `family-finance/screenshots/backend-bootstrap-after-login.png` shows the explicit login boundary.
- The authenticated backend ledger view is not claimed because no safe local pre-provisioned authentication environment was available for screenshot capture.

## Truth boundaries

The captures demonstrate rendered states only. They do not establish production household adoption, complete SMS-to-ledger synchronization, two-device use, populated authenticated backend rendering, or behavioral outcomes.
