---
name: rotem-receipt-evidence-reconciler
description: Reconcile a transaction against SMS, notifications, email receipts, PDFs, statements, reimbursements, screenshots, or other evidence without overmatching.
---

# Receipt Evidence Reconciler

## Goal
Build a defensible transaction ↔ evidence relationship with explicit confidence.

## Matching signals
Consider:
- exact/near amount
- merchant identity/aliases
- timestamp proximity
- payment channel/card/account
- order/reference number
- household member
- reimbursement linkage
- item details when available

## Confidence
- CONFIRMED
- PROBABLE
- POSSIBLE
- CONFLICTED
- NO_MATCH

## Guardrails
- Never fabricate receipt existence.
- Never turn unknown into absent just because search failed.
- Never attach one receipt to unrelated purchases unless the source explicitly aggregates them.
- Preserve original evidence IDs and provenance.
- Prefer unresolved queue to destructive rematching.

## Output
Transaction:
Best evidence:
Confidence:
Supporting signals:
Contradictions:
Other candidates:
Canonical action:
Needs human review: YES/NO
