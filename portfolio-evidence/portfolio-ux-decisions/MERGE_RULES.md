# Portfolio Website UX Decision Archive — Merge Rules

## Purpose

Incoming findings are provisional source material. Review them semantically by underlying user/audience problem, decision, rationale, scope, rejected alternatives, evidence, validation, and provenance—not merely by title, slug, wording, or visual similarity.

## Required outcome

Assign exactly one primary outcome to every reviewed incoming item:

- `NEW_DECISION` — a meaningful Portfolio Website UX decision not represented canonically.
- `MERGE_INTO_EXISTING` — the same underlying decision with additional rationale, scope, history, or rejected approaches.
- `EVIDENCE_UPDATE` — new or corrected evidence for an existing decision.
- `VALIDATION_UPDATE` — truthful evidence changes the strongest demonstrated validation.
- `DUPLICATE` — no distinct decision content, evidence, validation, or provenance is added.
- `NOT_ARCHIVE_MATERIAL` — routine implementation, unsupported speculation, editorial preference, or aesthetic detail without meaningful UX rationale.

## Review rules

1. Compare the underlying audience problem, decision, rationale, scope, evidence, and validation with existing records.
2. Preserve source provenance and meaningful failed or rejected approaches.
3. Record uncertainty instead of inferring unavailable history.
4. Do not recreate missing historical BEFORE states.
5. Do not fabricate recruiter research, usability findings, metrics, screenshots, or validation.
6. Distinguish `USER-STATED NEED`, `DESIGN INFERENCE`, `IMPLEMENTED`, and `VERIFIED`.
7. Editorial preference is not automatically a UX decision.
8. Include visual choices only when they materially affect comprehension, hierarchy, trust, attention, interaction, or behavior.
9. Keep Family Finance product decisions in `../ux-decisions/`; portfolio curation must not rewrite product truth.
10. Keep private proof private and do not treat duplicate evidence as independent validation.

## Canonicalization boundary

Only semantically reviewed material may update `decisions/` or `MASTER_INDEX.md`. Incoming packets remain non-canonical until that review is complete.
