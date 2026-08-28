# Incoming Decision Candidate — Direct Product Proof Over Staged Mockups

1. **Decision title:** Prefer readable direct product crops over staged device mockups.
2. **Approximate date / phase:** 2026-08-22–27; evidence studies and case-study roadmap.
3. **Context / trigger:** Earlier carousels used blurry/arbitrary crops and too many phone frames; staged mockups separated proof from the relevant detail.
4. **User problem:** `DESIGN INFERENCE`: viewers need to read the evidence at display size and understand why it is present.
5. **Previous assumption/state:** A full phone/device presentation made product work feel polished and complete.
6. **Constraints:** Preserve genuine UI, avoid fake status bars/3D scenes, keep sufficient context, support mobile.
7. **Alternatives considered:** Perspective devices; full-screen phone frame; direct crop; partial-to-full reveal.
8. **Rejected approaches:** Hands holding phones, shiny 3D renders, fake duplicate chrome, unreadable full screens, and arbitrary clipping.
9. **Trade-offs:** Crops improve legibility and proof density but can remove context if too aggressive.
10. **Final decision:** Use direct UI crops when one feature matters; reserve a thin flat phone frame only for necessary full-screen context.
11. **Resulting logic:** Shot lists specify crop/source/size/role; screenshot sharpness outranks clever motion.
12. **Edge cases:** Controls/text lines must remain complete; full-screen context may require a device boundary; a crop cannot imply unseen behavior.
13. **Viewer value:** Faster proof recognition and less decorative framing.
14. **Portfolio/design impact:** Evidence presentation becomes functional hierarchy rather than mockup styling.
15. **USER-STATED NEED:** Preference against staged mockups and weak crops is documented.
16. **DESIGN INFERENCE:** Direct readable proof supports credibility under limited attention.
17. **IMPLEMENTED:** PARTIAL; current Milestone 2 uses a direct flat product window, while full roadmap remains pending.
18. **VERIFIED:** Source and rendered checkpoints exist; no comparative viewer test.
19. **Strongest truthful validation:** `PROTOTYPE / IMPLEMENTED (partial)`.
20. **Evidence:** handoff P12–P13, P18–P19, sections 20, 28–30; `family_finance_partial_reveal_study.html`; `family_finance_real_evidence_study.html`; commit `17a6114`; `family-finance.html`.
21. **Before / after:** Earlier current/proposal QA captures exist, but not all are approved controlled comparisons.
22. **Outcome / learning:** Direct genuine product evidence replaced reliance on generic/mock presentation; complete crop system still open.
23. **Open questions:** Exact inline/deferred shot list for the full case study.
24. **Current case-study representation:** `PRESENT BUT UNDEREXPLAINED`.
25. **Proposed slug:** `direct-product-proof-over-staged-mockups`.

**Public safety:** PUBLIC-SAFE tracked demo/redacted proof references only. **Queue status:** QUEUED — NOT CANONICAL.
