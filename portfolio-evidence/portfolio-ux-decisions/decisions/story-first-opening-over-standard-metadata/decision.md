# Prioritize a Story-First Reading Path Over Standard Case-Study Framing

## Decision

Lead with a human question and one clear reading path instead of a metadata-heavy UX case-study template. Preserve the author's conversational voice, limit hierarchy cues, and defer secondary project orientation so the first impression communicates motivation rather than taxonomy.

## Context and viewer problem

The prior opening combined a giant project title, deck, role/focus/status grid, progress taxonomy, and optional reading-mode explanation. History records it as too loud and over-explained. No recruiter scan study exists; the design inference is that viewers need a clear first read, second read, and reason to continue.

## Previous state and alternatives

- Standard title/metadata/Problem–Solution framing.
- Multiple equal-emphasis visual cues and formalized UX prose.
- A story-first opening with restrained hierarchy and conversational source copy.

The giant title, top-heavy metadata, competing asides, every section as a poster headline, generic case-study prose, and silent “professionalizing” edits were rejected.

## Resulting logic and trade-offs

The page opens with “I wanted to know where our money was going,” then moves through collection, scattered evidence, the human problem, and behavioral constraints. One main reading path, limited levels, medium line length, whitespace, and source-authentic voice reduce initial cognitive load. Role/status details become less immediate and must reappear elsewhere truthfully.

## Truth status

- **USER-STATED NEED:** KNOWN — remove the beginning explanation, preserve locked copy, prefer smaller/lighter hierarchy, and do not rewrite the author's voice.
- **DESIGN INFERENCE:** Story before taxonomy and limited hierarchy support first-impression comprehension and continued reading.
- **IMPLEMENTED:** YES in current `family-finance.html` and the broader portfolio voice/system.
- **VERIFIED:** Preserved desktop/mobile before and Milestone 1 renders show the structural change; no eye-tracking, comprehension, or recruiter validation.
- **Strongest truthful validation:** `RENDERED BROWSER QA`

## Evidence and provenance

- Commit `3ab2776`
- `Rotem_Portfolio:family-finance.html`
- Four named before/Milestone 1 desktop/mobile screenshots and screenshots `README.md`
- Continuity handoff P2, P7, P10, P15–P16, P20–P21
- Visual cognition rules 3–16 and 26–35
- Incoming packets:
  - `incoming/codex/2026-08-28-story-first-opening-over-standard-metadata.md`
  - `incoming/codex/2026-08-28-single-reading-path-limited-hierarchy.md`
  - `incoming/codex/2026-08-28-conversational-voice-over-generic-case-study-copy.md`

## Merge rationale

Limited hierarchy and conversational voice are execution mechanisms serving the same first-impression/reading-flow problem. Neither creates a sufficiently distinct viewer behavior to justify a separate canonical decision.

## Before / after

The explicitly labeled before/Milestone 1 desktop and 390px captures are truthful historical comparisons. No audience-impact before/after exists.

## Public representation

`WELL REPRESENTED` in the current opening and portfolio voice.

## Open questions

- Where role, contribution, and project status should re-enter the complete case study.
- Whether later proof-heavy sections preserve the same reading clarity.
