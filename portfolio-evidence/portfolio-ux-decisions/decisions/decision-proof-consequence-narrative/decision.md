# Use Decision → Proof → Consequence as the Narrative Unit

## Decision

Structure meaningful case-study beats as `decision → proof → consequence`, so a viewer can connect product judgment to evidence and then to its outcome or next limitation.

## Context and viewer problem

Earlier versions felt modular, over-explained, screenshot-sparse, and causally weak. There is no recruiter validation; the design inference is that viewers evaluating product thinking need to understand why evidence matters, not merely encounter claims and feature screenshots.

## Previous state and alternatives

- Conventional Problem/Solution/Impact blocks.
- Claim-led prose with isolated screenshots.
- Causal narrative beats pairing judgment, proof, and consequence.

Random screenshot placement, carousel-only proof, and unexplained feature lists were rejected.

## Resulting logic and trade-offs

Story order, evidence selection, and motion are governed by causal relationships. The first implemented example is “What if the system did the remembering?” → genuine product proof/collection interaction → “Everything was in one place. That wasn't enough.” This is more demanding to author and implement than modular sections.

## Truth status

- **USER-STATED NEED:** The narrative grammar is explicitly documented in project history; no recruiter-stated need.
- **DESIGN INFERENCE:** Causal units make product judgment easier to assess than claims alone.
- **IMPLEMENTED:** PARTIAL in Milestone 2; the full roadmap is not implemented.
- **VERIFIED:** Source implementation verified; no complete full-page browser or viewer validation.
- **Strongest truthful validation:** `IMPLEMENTED (partial)`

## Evidence and provenance

- `Rotem_Portfolio:family-finance.html`
- `Rotem_Portfolio:script.js`
- Commit `17a6114`
- Continuity handoff P20 and sections 6, 30, 32
- Incoming packet: `incoming/codex/2026-08-28-decision-proof-consequence-narrative.md`

No complete before/after proves the full narrative method; Git preserves Milestone 1 → Milestone 2 only.

## Public representation

`PRESENT BUT UNDEREXPLAINED` — one causal beat is implemented, but the broader case-study grammar is neither complete nor explicitly surfaced.

## Open questions

- Whether the complete page can maintain causal clarity without becoming too long.
- Whether each public beat needs all three elements or whether some consequences can remain implicit.
