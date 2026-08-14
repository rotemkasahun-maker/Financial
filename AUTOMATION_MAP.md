# Automation & Data Flow Map

Product principle: **Automate when possible. When automation is impossible, remind. When uncertain, ask for review.** Users review exceptions, not every transaction.

All sources feed the same flow:

`source → raw import → relevance/type detection → extraction → normalization → deduplication → matching → classification → confidence policy → save → source-health update`

High-confidence safe results may proceed according to policy. Medium-confidence and failed results create an `ImportIssue`. Low-confidence items are never silently merged. Deliberate user corrections outrank automatic rules.

## Source and process matrix

| Source/process | Owner | Current | Desired final implementation | Mode | Trigger / frequency | Input → output | Deduplication | Failure / reminder / review | Status |
|---|---|---|---|---|---|---|---|---|---|
| Bank transactions | Household | Demo/file-import contract | Authorized Open Banking sync; file fallback | Automatic + fallback | Scheduled daily and manual refresh | Transactions, balances, pending/posted updates → canonical transactions | Provider transaction ID; account/date/amount/description fallback | Stale/failed/expired consent → issue; file-upload reminder; review uncertain transfers | Architecture ready; provider missing |
| Credit-card transactions | Household | Demo/file-import contract | Authorized provider sync; file fallback | Automatic + fallback | Scheduled daily; statement monthly | Pending/posted charges and refunds → canonical transactions | Provider ID; card/date/amount/merchant/reference | Failure/stale → issue; monthly fallback reminder | Architecture ready; provider missing |
| Bit | Relevant member / household | Mock `BitImportSource` | Supported Open Banking/API connection only | Automatic | Provider sync; daily health check | Incoming/outgoing transfers, balance, pending/booked records, metadata and external IDs → source records | External ID; wallet/date/amount/counterparty/reference; cross-source reconciliation | Expired/failed/stale/unsupported → issue and fallback reminder; ambiguous incoming money → review | Adapter contract ready; optional/not connected |
| PayBox | Relevant member / household | Mock `PayBoxImportSource` | Supported direct/API connection when available | Automatic if supported; semi-automatic fallback | Provider sync or bank/card/SMS/email/file evidence | Sent/received money, withdrawal, funding, refunds and identifiable card activity → source records | External ID; wallet/date/amount/counterparty/reference; cross-source reconciliation | Unsupported/failed/stale → fallback-required issue; ambiguous movement → review | Adapter contract ready; optional/not connected |
| Gmail A | User A | Mock source | Separate OAuth and relevance-filtered incremental sync | Automatic | Push/poll; daily health check | Relevant body/link/attachment → document/receipt envelope | Gmail message/attachment ID + content hash | Sync/permission failure → issue; uncertain relevance → review | Not connected |
| Gmail B | User B | Mock source | Same, isolated OAuth grant | Automatic | Push/poll; daily health check | Same as Gmail A | Same as Gmail A | Same as Gmail A | Not connected |
| Android SMS A | User A / phone A | Contract only | Private Android on-device filtering and sync | Automatic | New SMS + periodic health ping | Relevant structured fields/link only → envelope | Message fingerprint/device/source ID | No phone sync → stale issue; uncertain message stays local/review | Android client missing |
| Android SMS B | User B / phone B | Contract only | Same on phone B | Automatic | Same | Same | Same | Same | Android client missing |
| Receipt camera | Either member | Working Web mock flow | Android/Web capture + real extraction | Semi-automatic | User capture | Image → receipt, items and attachment | File hash + receipt/transaction match | Low extraction confidence or no match → review | UX ready; OCR mocked |
| Image/PDF upload | Either member | Working Web mock flow | Real extraction pipeline | Semi-automatic | User upload | File → structured receipt/document | File hash, external reference, receipt match | Parse failure → issue; retry/upload reminder if expected | UX ready; OCR mocked |
| Gmail/SMS receipt | Source owner | Envelope contract | Automatic attachment retrieval/link resolution | Automatic | Relevant message detected | Link/file/text → receipt/document | Message ID, URL/content hash, transaction match | Broken link/low confidence → review | Connector missing |
| Receipt matching | Household | Amount/date/merchant match | Include account/card/reference/source metadata | Automatic | After extraction or transaction update | Receipt + candidates → link proposal/decision | Existing receipt ID/file hash + confidence scoring | High: safe-policy link; medium: review; low: no merge | Basic implementation |
| Transaction categorization | Household | Known demo categories | Rules + correction-derived suggestions + later learned model | Automatic with review | New/updated transaction | Merchant/description/source/amount/recurrence → category | Rule identity/priority | Weak guess never overwrites correction; uncertainty → review | Rules module required |
| Receipt-item categorization | Household | Item categories in mock extraction | Product dictionary + corrections | Automatic with review | Item extraction | Raw/normalized product → micro-category | Normalized product + merchant | Unknown/low confidence → item review; remember correction | Data model ready |
| Reimbursements/refunds | Household | Explicit demo link/net calculation | Detect incoming credit and rank expense candidates | Automatic with review | Incoming credit/refund | Credit + expense candidates → reimbursement link | Credit ID + linked expense/amount | Uncertain candidate → review; never ordinary income | Basic linked model |
| Internal transfers | Household accounts | Type supported | Pair both sides across owned accounts | Automatic with review | New debit/credit | Two account movements → transfer pair | Account IDs, inverse amount, time/reference | Uncertain ownership/pair → review | Detection required |
| Recurring payments | Household | Demo schedule/price warning | Pattern detector and expectation monitor | Automatic | Each transaction + scheduled daily check | History → recurring identity/expected amount/date | Merchant/account/cadence identity | Missing/duplicate/unusual amount → issue | Basic UI; detector required |
| Expected documents | Configured owner | Generic model and upload completion | Auto-retrieve where possible; reminder fallback | Automatic or manual reminder | Due-date scheduler | Expected definition + file → document/extracted data | Type/owner/period unique key | Missing → one active reminder; received → complete reminder | Working mock |
| Utility/household bills | Household/member | Covered by generic document envelope | Gmail/provider detection, extraction, transaction link and archive | Automatic | Message/provider event | Bill/PDF → document + financial fields + match | Bill ID/account/period/amount | Missing bill or no transaction match → review | Connector/config missing |
| Monthly completeness | Household | Working basic score | Required-source policies, freshness windows and period close | Automatic | Source update + daily/month-end | Source/document/issue state → completeness checks | Check ID per month | Missing/stale/failed source creates actionable check | Basic implementation |
| Automation health | Household | Health fields and demo issues | Scheduled heartbeats, consent expiry and parser monitoring | Automatic | Every run + periodic monitor | Sync/run/heartbeat → health state | One active issue per source/problem | Stale/failed/expired permission → `דורש טיפול`; fallback reminder | Architecture ready |
| Unusual spending | Household | Static insight | Statistical anomaly detection | Automatic | Transaction update | History + transaction → anomaly score | Transaction ID/model version | Low confidence only shown as insight | Future |
| Budget monitoring | Household | Not configured | Category targets and alerts | Automatic | Transaction update | Budgets + net spending → progress/alert | Budget/category/month | Threshold alert, user-adjustable | Future |
| End-of-month forecast | Household | Not implemented | Historical + recurring forecast | Automatic | Daily/month activity | Current spend + expected recurring + history → forecast | Month/model version | Clearly label uncertainty | Future |
| Grocery intelligence | Household | Item/category/supermarket demo | Product normalization, average prices and comparison | Automatic after receipt | Receipt item update | Items/history → price/category/saving insights | Normalized product/merchant/date | Unknown item → review/correction memory | Basic demo |

## Adapter boundaries

Bank and card sources select an adapter without changing domain logic:

`BankSource → FileAdapter | OpenBankingAdapter`

`CreditCardSource → FileAdapter | OpenBankingAdapter`

`BitImportSource → SupportedWalletAdapter | reconciliation fallback`

`PayBoxImportSource → SupportedWalletAdapter | File/Bank/Card/SMS/Email reconciliation fallback`

Connectors produce source-neutral `ImportEnvelope` records. Provider credentials, consent and pagination remain inside adapters. The pipeline owns normalization, matching, classification, issue creation and source-health updates.

## Cross-source reconciliation

Every imported representation remains an immutable/auditable `SourceRecord`. Matching source records are linked to one `CanonicalFinancialEvent`; they are not deleted. The canonical event alone contributes to income/expense totals.

Examples include a PayBox withdrawal plus its bank deposit, or one Bit purchase represented by a wallet record, card charge and SMS. Matching uses external IDs where available, then amount, time/date, counterparty/merchant, owned account/card, direction, reference and source metadata. Links carry confidence and a relationship: `same_event`, `internal_transfer`, `reimbursement`, or `duplicate_representation`. Medium confidence goes to review; low confidence remains separate and uncounted only when policy explicitly permits it.

Wallet-to-household-bank withdrawals and household-bank/card funding of a wallet are internal transfers, not income or expense. Incoming wallet money is classified only after matching: it may be reimbursement, shared-purchase repayment, gift, transfer or actual income. It is never automatically treated as income.

## Automation status and health

Supported lifecycle states: `active`, `waiting_connection`, `manual`, `upload_required`, `synced`, `needs_attention`, `failed`, `permission_expired`, and `stale`.

Every automated source tracks last attempt, last success, next scheduled sync/expected item, consecutive failures, heartbeat/consent expiry when relevant, and a freshness policy. “No expenses” is valid only when the source is healthy and recently synchronized; otherwise the month is incomplete.

## Correction precedence

Classification decisions carry origin and confidence: `user_correction > household_rule > high-confidence model > suggestion`. A deliberate user correction creates or strengthens a household-scoped rule and is never overwritten by a weaker result. Item corrections use the same policy keyed by normalized product and optional merchant.

## Gaps still to implement

- Real durable storage and file hashing.
- File-import parser/mapping UI for Israeli bank/card exports.
- Concrete category-rule engine and correction history.
- Transfer, reimbursement and recurring-pattern detectors.
- Real OCR/document extraction.
- Authorized provider, Gmail and private Android connectors.
- Scheduler/worker for source health, expected documents and reminders.
- Authentication and shared household API for two devices.
