# Show Active Work in Depth Without Pretending It Is Finished

## Decision

Feature one active project in meaningful depth while explicitly separating current implementation, technical verification, hypotheses, and unvalidated outcomes. Do not wait for a fictional “finished” state, and do not make incompleteness disappear through portfolio polish.

## Context and viewer problem

The portfolio needed credible work to show while Family Finance was still evolving. There is no recruiter study supporting this choice. The design inference was that a viewer can evaluate real product judgment from unfinished work if the status and evidence ceiling remain clear.

## Previous state and alternatives

- Wait until the product appears finished.
- Present a polished concept deck.
- Show active work with explicit truth boundaries.

The first two approaches were rejected because they either delayed useful proof or encouraged invented outcomes.

## Resulting logic and trade-offs

Home describes “One active build · shown in depth,” while historical case-study copy distinguishes built, tested, incomplete, hypothetical, and unverified states. This provides depth sooner, but exposes uncertainty and requires ongoing status maintenance.

## Truth status

- **USER-STATED NEED:** Supported by explicit instructions not to fabricate completion or validation; no recruiter-stated need.
- **DESIGN INFERENCE:** Honest depth is more credible than a falsely complete case study.
- **IMPLEMENTED:** YES in tracked Home and historical case-study source.
- **VERIFIED:** Source/history verified; no viewer or hiring-outcome validation.
- **Strongest truthful validation:** `IMPLEMENTED`

## Evidence and provenance

- `Rotem_Portfolio:index.html`
- `Rotem_Portfolio:family-finance.html` at commit `c9b564c`
- Commit `c9b564c`
- Continuity handoff P14, P28, P30
- Incoming packet: `incoming/codex/2026-08-28-active-work-in-depth-with-truthful-status.md`

No authentic before state proves that waiting for completion was ever implemented.

## Public representation

`PRESENT BUT UNDEREXPLAINED` — active-build language is visible, but the editorial decision to publish truthful unfinished work is not fully explained.

## Open questions

- Whether status ceilings remain sufficiently visible as the case study expands.
- Whether future completed work changes the “one active build” curation strategy.
