---
name: canonical-source-resolver
description: Determine the correct source of truth before acting when information may exist across Cursor workspace, GitHub, Figma, Drive, spreadsheets, project files, deployments, screenshots, or chat history.
---

# Canonical Source Resolver

## Goal
Stop agents from using stale context or the wrong artifact.

## Default precedence
### Code
1. Active workspace if work may be unsynced.
2. GitHub target/default branch after sync verification.
3. Old handoffs only as historical context.

### Design
1. Current Figma/design source.
2. Approved live implementation if explicitly locked.
3. Screenshots/references.
4. Chat descriptions.

### Financial data
1. Canonical database/designated spreadsheet.
2. Statements/receipts/evidence.
3. Derived reports.
4. Chat recollection.

### Documents
1. Current Drive/project document.
2. Exported copy only if confirmed current.
3. Chat copy.

## Workflow
1. Identify decision/action.
2. List candidate sources.
3. Mark each: authoritative / derivative / historical / unknown freshness.
4. Check freshness where practical.
5. If authoritative sources conflict, stop and surface the conflict.
6. Otherwise proceed using the canonical source.

## Never
- silently merge conflicting values
- use memory as authority when a canonical source is accessible
- assume GitHub is current when Cursor may have unsynced work
- treat screenshots as data-model authority
- treat superseded old trackers as canonical

## Output
SOURCE RESOLUTION
Task:
Canonical source:
Why:
Freshness checked:
Secondary evidence:
Ignored stale/derivative sources:
Conflicts:
Safe to proceed: YES/NO
