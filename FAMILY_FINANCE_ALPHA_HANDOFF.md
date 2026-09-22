# Family Finance — Daily-use Alpha Handoff

## Project goal

Immediate goal: **Daily-use Alpha for the real household.** Once the Alpha is genuinely usable, stop adding features and begin real-world use; future work should be driven by actual friction.

## Final Alpha architecture decision

### Web

The existing Web app is the full user-facing Family Finance product: Dashboard, Transactions, Receipts, Attention, Tasks, Data Sources, imports, corrections, cash, expected documents, and the other existing screens.

### Android

Android is a private native companion/collector for SMS ingestion, Google Wallet/financial-notification ingestion, evidence queue and sync, periodic maintenance polling, local reminders, and notification routing toward the Web experience.

Do not rebuild the Web UI natively, add a WebView/TWA wrapper, create a second finance UI, redesign authentication, or add FCM/cloud push. Option B (one Android wrapper) was rejected for Alpha because auth/session, uploads, navigation, deep links, and wrapper infrastructure make it medium-to-large work. Reconsider only after real usage.

## Verified milestones

Do not reopen these without a concrete regression:

- household authentication boundary;
- shared transactions and corrections;
- browser import and dedupe;
- Quick Edit and Quick Cash cross-client persistence;
- receipt upload/save/link and cross-client persistence;
- no mock fallback;
- shared missing-receipt completion;
- shared expected-document completion;
- Attention/shared maintenance state;
- exactly-once reward and dedupe behavior.

Relevant checkpoints include `7eeea06` (Complete shared core finance browser flows), `40def4e` (Fix authenticated backend bootstrap), and `5a71c4d` (Share household maintenance state).

## Current Git state

- Branch: `main`
- HEAD: `5a71c4d`

Modified:

- `.dockerignore`
- `Dockerfile`
- `android/KasahunFamilyFinance/app/build.gradle.kts`
- `android/KasahunFamilyFinance/app/src/main/AndroidManifest.xml`
- `android/KasahunFamilyFinance/app/src/main/java/com/familyfinance/app/MainActivity.kt`
- `backend/financeDataService.ts`
- `backend/server.ts`
- `src/app.js`

Untracked:

- `.android-local/`
- `.gradle-local/`
- `android/KasahunFamilyFinance/app/src/main/java/com/familyfinance/app/maintenance/`

Ignored/local: `android/KasahunFamilyFinance/local.properties`, `.local/` encrypted state, generated APK/build output, private screenshots/evidence, and device logs. The tree contains mixed work and must not be blindly committed as one milestone.

## Secret and local-only boundaries

Never commit or print local.properties, machine IPs, human Web passwords, household credentials, connector tokens, auth signing secrets, `STATE_ENCRYPTION_KEY`, backend master secrets, `.local` state, device logs, private screenshots, or generated Android output.

## Current Android state

Package: `com.familyfinance.app`; module: `android/KasahunFamilyFinance/app`.

`MainActivity` is primarily a diagnostic/collector harness and historically shows “Family Finance – SMS Test”. SMS receiver, NotificationListenerService, Google Wallet parser, evidence persistence/queue, backend evidence sync, notification-access setup, and local maintenance client/notifier exist in the working tree. No WorkManager or AlarmManager maintenance scheduler exists yet.

Android 13+ notification permission was granted manually through ADB during device testing; normal runtime permission UX still needs implementation/verification.

## Google Wallet status

The existing real Wallet notification predated listener activation and was not retroactively delivered. Status: **PLATFORM BLOCKED PENDING NEXT NATURALLY OCCURRING GOOGLE WALLET NOTIFICATION**. Do not require a new payment solely for testing.

## Remaining Alpha blocker

Outgoing Android reminder delivery remains the blocker. Opening the companion manually is insufficient. Required path:

`WorkManager → MaintenanceSyncClient → shared maintenance state → deterministic eligibility/dedupe → MaintenanceNotifier`

WorkManager delivery must be described as best-effort periodic work, never exact-time push.

## Remaining acceptance tests

Verify normal notification permission UX; unique periodic WorkManager scheduling; locked-phone maintenance fetch; notification while the app is backgrounded; repeat-worker dedupe; practical process-death resilience; Web completion suppressing the next Android reminder without reopening Android; and notification tap routing toward Web Attention/task. Google Wallet may wait for the next natural notification.

## Working rules

Use Codex only when repository, build/install, runtime/device, Git, browser E2E, or environment inspection is genuinely required. Keep tasks narrow, preserve uncommitted work, avoid destructive Git operations, and never push/merge/publish or commit local/private material without explicit instruction.

## Portfolio evidence

Preserve truthful screenshots, decisions, regressions, fixes, authentic before/after evidence, architecture decisions, and test evidence. Do not fabricate historical BEFORE states. Portfolio work is secondary to Alpha readiness.

## Next task

Prepare the Android companion for background maintenance reminders without changing the Web architecture. First inspect current local maintenance changes; then implement only standard Android 13+ permission UX, WorkManager periodic polling, reuse of `MaintenanceSyncClient` and `MaintenanceNotifier`, feasible Web Attention/task tap routing, and physical-device verification. Do not implement WebView/TWA, rebuild UI, add FCM, redesign auth, or expand scope.
