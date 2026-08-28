# Family Finance UX Decision Archive — Master Index

This is the canonical deep-history index. Portfolio UI is a separate editorial layer. Validation applies only to the named decision.

| Decision | Slug | Validation |
|---|---|---|
| Hebrew/RTL/mobile foundation | [hebrew-rtl-mobile-first-foundation](decisions/hebrew-rtl-mobile-first-foundation/decision.md) | PROTOTYPE |
| Focused navigation and global capture | [focused-mobile-navigation-global-receipt-capture](decisions/focused-mobile-navigation-global-receipt-capture/decision.md) | PROTOTYPE |
| Receipt review/link before create | [receipt-review-link-before-create](decisions/receipt-review-link-before-create/decision.md) | SYNTHETIC TEST |
| Identity-safe receipt dedupe | [identity-safe-receipt-deduplication](decisions/identity-safe-receipt-deduplication/decision.md) | SYNTHETIC TEST |
| Exception-first mobile import | [exception-first-mobile-financial-file-import](decisions/exception-first-mobile-financial-file-import/decision.md) | SYNTHETIC TEST |
| Learned rules first | [learned-rules-before-weaker-heuristics](decisions/learned-rules-before-weaker-heuristics/decision.md) | SYNTHETIC TEST |
| Quick Cash/Edit | [contextual-quick-cash-quick-edit](decisions/contextual-quick-cash-quick-edit/decision.md) | SYNTHETIC TEST |
| Attention inbox | [attention-unified-exception-maintenance-inbox](decisions/attention-unified-exception-maintenance-inbox/decision.md) | SYNTHETIC TEST |
| Missing-receipt context | [context-preserving-missing-receipt-resolution](decisions/context-preserving-missing-receipt-resolution/decision.md) | SYNTHETIC TEST |
| Expected documents | [shared-expected-document-maintenance](decisions/shared-expected-document-maintenance/decision.md) | REAL HOUSEHOLD USE (narrow) |
| Household auth/no mock fallback | [household-scoped-auth-no-mock-fallback](decisions/household-scoped-auth-no-mock-fallback/decision.md) | SYNTHETIC TEST |
| Human/device auth boundary | [human-web-auth-android-device-ingestion-boundary](decisions/human-web-auth-android-device-ingestion-boundary/decision.md) | DEVICE E2E |
| Shared household state | [shared-canonical-household-state](decisions/shared-canonical-household-state/decision.md) | SYNTHETIC TEST |
| Financial semantics | [truthful-household-financial-semantics](decisions/truthful-household-financial-semantics/decision.md) | SYNTHETIC TEST |
| Human-attention escalation ladder | [human-attention-escalation-ladder](decisions/human-attention-escalation-ladder/decision.md) | SYNTHETIC TEST |
| Category-level sufficiency under uncertain item identity | [category-level-sufficiency-under-uncertain-item-identity](decisions/category-level-sufficiency-under-uncertain-item-identity/decision.md) | DESIGN DECISION ONLY |
| Source-agnostic household finance experience | [source-agnostic-household-finance-experience](decisions/source-agnostic-household-finance-experience/decision.md) | SYNTHETIC TEST |
| XP/Madrid boundary | [nonfinancial-xp-madrid-goal-boundary](decisions/nonfinancial-xp-madrid-goal-boundary/decision.md) | SYNTHETIC TEST |
| Historical bootstrap | [read-only-historical-learning-bootstrap](decisions/read-only-historical-learning-bootstrap/decision.md) | SYNTHETIC TEST |
| Gmail receipts | [automated-gmail-receipt-processing](decisions/automated-gmail-receipt-processing/decision.md) | SYNTHETIC TEST |
| Android companion | [android-companion-not-second-finance-ui](decisions/android-companion-not-second-finance-ui/decision.md) | DEVICE E2E |
| Private evidence pipeline | [privacy-preserving-financial-evidence-pipeline](decisions/privacy-preserving-financial-evidence-pipeline/decision.md) | DEVICE E2E |
| Android shared-truth reminders | [shared-truth-android-reminders](decisions/shared-truth-android-reminders/decision.md) | DEVICE E2E (partial) |
| Receipt grace window | [receipt-expectation-grace-window](decisions/receipt-expectation-grace-window/decision.md) | SYNTHETIC TEST |
| Financial-state validation before exposure | [real-world-financial-state-validation-before-exposure](decisions/real-world-financial-state-validation-before-exposure/decision.md) | REAL HOUSEHOLD USE (narrow) |

## Binary aliases

- `family-finance-proof.png` = `backend-bootstrap-before.png`
- `missing-receipt-client-a-completed.png` = `missing-receipt-fixed-after.png`
- `shared-document-completed-after.png` = `shared-maintenance-client-b-after.png`
- `shared-maintenance-completed-after.png` = `shared-maintenance-final-attention-after.png`

Missing BEFORE captures must not be reconstructed. `.local/`, device XML, credentials, and real household documents are non-public unless separately reviewed/redacted. Incoming packets are preserved as provenance and remain non-canonical after semantic merge.
