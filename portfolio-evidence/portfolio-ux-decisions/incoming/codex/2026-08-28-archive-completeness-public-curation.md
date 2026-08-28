# Incoming Decision Candidate — Archive Completeness, Public Curation

1. **Decision title:** Preserve a complete process archive while curating the public story.
2. **Approximate date / phase:** 2026-08-23; exploration import and public asset allowlist.
3. **Context / trigger:** Ninety-two overlapping explorations included selected references, rejected generic directions, duplicate captures, and process-only variants.
4. **User problem:** `DESIGN INFERENCE`: public viewers need a concise credible story, while future maintainers need complete provenance.
5. **Previous assumption/state:** Everything preserved might be treated as public/canonical, or rejected work might be discarded.
6. **Constraints:** Do not alter imported originals; do not let rejected mockups become authority; do not publish caches/private/source-only artifacts.
7. **Alternatives considered:** Delete rejects; publish everything; preserve everything but curate with statuses and an allowlisted public build.
8. **Rejected approaches:** Equating preservation with endorsement and counting duplicate binaries as separate proof.
9. **Trade-offs:** More maintenance and semantic review, but stronger provenance with lower public cognitive load.
10. **Final decision:** Preserve unchanged process history, classify it, and publish/select only material that serves the public narrative.
11. **Resulting logic:** `REFERENCE_INDEX.md` distinguishes selected/evolved/process/rejected; public build uses an asset allowlist.
12. **Edge cases:** Process evidence can be valuable without being canonical; duplicate files remain aliases; private material stays local.
13. **Viewer value:** Public story remains focused without erasing the real iteration behind it.
14. **Portfolio/design impact:** Archive and editorial layer become intentionally separate systems.
15. **USER-STATED NEED:** Preservation and non-recreation are documented; no viewer-stated need.
16. **DESIGN INFERENCE:** Curation protects attention; archival completeness protects credibility/history.
17. **IMPLEMENTED:** YES in tracked indexes and build configuration.
18. **VERIFIED:** Manifest reports 92/92 checksum verification; public effectiveness unverified.
19. **Strongest truthful validation:** `IMPLEMENTED`.
20. **Evidence:** commits `4a506f1`, `3366a3b`, `00c6aa5`; `Rotem_Portfolio:portfolio-evidence/portfolio-website/explorations/REFERENCE_INDEX.md`; manifest JSON; `scripts/build-public.mjs`; `portfolio-evidence/README.md`.
21. **Before / after:** No necessary visual before/after; this is an information/provenance architecture decision.
22. **Outcome / learning:** Rejected and duplicate material stayed available without becoming production guidance.
23. **Open questions:** What subset should be surfaced in a future Portfolio Website Case Study.
24. **Current case-study representation:** `MISSING`.
25. **Proposed slug:** `archive-completeness-public-curation`.

**Public safety:** PUBLIC-SAFE indexes; source-only/private artifacts remain excluded. **Queue status:** QUEUED — NOT CANONICAL.
