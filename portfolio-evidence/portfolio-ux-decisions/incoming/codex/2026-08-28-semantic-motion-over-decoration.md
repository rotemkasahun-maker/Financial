# Incoming Decision Candidate — Semantic Motion Over Decoration

1. **Decision title:** Use motion to communicate causality, continuity, and state change rather than decoration.
2. **Approximate date / phase:** 2026-08-23–27; motion studies, Milestones 1–2, kinetic specification.
3. **Context / trigger:** Earlier work lacked kinetics, but repeated fade-ups, ornamental loops, and competing transforms risked becoming an animation showcase.
4. **User problem:** `USER-STATED`: kinetics was missing. `DESIGN INFERENCE`: viewers need movement to clarify what changed without losing reading focus.
5. **Previous assumption/state:** Adding more animation or scroll triggers would make the portfolio feel alive.
6. **Constraints:** Native scroll, reduced-motion support, one dominant motion, readable text, crisp evidence, mobile simplification.
7. **Alternatives considered:** Decorative reveals/parallax; continuous animation; motion tied to hierarchy/causality/context.
8. **Rejected approaches:** Looping decoration, scroll-jacking, three simultaneous moving ideas, jitter, transform conflicts, and motion without a semantic job.
9. **Trade-offs:** Restrained motion is less immediately showy but protects comprehension and credibility.
10. **Final decision:** Motion may reveal, connect, preserve context, or show state change; strongest beats are scattered evidence → collected product and line items → structured understanding.
11. **Resulting logic:** Scroll behaves as a timeline; movement settles; collection visibly changes evidence into product context.
12. **Edge cases:** Reduced-motion users receive logical static states; motion cannot be the only carrier of essential meaning.
13. **Viewer value:** Makes cause/effect legible while keeping reading primary.
14. **Portfolio/design impact:** Motion density, timing, and scene ownership become narrative hierarchy.
15. **USER-STATED NEED:** KNOWN for meaningful kinetics; exact recruiter need not known.
16. **DESIGN INFERENCE:** Semantic motion aids comprehension and memory better than ornamental motion.
17. **IMPLEMENTED:** PARTIAL in Milestone 1 drift and Milestone 2 collection interaction.
18. **VERIFIED:** Deployed motion capture exists for Milestone 1; source/interaction present; full roadmap not verified.
19. **Strongest truthful validation:** `RENDERED BROWSER QA (partial)`.
20. **Evidence:** commits `7db833c`, `782d419`, `17a6114`; motion QA GIF and screenshots `README.md`; `script.js`; handoff P8, P23–P26, sections 7–8, 31; visual cognition rules 30–32 and 51–64.
21. **Before / after:** Milestone 1 before/static and motion capture exist; no complete full-page kinetic before/after.
22. **Outcome / learning:** Perceptible motion was achieved, but later handoff records unresolved motion architecture and opening failures v1–v4.
23. **Open questions:** Whether the final page can sustain continuity without motion fatigue.
24. **Current case-study representation:** `PRESENT BUT UNDEREXPLAINED`.
25. **Proposed slug:** `semantic-motion-over-decoration`.

**Public safety:** PUBLIC-SAFE tracked captures/source. **Queue status:** QUEUED — NOT CANONICAL.
