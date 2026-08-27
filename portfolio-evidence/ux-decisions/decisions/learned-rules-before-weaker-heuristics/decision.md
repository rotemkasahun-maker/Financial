# Learned rules before weaker heuristics

- **Validation:** SYNTHETIC TEST
- **USER-STATED NEED:** Household corrections should prevent repeated classification work.
- **DESIGN INFERENCE:** Explicit rules outrank heuristics; amount alone is insufficient; conflicts go to review.
- **IMPLEMENTED:** Persistent rules applied to live import preview before weaker logic.
- **VERIFIED:** `tests/classificationRules.test.js` validates persistence, precedence and household mappings; Quick Edit shows the correction surface only.
- **Evidence:** `CODEX_WORKING_RULES.md`, classification services; commits `879e4a0`, `d026a06`; `quick-edit-after.png`. `private-data/classification-rules.json` is private/non-public.
- **Rejected/learning:** Amount-only matching and heuristic override. First learn/reapply UI history unavailable.
- **Open:** Final shared-rule persistence is not fully evidenced.

