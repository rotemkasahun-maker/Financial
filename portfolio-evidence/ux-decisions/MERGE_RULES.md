# Standing Product & UX Decision Logging Rule

This file is the single current standing rule and merge policy for the **Family Finance Product & UX Decision Archive**. It replaces any narrower UX-only framing; no competing standing rule should be created.

## Purpose

Incoming findings are source material, not canonical records. Review them semantically rather than matching only titles, slugs, filenames, or wording. Preserve provenance and do not strengthen claims beyond the available evidence. This archive may include meaningful Product decisions alongside UX decisions when they materially change experience, define trust or uncertainty boundaries, shape household workflow or mental models, define AI/human responsibility, establish validation required before a product promise, or express product architecture relevant to user value.

Meaningful decisions may involve UX, Behavioral UX, AI UX, Information Architecture, Product, Validation, System Trust, Product Architecture, or UX Architecture. Use the causal form where possible: because a user, household, or product is likely to encounter X, we chose Y, which changes Z. Technical complexity alone is not product judgment.

Canonical records must distinguish `USER-STATED NEED`, `DESIGN INFERENCE`, `IMPLEMENTED`, and `VERIFIED`. Implementation is not validation. Preserve prior state, constraints, alternatives, rejected approaches, trade-offs, failures, open questions, and outcomes only where supported by evidence.

Validation ceilings are `DESIGN DECISION ONLY`, `PROTOTYPE`, `SYNTHETIC TEST`, `DEVICE E2E`, and `REAL HOUSEHOLD USE`, with `partial` or `narrow` qualifiers when needed. Never generalize narrow household evidence, device E2E, rendered browser QA, or passing automated tests into broader user value or adoption claims.

Never fabricate or reconstruct research, quotes, metrics, screenshots, BEFORE states, implementation states, behavior, outcomes, adoption, or financial evidence. Real household data remains private; publish only reviewed/redacted or synthetic representations and label private/local references clearly. AI-assisted ownership must distinguish product/design ownership from implementation authorship and must not imply unsupported manual coding.

Archive completeness is not portfolio completeness. Public selection should be complementary and employer-facing; a canonical decision may remain supporting-only or private.

Use an optional `Decision type` field in new or materially updated records only when useful. Allowed values are: `UX`, `Behavioral UX`, `AI UX`, `Information Architecture`, `Product`, `Validation`, `System Trust`, `Product Architecture`, and `UX Architecture`. Avoid taxonomy inflation; routine engineering, refactors, bugs, implementation mechanics, infrastructure, workflow mechanics, and cosmetic changes remain out of scope unless they substantively establish or alter such a decision.

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
