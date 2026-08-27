# Family Finance UX Decision Archive

This archive is the deep historical source of truth for meaningful Family Finance UX and product-architecture decisions. It preserves what was decided, why it was decided, which approaches failed or were rejected, and the strongest evidence that truthfully validates the decision.

The public Portfolio UI is a separate editorial layer. It may select and summarize archive material for a case study, but it is not the canonical decision record and must not silently strengthen archive claims.

Findings from Product Chat, Portfolio UI, and Codex enter through the corresponding `incoming/` directory. Incoming material is provisional. It must be compared semantically with existing canonical records and assigned an outcome from `MERGE_RULES.md` before it can become canonical.

Not every implementation change belongs here. Pure refactors, deployment work, build configuration, test plumbing, dependency changes, and other engineering details qualify only when they substantively establish or alter a user experience or product-architecture decision.

Validation claims must remain truthful. Use only these levels when applicable:

- `PROTOTYPE`
- `SYNTHETIC TEST`
- `DEVICE E2E`
- `REAL HOUSEHOLD USE`

A validation level describes the strongest demonstrated evidence, not the intended maturity of the feature. Do not imply household adoption from prototype, synthetic, or device-only evidence.

Missing historical screenshots and BEFORE states must never be recreated and presented as historical evidence. Record the gap explicitly when authentic evidence cannot be recovered.

Existing files elsewhere under `portfolio-evidence/` remain evidence in place. This archive setup does not move, rename, delete, or deduplicate them.

