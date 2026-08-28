# Use Motion for Causality, Continuity, and State Change

## Decision

Motion must perform a semantic job—show hierarchy, continuity, causality, physicality, preserved context, or state change. It must not exist merely to make the portfolio feel animated.

## Context and viewer problem

The user identified kinetics as missing, but repeated fades, ornamental loops, competing transforms, and scroll-trigger lists risked turning the page into an animation showcase. The inferred viewer problem is following change without losing reading focus.

## Previous state and alternatives

- Add more generic reveals and parallax.
- Use constant decorative motion.
- Build a restrained timeline with one dominant motion and explicit causal beats.

Looping decoration, scroll-jacking, multiple simultaneous moving ideas, jitter, transform conflicts, and motion with no explanatory role were rejected.

## Resulting logic and trade-offs

Scroll acts as narrative time. Movement settles, text remains primary, and reduced-motion states preserve meaning. Strong beats include scattered evidence → collected product and receipt items → structured understanding. Restrained motion is less showy but improves legibility.

## Truth status

- **USER-STATED NEED:** KNOWN — meaningful kinetics was explicitly requested.
- **DESIGN INFERENCE:** Semantic motion improves comprehension and memory more than ornamental motion.
- **IMPLEMENTED:** PARTIAL in Milestone 1 artifact drift and Milestone 2 collection interaction.
- **VERIFIED:** A deployed Milestone 1 motion capture exists; the full kinetic roadmap is not verified.
- **Strongest truthful validation:** `RENDERED BROWSER QA (partial)`

## Evidence and provenance

- `Rotem_Portfolio:portfolio-evidence/portfolio-website/screenshots/2026-08-23-family-finance-milestone-1-motion-qa-deployed.gif`
- Screenshots `README.md`
- `Rotem_Portfolio:script.js`
- Commits `7db833c`, `782d419`, `17a6114`
- Continuity handoff P8, P23–P26, sections 7–8 and 31
- Visual cognition rules 30–32 and 51–64
- Incoming packet: `incoming/codex/2026-08-28-semantic-motion-over-decoration.md`

## Failed approaches and limitations

Opening prototypes v1–v4 exposed fragile motion ownership, discontinuous trajectories, and unreadable timing. These are process evidence, not proof that the current full solution is complete.

## Public representation

`PRESENT BUT UNDEREXPLAINED` — motion is experienced, but its causal role and failure history are not fully explained.

## Open questions

- Whether the finished page sustains continuity without fatigue.
- Complete reduced-motion and multi-viewport validation.
