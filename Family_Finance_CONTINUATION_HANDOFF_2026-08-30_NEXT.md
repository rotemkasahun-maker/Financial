# Family Finance — Complete Chat Continuation Handoff (2026-08-30)

## 1. Continuity instruction

Treat this file as a direct continuation of the previous Family Finance conversation, not as a summary or a new project kickoff. Preserve every PASS, NOT VERIFIED item, blocker, decision, rejected approach, and safety boundary unless newer evidence explicitly changes it. Do not reopen settled work without concrete regression, convert implementation into verification, convert environment failures into product bugs, or use foreground behavior as background proof. Continue only from **CURRENT NEXT STEP** below.

## 2. Product identity and vision

Family Finance / ניהול פיננסי is a Hebrew-first, RTL, mobile-first household finance product. It manages expenses, income, receipts, reimbursements, recurring payments, groceries, insights, and shared maintenance/Attention work. Google Sheets is the initial financial reference. Preserve original evidence, distinguish gross/net and reimbursements, keep transfers out of income/expense, and never silently delete or overwrite household data.

The Web is the complete user-facing finance product: Dashboard, Transactions, Receipts, Groceries, Recurring, Reimbursements, Insights, Settings, and the Attention/task surface. Android is a private native companion/collector, not a second finance UI. It receives SMS and financial notifications, queues evidence durably, syncs to the authenticated backend, runs maintenance WorkManager, posts local reminders, and routes taps into the Web. Canonical household truth is shared backend state; Android local state is queue/snapshot/dedupe support only.

Rejected Alpha alternatives include a second native finance UI, WebView/TWA replacement, FCM dependency, minute polling, exact alarms, local parallel receipt truth, LAN-only Daily-use Alpha, dual writable local/cloud authorities, manual history reconstruction, UI scraping, and synthetic replacement of real household state.

## 3. Current architecture

### Web

Authenticated Hebrew/RTL finance workflows cover imports, corrections, cash, receipts, review/link-before-create, expected documents, tasks, Attention, rewards, maintenance, and shared-state convergence. Receipt uploads preserve originals, support image/PDF, extraction/review, matching and linking. Authenticated reads and mutations are household-scoped.

### Android

`com.familyfinance.app` collects supported SMS and financial notification evidence, including Wallet observability. `SmsReceiver`, candidate detection, normalization, persistence, durable evidence queue, `FinancialEvidenceSyncWorker`, and fresh-session sync preserve stable external IDs and retry safely. Maintenance uses a unique periodic WorkManager job, production interval approximately 12 hours, network constraints, fresh authenticated sessions, worker-owned `maintenance_run_marker.xml`, stable notification keys, dedupe, cancellation, and Web Attention routing. Receipt reminder work is event-triggered and delayed, not periodic minute polling.

### Backend

Node/TypeScript backend owns authenticated household finance state, Gmail state, ingestion, provenance, dedupe/idempotency, transaction/receipt links, maintenance tasks, expected documents, and shared receipt-status resolution. Current authoritative endpoint remains `GET /api/finance/evidence-status/:externalSourceId`, with `resolved`, `pending`, `not_found` ingestion states and `present`, `absent`, `unknown` receipt states. Pending/unknown/not-found must never be treated as absent.

### Persistence and target

Local canonical blobs are `.local/finance-state.enc` and `.local/gmail-state.enc`, encrypted in FFG1 format (AES-256-GCM). Preferred Alpha target is remotely reachable Cloud Run with private GCS-backed state and Secret Manager, with one canonical writable authority at a time.

## 4. Repository/runtime facts

- Repository: `C:\Users\gaya\Downloads\family-finance-codex-starter`
- Branch: `main`
- HEAD at handoff creation: `e9c774c`
- Android project: `android/KasahunFamilyFinance`
- Package: `com.familyfinance.app`
- Physical device: `RFCW114QRLR` (Samsung SM-A336E), when connected.
- ADB: `C:\Users\gaya\AppData\Local\Android\Sdk\platform-tools\adb.exe`
- Latest known local Web/backend listeners included Web on `192.168.1.143:4173` and backend on `192.168.1.143:8095`; runtime ports are not permanent assumptions.
- Working tree is intentionally mixed and dirty; preserve it.

## 5. Git and safety rules

Do not run `git add .`, `git add -A`, reset, checkout, stash, cleanup, or broad deletion. Do not discard unrelated changes. Do not commit or push unless explicitly requested. Never put secrets, credentials, private household state, raw SMS/Wallet evidence, or private device artifacts in Git. Distinguish source implementation from installed/live behavior. Existing uncommitted safety tooling is intentional.

## 6. Standing reporting contract

Every task report must include: WHAT CHANGED; WHAT WAS VERIFIED; FAILURES / ATTEMPTS; TESTS / EVIDENCE; GIT / LOCAL STATE; CURRENT PRODUCT STATE; NEXT STEP; ALPHA STATUS. Use only PASS, FAIL, NOT VERIFIED, or BLOCKED where applicable. Separate automated, synthetic, emulator, physical-device, natural real-world, and narrow real-household evidence. Never imply that source presence proves device behavior or that foreground proves background behavior.

## 7. UX Decision Archive

Canonical archive: `portfolio-evidence/ux-decisions/`, with `MASTER_INDEX.md`, `decisions/`, `MERGE_RULES.md`, and incoming packets under `incoming/codex/`. Canonicalization is separate from the Portfolio UI; do not edit canonical records during ordinary development. Before a material UX/Product/System Trust finding, read the index, relevant canonical decision, and merge rules, then queue one semantic packet. Packets must distinguish USER-STATED NEED, DESIGN INFERENCE, IMPLEMENTED, VERIFIED, validation ceiling, evidence, failures, limitations, and public/private visibility.

Important canonical decisions include shared canonical household state, household-scoped auth/no mock fallback, source-agnostic finance, Attention escalation, receipt review/link-before-create, privacy-preserving evidence, shared-truth reminders, receipt-expectation grace window, and real-world financial-state validation before exposure. The 2026-08-30 write-freeze packet is incoming only; canonical records remain unchanged.

## 8. Core capabilities already verified

### PASSED

- Authenticated Web household flow and shared state.
- Imports, persistence, dedupe, Quick Edit, Quick Cash, receipt upload/review/matching/linking, original-file preservation, expected documents, Attention, rewards, and cross-client completion through focused/synthetic Web tests.
- Historical missing-receipt identity/deduplication bug is CLOSED.
- Android current-APK notification tap to authenticated Web Attention passed in Phase A; stale-APK routing blocker is CLOSED.
- Real Discount bank-transfer SMS narrow validation: valid evidence can be captured and correctly classified as receipt-not-expected; do not generalize to all banks/formats.
- Natural background WorkManager scheduling and worker-owned marker were physically demonstrated under temporary QA cadence; production 12-hour timing itself was not separately observed.
- Receipt reminder vertical slice has synthetic and physical-device evidence for authoritative absent/present behavior, one-reminder dedupe, and tap into the existing receipt-capture flow as previously recorded.
- Focused write-freeze tests: 15/15 relevant backend tests pass (including 2 freeze-specific tests); rotation utility tests previously passed 2/2.

### NOT VERIFIED / debt

- Remote backend deployment and outside-home Android access.
- Live write-freeze activation in the running backend.
- Real encryption-key recovery and migration.
- Phase B successful authenticated remote shared-state fetch/notification correlation remains open in the current Alpha record despite prior scheduler behavior proof.
- Phase C zero-task suppression/cancellation remains open.
- Google Wallet natural purchase path remains platform-blocked and must not be called PASS.

## 9. Receipt reminder state

User requirement: after an eligible real transaction, allow a short cross-source grace window (target about 60 seconds, with Android scheduling limits), then query authoritative shared state and remind only when the transaction is resolved and receipt is absent. Receipt expected now includes supermarket, kiosk/convenience, restaurant/café, pharmacy, clothing/retail, and physical merchants. Digital-later purchases do not trigger an immediate physical reminder. Transfers, fees, refunds, deposits/withdrawals, investments, loans, standing orders, and person-to-person transfers are receipt-not-expected.

Transaction evidence is not itemized receipt evidence; never invent items. The backend status contract is authoritative and preserves pending/unknown/not-found uncertainty. Android uses delayed one-time work, stable IDs, backend status, dedupe, and the existing receipt workflow on tap. Automated, synthetic, and physical-device checks have covered absent/present suppression and duplicate behavior as documented in prior reports; broader real-household coverage remains narrow.

## 10. SMS and Wallet state

SMS ingestion includes candidate filtering, normalization, persistence, queueing, sync, and stable external IDs. A Discount security/authorization-code SMS was correctly treated as non-transaction evidence when it lacked a financial transaction signal; this is correct semantic rejection, not missing evidence. The real Discount transfer SMS narrow event was captured and excluded from receipt expectation. Wallet diagnostics/observability exist, but platform limitations prevent claiming a natural Wallet purchase path PASS. Do not request another purchase solely for QA.

## 11. WorkManager / background maintenance

The unique periodic Family Finance maintenance job is production-configured at approximately 12 hours after QA cadence restoration. Natural background scheduling, `foreground=false`, worker-owned marker, and scheduling behavior were physically demonstrated under a temporary 15-minute QA interval. Previous failed natural execution stopped at `MaintenanceWorker → MaintenanceSyncClient.postSession()` because the household backend was unavailable; classification was environment/reachability, not worker logic.

The successful authenticated shared-state fetch, fresh snapshot, notification decision, and dedupe correlation remain the required Phase B boundary. Do not force Jobscheduler, invoke the worker manually, use foreground refresh, or change the production interval. Do not reopen already-passed scheduling proof unless new evidence invalidates it.

## 12. Remote Backend Alpha requirement

A continuously reachable remote backend is a mandatory Daily-use Alpha prerequisite, not post-Alpha debt. Receipt-status checks must work away from home; Android evidence sync must not depend on home LAN; background maintenance must reach shared state remotely; and household use must not depend on a PC remaining powered on. Preferred architecture is Cloud Run + private GCS state + Secret Manager, with cost-conscious deployment and no local/cloud split-brain writes. Android endpoint must not change until cloud state is validated.

## 13. Encryption and migration status

Canonical finance state: `.local/finance-state.enc`; canonical Gmail state: `.local/gmail-state.enc`. Both use FFG1 encrypted JSON. The available repository `.env` key decrypts Gmail but fails finance with an authentication/decryption error. The original active finance key remains unknown. The currently running backend is the only proven reader of canonical finance state. Restarting with the known-wrong `.env` key is unsafe and prohibited.

The live process serving port 8095 was identified as Node PID `18844`, executable `C:\Program Files\nodejs\node.exe`, start time `2026-08-24 16:23:52`; process environment inspection was denied. No active key has been recovered, compared to Secret Manager, or provisioned. No rotation, GCS upload, Cloud Run deployment, or encrypted-blob rewrite occurred.

## 14. Migration safety tooling

`scripts/rotationUtility.mjs` provides FFG1-compatible, schema-validated, staging-only rotation behavior with stable identity/link checks, refusal to overwrite canonical destinations, and no plaintext persistence. `tests/rotationUtility.test.mjs` previously passed 2/2.

`backend/writeFreeze.ts` defines `WriteFreezeController` and `WriteFrozenError`. `backend/storage.ts` guards Gmail repository `write`/`update`; `backend/financeStorage.ts` guards finance repository `write`/`update`. `backend/server.ts` wires one controller, exposes authenticated internal status/freeze/release control, and maps frozen mutations to HTTP 423. `backend/config.ts` supports `WRITE_FREEZE_TOKEN` with scheduler-token fallback. Focused freeze and regression tests passed 15/15 relevant tests; static mutation-path audit passed.

These protections are implemented in current source only. They are NOT active in the currently running backend until a safe restart occurs.

## 15. Failed/rejected migration approaches

- Restarting with the `.env` finance key: rejected because it cannot decrypt canonical finance state.
- Windows process-environment inspection: blocked by permissions; no destructive attach or termination performed.
- Launch-history search: yielded no usable active-key source.
- Hot/in-process migration: no proven capability in the already-running process; adding source files does not hot-reload Node.
- API snapshot reconstruction: incomplete and unsafe; authenticated `getHouseholdState()` calls maintenance mutation and omits internal/idempotency fields.
- UI scraping, manual re-entry, synthetic/bootstrap replacement, canonical blob overwrite, and dual-writer migration: rejected for data-integrity reasons.

## 16. Latest exact blocker

`REMOTE BACKEND ALPHA BLOCKER STATUS: BLOCKED — WINDOWS/ADMIN ACCESS REQUIRED`

The active finance encryption key cannot currently be inspected or verified. The local backend remains running and canonical data remains untouched. Cloud migration, safe restart, live freeze activation, and remote Alpha deployment are blocked until the active key or an equivalent complete canonical migration source is recovered.

## 17. CURRENT NEXT STEP

Keep PID 18844 running. Obtain authorized Windows Administrator read-only inspection of its environment (for example, Process Explorer → PID 18844 → Properties → Environment), locate `STATE_ENCRYPTION_KEY` without displaying or transmitting it, and privately verify decrypt PASS, parse PASS, and expected finance-schema PASS against `.local/finance-state.enc`. Do not restart or migrate in that recovery task. If recovered, compare privately with `.env` and Secret Manager and report equality only as YES/NO.

## 18. Planned sequence after recovery

1. Verify and securely preserve the active finance key.
2. Perform controlled staging-only migration with originals untouched and write freeze active.
3. Deploy and validate Cloud Run/GCS/Secret Manager remote backend.
4. Confirm remote finance/Gmail integrity and avoid dual writers.
5. Update Android endpoint only after cloud validation.
6. Verify Android outside-home access.
7. Close Phase B successful remote fetch/notification/dedupe boundary.
8. Complete Phase C zero-task suppression/cancellation.
9. Make explicit Daily-use Alpha readiness decision and stop feature development when ready.

## 19. Alpha gate matrix

| Area | Status |
|---|---|
| Phase A notification → authenticated Attention | PASS |
| Receipt reminder vertical slice | PASS (recorded current vertical-slice evidence; broader coverage limited) |
| SMS natural Discount transfer validation | PASS (narrow real-household evidence) |
| Wallet natural-event validation | BLOCKED — Android platform limitation |
| WorkManager natural scheduling behavior | PASS under QA cadence |
| Phase B authenticated fresh remote fetch + notification/dedupe | OPEN / NOT VERIFIED |
| Remote Backend | BLOCKED |
| Phase C zero-task suppression | OPEN |
| Daily-use Alpha readiness | NOT READY |

## 20. Critical DO NOT rules

- Do not restart, stop, kill, suspend, or replace the current backend before active-key safety is established.
- Do not generate a replacement key, overwrite encrypted blobs, upload to GCS, deploy Cloud Run, or change Android endpoint yet.
- Do not treat API-visible state as complete canonical persistence without proof.
- Do not create dual writable authorities.
- Do not fabricate transactions, receipts, state, device evidence, or validation.
- Do not expose secrets, private household evidence, raw SMS/Wallet content, or credentials.
- Do not force WorkManager or reopen completed scheduling QA.
- Do not begin Phase C while remote backend/Phase B prerequisites remain unresolved.

## 21. Verification debt

Blocking: active finance-key recovery, safe restart, canonical migration, remote backend, Phase B successful remote fetch, and Phase C. Non-blocking or platform-limited: natural Wallet event, production 12-hour timing as a separate device observation, broader bank/SMS coverage, and future native/Google AI Studio exploration. The latter is post-Alpha and must not begin now.

## 22. Historical decisions that must survive

Web is the full product; Android is a companion. Household truth is shared, source-agnostic, authenticated, deduplicated, and uncertainty-aware. Attention is exception-first. Receipt reminders require receipt expectation classification, a grace window, authoritative absence, and transaction context. Digital documents and transfers have different receipt semantics. Exact itemization is not invented when uncertain. Remote reachability is an Alpha requirement. Local/cloud split-brain is prohibited. Daily-use Alpha is practical readiness, not endless QA perfection.

## 23. Important files/components

Android: `android/KasahunFamilyFinance/app/src/main/java/com/familyfinance/app/` including SMS, notification, evidence, maintenance, and receipt packages; `MainActivity.kt`; manifest; Gradle config.

Backend: `backend/server.ts`, `config.ts`, `auth.ts`, `storage.ts`, `financeStorage.ts`, `financeDataService.ts`, `financeIngestionService.ts`, `syncService.ts`, `writeFreeze.ts`.

Migration/tests: `scripts/rotationUtility.mjs`, `tests/rotationUtility.test.mjs`, `tests/writeFreeze.test.mjs`, finance/ingestion/maintenance/receipt tests.

Archive: `portfolio-evidence/ux-decisions/MASTER_INDEX.md`, `MERGE_RULES.md`, relevant `decisions/`, and incoming `codex/` packets.

## 24. Current Git/local state

At creation: branch `main`, HEAD `e9c774c`, no commit or push for this handoff. The working tree contains substantial existing mixed Android/backend/Web/config/test changes plus local/runtime directories and incoming archive packets. Do not clean or reset them. The live backend predates the current write-freeze source changes.

## 25. DO NOT LOSE THESE FACTS

- Remote Backend is mandatory for Alpha.
- Active finance key is unrecovered; `.env` key is wrong for finance.
- Current backend must not be restarted.
- Canonical blobs remain untouched and are the rollback authority.
- WorkManager scheduling proof already passed under QA cadence; do not wait for or recreate it.
- Receipt reminder and Phase A evidence must not be reopened without regression.
- Write freeze exists in source but is not live-active.
- Current next step is authorized admin read-only recovery of PID 18844’s active key.
- Daily-use Alpha remains NOT READY.

## 26. Instruction to the new ChatGPT

Continue from the CURRENT NEXT STEP in this document. Preserve every previous PASS, NOT VERIFIED item, blocker, architectural decision, and safety constraint exactly as written unless new evidence changes it. Do not begin later planned steps merely because they are listed. Do not ask the user to restate information contained here. Never expose secrets or private household evidence.
