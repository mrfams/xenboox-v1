# Job Architecture

> How `packages/jobs` interacts with the database and other services.

---

## Current Architecture

```
packages/jobs
  ├── triggers via Trigger.dev
  ├── reads/writes directly to PostgreSQL (via Drizzle)
  └── calls external APIs (Plaid, Mono, Resend)
```

### Issue

`packages/jobs` imports the database schema directly, bypassing the tRPC layer. This means:

- No entity scoping middleware
- No authentication checks
- No rate limiting
- Duplicate validation logic

---

## Recommended Architecture

### Option A: Route Through tRPC (Preferred)

```
Trigger.dev Job → tRPC caller → Router → Database
```

**Pros:**

- Entity scoping enforced
- Authentication via session/API key
- Rate limiting applied
- Single validation layer

**Cons:**

- Slightly more latency
- tRPC caller needs API key auth

### Option B: Shared Middleware Layer

```
Trigger.dev Job → Shared middleware → Database
```

**Pros:**

- No tRPC dependency
- Direct, fast

**Cons:**

- Duplicate middleware logic
- Must keep in sync with tRPC

### Option C: Keep Current (Not Recommended)

```
Trigger.dev Job → Direct database access
```

**Pros:**

- Simple, fast
- No dependencies

**Cons:**

- Bypasses all safety checks
- Entity scoping must be manual
- Security risk

---

## Migration Plan

1. **Phase 1:** Add API key auth to tRPC for job callers
2. **Phase 2:** Create job-specific tRPC procedures
3. **Phase 3:** Migrate jobs to use tRPC caller
4. **Phase 4:** Remove direct DB imports from packages/jobs

---

_Last updated: August 2026_
