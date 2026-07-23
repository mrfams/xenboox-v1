---
name: handoff
description: Compresses the current conversation and context into a structured handoff document for transfer between agents or sessions. Use when switching agents, saving session state, documenting progress, or passing work to another team member.
license: MIT
metadata:
  author: mattpocock/skills
  category: workflow
---

Create a structured handoff document that allows another agent or person to pick up exactly where you left off.

## Handoff Document Format

```markdown
# Handoff: [Project/Feature]

## Session Context

- **Date:** YYYY-MM-DD
- **Agent:** [agent name]
- **Task:** [what was being worked on]

## What Was Done

- [ ] Completed: [item]
- [ ] Completed: [item]
- [ ] In progress: [item]

## Current State

- Key files modified: [paths]
- Current branch/commit: [ref]
- Running dev server? [yes/no]

## Decisions Made

- [Decision 1] — rationale
- [Decision 2] — rationale

## Blockers / Open Questions

- [ ] Blocker: [description] (needs: [person/role])
- [ ] Question: [description] (needs: [input])

## Next Steps

1. [Next action]
2. [Next action]

## Files to Read

- [path] — why to read it
- [path] — why to read it

## Verification Status

- Typecheck: ✅ / ❌
- Tests: ✅ / ❌ (X passing, Y failing)
- Lint: ✅ / ❌
```
