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

## Delivery

- Add focused regression tests for every behavioral change, then run the full test suite and build.
- Commit only stable, scoped changes and leave the working tree clean.
