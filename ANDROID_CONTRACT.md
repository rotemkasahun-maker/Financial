# Android SMS Evidence Sync Contract

The Android client should push evidence to the backend using the following contract.

## Endpoint
`POST /api/ingestion/evidence`

## Headers
`Authorization: Bearer <CONNECTOR_SHARED_TOKEN>`
`Content-Type: application/json`

## Payload Structure
```json
{
  "externalSourceId": "sha256(sender + originalSmsTimestamp + body)",
  "sender": "The SMS sender string (e.g. BankName)",
  "originalSmsTimestamp": "ISO 8601 string of the received SMS time",
  "candidateType": "TRANSACTION | RECEIPT_LINK | AMBIGUOUS",
  
  "normalized": {
    "merchant": "Normalized business name",
    "date": "ISO 8601 date YYYY-MM-DD",
    "amount": 123.45,
    "currency": "ILS"
  },
  
  "documentUrls": [
    "https://example.com/receipt.pdf"
  ],
  
  "bodyHash": "sha256(body)",
  "metadata": {
    "deviceId": "...",
    "version": "..."
  }
}
```

## Idempotency Rules
1. `externalSourceId` MUST be generated exactly once and remain stable for the life of the evidence item.
2. The backend will ignore duplicate `externalSourceId` values to prevent double-processing.
3. The `originalSmsTimestamp` MUST be the time the SMS was received, not the sync time.
4. **Security**: DO NOT send the raw SMS body text to the backend.

## Logic
- **TRANSACTION**: Backend attempts to match against existing ledger transactions. If a high-confidence match is found, the evidence is linked. Otherwise, it is staged for manual review.
- **RECEIPT_LINK**: Evidence is staged, and the backend will attempt to fetch and process the documents in the background.
- **AMBIGUOUS**: Evidence is staged for manual classification by the user in the Web UI.
