# Make Product Evidence Authentic, Readable, and Explicitly Labeled

## Decision

Separate genuine product proof, simulated external storytelling evidence, and concept/process material. Present genuine UI directly and readably; use device framing only when full-screen context is necessary. Never let polished presentation imply stronger proof than the source supports.

## Context and viewer problem

Manually recreated screens, generic mockups, blurry carousels, arbitrary crops, and staged devices weakened trust and made proof harder to read. The inferred viewer problem is both credibility and recognition under limited attention.

## Previous state and alternatives

- Reconstructed or staged UI used as polished proof.
- Full-device mockups regardless of the relevant detail.
- Genuine source-tracked evidence with clear labeling and direct crops where appropriate.

Unlabeled concepts, HTML approximations presented as runtime proof, fake product states, shiny/perspective devices, duplicate status bars, unreadable full screens, and arbitrary cropping were rejected.

## Resulting logic and trade-offs

Byte-identical screenshots retain provenance and hashes. Temporary storytelling artifacts are labeled in source. Direct crops are preferred for a single feature; a thin flat device frame is reserved for necessary full context. Truthful evidence may appear less polished or remain incomplete.

## Truth status

- **USER-STATED NEED:** KNOWN — product UI must not be fabricated; weak/staged mockups and unreadable crops were rejected.
- **DESIGN INFERENCE:** Readable, source-labeled proof improves viewer trust and evaluation speed.
- **IMPLEMENTED:** YES for provenance, labels, and current flat product presentation; the full crop/shot system is partial.
- **VERIFIED:** Hash/provenance records and rendered portfolio checkpoints exist; no viewer trust test.
- **Strongest truthful validation:** `RENDERED BROWSER QA`

## Evidence and provenance

- `Rotem_Portfolio:assets/family-finance/evidence/README.md`
- `Rotem_Portfolio:portfolio-evidence/README.md`
- `Rotem_Portfolio:portfolio-evidence/portfolio-website/screenshots/README.md`
- `Rotem_Portfolio:family-finance.html`
- Selected `family_finance_partial_reveal_study.html` and `family_finance_real_evidence_study.html`
- Commits `e632920`, `00c6aa5`, `3ab2776`, `17a6114`
- Continuity handoff P11–P14, P18–P19, sections 20, 28–30
- Incoming packets:
  - `incoming/codex/2026-08-28-evidence-authenticity-and-truth-labeling.md`
  - `incoming/codex/2026-08-28-direct-product-proof-over-staged-mockups.md`

## Merge rationale and boundaries

Direct product crops are the presentation consequence of the same trust/readability decision, not a separate user problem. A genuine screenshot may still fail if it is blurry or misleadingly cropped. Demo/redacted evidence is public-safe proof of presentation/implementation, not real-household validation.

## Public representation

`PRESENT BUT UNDEREXPLAINED` — labels and genuine evidence are visible, but the authenticity taxonomy is not fully explained.

## Open questions

- Which private/local artifacts can be described publicly without copying them.
- The final inline-versus-full-context shot list.
