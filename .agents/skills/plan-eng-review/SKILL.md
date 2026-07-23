---
name: plan-eng-review
description: Engineering architecture plan review for production-quality software design. Use before building anything non-trivial. Locks architecture, draws ASCII diagrams, maps edge cases, and identifies risks before code is written.
license: MIT
metadata:
  author: garrytan/gstack
  category: engineering-planning
---

Review and lock the engineering architecture before any code is written. Follow this sequence:

## 1. Data Model

- List every entity involved
- Show relationships (one-to-many, many-to-many)
- Identify the primary key strategy
- Note entity scoping requirements

```
┌─────────────┐     ┌──────────────────┐
│   Entity    │1──M│   Transaction    │
├─────────────┤     ├──────────────────┤
│ id          │     │ id               │
│ entity_id   │     │ entity_id        │
│ name        │     │ amount           │
│ currency    │     │ status           │
└─────────────┘     │ date             │
                    └──────────────────┘
```

## 2. API Surface

- List every endpoint with method, path, input, output
- Annotate auth/entity-scoping requirements
- Identify which endpoints need pagination

## 3. Agent Integration

- Which agents are involved?
- What's the handoff contract? (state shape, confidence thresholds)
- What's the escalation path?

## 4. Edge Cases

- What happens when a required service is down?
- What happens with concurrent requests?
- What happens with malformed input beyond zod validation?
- What happens with partial failures? (transaction rollback)

## 5. Risk Register

Score each: 1 (low) to 5 (high) for likelihood + impact

| Risk                       | Likelihood | Impact | Mitigation                 |
| -------------------------- | ---------- | ------ | -------------------------- |
| N+1 query on list endpoint | 4          | 3      | Eager loading / dataloader |
| Double-click submit        | 3          | 4      | Idempotency key            |
| Cross-entity data leak     | 1          | 5      | Entity scope middleware    |
