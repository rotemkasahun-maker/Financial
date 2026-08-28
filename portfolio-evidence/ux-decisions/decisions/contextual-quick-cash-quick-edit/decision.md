# Contextual Quick Cash and Quick Edit

- **Validation:** SYNTHETIC TEST
- **USER-STATED NEED:** Record cash and correct facts quickly without duplicates, lost provenance, shame or punishment for imperfect tracking.
- **DESIGN INFERENCE:** Cash belongs contextually in Transactions; edits mutate stable canonical records through compact forms. Manual entry is a recovery path for incomplete source coverage, not a failure state to moralize or penalize.
- **IMPLEMENTED:** `שילמתי במזומן`, compact cash form and versioned/idempotent persistent Quick Edit/Cash.
- **VERIFIED:** Synthetic tests/browser evidence cover persistence, summaries, idempotency and Client B visibility.
- **Evidence:** `src/app.js`, data service; tests `frictionBundle`, `transactionCorrection`, `sharedFinance`; commits `a0d49ef`, `1f88ee3`, `7eeea06`; `quick-cash-after.png`, `quick-cash-form-after.png`, `quick-edit-after.png`.
- **Rejected/learning:** Global cash FAB, duplicate-on-edit, expanded forms, guilt language and penalties for manual correction. BEFOREs unavailable.
- **Open:** Real-use speed/error evidence.
