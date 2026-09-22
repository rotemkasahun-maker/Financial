# Family Finance — Current Handoff — 2026-08-31

## Recovery and authority

- The former live finance key was lost after reboot, then recovered from the preserved pagefile copy.
- The recovered key passed DECRYPT, PARSE, FINANCE SCHEMA, and integrity checks against `.local/fresh-missing-receipt-state.enc`.
- Secret Manager version 13 of `family-finance-alpha-state-encryption-key` was independently round-trip verified against the original finance state.
- Rebuild is **NOT REQUIRED**. The original finance state was preserved and is remotely readable.
- The repository `.env` finance key remains wrong and was not used.

## Remote Alpha

- Cloud Run service: `family-finance-alpha`, region `europe-west1`.
- Current reported revision: `family-finance-alpha-00008-mhb`.
- `/health` is the Cloud Run-safe health route. `/healthz` is retained for local compatibility but is not used for Cloud Run QA.
- Canonical GCS object: `gs://project-343999a8-f375-4c7d-aad-finance-state/finance/state.enc` (size 4162 bytes).
- Secret Manager: `family-finance-alpha-state-encryption-key`, verified version 13; no secret values recorded.
- Artifact Registry image lineage: `europe-west1-docker.pkg.dev/project-343999a8-f375-4c7d-aad/cloud-run-source-deploy/family-finance-alpha`; tags used include `lazy-openai-20260830` and `finance-read-diagnostic-20260831`.
- Auth user `user-a` was reset while preserving `household-alpha`; login works. `user-b` was preserved unchanged.

## Verified gates

- Remote backend availability: PASS.
- Authenticated finance access: PASS.
- Remote GCS read/decrypt/parse/schema: PASS through the authenticated diagnostic read.
- Encryption-key durability: PASS.
- Home PC canonical dependency: PASS (remote GCS is canonical).
- Receipt reminder behavior and Phase A: PASS per prior evidence.
- Android Phase B authenticated remote fetch/notification/dedupe: NOT VERIFIED / blocker.
- Phase C zero-task suppression/cancellation: OPEN / blocker.
- Remote persistence/read-after-write: NOT VERIFIED.
- Temporary `/api/diagnostics/finance-state-read` endpoint: still deployed; remove or disable before ordinary use.

## Standing rules

- NO-CHANGE-BEFORE-PROOF.
- ONE-MUTATION-PER-STEP.
- No secret values, hashes, salts, tokens, decrypted contents, pagefile contents, migration, rebuild, or dual writers.

## Current next step

Resume Android Phase B acceptance using an explicitly authorized path; the existing maintenance endpoint may write maintenance state and must not be called without that authorization.
