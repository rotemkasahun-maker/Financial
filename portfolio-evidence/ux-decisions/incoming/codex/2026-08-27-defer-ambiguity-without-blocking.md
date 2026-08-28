# Codex UX Decision Intake Packet

## Intake metadata

- **Date:** 2026-08-27
- **Commit / working-tree context:** `main`; behavioral UX backfill only.
- **Repository task/context:** Import/review lifecycle audit focused on uncertainty, interruption, and returning later.
- **Proposed merge target:** `exception-first-mobile-financial-file-import`
- **Packet type:** `DECISION_CHANGE`

## Finding

- **What changed:** A meaningful behavioral layer is buried inside the import decision: noncritical uncertainty can be deferred without blocking the useful remainder of an import, retained as one later task, and silently closed if new evidence resolves it. Only critical integrity uncertainty blocks progress.
- **Why it matters at UX/Product Architecture level:** A user importing a large file may not know what one credit means and may abandon the entire job if forced to decide immediately. Preserving uncertainty while allowing safe progress reduces context switching and avoids guessing simply to get past the screen.
- **USER-STATED NEED:** KNOWN — working rules explicitly say to defer noncritical ambiguity instead of blocking and to batch low-priority tasks/reminders.
- **DESIGN INFERENCE:** Give the user an honest “I’ll check later” path; keep the item out of totals while unknown; generate one deduplicated follow-up; let later receipt/Gmail/SMS evidence resolve it without demanding another confirmation.
- **IMPLEMENTED status:** IMPLEMENTED in the local/mock import and review lifecycle.
- **VERIFIED status:** Synthetic tests cover nonblocking defer, one deduplicated task, batched reminder, later automatic evidence resolution, automatic task closure without XP/streak penalty, and continued blocking for critical integrity risks.
- **Strongest truthful validation level:** SYNTHETIC TEST

## Evidence

- **Exact code/history paths:** `CODEX_WORKING_RULES.md:31-34`; `src/services/fileImport.js:80-98`; `src/services/dataService.js:33,115-137`; `src/services/taskEngine.js:17-24`; `src/views/fileImportView.js:25`; `tests/reviewLifecycle.test.js:16-23`; `tests/staleReviewState.test.js:12-20`.
- **Tests and results:** Canonical repository tests named above verify the behavior synthetically. No new product test was run for this documentation-only backfill.
- **Commit(s):** `06c11a9`, `5af6015`.
- **Screenshots/browser/device artifacts:** Existing import preview evidence only; no dedicated defer journey capture found.
- **Handoff/reference sections:** `FAMILY_FINANCE_MASTER_HANDOFF.md` §§1,7,10.
- **Evidence safety:** PUBLIC-SAFE — synthetic source/test evidence only.
- **Duplicate aliases:** NONE

## Interpretation

- **Rejected or failed approach:** Blocking the whole import, forcing a guess, excluding the unknown row permanently, or creating repeated reminders for the same ambiguity.
- **Limitations and unverified claims:** Shared-backend parity and real household use of defer/later resolution are not established.
- **Conflict with current canonical record:** The canonical exception-first record mentions deferred noncritical ambiguity but does not preserve the behavioral reason, “check later” user situation, automatic later closure, or no-reward-for-automation boundary.
- **Missing historical evidence:** No authentic before-state or abandonment evidence exists.
- **Open questions for semantic merge review:** Whether the full defer lifecycle belongs as a subsection of exception-first import or deserves a separate decision if reused outside imports.

## Queue status

- **Status:** QUEUED — NOT CANONICAL
- **Suggested merge-rule outcome:** MERGE_INTO_EXISTING
