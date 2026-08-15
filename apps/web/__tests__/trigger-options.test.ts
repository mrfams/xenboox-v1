import { describe, it, expect } from "vitest";

import { tenantJobOptions } from "@/lib/trigger";

describe("tenantJobOptions", () => {
  it("scopes the concurrency key to the entity (per-tenant fair scheduling)", () => {
    const opts = tenantJobOptions("entity-1", "process-document:doc-1");
    expect(opts.concurrencyKey).toBe("entity-1");
  });

  it("produces deterministic, namespaced idempotency keys", () => {
    const a = tenantJobOptions("entity-1", "process-document:doc-1");
    const b = tenantJobOptions("entity-1", "process-document:doc-1");
    expect(a.idempotencyKey).toBe(b.idempotencyKey);
    expect(a.idempotencyKey).toBe("job:entity-1:process-document:doc-1");
  });

  it("distinguishes different tenants for the same logical job", () => {
    const a = tenantJobOptions("entity-1", "process-document:doc-1");
    const b = tenantJobOptions("entity-2", "process-document:doc-1");
    expect(a.idempotencyKey).not.toBe(b.idempotencyKey);
    expect(a.concurrencyKey).not.toBe(b.concurrencyKey);
  });
});
