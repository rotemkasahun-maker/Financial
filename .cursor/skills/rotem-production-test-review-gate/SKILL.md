---
name: rotem-production-test-review-gate
description: Apply production-grade verification after coding: reproduce, test, review, inspect regressions, and require evidence before shipping.
---

# Production Test & Review Gate

Adapted from production engineering patterns in kk-agent/skill.md.

## Principle
Implementation is not proof.

## Gate
1. Re-state expected behavior.
2. Identify changed files/surface.
3. Run narrow tests first.
4. Run relevant broader regressions.
5. Inspect runtime behavior where possible.
6. Review diff for unintended scope.
7. Check data/security boundaries when relevant.
8. Verify git sync separately.
9. Report evidence and unresolved risk.

## Bug fix
reproduce → localize → reduce → fix → guard/regression test → re-run original reproduction.

## Review axes
correctness, scope discipline, maintainability, data/security safety, regression risk.

## Result
PASS / PASS_WITH_UNVERIFIED_RISK / FAIL

Never use PASS when the core scenario was not actually exercised.
