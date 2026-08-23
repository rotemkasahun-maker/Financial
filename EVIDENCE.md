# Family Finance evidence index

This file is a lightweight index for meaningful product, UX, system, and
technical evidence. It is not a development diary or portfolio case study.
Routine maintenance, minor visual changes, and ordinary debugging do not belong
here.

## Capture protocol

Before a meaningful product or workflow change, check whether a useful real
`before` state already exists. Capture one only when it helps explain an
important problem or decision. After implementation, test and QA the actual
application before capturing the corrected `after` state.

Prefer actual application or emulator states using synthetic, test, or safely
redacted data. Check every image for names, phone/account/card details,
addresses, messages, transaction identifiers, credentials, tokens, and other
private financial information before saving it.

Future screenshots belong in `evidence/screenshots/` and use:

`YYYY-MM-DD_<feature>_<state-or-version>.png`

For each case-study-worthy screenshot, add a short entry below stating what it
shows, why it matters, what the viewer should notice, and which real
problem/decision/result it supports. Keep the source image clean; portfolio
annotations belong in the portfolio repository.

If an old state is ever recreated from Git, label both its entry and caption
`RECONSTRUCTED FROM COMMIT <SHA>`. Do not reconstruct historical screenshots
unless the story is unusually valuable and the state can be reproduced
reliably.

Use accurate status labels such as `OBSERVATION`, `ASSUMPTION`, `HYPOTHESIS`,
`DECISION`, `TECHNICAL CONSTRAINT`, `FAILED ATTEMPT`, `BUILT`, `IN PROGRESS`,
`SHIPPED`, and `VALIDATED`. In particular, built is not validated, queued is not
successfully synchronized, and tested technical behavior is not a user outcome.

Add an entry only when it would help a reviewer understand a meaningful
problem, decision, constraint, failure, iteration, or result. Never invent
research, alternatives, rationale, metrics, adoption, or validation after the
fact.

## Existing high-value evidence

| ID | Date | Feature | Status | Evidence and supported claim | Case-study value |
| --- | --- | --- | --- | --- | --- |
| FF-001 | 2026-08-20 | Android SMS ingestion | `IN PROGRESS` / `FAILED ATTEMPT` | [`android/KasahunFamilyFinance/SMS_E2E_TEST_REPORT.md`](android/KasahunFamilyFinance/SMS_E2E_TEST_REPORT.md), commits `7c0e93f` and `b5bd13c`. SMS was detected, classified, normalized, and persisted; synchronization returned an error and the evidence remained queued. This does **not** prove a complete SMS-to-ledger flow. | HIGH |
| FF-002 | 2026-08-20 | Notification ingestion | `BUILT` and technically tested | [`android/KasahunFamilyFinance/E2E_NOTIFICATION_VERIFICATION_REPORT.md`](android/KasahunFamilyFinance/E2E_NOTIFICATION_VERIFICATION_REPORT.md), commit `b5bd13c`. Supports wallet parsing, unrelated-notification filtering, privacy behavior, duplicate prevention, and shared SMS/notification persistence. Manual notification access is still required and background synchronization is not built. | HIGH |
| FF-003 | 2026-08-20 | Privacy boundary | `DECISION` / `BUILT` | [`ANDROID_CONTRACT.md`](ANDROID_CONTRACT.md), the two Android E2E reports, and Android mapper/parser tests. Financial relevance and normalized evidence can be retained without unnecessarily storing raw SMS content. | HIGH |
| FF-004 | 2026-08-20 | Safe ingestion and ambiguity | `DECISION` / technically tested | [`ARCHITECTURE.md`](ARCHITECTURE.md), [`backend/financeIngestionService.ts`](backend/financeIngestionService.ts), and [`tests/financeIngestionService.test.js`](tests/financeIngestionService.test.js). Supports stable external IDs, idempotency, high-confidence linking, and staging incomplete evidence for review instead of silently committing it. | HIGH |
| FF-005 | 2026-08-20 | Shared evidence pipeline | `BUILT`, with integration still in progress | [`ARCHITECTURE.md`](ARCHITECTURE.md), [`ANDROID_CONTRACT.md`](ANDROID_CONTRACT.md), commits `18cc59f`, `d91a85c`, `7c0e93f`, and `b5bd13c`. Shows evolution from backend ingestion to Android SMS and notification capture sharing normalization, persistence, and synchronization boundaries. | HIGH |
| FF-006 | Current | Automation boundaries | Mixed: `BUILT`, mock, architecture-ready, and unconnected | [`AUTOMATION_MAP.md`](AUTOMATION_MAP.md). Use it to avoid overstating external providers, Google Sheets, Gmail credentials, OCR, or background synchronization. Newer Android reports supersede older Android-client status rows where they conflict. | HIGH |
| FF-007 | Current | Product and interaction model | `DECISION` / partially built | [`PRODUCT_SPEC.md`](PRODUCT_SPEC.md) and [`ARCHITECTURE.md`](ARCHITECTURE.md). Documents Hebrew RTL mobile-first design, exception-first review, provenance, receipt handling, and no silent merges. These documents are product intent and implementation guidance, not user-research validation. | MEDIUM |

## Screenshot evidence

Existing real local captures are indexed in
[`portfolio-evidence/README.md`](portfolio-evidence/README.md). They were
captured from the locally rendered applications with demo/redacted content and
were not reconstructed for this index.

The committed Android launcher assets are branding resources, not
application-state evidence.

## Current truth boundaries

Evidence currently supports candidate detection, normalization, local
persistence, duplicate prevention, privacy-conscious capture, ambiguous-evidence
staging, shared SMS/notification queues, and safe evidence retention after a
failed synchronization attempt.

It does not currently support production household adoption, user or business
outcomes, validated behavior change, complete SMS-to-ledger synchronization,
fully automated collection, verified live Google Sheets/Gmail connections,
production-grade OCR, or real-time background synchronization. Gamification,
Madrid motivation mechanics, proactive assistance, and future automation should
remain hypotheses or future directions unless separately built and validated.
