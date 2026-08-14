# Tasks, rewards and smart reminders

The system rewards useful actions, never spending less and never financial hardship. Personal XP supports friendly competition around completing tasks; household progress reflects shared data completeness and goals.

## ADHD-friendly product rules

- One clear action per reminder.
- Minimal text and visible progress.
- Immediate positive feedback after completion.
- Deep-link to the exact action; never make the user search.
- Reduce memory burden with tasks generated from detected needs.
- Use at most a first reminder and one optional follow-up by default.
- Completed, dismissed, snoozed or “no receipt available” tasks stop notifications.
- No shame, negative points or guilt language.
- Completion should take as few taps as possible.

## Lifecycle

`financial need → idempotent Task → NotificationRule waiting window → actionable reminder → deep link → completed action → task auto-complete → exactly one XPEvent → score/challenge progress`

A missing-receipt task is created only after automatic Gmail/SMS/digital/uploaded receipt matching has had its configured waiting window. Its dedupe key is `missing_receipt:<transaction_id>`. The deep link is `receipt_capture` with `transactionId`, so capture opens with the likely match already selected.

Task ownership uses explicit `userId`, then source/device/account metadata, otherwise household/unassigned. Challenges are configuration records; they may measure task completion or shared completeness. Android notification delivery is a future adapter and does not change task or rule semantics.
