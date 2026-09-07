# Family Finance — Product Learning Log

This log records the professional learning produced by the product work. It is not a claim that Rotem personally wrote code implemented by AI. It records the decisions, questions, evidence, and concepts Rotem is learning through directing, reviewing, testing, and reflecting on the work.

## How to use this log

Add an entry when work creates a meaningful product, engineering, research, or delivery lesson. Keep entries short and concrete. Prefer one concept tied to one real decision over a generic tutorial.

Each entry should capture:

- **Date / stage**
- **Product situation**
- **Decision or evidence**
- **Professional term**
- **Why teams use it**
- **Transferable learning**
- **Open question / next proof**

## Current baseline

**Date / stage:** 2026-09-07 — Alpha hardening / pre-acceptance  
**Product situation:** The Alpha must work without a PC, ADB, LAN backend, manual sync, or periodic polling as its primary transport.  
**Decision or evidence:** The architecture audit found useful local persistence, WorkManager, authenticated ingestion, and Web state, but the phone-independent end-to-end path and immediate receipt prompt are not yet accepted.  
**Professional term:** Release gate / acceptance criteria.  
**Why teams use it:** A gate turns a vague feeling of readiness into an explicit, testable decision and prevents risky real-world validation from becoming debugging.  
**Transferable learning:** Product maturity is demonstrated by evidence at the right boundary, not by the amount of code or the number of features.  
**Open question / next proof:** Establish a safe synthetic, non-financial `PHONE_INDEPENDENT_E2E_PASS` before real-transaction testing.

## Baseline concepts

### Evidence before implementation

Inspecting the actual Android, backend, Web, build, and preflight paths before changing code is an **architecture reconciliation audit**. Professional teams do this when a product has accumulated prototype assumptions, because local fixes can otherwise preserve a system-level conflict. The transferable lesson is to separate observed facts, hypotheses, and proposed changes.

### Release gates

The sequence from `NOT_READY` to `ALPHA_ACCEPTED` is a **stage-gate process**. Teams use stage gates to make readiness explicit and to control risk, especially when real users, money, devices, or production infrastructure are involved. The transferable lesson is to ask “what evidence unlocks the next stage?” rather than “can we try it anyway?”

### Safe synthetic acceptance

The planned non-financial phone test is a **test harness / acceptance test**. Teams use isolated synthetic data to prove transport and recovery without contaminating canonical business data. The transferable lesson is that good testing protects both the system and the people whose data it manages.

### Learning through directing and reviewing

Rotem's role includes product framing, prioritization, reviewing evidence, making scope decisions, and evaluating AI-generated implementation. This is **AI-assisted product development**, not a claim of hand-written implementation. The transferable lesson is to build professional judgment through clear constraints, critique, validation, and reflection.

## Future entries

Use the template below for the next meaningful milestone.

### YYYY-MM-DD — [stage/process]

**Product situation:**  
**Decision or evidence:**  
**Professional term:**  
**Why teams use it:**  
**Transferable learning:**  
**Open question / next proof:**  
