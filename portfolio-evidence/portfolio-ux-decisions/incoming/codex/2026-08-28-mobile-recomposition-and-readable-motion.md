# Incoming Decision Candidate — Mobile Recomposition and Readable Motion

1. **Decision title:** Recompose mobile storytelling and preserve readable/reduced-motion states.
2. **Approximate date / phase:** 2026-08-23–27; opening implementation and kinetic specification.
3. **Context / trigger:** Desktop sticky/motion compositions could overcrowd mobile, create dead-scroll regions, or make evidence compete with text.
4. **User problem:** `DESIGN INFERENCE`: mobile viewers need the same narrative order and proof without a scaled-down cinematic layout.
5. **Previous assumption/state:** Desktop layout/motion could be proportionally reduced.
6. **Constraints:** 390/360 QA, touch viewport, readable product proof, reduced motion, no scroll-jacking.
7. **Alternatives considered:** Scale desktop; remove motion entirely; recompose with fewer layers, shorter travel, and stronger exclusion zones.
8. **Rejected approaches:** Multi-layer mobile pinning, crowded center, tall dead-scroll zones, tiny evidence, and motion-only meaning.
9. **Trade-offs:** Mobile may be less visually elaborate but more readable and robust.
10. **Final decision:** Preserve story order while reducing layers/travel/parallax, using edges, simplifying sticky scenes, and supplying logical reduced-motion states.
11. **Resulting logic:** Mobile is a distinct composition, not a breakpoint shrink; text remains protected from moving evidence.
12. **Edge cases:** Orientation changes require geometry recalculation; manual interactions remain usable under reduced motion.
13. **Viewer value:** Maintains comprehension, continuity, and control on small screens and for motion-sensitive viewers.
14. **Portfolio/design impact:** Responsive behavior becomes narrative design rather than CSS cleanup.
15. **USER-STATED NEED:** Mobile QA and recomposition are locked project rules; no external user study.
16. **DESIGN INFERENCE:** Simplified mobile choreography protects attention/readability.
17. **IMPLEMENTED:** PARTIAL in current responsive source and reduced-motion CSS/JS.
18. **VERIFIED:** 390px Milestone 1 capture exists; 360/full-page/later sequence coverage incomplete.
19. **Strongest truthful validation:** `RENDERED BROWSER QA (partial)`.
20. **Evidence:** Milestone 1 mobile screenshot and screenshots `README.md`; `family-finance.html`; `styles.css`; `script.js`; handoff P24–P28 and sections 15–18, 26–27; visual cognition rules 60–64.
21. **Before / after:** Preserved 390px before/Milestone 1 pair; no complete later mobile before/after.
22. **Outcome / learning:** Narrative opening rendered at 390px; full responsive kinetic acceptance remained open.
23. **Open questions:** Full 360px and complete case-study reduced-motion QA.
24. **Current case-study representation:** `PRESENT BUT UNDEREXPLAINED`.
25. **Proposed slug:** `mobile-recomposition-and-readable-motion`.

**Public safety:** PUBLIC-SAFE source/capture references. **Queue status:** QUEUED — NOT CANONICAL.
