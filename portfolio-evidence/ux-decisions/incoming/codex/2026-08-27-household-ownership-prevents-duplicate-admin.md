# Codex UX Decision Intake Packet

## Intake metadata

- **Date:** 2026-08-27
- **Commit / working-tree context:** `main`; behavioral UX backfill only.
- **Repository task/context:** Household coordination audit across tasks, expected documents, and shared completion.
- **Proposed merge target:** `shared-expected-document-maintenance`
- **Packet type:** `DECISION_CHANGE`

## Finding

- **What changed:** Shared state is not only a consistency architecture. It supports a behavioral coordination decision: assign work to the person indicated by source/context when possible, fall back visibly to the household when ownership is unknown, and let one completion remove the obligation for everyone without duplicate reminders or rewards.
- **Why it matters at UX/Product Architecture level:** In a two-person household, unclear ownership causes either avoidance (“the other person will do it”) or duplicate effort. A shared, idempotent task with explicit ownership makes responsibility legible and prevents both people from repeating the same admin.
- **USER-STATED NEED:** NOT KNOWN — the product is explicitly for two people sharing household truth, but no direct user statement about diffusion of responsibility or duplicate household admin was found.
- **DESIGN INFERENCE:** Infer ownership from explicit user/source/device/account evidence; otherwise mark the work household/unassigned rather than guessing. Completion must converge across clients and stop further prompting.
- **IMPLEMENTED status:** PARTIALLY IMPLEMENTED — task ownership inference, household-owned expected documents, shared completion, dedupe keys, and exactly-once rewards exist. Broader reassignment/claiming UI is absent.
- **VERIFIED status:** Synthetic ownership and cross-client convergence tests exist; one narrow real-household expected-document completion converged. The inferred behavioral benefit itself is not validated.
- **Strongest truthful validation level:** REAL HOUSEHOLD USE — narrow, one expected-document completion only

## Evidence

- **Exact code/history paths:** `GAMIFICATION.md:19-23`; `src/services/taskEngine.js:9-15`; `src/services/dataService.js:87-89`; `backend/financeDataService.ts`; `tests/taskEngine.test.js:9`; `tests/sharedFinance.test.js:13`; `tests/monthlyExpectedDocuments.test.js`.
- **Tests and results:** Existing synthetic tests verify owner inference, task/document dedupe, shared completion, and exactly-once reward. Narrow real-household completion is recorded in continuity; no new product test was run.
- **Commit(s):** `84cbcb6`, `2f826be`, `5a71c4d`.
- **Screenshots/browser/device artifacts:** Shared maintenance completion captures exist canonically; real household data/screens remain private.
- **Handoff/reference sections:** `FAMILY_FINANCE_MASTER_HANDOFF.md` §§1,8,16-18; continuity §§9,18,21.
- **Evidence safety:** MIXED — code/tests are public-safe; real household completion evidence is private/non-public.
- **Duplicate aliases:** Shared maintenance screenshot aliases are already listed in `MASTER_INDEX.md` and are not additional proof.

## Interpretation

- **Rejected or failed approach:** Separate per-client obligations, guessed ownership without evidence, repeated task creation, duplicate XP, and reminders that continue after another household member completed the work.
- **Limitations and unverified claims:** No claiming/reassignment experience exists, and no study shows whether current owner labels reduce household coordination friction.
- **Conflict with current canonical record:** The expected-document and shared-state records emphasize durability and convergence; the human responsibility/duplicate-work rationale is largely absent.
- **Missing historical evidence:** No household interview or duplicate-admin BEFORE capture exists.
- **Open questions for semantic merge review:** Whether this rationale belongs primarily in expected-document maintenance, shared canonical state, or a separate household-coordination decision.

## Queue status

- **Status:** QUEUED — NOT CANONICAL
- **Suggested merge-rule outcome:** MERGE_INTO_EXISTING
