# Shared canonical household state and cross-client convergence

- **Validation:** SYNTHETIC TEST
- **USER-STATED NEED:** Both users see durable common truth after finance actions and should not repeat the same household administration.
- **DESIGN INFERENCE:** Canonical events require household backend state, stable IDs, provenance, versioning, dedupe and idempotency. Assign work from explicit user/source/device/account evidence when possible; otherwise show it as household/unassigned rather than guessing. One completion should remove the obligation for everyone.
- **IMPLEMENTED:** Authenticated finance state, versioned mutations, shared receipts/import/maintenance, task ownership inference, household-owned expected documents, shared completion, dedupe keys and exactly-once rewards. Claim/reassignment UI is absent.
- **VERIFIED:** Synthetic two-client flows persisted across re-authentication for import, edit, cash, receipt and maintenance without duplicates. Tests cover owner inference, task/document dedupe, cross-client completion and exactly-once reward. The narrow real expected-document completion remains evidence only for `shared-expected-document-maintenance`, not broad shared-state validation.
- **Evidence:** backend finance services, data adapter, task engine; `tests/sharedFinance.test.js`, `tests/taskEngine.test.js`, `tests/monthlyExpectedDocuments.test.js`; commits `65d8908`, `b730a3a`, `7eeea06`, `84cbcb6`, `2f826be`, `5a71c4d`; persisted/Client-B screenshots. Real household completion evidence is private/non-public.
- **Rejected/learning:** Per-client truth, mock promotion, stale writes, retry duplicates, separate duplicate obligations, guessed ownership, duplicate XP, and reminders that continue after another household member completed the work.
- **Open:** Long-term real conflicts/convergence, reassignment/claiming, and whether owner labels reduce household coordination friction are unverified.
