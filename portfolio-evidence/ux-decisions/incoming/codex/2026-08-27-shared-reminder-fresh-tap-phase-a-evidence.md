# Codex UX Decision Intake Packet

## Intake metadata

- **Date:** 2026-08-27
- **Commit / working-tree context:** `main` at `e0ee1f3`; current Android maintenance implementation remains in the mixed Alpha working tree.
- **Repository task/context:** Physical-device Phase A acceptance of the current-APK shared maintenance reminder.
- **Proposed merge target:** `shared-truth-android-reminders`
- **Packet type:** `EVIDENCE_UPDATE`

## Finding

- **What changed:** The previously open fresh-notification tap check passed on the authorized physical device. A truthful current-APK maintenance refresh produced one reminder for the current shared state; tapping that fresh notification opened the correct Web `page=attention` URL, retained the route through household authentication, and visibly rendered the authenticated Attention view.
- **Why it matters at UX/Product Architecture level:** This closes the stale-installed-APK routing failure and demonstrates the intended companion-to-Web handoff on a physical device. It does not prove periodic background execution or zero-task cancellation.
- **USER-STATED NEED:** KNOWN — Android reminders should route into the current household Attention experience without duplicates or stale destinations.
- **DESIGN INFERENCE:** The reminder remains a native companion action that hands off to the authenticated Web product rather than creating a second native finance UI.
- **IMPLEMENTED status:** IMPLEMENTED
- **VERIFIED status:** DEVICE E2E — fresh current-APK notification tap reached the correct Web origin and `page=attention`; after authentication, `דורש טיפול` and its Attention subtitle visibly rendered with no browser/network/auth error.
- **Strongest truthful validation level:** DEVICE E2E

## Evidence

- **Exact code/history paths:** `android/KasahunFamilyFinance/app/src/main/java/com/familyfinance/app/maintenance/MaintenanceNotifier.kt`; `MaintenanceSyncClient.kt`; `MaintenanceWorkScheduler.kt`; `src/app.js` query-page bootstrap.
- **Tests and results:** Android unit tests and debug APK build passed before installation; route-aware notification-dedupe tests passed. This packet concerns the later physical browser result, not merely those tests.
- **Commit(s):** No commit created; evidence belongs to the current mixed Alpha working tree at HEAD `e0ee1f3`.
- **Screenshots/browser/device artifacts:** `.local/device-e2e/ff-phase-a-after-refresh.xml`, `ff-phase-a-shade.xml`, `ff-phase-a-tap-result.xml`, `ff-phase-a-cdp-result.xml` — private/non-public device artifacts.
- **Handoff/reference sections:** Full continuity handoff §§18–19, 22–23, 28–30; subsequent Phase A device verification in this continuation thread.
- **Evidence safety:** MIXED — source paths and status are public-safe; device XML, local browser state, URLs containing LAN origins, and authentication interaction are private/non-public.
- **Duplicate aliases:** NONE

## Interpretation

- **Rejected or failed approach:** The pre-existing stale notification was not used. A signing mismatch was resolved with the existing matching local key. Android shell text entry altered the credential, so secure in-page Chrome debugging was used without printing credentials; temporary forwarding was removed afterward.
- **Limitations and unverified claims:** Natural periodic WorkManager execution, background dedupe, and zero-task cancellation remain unverified. Foreground refresh is not background evidence. Google Wallet remains platform-blocked and is not claimed PASS.
- **Conflict with current canonical record:** The canonical record lists fresh tap as open and describes device verification as foreground/shared-state only. Fresh tap is now DEVICE E2E PASS, but the broader decision must remain partial until Phase B and zero-task suppression pass.
- **Missing historical evidence:** NONE
- **Open questions for semantic merge review:** Preserve partial validation wording so this evidence closes only fresh tap routing, not background execution or empty-state cancellation.

## Queue status

- **Status:** QUEUED — NOT CANONICAL
- **Suggested merge-rule outcome:** EVIDENCE_UPDATE
