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

## Android and privacy

Each phone scans only its own SMS after explicit Android permission in a future phase. Filtering should happen on-device so unrelated conversations are not uploaded. Only likely receipts, invoice links, payment confirmations, and structured financial fields enter the shared pipeline. Gmail connections use independent OAuth grants for each household member. No SMS permissions, Gmail connections, or external credentials exist in this MVP.

## Persistence evolution

The UI consumes `FinanceDataService`, not Sheets directly. `MockFinanceDataService` can be replaced with a Google Sheets adapter and later an authenticated shared API/database without redesigning the screens. Stable IDs and `externalSourceId` provide idempotency across two phones and several connectors.
