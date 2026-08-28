# Preserve Complete History While Curating the Public Story

## Decision

Keep the deep process archive complete and provenance-rich while selecting only the material that serves the public narrative. Preservation does not equal endorsement, publication, or canonical status.

## Context and viewer problem

The repository contained 92 overlapping explorations, including selected references, rejected generic directions, process-only studies, and duplicate captures. The inferred viewer problem was excessive proof density; the archive problem was losing the reasoning and rejected alternatives that made later decisions trustworthy.

## Previous state and alternatives

- Delete rejected or duplicate history.
- Publish everything preserved.
- Preserve unchanged history, classify it, and curate a smaller public set.

The final option was chosen. Deletion weakens provenance; publishing everything overwhelms attention and risks treating rejected work as authority.

## Resulting logic and trade-offs

The exploration index classifies source material without editing it. Duplicate binaries remain aliases, rejected work remains process evidence, and the public build is allowlisted. This adds archive maintenance but separates deep truth from editorial storytelling.

## Truth status

- **USER-STATED NEED:** Preservation, non-recreation, and non-public private evidence boundaries are explicit.
- **DESIGN INFERENCE:** Public curation protects attention while archive completeness protects credibility.
- **IMPLEMENTED:** YES in tracked indexes, manifest, and public-build selection.
- **VERIFIED:** Manifest verification reports 92/92 files; public storytelling effectiveness is unverified.
- **Strongest truthful validation:** `IMPLEMENTED`

## Evidence and provenance

- `Rotem_Portfolio:portfolio-evidence/portfolio-website/explorations/REFERENCE_INDEX.md`
- `Rotem_Portfolio:portfolio-evidence/portfolio-website/explorations/2026-08-23-chat-explorations/manifest/portfolio_chat_explorations_manifest_2026-08-23.json`
- `Rotem_Portfolio:scripts/build-public.mjs`
- `Rotem_Portfolio:portfolio-evidence/README.md`
- Commits `4a506f1`, `3366a3b`, `00c6aa5`
- Incoming packet: `incoming/codex/2026-08-28-archive-completeness-public-curation.md`

## Public/private boundary

Canonical Markdown may describe private/local evidence paths, but the private artifact must not be copied into Git. Duplicate evidence is not independent validation.

## Public representation

`MISSING` — the current public portfolio shows some iteration but not the archive-versus-editorial-layer decision.

## Open questions

- Which process artifacts best support a future Portfolio Website Case Study without recreating archive density publicly.
