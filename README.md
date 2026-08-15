# Family Finance — Codex Starter

This folder is the handoff package for the household finance app.

Files:
- `AGENTS.md` — standing instructions and finance rules for Codex
- `PRODUCT_SPEC.md` — product and data specification
- `CODEX_KICKOFF_PROMPT.md` — first prompt to paste into Codex

Recommended workflow:
1. Create/open a new local folder or Git repository in Codex.
2. Copy these files into the repository root.
3. Paste the contents of `CODEX_KICKOFF_PROMPT.md` into Codex.
4. Let Codex build the first local version using mock data.
5. Review the UI and receipt flow before connecting the real Google Sheet.

## Run the MVP

Requires Node.js. From this directory run `npm.cmd run dev`, then open
`http://127.0.0.1:4173`. Run `npm.cmd test` and `npm.cmd run build` for verification.

The app currently uses demo data only and has no external credentials. See
`ARCHITECTURE.md` for the shared Web/Android domain, two-member provenance and
unified import-pipeline decisions.
