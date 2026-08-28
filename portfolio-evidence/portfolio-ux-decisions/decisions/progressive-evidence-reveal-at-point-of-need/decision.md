# Reveal Evidence Progressively at the Point of Need

## Decision

Introduce evidence when its narrative meaning becomes available, often beginning with a readable detail and revealing its broader source or context later. Do not front-load a dense evidence gallery or make essential proof depend on an undiscoverable interaction.

## Context and viewer problem

Full screenshots, carousels, and evidence dumps created weak crops, high cognitive load, and proof disconnected from the story. There is no comprehension study; the design inference is that viewers need an overview-to-depth path that supports both scanning and inspection.

## Previous state and alternatives

- Show a full screenshot immediately.
- Use a carousel as the main proof container.
- Follow `detail → source → payoff → next detail → trace` and time evidence to the relevant thought.

Blurry carousel proof, random crops, repeated full phones, and evidence appearing before the thought were rejected.

## Resulting logic and trade-offs

Evidence arrives after the collection thought; selected prototypes expand a detail into the real Attention screen. Lower initial proof density improves pacing, but deferred details may be missed and therefore cannot contain essential truth alone.

## Truth status

- **USER-STATED NEED:** Documented preference not to over-explain and to use compact, meaningful proof; no viewer-stated need.
- **DESIGN INFERENCE:** Progressive disclosure balances limited attention with case-study depth.
- **IMPLEMENTED:** PARTIAL in the opening/show-me sequence; the broader pattern remains prototype/roadmap.
- **VERIFIED:** Prototype/source presence verified; no viewer comprehension test.
- **Strongest truthful validation:** `PROTOTYPE / IMPLEMENTED (partial)`

## Evidence and provenance

- Selected `Rotem_Portfolio:portfolio-evidence/portfolio-website/explorations/.../family_finance_partial_reveal_study.html`
- `family_finance_opening_storyboard.html`
- `REFERENCE_INDEX.md` group G4
- Commits `4a506f1`, `3ab2776`, `17a6114`
- Continuity handoff P18–P20 and section 30
- Incoming packet: `incoming/codex/2026-08-28-progressive-evidence-reveal-at-point-of-need.md`

No single authentic before/after exists for the complete disclosure rule.

## Public representation

`PRESENT BUT UNDEREXPLAINED` — a partial interaction exists, but the inline/deferred evidence strategy is incomplete.

## Open questions

- Which evidence must stay inline for scanning and truthfulness.
- Whether deferred proof remains discoverable without increasing interface chrome.
