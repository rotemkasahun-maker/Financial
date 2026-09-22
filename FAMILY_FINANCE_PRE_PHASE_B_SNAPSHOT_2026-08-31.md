# Family Finance — Pre-Phase B Snapshot — 2026-08-31

## Git

- Branch: `main`
- HEAD: `e9c774c192454b6be9ea7a81935499b6a765430c`
- Mixed working tree: preserved; no staging, commit, push, or cleanup performed.

## Full git status

The working tree contains the existing modified and untracked recovery/product files, including modified `Dockerfile`, backend, Android, web, and test files; untracked `.android-local/`, `.gradle-local/`, `.gcloudignore`, handoff files, `docs/`, incoming evidence, backend/write-freeze code, rotation tooling, and Android maintenance/receipt tests. No files were removed.

## Recovery files changed/created during this sequence

- `backend/aiReceiptExtractor.ts`
- `backend/server.ts`
- `Dockerfile` (pre-existing mixed-tree modification)
- `.gcloudignore`
- `.local/pagefile-key-recovery.mjs`
- `.local/verify-secret-version-13.mjs`
- `.local/list-auth-users.mjs`
- `.local/reset-auth-credential-user-a.mjs`

Local helper names only (no contents): `.local/fresh-missing-receipt-state.enc`, `finance-state.enc`, `gmail-state.enc`, `pagefile-key-recovery.mjs`, `reset-auth-credential-user-a.mjs`, `verify-secret-version-13.mjs`, and other existing local QA helpers.

## Build/deploy path

- `Dockerfile` builds `node:22-alpine`, installs production dependencies, copies `backend/`, `src/`, and web files, and starts `backend/server.ts`.
- `.gcloudignore` excludes local/generated directories while retaining Docker-required source.
- Cloud Run service: `family-finance-alpha`, revision `family-finance-alpha-00008-mhb`.
- Artifact Registry image namespace: `europe-west1-docker.pkg.dev/project-343999a8-f375-4c7d-aad/cloud-run-source-deploy/family-finance-alpha`.

## Remote state metadata

- GCS bucket/object: `project-343999a8-f375-4c7d-aad-finance-state/finance/state.enc`.
- Reported object size: 4162 bytes.
- Original encrypted state remains unchanged locally and remotely.

## Alpha gate summary

- Remote availability, authenticated login, canonical GCS read/decrypt/parse/schema, and key durability: PASS.
- Phase B Android remote fetch/notification/dedupe: NOT VERIFIED / blocker.
- Phase C zero-task suppression/cancellation: OPEN / blocker.
- Remote persistence/read-after-write: NOT VERIFIED.
- Temporary read-only diagnostic endpoint: deployed and pending removal before ordinary use.
- Rebuild required: NO.

No secret values, credentials, hashes, salts, tokens, decrypted finance data, pagefile data, or private payloads are present in this snapshot.
