# Source-agnostic household finance experience

- **Validation:** SYNTHETIC TEST — source integration mechanics only
- **USER-STATED NEED:** The household should use one finance product rather than manage separate workflows for bank files, cards, Gmail receipts, SMS, Wallet signals and manual cash.
- **DESIGN INFERENCE:** Source-specific adapters and evidence provenance remain visible for audit, but the household’s mental model is transactions, receipts and unresolved work—not a collection of source inboxes. Normalized sources should converge into canonical household state and one Attention surface.
- **IMPLEMENTED:** PARTIAL — bank/card file import, Gmail receipt processing, Android SMS/notification evidence, manual cash, canonical reconciliation and unified Attention exist. Some sources remain manual, waiting for connection or platform-limited.
- **VERIFIED:** Synthetic tests cover normalization, dedupe, reconciliation, imports, Gmail processing and unified Attention rendering. Device E2E exists for parts of Android ingestion, but no end-to-end study verifies that the household experiences source management as invisible or effortless.

## Evidence and related decisions

- Source adapters, reconciliation, ingestion, receipt processing and Attention views/tests; `AUTOMATION_MAP.md` and `CODEX_WORKING_RULES.md`.
- Related canonical applications: `attention-unified-exception-maintenance-inbox`, `shared-canonical-household-state`, `automated-gmail-receipt-processing`, `privacy-preserving-financial-evidence-pipeline`, and `exception-first-mobile-financial-file-import`.

## Rejected approaches, limitations, and open questions

- Rejected making the household reconcile multiple source-specific products or inboxes as the primary workflow.
- Source provenance must not be erased; unification is a UX layer over auditable evidence, not destructive flattening.
- Coverage, connector availability and sustained household comprehension are not fully verified. No dedicated comparative BEFORE or usability study exists.
