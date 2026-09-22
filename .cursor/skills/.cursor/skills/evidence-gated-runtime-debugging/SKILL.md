---
name: evidence-gated-runtime-debugging
description: Evidence-first runtime debugging for reproducible cross-layer failures, especially when data may mutate across OCR/AI/API/merge/UI boundaries. Proves the failing boundary before changing code.
---

# Evidence-Gated Runtime Debugging

Use this skill when a bug is visible in runtime behavior but the failing layer is not yet proven.

Typical examples:
- expected value differs from observed value
- a field changes somewhere between source input and UI
- OCR / AI / parser / API / mapping disagreement
- intermittent or environment-specific production behavior
- suspicious regressions after a deployment
- slow requests where the actual latency source is unknown
- a backend response looks correct but the UI is wrong
- a UI looks correct but canonical state may be wrong

This skill is especially important for financial, identity, security, or other high-integrity data.

## Core rule

**Observed failure → exact failing boundary → proven root cause → smallest corrective implementation → real acceptance**

Do not skip directly from symptom to solution.

---

## Non-negotiable rules

### 1. No change before proof

Do not change:
- prompts
- OCR preprocessing
- model selection
- merge logic
- API mapping
- frontend mapping
- schema
- persistence
- retries
- timeouts
- infrastructure

based only on a plausible theory.

First gather read-only evidence that proves the failing boundary.

### 2. Reproduction before repair

Record a concrete reproducible case.

Always capture:

- **Input**
- **Expected**
- **Observed**
- **Environment**
- **Exact path exercised**
- **Whether canonical state was mutated**

Example:

```text
INPUT:
supermarket receipt benchmark

EXPECTED:
total = 38.20

OBSERVED:
review UI total = 39.20

ENVIRONMENT:
production web + production backend

CANONICAL MUTATION:
NO
```

If the issue cannot yet be reproduced, classify it as `UNVERIFIED` rather than guessing.

### 3. Preserve expected-vs-actual ground truth

For every investigated field, explicitly record:

```text
FIELD:
EXPECTED:
OBSERVED:
SOURCE OF EXPECTED VALUE:
```

Do not silently redefine the expected result to match what the system produced.

Ground truth must stay stable throughout the investigation.

---

## Field provenance tracing

When a field is wrong, trace the **same field** through every relevant boundary.

For a receipt pipeline, this may be:

```text
original image
→ preprocessed image
→ raw OCR text
→ AI structured extraction
→ hybrid fallback result
→ merge result
→ validated backend result
→ HTTP API response
→ Web mapping
→ review UI
→ canonical save payload
```

For each boundary, record the exact value.

Example:

```text
FIELD: total

raw OCR text:
38.20

AI extraction:
38.20

post-hybrid merge:
38.20

/api/receipts/analyze response:
38.20

Web mapped review state:
39.20

UI:
39.20
```

This proves the failing boundary is Web mapping, not OCR, AI, or Vision.

### Provenance requirement

Do not say:
- "probably OCR"
- "Vision may have overwritten it"
- "the frontend seems wrong"

Instead return:

```text
FAILING BOUNDARY:
Web API-response → review-state mapping

PROOF:
backend response total=38.20
review state total=39.20
```

If the exact boundary is not proven, status remains:

`ROOT_CAUSE_NOT_PROVEN`

---

## Authority contract check

Before debugging a multi-source system, identify which source is authoritative for each field.

Example:

```text
merchant: OCR→AI authoritative
purchaseDate: OCR→AI authoritative
total: OCR→AI authoritative
currency: OCR→AI authoritative
item totals: OCR first, Vision fallback allowed
item name: OCR first, Vision may fill only when empty
category: Vision not authoritative
```

Then verify that no lower-authority source overwrote a higher-authority field.

Any unexpected authority violation is a separate bug.

---

## Mutation safety

Diagnostics should be read-only unless mutation is explicitly necessary.

For financial workflows:

- do not save test receipts to canonical state
- do not alter production finance state
- do not rewrite historical transactions
- do not clear Android app data
- do not modify IAM/secrets
- do not deploy during diagnosis

unless separately authorized.

When a mutation is unavoidable, isolate one production mutation boundary at a time.

---

## Latency decomposition

When the user reports that something is "slow", do not optimize blindly.

Measure the request by stage.

Possible stages:

```text
image preprocessing
OCR
AI structured extraction
Vision fallback
validation
network transfer
frontend rendering
total request duration
```

Return measured timings where available:

```text
preprocess: 0.8s
OCR: 9.6s
AI extraction: 5.1s
Vision fallback: 17.4s
validation: 0.1s
TOTAL: 33.0s
```

Then identify the dominant contributor.

Do not infer that Vision is the bottleneck merely because Vision exists.

If timings cannot be observed with existing telemetry, first inspect whether existing logs/traces already expose them.

Only add temporary instrumentation if:
1. the timing boundary cannot otherwise be proven;
2. instrumentation is scoped and non-sensitive;
3. it can be removed or converted into safe permanent telemetry afterward.

---

## Investigation sequence

### Phase 1 — Freeze scope

State:

```text
SYMPTOM:
EXPECTED:
OBSERVED:
ENVIRONMENT:
USER IMPACT:
CANONICAL MUTATION RISK:
```

Do not broaden scope.

### Phase 2 — Inventory existing path

Inspect the real runtime/source path.

Identify:
- handler
- service
- parser/extractor
- merge layer
- validator
- API serializer
- frontend mapping
- persistence boundary
- existing tests
- existing logs/telemetry

Prefer existing project primitives over new mechanisms.

### Phase 3 — Form bounded hypotheses

Create a short ranked list, usually 2–5 hypotheses.

Example:

```text
H1: OCR→AI returned 39.20
H2: Vision overwrote total despite authority contract
H3: backend validation transformed 38.20 → 39.20
H4: Web mapping transformed 38.20 → 39.20
```

Every hypothesis must be falsifiable.

### Phase 4 — Gather discriminating evidence

Choose the smallest read-only observation that separates the hypotheses.

Examples:
- inspect analyze response
- inspect structured extractor result
- inspect post-merge object
- inspect browser network response
- inspect runtime logs
- compare production artifact to source

Avoid adding broad logs when one existing response proves the boundary.

### Phase 5 — Prove root cause

Return:

```text
ROOT CAUSE:
...

FAILING BOUNDARY:
...

PROOF:
...

REJECTED HYPOTHESES:
...
```

Do not proceed to implementation unless the failing boundary is proven.

### Phase 6 — Design the smallest compatible fix

Use this preference order:

**existing repo primitive → existing mature dependency → compatible extension → new custom mechanism**

The proposed fix must:
- affect only the proven failing boundary
- preserve authority contracts
- preserve canonical safety
- avoid unrelated refactors
- include regression coverage

### Phase 7 — Verify implementation

Distinguish evidence levels:

- `CODE_WRITTEN`
- `SOURCE_PATH_CONFIRMED`
- `UNIT_PROVEN`
- `HANDLER_RUNTIME_PROVEN`
- `LIVE_RUNTIME_PROVEN`
- `DEVICE_PROVEN`
- `NOT_RUN`
- `UNKNOWN`
- `BLOCKED`

Never collapse these into "fixed".

### Phase 8 — Real acceptance

Repeat the **same reproduction case** that originally failed.

Compare against the original expected ground truth.

Do not substitute a synthetic test for the real acceptance case when the bug originally occurred on real input.

---

## Stop-random-iteration rule

If two consecutive attempted fixes do not resolve the same reproduced failure:

**STOP changing code.**

Return to:
- path inventory
- field provenance
- authority contract
- runtime artifact verification

Do not continue prompt-tuning or parameter-tweaking.

---

## Production artifact verification

When local/source behavior and production behavior disagree, verify the artifact actually serving the user.

Check:
- active revision
- traffic
- runtime health
- deployed source/build identity where available
- frontend and backend independently if they are separate services

Do not assume:
- latest source = deployed source
- backend deployment = web deployment
- build PASS = production PASS

---

## Required output format

For diagnosis-only work, return:

```text
STATUS:
ROOT_CAUSE_PROVEN
or
ROOT_CAUSE_NOT_PROVEN
or
BLOCKED

REPRODUCTION:
input:
expected:
observed:
environment:

FIELD PROVENANCE:
<field 1>:
  source/input:
  OCR/parser:
  AI:
  merge:
  API:
  UI:
  save payload:

FAILING BOUNDARY:
...

ROOT CAUSE:
...

EVIDENCE:
...

LATENCY:
preprocess:
OCR:
AI:
Vision:
validation:
network/UI:
total:

AUTHORITY CHECK:
...

CANONICAL STATE MUTATED:
NO / YES

NEXT:
<smallest justified next action>
```

For implementation work, additionally return:

```text
CHANGE:
...

FILES:
...

TESTS:
...

VERIFICATION LEVEL:
...

REGRESSION ACCEPTANCE:
...
```

---

## Family Finance-specific guardrails

When used in Family Finance:

- OCR→AI remains authoritative for receipt core fields unless a newer canonical contract explicitly changes this.
- Vision must not overwrite merchant/date/total/currency in the current hybrid receipt architecture.
- Vision item fallback must remain review-gated.
- `requiresReview=true` whenever Vision contributes.
- analyze must not silently save canonical finance state.
- PDF flow must not be changed during image-path debugging unless evidence proves it is involved.
- do not change Web, Android, IAM, secrets, canonical state, or production category semantics without separate evidence and authorization.
- preserve the mixed working tree.
- never use `git add .` or `git add -A`.
- no commit/push unless explicitly authorized.

For receipt extraction failures, prefer tracing:

```text
original receipt
→ OCR text
→ extractReceiptWithAi
→ shouldUseItemVisionFallback
→ Vision result
→ item-only merge
→ validation
→ /api/receipts/analyze JSON
→ Web review mapping
→ review screen
```

---

## Current benchmark pattern example

A strong regression case is one where:
- expected core field is known
- previous extractor behavior is known
- hybrid behavior is visible
- canonical save can be withheld

Example acceptance structure:

```text
EXPECTED TOTAL: 38.20
EXPECTED ITEM TOTALS: 8.50 / 29.70

If UI shows total 39.20:
trace total provenance.

If item totals show 8.50 / 29.70:
record item fallback success separately.

Do not let successful item recovery hide a failing core field.
```

A mixed result must remain mixed:

```text
ITEM FALLBACK: PASS
CORE TOTAL: FAIL
REVIEW GATE: PASS
OVERALL FLOW: NOT ACCEPTED
```

---

## Skill completion rule

This skill has succeeded only when one of these is true:

1. the exact failing boundary and root cause are proven; or
2. the investigation is explicitly blocked by missing evidence and the missing evidence is identified precisely.

It has **not** succeeded merely because a plausible fix was proposed.
