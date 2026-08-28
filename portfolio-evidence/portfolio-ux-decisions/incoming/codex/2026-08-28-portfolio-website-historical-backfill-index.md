# Portfolio Website Historical UX Backfill — Deduplicated Index

## Intake metadata

- **Date:** 2026-08-28
- **Context:** Read-only historical audit of the tracked `Rotem_Portfolio` repository, its Git history, current Portfolio UI source, continuity handoffs, selected/rejected prototypes, rendered checkpoints, and evidence indexes.
- **Packet type:** `NEW_DECISION_CANDIDATE` collection; each linked packet remains provisional.
- **Canonical state reviewed:** `portfolio-evidence/portfolio-ux-decisions/MASTER_INDEX.md` contains no canonical decisions.
- **Truth ceiling:** No recruiter study, hiring-manager usability test, audience metric, or real-viewer validation was found. Viewer/recruiter needs below are therefore `DESIGN INFERENCE` unless explicitly user-stated.

## Validation vocabulary used in this backfill

- `DESIGN DECISION ONLY` — documented reasoning, without a working prototype or rendered implementation proving the presentation.
- `PROTOTYPE` — the decision is expressed in a preserved prototype or process artifact.
- `IMPLEMENTED` — present in tracked Portfolio UI source; this is not proof of viewer effectiveness.
- `RENDERED BROWSER QA` — preserved desktop/mobile or motion captures show the implementation rendered; this is not recruiter/usability validation.

## Deduplicated backfill index

| # | Candidate decision | Proposed slug | Approximate phase | Validation | Current public representation |
|---:|---|---|---|---|---|
| 1 | Show one active project in depth without pretending it is finished | `active-work-in-depth-with-truthful-status` | 2026-08-20–27 | IMPLEMENTED | PRESENT BUT UNDEREXPLAINED |
| 2 | Replace standard case-study metadata with a story-first opening | `story-first-opening-over-standard-metadata` | 2026-08-22–23 | RENDERED BROWSER QA | WELL REPRESENTED |
| 3 | Use decision → proof → consequence as the narrative unit | `decision-proof-consequence-narrative` | 2026-08-23–27 | IMPLEMENTED (partial) | PRESENT BUT UNDEREXPLAINED |
| 4 | Reveal evidence progressively at the moment it becomes meaningful | `progressive-evidence-reveal-at-point-of-need` | 2026-08-23–27 | PROTOTYPE / IMPLEMENTED (partial) | PRESENT BUT UNDEREXPLAINED |
| 5 | Separate real product proof, simulated external evidence, and concept material | `evidence-authenticity-and-truth-labeling` | 2026-08-22–27 | RENDERED BROWSER QA | PRESENT BUT UNDEREXPLAINED |
| 6 | Preserve a complete process archive while curating the public story | `archive-completeness-public-curation` | 2026-08-23 | IMPLEMENTED | MISSING |
| 7 | Use motion to communicate causality, continuity, and state change | `semantic-motion-over-decoration` | 2026-08-23–27 | RENDERED BROWSER QA (partial) | PRESENT BUT UNDEREXPLAINED |
| 8 | Build personality from voice, evidence, and composition—not portfolio gimmicks | `authored-quiet-identity-over-template-gimmicks` | 2026-08-20–27 | PROTOTYPE / IMPLEMENTED | WELL REPRESENTED |
| 9 | Maintain one clear reading path with deliberately limited hierarchy | `single-reading-path-limited-hierarchy` | 2026-08-22–27 | RENDERED BROWSER QA | WELL REPRESENTED |
| 10 | Recompose mobile storytelling and preserve readable/reduced-motion states | `mobile-recomposition-and-readable-motion` | 2026-08-23–27 | RENDERED BROWSER QA (partial) | PRESENT BUT UNDEREXPLAINED |
| 11 | Preserve approved work and revise surgically instead of repeatedly redesigning | `preserve-approved-work-surgical-revision` | 2026-08-22–27 | IMPLEMENTED process / DESIGN DECISION ONLY | MISSING |
| 12 | Give each project a distinct composition inside a shared portfolio system | `shared-system-project-specific-composition` | 2026-08-23–27 | IMPLEMENTED | PRESENT BUT UNDEREXPLAINED |
| 13 | Treat building the portfolio as product work and expose meaningful iteration | `portfolio-as-product-visible-iteration` | 2026-08-20–23 | IMPLEMENTED | WELL REPRESENTED |
| 14 | Prefer readable direct product crops over staged device mockups | `direct-product-proof-over-staged-mockups` | 2026-08-22–27 | PROTOTYPE / IMPLEMENTED (partial) | PRESENT BUT UNDEREXPLAINED |
| 15 | Preserve the author's conversational voice instead of professionalizing it | `conversational-voice-over-generic-case-study-copy` | 2026-08-20–27 | IMPLEMENTED | WELL REPRESENTED |

## Strongest five for a Portfolio Website Case Study

1. `evidence-authenticity-and-truth-labeling` — clearest credibility decision with repository provenance and explicit failure boundaries.
2. `story-first-opening-over-standard-metadata` — strongest preserved before/after structural change.
3. `semantic-motion-over-decoration` — distinguishes the portfolio's kinetic system from decorative animation.
4. `archive-completeness-public-curation` — explains how deep history can coexist with a concise public story.
5. `single-reading-path-limited-hierarchy` — most direct response to scanning, cognitive load, and first-impression control, though audience effectiveness is not user-tested.

## Already well represented publicly

- Story-first opening.
- Quiet authored identity over template/gimmick styling.
- One clear reading path and restrained hierarchy.
- Portfolio-as-product iteration via the Side Quest version history.
- Conversational author voice.

## Missing or underexplained publicly

- The evidence authenticity taxonomy and public/private/prototype boundaries are visible in labels but not fully explained.
- The reason for causal/progressive motion is experienced but not made legible as a design decision.
- Archive completeness versus public curation is absent.
- Mobile recomposition, reduced motion, direct-crop logic, surgical preservation, and project-specific composition are underexplained or absent.
- Showing an active build truthfully is visible, but the decision not to wait for a fictitious finished outcome is underexplained.

## Evidence gaps

- No recruiter or hiring-manager research, task testing, scan-path data, comprehension study, or attention metric.
- No verified public analytics showing whether visitors continue from Home into the case study.
- No complete rendered QA set for the later full Family Finance case-study roadmap; current tracked page stops at Milestone 2.
- Several handoff references point to historical `/mnt/data/...` artifacts that are not repository-relative and are not independently available in the tracked repository.
- No authentic before state exists for every design evolution; only preserved checkpoints explicitly labeled as before may be used.
- The current working-tree `styles.css` modification in `Rotem_Portfolio` is excluded because it is uncommitted and its approval/history is ambiguous.

## Duplicates and rejected non-decisions

- Individual palette, type-size, shadow, easing, breakpoint, and CSS-value choices were merged into broader hierarchy/motion/material decisions or rejected as implementation detail.
- Asset-first checklists, prompt templates, Git workflow, build allowlisting mechanics, and QA wording are workflow rules unless they directly establish viewer-facing truth or comprehension.
- The many G2 AI mockups are evidence of rejected generic directions, not separate decisions.
- Duplicate rendered files such as `case1440b.png` and `case1440c.png` remain provenance aliases, not independent proof.
- Family Finance product behaviors mentioned in the portfolio narrative are excluded; only their presentation/curation is in scope.

## Queue status

- **Status:** QUEUED — NOT CANONICAL
- **Recommended semantic review outcome:** Review each child packet independently under `MERGE_RULES.md`; do not canonicalize this index as one monolithic decision.
