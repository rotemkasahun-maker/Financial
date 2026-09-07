# Family Finance Alpha release guardrails

The Alpha is autonomous during normal use: Android and cloud services detect, persist, sync, retry, and update Web without a home PC, ADB, manual sync, or periodic polling as the primary path. Financial events are event-driven; WorkManager provides reliable execution, retry, connectivity, startup, and reboot recovery.

The first receipt prompt is immediate and offers: **לצלם קבלה**, **קבלה דיגיטלית**, and **אין קבלה**. It must not wait 30, 60, or 90 seconds or depend on backend matching.

Engineering follows existing-code-first and open-source-first review. Routine implementation and verification proceeds autonomously, while destructive finance, access-control, secret, and data-loss operations remain gated.

## Release gates

`NOT_READY → READY_TO_BUILD → READY_TO_INSTALL → READY_FOR_REMOTE_TEST → READY_FOR_REAL_TRANSACTION_TEST → ALPHA_ACCEPTED`

No real purchase test occurs before `READY_FOR_REAL_TRANSACTION_TEST`. That gate requires a proven installed APK, event-triggered sync, startup/reboot and connectivity recovery, sanitized remote trace, immediate prompt, healthy backend, working Web auth, and no PC/LAN dependency.

## Locked toolchain and preflight

- Android preflight: `scripts/alpha-android-preflight.ps1`
- Cloud preflight: `scripts/alpha-cloud-preflight.ps1`
- JDK: Android Studio bundled JDK
- AGP: 9.3.1
- Gradle: 9.5.0
- Kotlin: 2.2.10

Every proven regression becomes a test or preflight check where practical. Updates preserve queue, dedupe, authentication, and app data.

## Current Alpha state

- 48 pending SMS evidence items were observed. They must not be cleared manually.
- Autonomous queue drain still requires acceptance proof.
- Immediate receipt timing still requires acceptance proof.
- Web authentication still requires verification.

No credentials, tokens, secret values, raw SMS, receipt content, or private financial payloads belong in this document.
