# Architecture — Web MVP and future private Android clients

The product is one shared household-finance system used by two household members. The current UI is Web; future privately installed Android clients are a core requirement, not a separate product.

## Boundaries

- `src/models.js`: source-neutral contracts and provenance metadata.
- `src/services/finance.js`: pure financial calculations, normalization, matching and deduplication. It must not import browser UI code.
- `src/services/importPipeline.js`: shared intake sequence for every source.
- `src/services/receiptExtraction.js`: replaceable extraction interface; currently a mock.
- `src/services/dataService.js`: persistence port. Mock data is current; Google Sheets is the planned first adapter.
- `src/app.js`: Web presentation only.
- Future `clients/android/`: private Android client. It will call the same API contracts and reproduce the shared domain rules locally where privacy requires it.
- Future `connectors/`: Gmail OAuth per member, Android SMS, bank/card CSV, and other import adapters.

## Required provenance

Every imported envelope or financial record retains `householdId`, `userId`, `deviceId`, `sourceType`, `sourceAccount`, `externalSourceId`, and `importedAt`. Both members query the same `householdId`; provenance remains available for audit and review.

## Unified import pipeline

`source → raw envelope → local/relevant-content classification → extraction → normalization → deduplication → transaction matching → review when uncertain → attach or save`

A receipt or document is supporting evidence. It is never automatically a new expense. High-confidence matches are suggested, not silently merged. Low/uncertain results require review.

## Ingestion reliability and completeness

The ingestion domain uses generic records rather than source-specific finance logic:

- `ImportSource`: ownership, automation mode, connection method, freshness and pending issues.
- `ExpectedDocument`: recurring expectation by period, owner, receipt and extraction state.
- `ImportRun`: auditable execution result, received/saved record counts and skipped duplicates.
- `ImportIssue`: centralized exception requiring human review.
- `ReminderTask`: an idempotent reminder tied to an expected item; completion stops further reminders.
- `DataCompletenessStatus`: derived monthly checks across required sources, documents and unresolved issues.

Sources are classified as `automatic`, `semi_automatic`, or `manual_reminder`. Uploading an expected document completes its reminder, resolves the related missing-document issue and refreshes its source state. Future Android notifications consume reminder tasks but are not implemented in the Web MVP.

`AUTOMATION_MAP.md` is the durable source/process inventory and implementation roadmap. `sourceAdapters.js` keeps acquisition replaceable (`FileAdapter` or future `OpenBankingAdapter`) while the shared pipeline retains all financial policy. Source health must prove a recent successful sync before “no transactions” can be considered valid data.

Bit and PayBox use dedicated supported-only adapter boundaries. `SourceRecord` preserves every provider/bank/card/SMS representation for audit, while one `CanonicalFinancialEvent` controls totals. Reconciliation links source records instead of deleting them. Wallet funding and withdrawals between household-owned sources are transfers; incoming wallet money remains unclassified until reimbursement/repayment/gift/transfer/income rules establish its meaning.

## Cash flow and capital allocation

Operating expenses and intentional capital allocations are separate dimensions. `savings_transfer`, `investment_transfer`, and `capital_allocation` have zero household-expense impact, but an outgoing allocation reduces current-account cash availability. Monthly reporting therefore exposes both economic surplus before allocations and cash flow after allocations. Recurring allocations are reserved in the month-end forecast until linked to a posted transaction. A future goal contribution (for example, Madrid) may reference the same canonical savings event; it must not create a second expense or allocation.

## Android and privacy

Each phone scans only its own SMS after explicit Android permission in a future phase. Filtering should happen on-device so unrelated conversations are not uploaded. Only likely receipts, invoice links, payment confirmations, and structured financial fields enter the shared pipeline. Gmail connections use independent OAuth grants for each household member. No SMS permissions, Gmail connections, or external credentials exist in this MVP.

## Persistence evolution

The UI consumes `FinanceDataService`, not Sheets directly. `MockFinanceDataService` can be replaced with a Google Sheets adapter and later an authenticated shared API/database without redesigning the screens. Stable IDs and `externalSourceId` provide idempotency across two phones and several connectors.
# Historical learning / bootstrap

Historical files enter a read-only analysis boundary and never the live ledger. `historicalLearning.js` groups normalized evidence, honors explicit user classifications over heuristics, detects conflicts, and emits confidence-scored proposals. Only an explicit approval converts a proposal into the existing persistent `ClassificationRule` structure with `origin: historical_bootstrap`; reconciliation patterns use the same rule structure with `ruleType: reconciliation`.

This is an internal, one-time setup utility, not an end-user destination. It has no navigation entry and is opened deliberately with `?setup=historical-learning`. Finishing bootstrap stores a local completion flag and disables the utility; the normal application only consumes the approved rules.

The analysis API has no transaction, completeness, receipt-task, or XP write path. Raw files remain in browser memory for the analysis session and are not copied into the repository. Root-level CSV/XLSX files and private historical-data folders are ignored by Git.
