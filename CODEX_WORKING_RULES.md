# Codex Working Rules

Follow `AGENTS.md`, `PRODUCT_SPEC.md`, `ARCHITECTURE.md`, and `AUTOMATION_MAP.md`; this file only summarizes persistent working rules.

## Financial integrity

- Count one real-world event once. Retain source records for audit, but only canonical financial events affect totals.
- Savings, investments, capital allocations, and internal transfers are not household expenses.
- Refunds and reimbursements offset related expenses; they are not new income.
- Never silently delete, overwrite, merge, or double-count financial data.

## Automation and confidence

- Prefer automation-first, exception-first UX and minimize user work.
- A HIGH-confidence resolution may auto-apply. MEDIUM, LOW, conflicting, or incomplete cases go to review.
- Apply learned user rules before weaker heuristics. Never match from amount alone.
- Recalculate review state after classification, reconciliation, and deduplication. Known resolved items must not request confirmation again.
- Historical bootstrap is read-only: it must not affect live totals, cash flow, XP, tasks, Madrid, or completeness.

## Safety and product behavior

- Real financial files, raw histories, identifiers, and credentials never enter Git.
- XP and money are separate systems. XP never changes savings or financial totals, and automatic resolution awards no XP.
- Preserve existing architecture, routes, deep links, and working behavior unless the request explicitly changes them.
- Keep the UI Hebrew-first, RTL, mobile-first, usable at 390px, and free of core horizontal overflow.

## Minimum Necessary Effort

Optimize for minimum total cost while preserving correctness, financial integrity, and auditability. Cost includes user attention, Codex/AI tokens, compute and API calls, cloud spend, stored data, network traffic, implementation complexity, and maintenance burden.

- Use the cheapest reliable escalation path: metadata → deterministic or saved rules → cross-source reconciliation → parser → AI/OCR only when necessary → user decision as the last resort.
- Do not store data that can safely be reconstructed, reprocess resolved evidence, reconfirm known HIGH-confidence facts, or fetch full content when metadata is sufficient.
- Do not introduce infrastructure without a current requirement. Prefer incremental/on-demand work over bulk processing.
- Keep UX exception-first with progressive disclosure; batch low-priority tasks and notifications, and defer non-critical ambiguity instead of blocking.
- Use AI only where cheaper deterministic methods are insufficient.
- For Codex work, prefer delta prompts and existing docs, inspect relevant files first, avoid broad refactors, run focused tests while iterating, run the full suite/build once before a stable commit, and report concisely.

## Delivery

- Add focused regression tests for every behavioral change, then run the full test suite and build.
- Commit only stable, scoped changes and leave the working tree clean.
