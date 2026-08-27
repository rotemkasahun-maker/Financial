# Codex Intake

This directory is the standing intake queue for materially new UX or Product Architecture information discovered during Codex repository work. Packets are provisional evidence context. Ordinary product-development work must not directly create or update canonical records in `../../decisions/` or `../../MASTER_INDEX.md`.

## Before creating a packet

1. Read `../../MASTER_INDEX.md`.
2. Read every relevant canonical `../../decisions/<decision-slug>/decision.md` record.
3. Read `../../MERGE_RULES.md`.
4. Search semantically for an existing matching decision. Do not rely only on titles or slugs.

## Create a packet only when

At least one of these is true:

- A meaningful UX or Product Architecture decision is newly implemented.
- An existing canonical decision materially changes.
- A meaningful alternative or rejected approach is discovered.
- A failure exposes an incorrect UX/system assumption.
- A new edge case materially changes intended behavior.
- Implementation status changes.
- Validation level may change.
- Meaningful new test, device, browser, or real-household evidence appears.
- Existing canonical behavior becomes inaccurate.
- Stronger evidence materially changes what the archive can truthfully claim.

Do not create packets for routine bug fixes, refactors, build/tooling work, Gradle/JDK/ADB work, deployment mechanics, backend plumbing without UX/Product Architecture consequence, minor implementation details, or evidence already represented without meaningful new information.

## Queue and merge boundary

- Use `PACKET_TEMPLATE.md` for every packet.
- Store each packet as a new Markdown file in this directory. Use an ISO date and concise provisional slug, for example `2026-08-27-shared-reminder-background-evidence.md`.
- Select exactly one packet type from the template.
- A proposed merge target is advisory; semantic review decides the final merge outcome.
- Leave packets queued. Do not automatically merge them into canonical decisions during ordinary development.
- Do not modify the public Portfolio UI as part of intake.

## Truthfulness rules

Never fabricate UX reasoning from constants, invent user needs, reconstruct missing historical BEFORE states, or upgrade validation from implementation alone. A passing unit test is not DEVICE E2E. Narrow REAL HOUSEHOLD USE evidence must remain narrowly described. Duplicate evidence aliases are not independent proof. Label private/local evidence as non-public.
