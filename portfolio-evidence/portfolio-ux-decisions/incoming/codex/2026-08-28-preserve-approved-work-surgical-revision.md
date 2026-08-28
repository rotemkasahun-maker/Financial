# Incoming Decision Candidate — Preserve Approved Work, Revise Surgically

1. **Decision title:** Preserve approved work and revise surgically instead of repeatedly redesigning.
2. **Approximate date / phase:** 2026-08-22–27; after repeated Family Finance iterations.
3. **Context / trigger:** Whole-page regeneration reopened closed choices, lost approved work, and made it difficult to distinguish evidence-driven changes from arbitrary novelty.
4. **User problem:** `USER-STATED`: do not redesign closed About/Tiny Tool work or change unspecified content; preserve locked decisions.
5. **Previous assumption/state:** A weak section justified generating another broad redesign.
6. **Constraints:** Mixed approved/open states; exact locked copy; multiple page identities; need historical comparison.
7. **Alternatives considered:** Full regeneration; overwrite current; smallest-risk prototype then surgical patch.
8. **Rejected approaches:** Reopening unrelated pages, silently improving copy, and overwriting the only known-good artifact.
9. **Trade-offs:** Slower local iteration and legacy constraints, but stronger continuity and clearer causal learning.
10. **Final decision:** Identify the risky/weak relationship, prototype it separately, visually inspect, and integrate only after approval while preserving closed references.
11. **Resulting logic:** Architectural changes get versions/backups; narrow fixes get patches; latest approved correction wins.
12. **Edge cases:** A genuinely architectural defect can justify a new version, but not an unbounded redesign.
13. **Viewer value:** Produces a more coherent site because improvements do not destabilize unrelated successful experiences.
14. **Portfolio/design impact:** Change control became part of maintaining visual/narrative consistency.
15. **USER-STATED NEED:** KNOWN and repeatedly documented.
16. **DESIGN INFERENCE:** Surgical iteration better preserves learned viewer-facing strengths.
17. **IMPLEMENTED:** YES as process/history (backup, prototype, milestone commits); not a standalone public feature.
18. **VERIFIED:** Git history shows preserved versions and targeted commits; audience benefit unverified.
19. **Strongest truthful validation:** `DESIGN DECISION ONLY / IMPLEMENTED process`.
20. **Evidence:** commits `c9b564c`, `26e555f`, `3ab2776`, `17a6114`; `Rotem_Portfolio:backup/2026-08-25/README.md`; desire-path prototype/review; handoff P1, P17, P29, P37.
21. **Before / after:** Several tracked checkpoints exist, but only explicitly labeled pairs should be used.
22. **Outcome / learning:** Closed work remained stable while Family Finance opening advanced by milestones.
23. **Open questions:** Whether this is canonical UX architecture or better retained as a documented design-process decision.
24. **Current case-study representation:** `MISSING`.
25. **Proposed slug:** `preserve-approved-work-surgical-revision`.

**Public safety:** PUBLIC-SAFE Git/process references. **Queue status:** QUEUED — archive-level scope review required.
