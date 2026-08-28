# Recompose Mobile Storytelling and Preserve Readable Motion States

## Decision

Treat mobile as a narrative recomposition rather than a scaled desktop layout. Reduce layers, travel, parallax, and pinning; protect text from moving evidence; preserve story order and usable reduced-motion states.

## Context and viewer problem

Desktop sticky and kinetic compositions could overcrowd mobile, create dead-scroll regions, and make evidence compete with reading. No mobile-viewer study exists; the design inference is that smaller viewports require simpler choreography to preserve comprehension and control.

## Previous state and alternatives

- Scale the desktop sequence down.
- Remove narrative motion entirely.
- Recompose with fewer layers, shorter travel, stronger exclusion zones, and static reduced-motion equivalents.

Multi-layer mobile pinning, crowded centers, tiny product proof, dead-scroll cinematics, and motion-only meaning were rejected.

## Resulting logic and trade-offs

Mobile retains narrative order but may use simpler flow, edge-positioned evidence, and less travel. Reduced-motion users receive logical content states and usable manual interactions. Mobile can be less spectacular in exchange for readability and robustness.

## Truth status

- **USER-STATED NEED:** Mobile QA/recomposition and readable motion are explicit project rules; no external viewer research.
- **DESIGN INFERENCE:** Simplified choreography reduces small-screen cognitive load.
- **IMPLEMENTED:** PARTIAL in responsive source and reduced-motion handling.
- **VERIFIED:** A 390px Milestone 1 render exists; 360px, complete-page, and later-sequence coverage remain incomplete.
- **Strongest truthful validation:** `RENDERED BROWSER QA (partial)`

## Evidence and provenance

- `Rotem_Portfolio:portfolio-evidence/portfolio-website/screenshots/2026-08-23-family-finance-milestone-1-mobile-390.png`
- Corresponding before capture and screenshots `README.md`
- `Rotem_Portfolio:family-finance.html`, `styles.css`, `script.js`
- Continuity handoff P24–P28 and sections 15–18, 26–27
- Visual cognition rules 60–64
- Incoming packet: `incoming/codex/2026-08-28-mobile-recomposition-and-readable-motion.md`

## Public representation

`PRESENT BUT UNDEREXPLAINED` — responsive behavior exists, but the recomposition and accessibility reasoning is not public narrative content.

## Open questions

- Complete 360px and full-page reduced-motion QA.
- Whether later evidence-heavy beats require different mobile disclosure patterns.
