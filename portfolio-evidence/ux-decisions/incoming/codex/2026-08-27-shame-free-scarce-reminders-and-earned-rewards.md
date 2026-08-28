# Codex UX Decision Intake Packet

## Intake metadata

- **Date:** 2026-08-27
- **Commit / working-tree context:** `main`; behavioral UX backfill only.
- **Repository task/context:** Motivation/reminder audit focused on avoidance, memory burden, and interruption cost.
- **Proposed merge target:** `nonfinancial-xp-madrid-goal-boundary`
- **Packet type:** `DECISION_CHANGE`

## Finding

- **What changed:** The canonical XP/Madrid record preserves the money/XP safety boundary but underplays the behavioral design: unavoidable financial admin is framed as a small, completable mission; reminders use one clear action, few taps, scarce follow-ups, no guilt, and immediate positive feedback. Rewards recognize human effort, while automatic resolution earns no XP.
- **Why it matters at UX/Product Architecture level:** Users who avoid tedious or shame-laden money administration are more likely to act when the request is bounded, nonjudgmental, directly actionable, and visibly complete. Rewarding automation would distort agency and motivation.
- **USER-STATED NEED:** KNOWN — `GAMIFICATION.md` explicitly defines ADHD-friendly, no-shame, low-interruption product rules and motivation without corrupting financial truth.
- **DESIGN INFERENCE:** Turn necessary manual cleanup into a lightweight positive interaction, but never pressure users for spending outcomes, punish delay, or gamify hardship.
- **IMPLEMENTED status:** PARTIALLY IMPLEMENTED — task language, deep links, completion XP, exactly-once rewards, deferred-review missions, and zero XP for automatic closure exist. Reminder-count and dismissal/snooze behavior are not fully validated end to end.
- **VERIFIED status:** Synthetic tests verify exactly-once XP, zero financial impact, automatic closure without XP/streak penalty, and task deep links. Motivational effectiveness, shame reduction, and reminder cadence are not user-validated.
- **Strongest truthful validation level:** SYNTHETIC TEST

## Evidence

- **Exact code/history paths:** `GAMIFICATION.md:1-27`; `CODEX_WORKING_RULES.md:23`; `src/services/taskEngine.js:14-36`; `src/views/fileImportView.js:25`; `tests/taskEngine.test.js:4-8`; `tests/reviewLifecycle.test.js:18-20`; `tests/madridGoal.test.js`.
- **Tests and results:** Existing synthetic task/review/Madrid tests cover reward boundaries and completion semantics. This documentation-only audit did not rerun them.
- **Commit(s):** `84cbcb6`, `06c11a9`, `5256d1d`, `17170c0`, `5af6015`.
- **Screenshots/browser/device artifacts:** Current Madrid/tasks UI exists; no comparative behavior study or dedicated reminder-cadence capture found.
- **Handoff/reference sections:** `FAMILY_FINANCE_MASTER_HANDOFF.md` §§1,8,10; continuity §§1,9.
- **Evidence safety:** PUBLIC-SAFE — docs, synthetic tests, and source only.
- **Duplicate aliases:** NONE

## Interpretation

- **Rejected or failed approach:** Shame, negative points, guilt language, spending-based competition, unlimited nagging, rewards for automatic work, and XP that changes money.
- **Limitations and unverified claims:** No evidence proves that XP motivates either household member or that the reminder cadence is optimal. Several ADHD-friendly rules are design intent rather than fully verified behavior.
- **Conflict with current canonical record:** The canonical title and rationale center the technical XP/money boundary; they do not adequately explain avoidance, memory burden, interruption limits, non-shaming language, or why only human effort earns rewards.
- **Missing historical evidence:** No validated BEFORE experience, behavioral interview, or longitudinal engagement data exists.
- **Open questions for semantic merge review:** Whether to retitle/reframe the XP/Madrid record around humane motivation and retain the financial-domain boundary as a guardrail.

## Queue status

- **Status:** QUEUED — NOT CANONICAL
- **Suggested merge-rule outcome:** MERGE_INTO_EXISTING
