# Family Finance — Master Handoff for a Fresh Codex Thread

Status date: 2026-08-24  
Repository: `C:\Users\gaya\Downloads\family-finance-codex-starter`

This document is the long-form source of truth for the current private Alpha. It preserves decisions, verified behavior, known failures, local-only boundaries, and the exact next task. It is intentionally more complete than `FAMILY_FINANCE_ALPHA_HANDOFF.md`.

## 1. Product vision and Alpha principle

Family Finance is a private, Hebrew-first household finance product for two people sharing one household scope. It covers expenses, income, receipts, reimbursements/refunds/transfers, recurring obligations, expected documents, attention items, corrections, and lightweight task/XP feedback.

The governing Alpha principle is: once Daily-use Alpha is genuinely usable, stop adding features and begin real household use. New work should come from observed household friction, not speculative feature expansion. The project is also preserved as a portfolio case study; claims must be evidence-backed and must not imply real adoption where only synthetic/local verification exists.

Financial integrity rules remain mandatory: preserve provenance and original evidence, deduplicate imported data, keep micro-categories, and never silently reinterpret transfers, refunds, reimbursements, or wallet evidence as ordinary income/expense.

## 2. Repository and environment

- Repository: `C:\Users\gaya\Downloads\family-finance-codex-starter`
- Web dev command: `npm run dev` (the Vite Web server has commonly used port 4173; verify the actual port rather than assuming it).
- Backend dev command: `npm run backend` (the backend port has varied during isolated tests, including 8080, 8081, 8094, and 8095; inspect the active process/config before browser tests).
- Android project: `android/KasahunFamilyFinance`
- Android module: `android/KasahunFamilyFinance/app`
- Android package: `com.familyfinance.app`
- Typical APK output: `android/KasahunFamilyFinance/app/build/outputs/apk/debug/app-debug.apk`
- Physical device previously used: `RFCW114QRLR`
- Android SDK platform tools: `C:\Users\gaya\AppData\Local\Android\Sdk\platform-tools\adb.exe`
- Android Studio JBR: `C:\Program Files\Android\Android Studio\jbr`

Android builds use local Gradle/JDK setup under `.android-local/` and `.gradle-local/` when present. `local.properties` is machine-specific and ignored. Backend origin, connector token, and local household test configuration must be read from the local environment/config, never copied into source or this handoff.

## 3. Working rule with Codex

Use ChatGPT directly for reasoning, audits, and prompt shaping when repository/runtime access is unnecessary. Use Codex for repository inspection, edits, builds, installs, browser/device E2E, Git, and environment/runtime inspection.

Standing rules:

- Keep tasks focused and reuse existing boundaries.
- Search before opening broad file sets.
- Do not silently expand scope.
- Do not use destructive Git operations; preserve existing uncommitted work.
- Never push, merge, publish, or commit secrets/private evidence.
- Prefer deterministic, local, free, open-source/platform capabilities.
- Do not claim a behavior is verified without a reproducible check or truthful evidence.

## 4. Important Git milestones

Known relevant commits (short hashes are sufficient for navigation):

- `1f88ee3` — Reduce daily finance friction and add evidence capture (`1f88ee396892ae15621db7d3e7dc67279760c2a2`)
- `8073672` — Add household-scoped Web authentication (`8073672e61649eee4008fa0dbae51de868751917`)
- `65d8908` — Add shared household finance backend (`65d8908cb8ce8d33c7b45cdc85de11b2b15e08e1`)
- `2ebde11` — Add authenticated Web finance bootstrap (`2ebde11f40947decd1538160855c1d17bb4c021a`)
- `b730a3a` — Add authenticated real ledger import (`b730a3a8de5a2075fc644530b46cc3264f8c244f`)
- `40def4e` — Fix authenticated backend bootstrap (`40def4e7e950ecf9213c524fcf47b04e33597068`)
- `7eeea06` — Complete shared core finance browser flows
- `5a71c4d` — Share household maintenance state
- `2f826be` — Add monthly document reminders
- `bc2362f` — Surface missing receipts in Attention
- `a0d49ef` — Add persistent transaction quick edit
- `815f74d` — Verify SMS Attention flow on real device

Current HEAD is `5a71c4d` on `main`; the working tree is intentionally not a clean checkpoint.

## 5. Auth architecture

The private Alpha Web boundary uses two environment-configured synthetic/pre-provisioned human users in one shared household. Credentials are verified server-side. Successful login returns a short-lived signed HMAC session. The backend derives `userId` and `householdId` from the verified session; a client-submitted household ID cannot switch scope.

Endpoints:

- `POST /api/auth/session`
- `GET /api/auth/me`

Missing, invalid, or expired sessions return 401. Android ingestion/device authentication is deliberately separate from Web human auth. Never put Web passwords, `AUTH_SIGNING_SECRET`, `STATE_ENCRYPTION_KEY`, connector tokens, backend master secrets, or equivalent secrets in frontend or Android source.

## 6. Shared finance backend

The authenticated backend owns household finance state and encrypted persistence. Main APIs are:

- `GET /api/finance/state` — authenticated household state read.
- `PATCH /api/finance/transactions/:id` — in-place correction by stable ID.
- `POST /api/finance/cash` — idempotent manual cash creation.
- `POST /api/finance/receipts` — receipt save/link persistence.
- `POST /api/finance/import` — authenticated import with provenance and dedupe.

Transactions retain stable IDs, source/provenance, receipt links, categories, financial semantics, versions, and `updatedAt` metadata. `If-Match`/version checks provide stale-write 409 protection. `Idempotency-Key` protects cash/import/other supported mutations from duplicate retries. Re-importing the same source identity is deduplicated; edits update an existing transaction rather than creating a replacement. Receipts remain evidence records and may link to a canonical transaction. `BackendFinanceDataService` adapts the Web UI to this backend.

Mock data is available only through explicit demo mode (`?demo=1`). Authenticated/bootstrap or backend failures do not silently fall back to mock/demo finance data; honest empty state is allowed.

## 7. Verified core Web flows

These flows were exercised through the real authenticated browser UI and should not be reopened without a concrete regression:

- Browser file import parses a supported fixture, approves at least one row, persists to the backend, survives re-authentication, and is visible to User B in the same household.
- Re-import of the same stable identity creates no duplicate canonical transaction.
- Quick Edit updates merchant/description, amount, date, macro category, and micro-category by stable ID; corrected values persist and affect summaries without changing provenance or creating a duplicate.
- Quick Cash persists through the backend, is idempotent, and is visible to User B.
- Receipt upload/review/match/save/link reaches the shared backend; the link survives reload/re-authentication and is visible to User B; no duplicate transaction was observed.
- Authenticated bootstrap selects `BackendFinanceDataService`; no mock fallback appears after backend/auth failure.
- CORS was adjusted for PATCH, `If-Match`, and `Idempotency-Key` where required.

Evidence includes local screenshots such as `local-browser-import-after.png`, `local-browser-import-persisted-after.png`, `local-receipt-after.png`, `local-receipt-linked-after.png`, and `local-receipt-client-b-after.png` under the ignored portfolio screenshot tree. Synthetic fixtures and credentials remain local-only.

## 8. Maintenance / Attention architecture

Maintenance state is household-scoped and durable in the backend. It includes missing-receipt tasks, expected documents, completion state, reward events, dedupe keys, and Attention-derived actionable items. Existing rules include deterministic missing-receipt eligibility and current-month expected documents (Rehabilitation Department document due on day 1; credit-card statement/charge details due on day 2). Repeated initialization is idempotent; historical periods remain intact. Completion updates shared state and reward/XP is exactly once. Attention consumes the shared state, so two authenticated clients converge after refresh.

Focused shared-maintenance tests passed 4/4 during implementation; the broader Web suite baseline passed 230/230. Fresh isolated missing-receipt verification also passed focused receipt/missing-receipt tests 8/8.

## 9. Missing-receipt bug and fix — CLOSED

The important failure was not a task-engine design problem. A synthetic receipt's content hash matched an older receipt already linked to a different transaction. Backend deduplication reused that receipt, so the intended missing-receipt transaction never received a `receiptId`; its task therefore remained open.

The smallest fix was applied at the existing boundary:

1. Preserve the missing-receipt deep-link transaction ID when automatic matching returns no result.
2. If an existing receipt with the same content hash is already linked to a different transaction, do not reuse it; create a distinct receipt record.

Fresh isolated E2E PASS: User A uploaded a new unique synthetic receipt, linked it to the intended old expense, and closed the task. The transaction receipt link and task completion survived re-authentication. User B saw the same linked receipt and no active missing-receipt task. No duplicate transaction/task/receipt/reward was created; exactly one reward event was observed. Evidence: `fresh-missing-receipt-after.png` and `fresh-missing-receipt-client-b-after.png`. Treat this blocker as closed unless a new concrete regression appears.

## 10. Web product/UI architecture

The Web is the complete user-facing Alpha product. Existing routes/views cover Dashboard, Transactions, Receipts, Groceries, Recurring expenses, Reimbursements, Insights, Settings, Data Sources, File Import, Attention, Tasks, and Madrid. Mobile navigation is primary; lower-frequency actions use existing drawers/action menus. The contextual cash action belongs in Transactions, not as a global always-visible FAB. Attention contains maintenance summaries/cards and preserves existing actions. Hebrew/RTL presentation and micro-category semantics remain product requirements.

## 11. Android project history and current role

Android began as an SMS/financial-notification connector and diagnostic harness, not as a second finance UI. Current native capabilities in the working tree include:

- SMS receiver, local filtering/normalization, persistent evidence queue, and backend evidence sync;
- `NotificationListenerService` with Google Wallet/financial-notification parsing and notification-access setup;
- maintenance sync client and local maintenance notifier;
- diagnostic/test `MainActivity`.

`MainActivity` is not the full Family Finance finance UI. The installed/debug APK has historically shown a collector/test surface (including “Family Finance – SMS Test”) with maintenance controls lower in the screen. Do not validate that harness as though it were the Web product.

## 12. Final Alpha architecture decision

### Web

Full UI and day-to-day finance product: login, ledger, corrections, cash, receipts, imports, Attention, tasks, expected documents, dashboard, and summaries.

### Android

Private companion/collector for SMS ingestion, Google Wallet/financial notifications, background maintenance polling, local Android reminders, and notification tap routing toward the Web.

Do not rebuild Web UI natively, create a second finance UI, add a WebView/TWA wrapper, add FCM/cloud push, or redesign auth for Alpha. Option B (wrapper) was audited and rejected because session/auth handoff, uploads, navigation, deep links, wrapper infrastructure, and testing make it medium-to-large work. It may be reconsidered after real use.

## 13. Google Wallet status

An existing real Wallet notification was visible, but it predated active listener delivery. Android does not retroactively deliver an old notification to a newly bound listener. Status: **PLATFORM BLOCKED PENDING NEXT NATURALLY OCCURRING GOOGLE WALLET NOTIFICATION**. This is not currently a proven product-code bug and should not justify a purchase solely for testing.

## 14. Android notification/background status

`POST_NOTIFICATIONS` was previously granted manually through ADB. Normal Android 13+ runtime permission UX still needs implementation/verification. No WorkManager/AlarmManager maintenance scheduler currently exists; foreground-only reminders are insufficient for daily use.

Required path:

`WorkManager → MaintenanceSyncClient → shared maintenance state → deterministic eligibility/dedupe → MaintenanceNotifier`

WorkManager is best-effort periodic execution, not exact-time push. The implementation must preserve dedupe and suppression after Web completion, and tolerate background/process-death conditions as far as Android allows.

## 15. Android auth/config status

Android backend origin and connector/maintenance configuration are supplied through local BuildConfig/local.properties mechanisms. Machine-specific URL, household test values, and tokens are local-only. A malformed local.properties line previously concatenated two backend URL assignments and caused a misleading sync failure; it was corrected after inspecting generated BuildConfig. Future debugging must inspect the actual generated APK/config and active backend rather than assuming host/port.

Never embed Web human credentials, signing secrets, state-encryption keys, or backend master secrets in the APK. If production device maintenance auth needs hardening, use the smallest server-scoped device credential restricted to one household and maintenance read access; do not silently broaden connector privileges.

## 16. Current working tree

Exact state at handoff creation:

- Branch: `main`
- HEAD: `5a71c4d`

Modified:

- `.dockerignore` — deployment/container ignore changes.
- `Dockerfile` — deployment/container build changes.
- `android/KasahunFamilyFinance/app/build.gradle.kts` — local Android build/config changes.
- `android/KasahunFamilyFinance/app/src/main/AndroidManifest.xml` — Android permission/service declarations.
- `android/KasahunFamilyFinance/app/src/main/java/com/familyfinance/app/MainActivity.kt` — connector/diagnostic/maintenance harness changes.
- `backend/financeDataService.ts` — shared finance/receipt/maintenance backend behavior, including the receipt identity fix.
- `backend/server.ts` — authenticated/shared API and runtime configuration changes.
- `src/app.js` — Web backend wiring, receipt/deep-link compatibility, and maintenance/UI integration.

Untracked:

- `.android-local/` — local Android build tooling/state.
- `.gradle-local/` — local Gradle tooling/state.
- `android/KasahunFamilyFinance/app/src/main/java/com/familyfinance/app/maintenance/` — maintenance sync/notifier implementation currently being developed.
- `FAMILY_FINANCE_ALPHA_HANDOFF.md` — shorter operational handoff.
- This file, `FAMILY_FINANCE_MASTER_HANDOFF.md`.

These groups are mixed deployment, Android, backend, and Web work. Do not blindly stage or commit the whole tree. Inspect a diff and stage only a named milestone.

## 17. Local-only / never commit

Never commit or print:

- `android/KasahunFamilyFinance/local.properties`;
- machine IPs and local backend origins when machine-specific;
- Web passwords, household credentials, connector tokens;
- `AUTH_SIGNING_SECRET`, `STATE_ENCRYPTION_KEY`, backend master secrets;
- `.local/` encrypted finance state and temporary synthetic state;
- `.android-local/` and `.gradle-local/` when generated/local;
- APK/build output and device logs;
- private screenshots/evidence and temporary fixtures.

Use process-only or ignored local environment for test credentials. Portfolio evidence must be redacted/synthetic and must never contain tokens or personal financial identifiers.

## 18. Portfolio evidence

The repository has a Playwright evidence workflow and a `portfolio-evidence/README.md` claim log. Evidence is for truthful claims only: record milestone, screenshot path, verified behavior, limitation, and working-tree/commit reference. Do not fabricate historical BEFORE screenshots; mark them unavailable when authentic recovery is impossible. Bugs and their fixes are valuable case-study evidence. Portfolio website development is separate from Alpha feature work.

Known meaningful evidence includes shared maintenance and fresh missing-receipt screenshots named above, plus local browser import and receipt screenshots. PNG binaries are normally ignored/local.

## 19. Acceptable post-Alpha friction

These should not block the current Alpha gate unless real use demonstrates unacceptable impact:

- re-login/session persistence friction;
- Madrid still demo/incomplete;
- classification learning not fully shared;
- no full cash-wallet/reconciliation system;
- no cloud push;
- no full offline sync;
- Google Wallet real E2E waiting for a naturally occurring event.

Do not use these as reasons to reopen verified Web finance flows or build speculative infrastructure.

## 20. Daily-use Alpha status

### PASS / effectively verified

- Authenticated two-user household boundary and no silent mock fallback.
- Shared encrypted finance state, import, dedupe, Quick Edit, Quick Cash, and receipt persistence.
- Cross-client visibility and re-authentication persistence for core browser finance flows.
- Shared missing-receipt task generation/completion and receipt-link closure.
- Shared expected-document records and Attention maintenance state.
- Deduplication and exactly-once reward/XP behavior in focused verification.
- SMS Android capture/queue/sync vertical slice and Web Attention staging flow.

### Still required before declaring READY

Only Android reminder/delivery work remains:

- normal Android 13+ notification permission UX;
- unique periodic WorkManager scheduling;
- background/locked-phone maintenance fetch;
- local notification delivery;
- repeat-worker dedupe;
- practical process-death resilience;
- Web completion suppressing the next Android reminder;
- notification tap routing toward Web Attention/task.

Google Wallet remains a platform/event dependency, not a reason to redesign the parser.

## 21. Remaining Alpha acceptance tests and classification

For each remaining test, label failures precisely:

- **Product-code bug:** reproducible behavior fails with valid local setup and current source.
- **Environment/setup problem:** wrong port, stale APK, missing permission, malformed local config, or dead backend process.
- **Test-fixture issue:** synthetic data is ineligible, already deduplicated, collides by content hash, or uses an unsupported identity.
- **Android platform limitation:** OS does not deliver retroactive notifications or imposes background/permission constraints.

Do not report a vague “blocked” state without this classification and the first concrete failing boundary.

## 22. Exact next task

The next Codex thread must perform one task only: prepare and physically verify Android background maintenance reminders while preserving the existing architecture.

Before editing, inspect the current local Android maintenance files and the diff. Then implement only:

1. Android 13+ `POST_NOTIFICATIONS` runtime permission UX.
2. Unique periodic WorkManager polling.
3. Reuse `MaintenanceSyncClient` and existing shared-state eligibility/dedupe.
4. Reuse `MaintenanceNotifier`.
5. Safe notification tap toward Web Attention/task if supported.
6. Physical-device verification, including background/locked-phone behavior.

Do not build WebView/TWA, rebuild the UI, add FCM, redesign auth, revisit verified Web flows, or expand product scope. Do not execute this task while creating this handoff.

## 23. Stop condition

Once the remaining Android acceptance tests pass and no concrete Daily-use Alpha blocker remains, declare **Daily-use Alpha READY**, stop feature development, and begin real household use. Create a backlog only from observed real-world friction.

