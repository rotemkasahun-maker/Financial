# Family Finance Product & UX Decision Archive

This archive is the deep historical source of truth for meaningful Family Finance Product & UX decisions. It covers interaction and behavioral UX, AI UX, information architecture, product and product architecture, validation strategy, system trust, UX architecture, scope management, and financial-domain semantics. It preserves what was decided, why it was decided, which approaches failed or were rejected, and the strongest evidence that truthfully validates the decision.

The public Portfolio UI is a separate editorial layer. It may select and summarize archive material for a case study, but it is not the canonical decision record and must not silently strengthen archive claims.

Findings from Product Chat, Portfolio UI, and Codex enter through the corresponding `incoming/` directory. Incoming material is provisional. It must be compared semantically with existing canonical records and assigned an outcome from `MERGE_RULES.md` before it can become canonical.

`MERGE_RULES.md` is the single current Standing Product & UX Decision Logging Rule and governs qualification, evidence integrity, validation, privacy, ownership, and semantic merge outcomes.

Meaningful Product decisions belong here when they materially change user experience, define trust or uncertainty boundaries, determine what the product exposes or deliberately withholds, affect household workflow or mental models, define AI/human responsibility, establish validation required before a product promise, or express product architecture relevant to user value. Not every implementation change belongs here: pure refactors, bugs, deployment work, build configuration, test plumbing, dependency changes, infrastructure, and other engineering details do not qualify merely because they affect the product.

Each canonical record may optionally include a `Decision type` field using only materially relevant types: `UX`, `Behavioral UX`, `AI UX`, `Information Architecture`, `Product`, `Validation`, `System Trust`, `Product Architecture`, or `UX Architecture`.

Archive completeness is not public portfolio completeness. Canonical decisions may remain out of the public case study; curation should prioritize employer-facing value and complementary competencies.

Validation claims must remain truthful. Use only these levels when applicable:

- `PROTOTYPE`
- `SYNTHETIC TEST`
- `DEVICE E2E`
- `REAL HOUSEHOLD USE`

A validation level describes the strongest demonstrated evidence, not the intended maturity of the feature. Do not imply household adoption from prototype, synthetic, or device-only evidence.

Missing historical screenshots and BEFORE states must never be recreated and presented as historical evidence. Record the gap explicitly when authentic evidence cannot be recovered.

Existing files elsewhere under `portfolio-evidence/` remain evidence in place. This archive setup does not move, rename, delete, or deduplicate them.
