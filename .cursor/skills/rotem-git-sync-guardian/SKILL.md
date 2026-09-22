---
name: rotem-git-sync-guardian
description: Verify that Cursor local work is actually synchronized with GitHub before treating repository state as canonical or declaring work complete. Use after implementation, before handoff, when GitHub appears stale, or when local/remote state may differ.
---

# Git Sync Guardian

## Goal
Prevent “done locally but missing from GitHub” and branch-drift failures.

## Read-only first
Run:
```bash
git rev-parse --show-toplevel
git remote -v
git branch --show-current
git status --short --branch
git fetch --all --prune
git rev-parse HEAD
git log --oneline --decorate -n 12
```
If an upstream exists, also compare local and upstream:
```bash
git rev-parse @{u}
git log --oneline @{u}..HEAD
git log --oneline HEAD..@{u}
```

## Classify state
Return exactly one:
- SYNCED
- LOCAL_CHANGES_NOT_COMMITTED
- LOCAL_COMMITS_NOT_PUSHED
- REMOTE_AHEAD
- DIVERGED
- NO_UPSTREAM
- NOT_A_GIT_REPO
- BLOCKED

## Safety
Do NOT automatically commit, push, pull, rebase, merge, reset, switch branches, or force-push.

## Completion rule
Never claim repository-level DONE unless state is SYNCED, unless the user explicitly accepts local-only work.

## Output
GIT SYNC STATUS:
State:
Branch:
Remote:
Local HEAD:
Upstream:
Uncommitted:
Ahead:
Behind:
Canonical GitHub safe to trust: YES/NO
Required next action:
