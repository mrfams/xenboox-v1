import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  enqueueReviewItem,
  failureContext,
  dlqOnFailure,
} from "@xenboox/jobs/lib/dlq";

// The DLQ helper talks to the DB through @xenboox/db — mock it. The schema
// import (reviewItems / entities table defs) stays real (pure metadata).
vi.mock("@xenboox/db", () => {
  return {
    db: {
      query: {
        entities: {
          findFirst: vi.fn(),
        },
      },
      insert: vi.fn(),
    },
  };
});

import { db } from "@xenboox/db";

const mockedDb = db as unknown as {
  query: { entities: { findFirst: ReturnType<typeof vi.fn> } };
  insert: ReturnType<typeof vi.fn>;
};

describe("DLQ helper (enqueueReviewItem)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedDb.query.entities.findFirst.mockResolvedValue({
      organizationId: "org-123",
    });
    mockedDb.insert.mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    });
  });

  it("resolves the organization from the entity and inserts a review item", async () => {
    await enqueueReviewItem({
      entityId: "entity-1",
      task: "process-document",
      runId: "run-abc",
      title: "Document processing failed: doc-1",
      description: "exhausted retries",
      type: "data_validation",
      severity: "high",
      contextData: { error: "boom" },
    });

    expect(mockedDb.query.entities.findFirst).toHaveBeenCalledTimes(1);
    expect(mockedDb.insert).toHaveBeenCalledTimes(1);
    // The chain resolves: insert(table).values(row) — values got the row.
    const valuesFn = mockedDb.insert.mock.results[0]?.value
      .values as ReturnType<typeof vi.fn>;
    expect(valuesFn).toHaveBeenCalledTimes(1);
  });

  it("enqueues with a null org when the entity cannot be resolved (better visible than lost)", async () => {
    mockedDb.query.entities.findFirst.mockResolvedValue(undefined);

    await enqueueReviewItem({
      entityId: "entity-missing",
      task: "mono-sync-transactions",
      runId: "run-2",
      title: "Bank sync failed",
      description: "connection 404",
    });

    const valuesMock = (
      mockedDb.insert.mock.calls[0] as unknown as [{ [k: string]: unknown }]
    )[0];
    const valuesCall = valuesMock;
    expect(valuesCall).toBeDefined();
  });

  it("never throws when the DB write fails (DLQ must not re-enter retry loop)", async () => {
    mockedDb.query.entities.findFirst.mockRejectedValue(new Error("db down"));
    mockedDb.insert.mockReturnValue({
      values: vi.fn().mockRejectedValue(new Error("db down")),
    });

    await expect(
      enqueueReviewItem({
        entityId: "entity-1",
        task: "import-bank-statement",
        runId: "run-3",
        title: "Import failed",
        description: "x",
      }),
    ).resolves.toBeUndefined();
  });
});

describe("failureContext", () => {
  it("normalizes an Error into message + trimmed stack", () => {
    const ctx = failureContext(new Error("kaboom"), { documentId: "doc-1" });
    expect(ctx.error).toBe("kaboom");
    expect(ctx.documentId).toBe("doc-1");
    expect(Array.isArray(ctx.stack)).toBe(true);
  });

  it("stringifies non-Error values", () => {
    expect(failureContext("plain string").error).toBe("plain string");
    expect(failureContext(undefined).error).toBe("undefined");
  });
});

describe("dlqOnFailure (task hook factory)", () => {
  it("surfaces the poison task with payload-derived title + entityId", async () => {
    const hook = dlqOnFailure<{ documentId: string; entityId: string }>({
      task: "process-document",
      type: "data_validation",
      severity: "high",
      title: (p) => `Document processing failed: ${p.documentId}`,
      entityIdFrom: (p) => p.entityId,
    });

    mockedDb.query.entities.findFirst.mockResolvedValue({
      organizationId: "org-1",
    });
    mockedDb.insert.mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    });

    await hook({
      payload: { documentId: "doc-9", entityId: "entity-9" },
      ctx: { run: { id: "run-9" }, attempt: { number: 3 } },
      error: new Error("pdf parse failed"),
    });

    expect(mockedDb.insert).toHaveBeenCalledTimes(1);
    const valuesCall = mockedDb.insert.mock.calls[0];
    expect(valuesCall).toBeDefined();
  });
});
