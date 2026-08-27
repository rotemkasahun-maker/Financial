# Family Finance — Full Continuity Master Handoff (2026-08-27)

## 1. Product vision and Daily-use Alpha principle
Family Finance is a Hebrew-first, RTL household finance product for expenses, income, receipts, reimbursements, recurring payments, grocery detail, insights, and maintenance tasks. Google Sheets is the initial source of truth. Preserve original evidence, deduplicate imports, distinguish gross/net and reimbursements, and never silently delete financial data. Once Daily-use Alpha is genuinely usable, stop speculative feature development and begin real household use; future backlog must come from actual friction.

## 2. Final Alpha architecture
The Web app is the complete user-facing finance product. Android is a private native companion/collector for SMS, financial notifications/Google Wallet, evidence sync, maintenance polling, local reminders, and notification routing. Alpha deliberately does not rebuild the Web UI natively, add WebView/TWA, add FCM, or redesign authentication. After Alpha, a progressive Compose migration may be explored with Google AI Studio: faithful Compose equivalent, same backend, existing native services preserved, one screen at a time.

## 3. Repository and environment
- Repository: `C:\Users\gaya\Downloads\family-finance-codex-starter`
- Android module: `android/KasahunFamilyFinance`; package `com.familyfinance.app`.
- Physical test device: `RFCW114QRLR` (Samsung SM-A336E).
- ADB: `C:\Users\gaya\AppData\Local\Android\Sdk\platform-tools\adb.exe`.
- Android Studio/JBR: Android Studio bundled JBR was used for Gradle builds.
- Web and backend ports are runtime configuration, not permanent assumptions. During the latest run Web was `192.168.1.143:4173`; backend was `192.168.1.143:8095`.

## 4. Git history and current state
Known milestones include: `8073672` household authentication; `2f826be` monthly document reminders; `bc2362f` Attention missing receipts; `815f74d` real-device SMS Attention verification; `65d8908` shared finance backend; `2ebde11` authenticated Web bootstrap; `b730a3a` authenticated ledger import; `40def4d` backend bootstrap fix; `7eeea06` shared core browser flows; `5a71c4d` household maintenance state.

At handoff creation, branch is `main`. HEAD is `5a71c4d`. `git status` was re-inspected. Existing mixed working-tree changes include Android maintenance implementation, Web/backend runtime fixes, Gradle/configuration updates, and local ignored build/runtime directories. These are intentionally not part of this documentation commit. The logical purpose is the latest Alpha implementation and troubleshooting work; do not reset, stash, or discard it.

## 5. Authentication and security architecture
Web uses household-scoped authentication and sessions. Android/device authentication is separate; local development provisioning uses BuildConfig/local-only properties and is not production hardening. Short-lived Android session tokens are no longer persisted; the sync client obtains a fresh session for each fetch. Never commit or print household credentials, auth tokens, signing keys, encryption secrets, or local.properties contents.

## 6. Shared backend architecture
The backend exposes authenticated finance state, transactions, corrections, cash, receipts, imports, maintenance/Attention, provenance, deduplication, idempotent completion, concurrency/version handling, and encrypted state semantics. Expected-document completion updates shared state and task/reward state through the authenticated endpoint; Android reads the same shared maintenance state.

## 7. Verified Web flows
Previously verified authenticated Web flows and the 230/230 Web test baseline are PASS. Do not reopen PASS flows without a concrete regression. Web build and existing finance/receipt/import/Attention flows remain the regression baseline.

## 8. Missing-receipt bug history
The historical blocker was content-hash collision and reuse of an already-linked receipt. Symptoms were a new receipt being treated as an existing linked record. The fix made deduplication/linking identity-safe and preserved the original evidence. Final real E2E passed; this blocker is CLOSED.

## 9. Maintenance and Attention architecture
Maintenance combines missing receipts and expected documents. Completing an expected document updates shared state, task completion, rewards, and Attention. Android snapshots the eligible task/document set, derives a stable notification key, posts one reminder, cancels when no longer applicable, and suppresses repeats for an unchanged key.

## 10. Android history
Android began as a collector/diagnostic harness and now includes SMS filtering, financial-notification listener/Google Wallet handling, evidence and maintenance state, local permissions UX, diagnostics, and native Compose maintenance controls. The Web remains the source of user-facing finance workflows.

## 11. Android background reminder implementation
Implemented files include `FamilyFinanceApplication.kt`, `maintenance/MaintenanceWorker.kt`, `MaintenanceWorkScheduler.kt`, `MaintenanceSyncClient.kt`, `MaintenanceNotifier.kt`, `MainActivity.kt`, manifest and Gradle/version updates. The implementation adds Android 13+ notification permission UX, WorkManager dependency, one unique periodic job with a 12-hour interval and network constraint, application-lifecycle scheduling, fresh-session sync, retry on fetch failure, stable-key notification dedupe/cancellation, and notification tap routing intended for Web `?page=attention` with a backend-origin query. Web `src/app.js` supports `?page=attention`. The installed stale APK was later proven to still route to backend port 8095; current source contains the routing fix but must be rebuilt and installed.

## 12. Build and test results
Web baseline: 230/230 tests PASS and Web build PASS. Android unit tests and debug APK build previously PASS. `git diff --check` was part of the build verification. Physical Android notification permission UX was granted. Exactly one periodic WorkManager registration was observed.

## 13. Device/backend network troubleshooting history
A malformed/local-properties and generated-BuildConfig issue initially produced incorrect runtime configuration. Physical-device reachability initially failed. After correcting the runtime host binding and using the actual Wi-Fi address, phone-side TCP and `/healthz` HTTP 200 succeeded. Earlier forced WorkManager attempts also occurred before the real periodic eligibility window; those failures were not network failures. Lesson: determine current ports/addresses and distinguish transport from scheduler timing.

## 14. ADB failure history
ADB attempted to use `\\.android` because Codex runtime `HOME`, `ANDROID_USER_HOME`, and `ANDROID_SDK_HOME` were empty. User-scoped Android environment variables were restored; no product code changed. After restart, ADB reported `RFCW114QRLR device` once the phone was connected and authorized. Preserve this troubleshooting knowledge.

## 15. WorkManager forced-execution failure
The periodic work remained registered, but shell Jobscheduler triggers could not reliably execute it: one attempt hit the WorkManager early-execution guard and another could not find the transient job ID. Snapshot state stayed stale. Classification is Android scheduling/eligibility limitation, not a product bug. Do not escalate to increasingly invasive bypasses merely to force a pass.

## 16. Real document upload E2E
The real attached July 2026 rehabilitation payslip image was used through the authenticated August expected-document Web task. The browser automation failure was diagnosed precisely: a real enabled `<input type="file">` existed, accepted `image/*,application/pdf` including PNG, and had a `change` handler; the exposed automation API lacked direct `setInputFiles`, while the native chooser timed out. No backend request occurred in that failed attempt. Classification: Codex/browser automation limitation, not a Web product bug. Manual selection then completed the real flow: document status `התקבל`, reminder completed, 2/3 checks complete, credit-card statement intentionally still open.

## 17. Codex/Web runtime instability
The Codex/browser session unexpectedly closed and the Web server stopped, yielding ERR_CONNECTION_REFUSED. Runtime restoration required restarting only the Web process and re-authenticating; backend remained available. At one point automation metadata showed a rendered page while the user-visible tab still showed an error, demonstrating that actual interactable browser context must be verified directly.

## 18. Foreground shared-state verification
Using the existing in-app refresh (not as background evidence) produced `Synced: 1 open tasks, 1 documents, attention 1`. The rehabilitation task disappeared; the credit-card statement remained the only eligible expected document; notification state contained only that task. A repeat refresh changed the fetch timestamp but preserved notification key/notified key, proving foreground dedupe. Foreground refresh is not natural WorkManager evidence.

## 19. Notification tap stale-build discovery
The available physical notification PendingIntent still targeted backend port 8095. Classification: stale installed APK/build artifact. Current source routing targets the Web origin and Attention route. Required next step is build current source, install it, generate a truthful reminder, and verify tap. Do not redesign routing unless a fresh build fails.

## 20. Google Wallet status
Platform blocked pending the next naturally occurring Google Wallet notification. Do not claim this path PASS without a truthful notification event.

## 21. Current shared maintenance state
At handoff creation: August rehabilitation document completed; monthly credit-card statement intentionally open; fresh Android foreground state has one eligible task/document; Attention is one; notification key is credit-card-only. Do not complete the credit-card task unless final zero-task suppression is explicitly required.

## 22. Alpha pass/fail matrix
PASS: authenticated Web completion; shared foreground fetch; completed-task suppression in foreground state; remaining-task eligibility; foreground notification key; repeat dedupe; ADB repair/device authorization; Web and Android test baselines. NOT VERIFIED: natural background WorkManager execution, background dedupe, fresh-build tap routing, zero-task suppression. FAIL + classification: stale installed APK tap target (stale-build artifact). PLATFORM BLOCKED: WorkManager natural timing and Google Wallet event. ACCEPTABLE POST-ALPHA: progressive native Compose exploration.

## 23. Remaining Alpha gate
A. Build/install current routing-fix APK. B. Verify truthful notification tap to Web Attention. C. Verify natural periodic WorkManager execution while companion is not foreground. D. Verify background dedupe. E. If required, complete the remaining credit-card task through the real Web UI and verify zero-task cancellation/suppression.

## 24. Acceptable post-Alpha friction
Do not create scope creep for known non-blockers: native rewrite, WebView/TWA, FCM, redesigning auth, or replacing the backend. Use real household friction and evidence to prioritize after Alpha.

## 25. Portfolio/evidence history
Portfolio screenshots and evidence remain truthful records of UI milestones, bug stories, limitations, and failed attempts. Preserve the no-fabricated-BEFORE rule. Private documents, screenshots, device XML, and temporary evidence remain local-only.

## 26. Google AI Studio/native V2 exploration
Post-Alpha only: existing real Web UI → faithful Compose equivalent → same backend, native services retained, one screen at a time. No replacement backend or database.

## 27. Secret/local-only boundaries
Never commit credentials, local.properties, auth/session tokens, signing/encryption material, private payslips/statements, raw receipts, device logs/XML, screenshots containing personal data, temporary attachment paths, or generated local runtime/build directories. Keep real household evidence outside Git.

## 28. Exact next task
The next thread must only inspect the current tree; build current routing-fix APK; install it on the authorized device; verify truthful notification tap → Web Attention; preserve periodic WorkManager; at/after natural eligibility verify background execution and dedupe; and, only if required, complete the credit-card task and verify zero-task suppression. No new features.

## 29. Alpha stop condition
When the remaining physical checks pass and no concrete product blocker exists, declare `DAILY-USE ALPHA READY` and stop feature development.

## 30. Failed/abandoned/rejected approaches index
- WebView/TWA and full native rewrite: rejected for Alpha scope.
- Stale-cache notification fallback: rejected because reminders must reflect shared truth.
- FCM: rejected for local Alpha simplicity.
- Forced WorkManager execution before eligibility: failed/platform-limited; do not repeat invasively.
- Treating foreground refresh as background evidence: invalid.
- Direct backend mutation to fake completion: prohibited and not used.
- Browser native file-picker automation: chooser timed out; use minimum manual selection.
- Assuming old ports/IPs: caused false diagnosis; inspect current runtime.
- Assuming internal automation page equals user-visible browser: disproven.
- Embedding human credentials/server secrets in APK: prohibited; local provisioning only.

## 31. Continuity instructions for the next thread
Read this document completely before acting. Treat it as historical source of truth, including preserved failures and false starts. Inspect the current repository and runtime because machine state changes. Do not reopen PASS items without regression. Continue from Exact next task, and append/update continuity at the next meaningful milestone rather than discarding this history.

