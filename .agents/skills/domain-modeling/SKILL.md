---
name: domain-modeling
description: Builds and refines the domain model for accounting concepts in Xenboox. Use when designing new features, refactoring existing code, resolving ambiguous terminology, or documenting domain concepts. Challenges terms against the glossary and updates CONTEXT.md and ADRs.
license: MIT
metadata:
  author: mattpocock/skills
  category: architecture
---

Build a rigorous domain model. The goal is to make illegal states unrepresentable.

**Workflow Mode:** LOOP + GRAPH

- **Loop:** Iterate through identification → definition → validation → refinement until domain model is solid
- **Graph:** For large domains (>10 entities), fan-out across modules, fan-in to aggregate
- **Quality Gate:** Cannot declare PASS until domain model is AI-native and evidence-based

**Non-negotiable rules:**

1. Research before modeling — understand the system first
2. Every entity must be accurately defined
3. Domain model must be AI-native, not SaaS-style
4. You provide evidence of model quality, not just claims

## 1. Identify Core Entities

For each entity in the domain:

```typescript
// What is it?
type Invoice = {
  id: string;
  entityId: string;
  vendorId: string;
  amount: Money;
  status: InvoiceStatus;
  lineItems: LineItem[];
  createdAt: Date;
};

// What states can it be in?
type InvoiceStatus =
  "draft" | "sent" | "viewed" | "paid" | "overdue" | "voided";

// What invariants must hold?
// - Total of line items must equal invoice amount
// - Cannot pay a voided invoice
// - Cannot void a paid invoice
```

## 2. Define Relationships

```
Entity ──1:M── Invoice ──1:M── LineItem
Entity ──1:M── JournalEntry ──1:M── JournalEntryLine
Entity ──1:M── Account
```

## 3. Surface Hidden Concepts

Ask these questions:

- Are there implicit states not captured in the type system?
- Are there business rules that aren't encoded in the data model?
- Is every `string` field actually a constrained type?
- Is every `number` field bounded? (min, max, precision)

## 4. Glossary Update

For each term, verify:

- Does the codebase use this term consistently?
- Is it in the database schema? (check `packages/db/schema/`)
- Does DATABASE.md define it?
- Would a new developer understand it?

## 5. Document Decisions

Update ADRs with any domain model decisions made:

- Why was this entity modeled this way?
- What alternatives were considered?
- What are the boundary conditions?

## 6. AI-Native Domain Modeling

Since Xenboox is AI-native, domain model must reflect this:

### AI-Native Domain Principles

1. **Agent communication** — Agents communicate through typed state
2. **Confidence scoring** — Every output includes confidence field
3. **Human-in-the-loop** — Decision cards for human approval
4. **Entity scoping** — Every entity has entityId for isolation
5. **Audit trail** — Every action is logged

### AI-Native Entities

| Entity         | AI-Native Pattern                        |
| -------------- | ---------------------------------------- |
| **Agent**      | Three-tier hierarchy, confidence scoring |
| **Decision**   | Decision cards, human-in-the-loop        |
| **Confidence** | Score 0-1, escalation thresholds         |
| **Audit**      | Append-only, tamper-evident              |

### Evidence-Based Completion

Before declaring domain model complete, provide:

```
EVIDENCE PACKAGE:
├── Entities defined: [list all entities]
├── Relationships mapped: [list all relationships]
├── Invariants defined: [list all invariants]
├── AI-native check: [domain is AI-native, not SaaS]
└── Glossary updated: [terms defined]
```
