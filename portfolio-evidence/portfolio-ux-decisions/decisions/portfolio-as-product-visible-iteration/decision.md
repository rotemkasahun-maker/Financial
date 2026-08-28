# Treat the Portfolio as Product Work and Make Iteration Visible

## Decision

Treat the portfolio itself as a product problem and expose meaningful iteration, including failures and changes in direction. Preserve approved states and revise the smallest risky relationship rather than repeatedly regenerating the whole site.

## Context and viewer problem

“Make a portfolio” became work involving friction, pattern choice, evidence, and iteration. Broad redesigns reopened closed decisions and obscured why something changed. The inferred viewer problem is that a polished endpoint alone reveals little about product judgment.

## Previous state and alternatives

- Hide portfolio process and show only the endpoint.
- Regenerate broadly whenever a section feels weak.
- Show a compact version history while preserving approved work and making targeted, evidence-led revisions.

Overwriting known-good work, reopening unrelated pages, silently rewriting approved copy, and presenting every visual variant as meaningful progress were rejected.

## Resulting logic and trade-offs

Home's Side Quest exposes V1–V4 learning. Architectural changes receive preserved versions; narrow changes receive surgical patches. This adds process discipline and some public meta-content, but makes adaptation and self-critique inspectable.

## Truth status

- **USER-STATED NEED:** KNOWN — preserve locked decisions, do not redesign closed work, and retain exact approved copy.
- **DESIGN INFERENCE:** Visible, evidence-led iteration demonstrates judgment more credibly than polish alone.
- **IMPLEMENTED:** YES in Home version history, backups, prototypes, and targeted milestone commits.
- **VERIFIED:** Git/source history and QA captures exist; viewer or hiring-outcome benefit is unverified.
- **Strongest truthful validation:** `IMPLEMENTED`

## Evidence and provenance

- `Rotem_Portfolio:index.html` Side Quest
- `Rotem_Portfolio:script.js` V1–V4 history
- `Rotem_Portfolio:qa-screenshots/side-quest-version-history.png`
- `Rotem_Portfolio:backup/2026-08-25/README.md`
- Desire-path prototype/review artifacts
- Commits `c9b564c`, `26e555f`, `3ab2776`, `17a6114`
- Continuity handoff P1, P17, P29, P37
- Incoming packets:
  - `incoming/codex/2026-08-28-portfolio-as-product-visible-iteration.md`
  - `incoming/codex/2026-08-28-preserve-approved-work-surgical-revision.md`

## Merge rationale

Surgical preservation is a constraint and method that keeps iteration evidence causal; it is not a separate viewer-facing UX problem. It belongs inside the visible-iteration decision rather than as a standalone canonical record.

## Public representation

`WELL REPRESENTED` through Side Quest; the preservation/surgical-change mechanism is `MISSING` from the public explanation.

## Open questions

- Whether a dedicated Portfolio Website Case Study needs more iteration depth than the compact Side Quest.
