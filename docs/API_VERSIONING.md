# API Versioning Strategy

> How Xenboox handles API evolution without breaking clients.

---

## Approach: tRPC Procedure Versioning

Xenboox uses tRPC, which doesn't have traditional REST versioning. Instead, we use **procedure-level versioning** with backward-compatible evolution.

---

## Versioning Rules

### 1. Additive Changes (No Version Bump)

- Adding new optional input fields
- Adding new output fields
- Adding new procedures
- Adding new enum values

### 2. Breaking Changes (Require Version Bump)

- Removing input fields
- Renaming fields
- Changing field types
- Changing required → optional or vice versa
- Removing procedures

### 3. Deprecation Process

1. Mark procedure as `@deprecated` in code
2. Add deprecation notice in tRPC output
3. Maintain for 2 major versions
4. Remove after deprecation period

---

## Versioning in Practice

### Procedure Naming

```typescript
// Current version (implicit v1)
router.listInvoices;

// When v2 is needed
router.v2.listInvoices;
router.listInvoices; // deprecated, kept for backward compat
```

### Input Evolution

```typescript
// v1: Add optional field (no breaking change)
z.object({
  status: z.string(),
  search: z.string().optional(), // new
});

// v2: Change required field (breaking change)
z.object({
  status: z.enum(["all", "sent", "paid"]), // was z.string()
});
```

### Output Evolution

```typescript
// Always add new fields, never remove
z.object({
  id: z.string(),
  total: z.number(),
  currency: z.string(), // new field
});
```

---

## Mobile API Considerations

Since mobile apps are out of scope, versioning is simpler:

- Web app consumes tRPC directly (no versioning needed)
- External API (v1) uses `/api/v1/` prefix
- Breaking changes go to `/api/v2/`

---

## Migration Guide

When breaking changes are made:

1. Write migration guide in docs
2. Notify API consumers 30 days before removal
3. Provide automated migration scripts where possible
4. Keep old version running for 90 days after v2 launch

---

_Last updated: August 2026_
