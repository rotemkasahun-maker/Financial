# Product & UX Decision Archive — Merge Rules

## Purpose

Incoming findings are source material, not canonical records. Review them semantically rather than matching only titles, slugs, filenames, or wording. Preserve provenance and do not strengthen claims beyond the available evidence. This archive may include meaningful Product decisions alongside UX decisions when they materially change experience, define trust or uncertainty boundaries, shape household workflow or mental models, define AI/human responsibility, establish validation required before a product promise, or express product architecture relevant to user value.

Use an optional `Decision type` field in new or materially updated records only when useful. Allowed values are: `UX`, `Behavioral UX`, `AI UX`, `Information Architecture`, `Product`, `Validation`, `System Trust`, `Product Architecture`, and `UX Architecture`. Avoid taxonomy inflation; routine engineering, refactors, bugs, implementation mechanics, and infrastructure remain out of scope unless they substantively establish or alter such a decision.

## Required outcome

Assign exactly one primary outcome to every incoming item:

- `NEW_DECISION` — a meaningful UX or product-architecture decision not already represented canonically.
- `MERGE_INTO_EXISTING` — the item describes the same underlying decision and contributes rationale, rejected approaches, scope, or historical context.
- `EVIDENCE_UPDATE` — the decision is already canonical and the item adds, corrects, or clarifies evidence paths or evidence sufficiency.
- `VALIDATION_UPDATE` — the decision is already canonical and new truthful evidence changes its strongest demonstrated validation level.
- `DUPLICATE` — the item adds no distinct decision content, evidence, validation, or provenance beyond material already retained.
- `NOT_ARCHIVE_MATERIAL` — the item is implementation detail, routine engineering work, editorial-only material, unsupported speculation, or otherwise not a meaningful UX/product-architecture decision.

## Review requirements

Before applying an outcome:

1. Compare the underlying user problem, decision, rationale, and scope with existing canonical records.
2. Check existing evidence paths, Git history, handoffs, tests, screenshots, and device/browser captures.
3. Preserve the incoming source and its provenance until archival policy explicitly permits another action.
4. Keep failed and rejected approaches when they materially explain the decision.
5. Record uncertainty instead of inferring unavailable history.
6. Never create a historical screenshot or BEFORE state to fill an evidence gap.
7. Do not promote validation beyond the strongest truthful level: `PROTOTYPE`, `SYNTHETIC TEST`, `DEVICE E2E`, or `REAL HOUSEHOLD USE`.
8. Do not treat the public Portfolio UI as proof of product validation.

## Canonicalization boundary

Only reviewed material may update `decisions/` and `MASTER_INDEX.md`. A filename or proposed slug from an incoming source is advisory until semantic review confirms whether it represents a new decision or belongs to an existing one.
