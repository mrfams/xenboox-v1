---
name: grill-with-docs
description: Structured planning session that builds the project's domain model, sharpens terminology, and captures decisions in CONTEXT.md and ADRs. Use at the start of any significant task to clarify requirements and document shared understanding before writing code.
license: MIT
metadata:
  author: mattpocock/skills
  category: planning
---

Run a structured discovery session. Builds a shared domain model before any code is written.

## 1. Context Building

Ask these questions and capture answers:

- What exactly are we building? (one sentence)
- What problem does it solve?
- Who are the users?
- What are the key domain terms and their definitions?

## 2. Domain Model

Map the core entities and their relationships:

```
Entity: Invoice
  Attributes: id, vendor, amount, status, date, lineItems
  Relationships: belongsTo Entity, hasMany LineItems

Entity: LineItem
  Attributes: id, description, amount, accountCode
  Relationships: belongsTo Invoice
```

## 3. Sharpening Terminology

For each term identified:

- Is this term used consistently across the codebase?
- Does it match existing schema names? (Xenboox: check `packages/db/schema/`)
- Could someone new understand it without context?

## 4. Decision Capture

For each decision made, write an ADR entry:

```markdown
## ADR: [title]

- **Date:** YYYY-MM-DD
- **Status:** Accepted
- **Context:** Why this decision was needed
- **Decision:** What was decided
- **Consequences:** What this means for the codebase
- **Alternatives considered:** What was rejected and why
```

## 5. Update CONTEXT.md

Update or create `CONTEXT.md` at project root with:

- Project description (one paragraph)
- Glossary of terms
- Current session goal
- Architecture decisions (links to ADRs)
