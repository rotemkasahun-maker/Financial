# Portfolio UI UX Decision Intake Packet

## Intake metadata

- **Date:** 2026-08-27
- **Commit / working-tree context:** Portfolio UI behavioral-gap review against `Financial/main` canonical UX Decision Archive and existing incoming Codex evidence.
- **Repository task/context:** Review public Family Finance case-study claim `When it really does need me, it can ask.` against current product behavior and validation.
- **Proposed merge target:** `receipt-expectation-grace-window`
- **Packet type:** `CONFLICT_OR_INCONSISTENCY`

## Finding

- **What changed:** The current public case-study roadmap presents a clean behavioral promise: the system asks only when needed, illustrated by a missing-receipt notification. Canonical archive evidence shows the timing behavior is not yet consistent across architectures, while an existing Codex incoming packet records a newer 1–2 minute point-of-purchase requirement whose authoritative backend prerequisite is only partially implemented and whose Android reminder flow is not yet implemented or device-verified.
- **Why it matters at UX/Product Architecture level:** Timing is part of the UX decision, not an implementation footnote. A reminder that arrives too early interrupts unnecessarily; one that arrives much later loses the point-of-purchase context. The public story must not imply a fully working selective-interruption behavior beyond the strongest truthful evidence.
- **USER-STATED NEED:** KNOWN — ask for a missing receipt only after a short evidence-arrival window, while the purchase is still contextually fresh, suppressing the prompt when evidence is already linked and avoiding duplicates.
- **DESIGN INFERENCE:** The public portfolio can preserve the behavioral principle, but implementation/validation wording must distinguish the intended selective-interruption model from current partial/inconsistent execution.
- **IMPLEMENTED status:** PARTIALLY IMPLEMENTED — authoritative receipt-state resolution exists per the Codex incoming packet; the near-real-time Android reminder flow is not implemented. Canonical local/mock task logic and shared backend timing also diverge.
- **VERIFIED status:** SYNTHETIC verification exists for the authoritative backend prerequisite and for older task suppression/creation behavior; no complete near-real-time reminder vertical slice is verified.
- **Strongest truthful validation level:** SYNTHETIC TEST

## Evidence

- **Exact code/history paths:** See canonical `receipt-expectation-grace-window/decision.md` and incoming Codex packet `2026-08-27-near-real-time-receipt-grace-alpha-requirement.md`.
- **Tests and results:** Canonical archive records synthetic old/new transaction suppression/creation tests; Codex incoming records focused backend contract tests. No end-to-end Android test of the new point-of-purchase reminder exists.
- **Commit(s):** Canonical history includes `84cbcb6`, `bc2362f`, `65d8908`; new authoritative prerequisite is in the current uncommitted Alpha working tree per the Codex packet.
- **Screenshots/browser/device artifacts:** Current portfolio case study uses/plans a fabricated-but-authorized Android notification as storytelling evidence; this is not product-validation evidence.
- **Handoff/reference sections:** Public roadmap: `When it really does need me, it can ask.` with one Android missing-receipt notification. Canonical timing record and Codex incoming packet as above.
- **Evidence safety:** MIXED — public portfolio notification can be fabricated as external evidence; implementation/device artifacts and household data have separate public-safety constraints.
- **Duplicate aliases:** NONE

## Interpretation

- **Rejected or failed approach:** Treating generic periodic maintenance or immediate task creation as equivalent to the intended point-of-purchase selective-interruption behavior.
- **Limitations and unverified claims:** The portfolio must not claim that the 1–2 minute reminder flow is currently implemented or device-validated. Public storytelling itself is not proof.
- **Conflict with current canonical record:** The public narrative currently reads more complete than the canonical implementation state. Canonical record still documents inconsistent timing; the newer incoming requirement is not yet fully implemented.
- **Missing historical evidence:** No authentic historical implementation/BEFORE capture for the earlier ~60-second proposal; do not reconstruct one.
- **Open questions for semantic merge review:** Whether the public case study should frame this as an intended/partially implemented behavioral rule until the full near-real-time Android vertical slice is verified; whether the canonical decision should separate fast contextual interruption from slower maintenance-task generation.

## Queue status

- **Status:** QUEUED — NOT CANONICAL
- **Suggested merge-rule outcome:** MERGE_INTO_EXISTING
