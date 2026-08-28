# Incoming Decision Candidate — Evidence Authenticity and Truth Labeling

1. **Decision title:** Separate real product proof, simulated external evidence, and concept material.
2. **Approximate date / phase:** 2026-08-22–27; evidence ingestion and Milestone 1.
3. **Context / trigger:** Earlier manually recreated screens, generic mockups, and blurry proof weakened trust.
4. **User problem:** `USER-STATED`: product UI must not be fabricated. `DESIGN INFERENCE`: viewers need to distinguish actual runtime evidence from storytelling material.
5. **Previous assumption/state:** Polished mock material could stand in for proof if it looked plausible.
6. **Constraints:** Private household evidence cannot be public; external receipt/message fragments may be fabricated only when explicitly authorized; product UI cannot.
7. **Alternatives considered:** Reconstructed UI; staged mockups; genuine repo evidence with provenance and explicit labels.
8. **Rejected approaches:** Presenting HTML approximations as runtime proof, unlabeled concepts, invented product states, and treating placeholders as evidence.
9. **Trade-offs:** Truthful evidence may look less polished or be incomplete; provenance adds editorial overhead.
10. **Final decision:** Maintain a material/truth taxonomy: editorial layer, real-world evidence, and flat source-faithful product UI; label temporary or simulated artifacts explicitly.
11. **Resulting logic:** Byte-identical screenshots carry hashes/provenance; placeholders use `data-temp-story-artifact`; screenshot captions say `real product evidence`.
12. **Edge cases:** A real screenshot can still fail through blur/crop; demo/redacted data is public-safe but not real-household validation; simulations are storytelling only.
13. **Viewer value:** Supports credibility and prevents polished presentation from overstating the product.
14. **Portfolio/design impact:** Evidence sourcing, labels, material treatment, and public/private boundaries shape the page.
15. **USER-STATED NEED:** KNOWN — do not fabricate product UI or blur source authenticity.
16. **DESIGN INFERENCE:** Explicit provenance helps viewers judge credibility.
17. **IMPLEMENTED:** YES for current screenshot provenance and placeholder labels.
18. **VERIFIED:** Byte hashes and rendered portfolio checkpoints recorded; no viewer trust study.
19. **Strongest truthful validation:** `RENDERED BROWSER QA`.
20. **Evidence:** commits `e632920`, `00c6aa5`, `3ab2776`; `Rotem_Portfolio:assets/family-finance/evidence/README.md`; `portfolio-evidence/README.md`; screenshots `README.md`; `family-finance.html`; handoff P11–P14, P30.
21. **Before / after:** Earlier source at `c9b564c` and Milestone 1 capture show evolution, but not every reconstructed-screen failure has a preserved authentic before.
22. **Outcome / learning:** Genuine product evidence became immutable/source-tracked; temporary artifacts remained explicitly non-proof.
23. **Open questions:** Which private/local artifacts can be represented publicly through description only.
24. **Current case-study representation:** `PRESENT BUT UNDEREXPLAINED`.
25. **Proposed slug:** `evidence-authenticity-and-truth-labeling`.

**Public safety:** PUBLIC-SAFE metadata only; private artifacts are not copied. **Queue status:** QUEUED — NOT CANONICAL.
