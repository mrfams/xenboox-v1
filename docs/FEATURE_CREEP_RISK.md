# Feature Creep Risk Mitigation

> Keeping Xenboox focused on the 5-surface AI-native model.

---

## The 5 Surfaces (Non-Negotiable)

| Surface         | Purpose                      | AI Role                                   |
| --------------- | ---------------------------- | ----------------------------------------- |
| Command Center  | Conversational AI interface  | Handles ALL create/update/approve actions |
| Activity Hub    | Human-in-the-loop queue      | Surfaces things needing human decision    |
| Financial Pulse | AI-narrated financial health | Explains what numbers mean                |
| Ledger          | Record of truth              | Single source of truth                    |
| Operations      | Money in, money out          | AI manages cash flow                      |

---

## Feature Creep Warning Signs

| Signal                                   | Action                                  |
| ---------------------------------------- | --------------------------------------- |
| New surface proposed                     | Reject — we have 5 surfaces             |
| Feature that bypasses AI                 | Redirect — AI absorbs navigation        |
| Feature that adds sidebar item           | Reject — sidebar has 5 items, not 40    |
| Feature that duplicates existing surface | Consolidate into existing surface       |
| "Let's add a page for X"                 | Ask: which surface does this belong to? |

---

## Feature Request Evaluation

### Must-Have (Add)

- [ ] Improves one of the 5 surfaces
- [ ] AI can handle the work
- [ ] Users explicitly request it (3+ requests)
- [ ] Aligns with AI-native model

### Should-Have (Evaluate)

- [ ] Enhances existing surface
- [ ] Complements AI workflow
- [ ] No alternative exists
- [ ] Low implementation cost

### Won't-Have (Reject)

- [ ] Creates a new surface
- [ ] Bypasses AI (forms, manual input)
- [ ] Duplicates existing functionality
- [ ] "Nice to have" without user demand

---

## Decision Framework

```
User requests feature
  ↓
Does it improve one of the 5 surfaces?
  YES → Can AI handle it?
    YES → Add to roadmap
    NO → Can it be an AI tool?
      YES → Add as agent tool
      NO → Reject (manual = not AI-native)
  NO → Does it replace an existing surface?
    YES → Consolidate
    NO → Reject (we have 5 surfaces)
```

---

## Quarterly Review

| Question                                  | Answer |
| ----------------------------------------- | ------ |
| How many new features added this quarter? | —      |
| How many align with 5-surface model?      | —      |
| How many were rejected for scope creep?   | —      |
| User satisfaction with focused product?   | —      |

---

_Last updated: August 2026_
