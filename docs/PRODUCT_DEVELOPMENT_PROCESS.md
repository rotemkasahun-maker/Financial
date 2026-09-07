# Family Finance — Product Development Process

## Purpose

Family Finance is developed as both a real household-finance product and a professional product-development practice. Product correctness, financial safety, evidence, and learning quality are all part of the definition of done.

## Current maturity stage

The project is in **Alpha hardening / pre-acceptance**. The Alpha V2 architecture has been reconciled, but the phone-independent end-to-end acceptance path is not yet proven. The current release gate remains `NOT_READY` for real-transaction testing.

The release sequence is fixed:

`NOT_READY → READY_TO_BUILD → READY_TO_INSTALL → READY_FOR_REMOTE_TEST → READY_FOR_REAL_TRANSACTION_TEST → ALPHA_ACCEPTED`

No real purchase, deployment, APK installation, or infrastructure mutation may be used to discover basic build, configuration, authentication, or observability prerequisites. The relevant Alpha preflight must pass first.

## Working loop

Every meaningful change follows this loop:

1. **Frame** — state the user/product problem, scope, maturity-stage constraint, and safety boundary.
2. **Inspect** — examine the existing implementation, evidence, runtime configuration, and current tests before proposing a change.
3. **Hypothesize** — identify the smallest change that could satisfy the requirement and the risks it introduces.
4. **Implement** — preserve existing architecture and financial data; do not rewrite without evidence that it is necessary.
5. **Verify** — add focused regression coverage, run the relevant preflight, and validate the real acceptance condition appropriate to the release gate.
6. **Record** — document the result, remaining uncertainty, and the professional concept learned.

## Product principles

- Hebrew-first, RTL, mobile-first, and usable on a phone.
- Cloud-canonical shared household state; Android and Web must converge on the same truth.
- Evidence is persisted locally before transmission.
- Retries are idempotent; queue items are removed only after accepted ingestion.
- Reimbursements and refunds offset related expenses; transfers do not become income or expense.
- Preserve original receipts and source records. Never silently delete, overwrite, merge, or double-count financial data.
- Event-driven transport is primary. Periodic workers are for reliability and maintenance.
- Diagnostics must be safe: no credentials, tokens, raw SMS, or financial payloads.
- Autonomous execution remains the default. Teaching and documentation must not create unnecessary approval or ping-pong.

## Change boundaries

Documentation/process tasks must not mutate product code, production state, deployment state, APK state, or canonical financial data unless explicitly requested. Destructive actions require confirmation. Existing user changes in a dirty worktree must be preserved.

## Reporting standard

For meaningful work, report briefly:

- what was changed and what was not changed;
- the current product stage/process;
- why a professional team uses this process;
- the relevant professional term;
- the transferable learning for Rotem;
- evidence, validation, uncertainty, and the next safe gate.

Explanations should be conceptual and practical by default, not code-heavy. Reports must distinguish work performed by Rotem from work implemented by AI. Never inflate Rotem's experience or imply that she personally wrote AI-generated code.

## Definition of done

A change is not complete merely because code or copy exists. It is complete when the scoped behavior is implemented, financial-integrity risks are addressed, relevant tests/preflight pass, the maturity gate is respected, and the result is recorded in the learning log when it is meaningful.
