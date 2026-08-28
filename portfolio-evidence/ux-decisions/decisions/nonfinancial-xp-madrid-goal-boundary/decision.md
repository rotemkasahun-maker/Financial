# Nonfinancial XP and Madrid goal boundary

- **Validation:** SYNTHETIC TEST — implemented mechanics and safety boundaries only
- **USER-STATED NEED:** `GAMIFICATION.md` calls for low-interruption, non-shaming motivation without corrupting financial truth.
- **DESIGN INFERENCE:** Frame unavoidable manual administration as a small, completable mission with one clear action and positive completion feedback. XP acknowledges human effort but never changes savings/balances/totals; automatic resolution earns no XP. Do not pressure spending outcomes, punish delay or gamify hardship.
- **IMPLEMENTED:** Madrid destination/service/view, actionable task deep links, completion XP, exactly-once rewards, deferred-review missions, and automatic closure without XP. Reminder-count, dismissal and snooze behavior are not fully established end to end.
- **VERIFIED:** Synthetic Madrid/task/review tests verify exactly-once XP, zero financial impact, automatic closure without XP/streak penalty and task deep links. They do not validate motivation, shame reduction, ADHD suitability or reminder-cadence effectiveness.
- **Evidence:** `GAMIFICATION.md`, `CODEX_WORKING_RULES.md`, `NAVIGATION.md`, Madrid/task/review code; `tests/taskEngine.test.js`, `tests/reviewLifecycle.test.js`, `tests/madridGoal.test.js`; commits `84cbcb6`, `06c11a9`, `5256d1d`, `17170c0`, `5af6015`.
- **Rejected/learning:** XP as money, spending-based competition, shame/guilt language, negative points, unlimited nagging, rewards for automatic work, and hiding motivation as a minor feature.
- **Open:** No evidence establishes motivational effectiveness, shame reduction, ADHD suitability, optimal reminder cadence, household adoption or a valid historical BEFORE.
