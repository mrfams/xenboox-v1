import { describe, it, expect, vi, beforeEach } from "vitest";

import type { IngestionState, PostingDecision } from "../core/types";

// Mock the DB module — notifications are inserted via @xenboox/db.
// Accessors are lazy because vi.mock is hoisted above the let bindings.
let insertValues: ReturnType<typeof vi.fn>;
let findFirstValues: ReturnType<typeof vi.fn>;
let findManyValues: ReturnType<typeof vi.fn>;

vi.mock("@xenboox/db", () => ({
  db: {
    query: {
      notifications: {
        findFirst: (...args: unknown[]) =>
          (findFirstValues as ReturnType<typeof vi.fn>)(...args),
      },
      userEntityAccess: {
        findMany: (...args: unknown[]) =>
          (findManyValues as ReturnType<typeof vi.fn>)(...args),
      },
    },
    insert: (_table: unknown) => ({
      values: (values: unknown) => {
        (insertValues as ReturnType<typeof vi.fn>)({ values });
        return {};
      },
    }),
  },
}));

// Load the module AFTER the mock is registered.
import {
  sendIngestionNotifications,
  sendPostingFailureNotification,
} from "../engine/notifications";

beforeEach(() => {
  insertValues = vi.fn();
  findFirstValues = vi.fn();
  findManyValues = vi.fn();
});

function makeState(overrides: Partial<IngestionState> = {}): IngestionState {
  return {
    documentId: "doc-1234567890",
    entityId: "entity-1",
    workflow: "ap_invoice",
    classification: {
      category: "invoice",
      confidence: 0.9,
      reasoning: "test",
      metadata: {},
    },
    extraction: {
      type: "invoice",
      confidence: 0.9,
      fieldConfidence: {},
      data: { vendorName: "Acme Supplies Ltd" },
    },
    ...overrides,
  } as IngestionState;
}

describe("sendIngestionNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findManyValues.mockResolvedValue([{ userId: "user-1" }]);
  });

  it("sends an ingestion_review notification for pending reviews", async () => {
    const state = makeState();
    const decision: PostingDecision = {
      action: "pending_review",
      confidence: 0.7,
      reason: "Low confidence on total",
      reviewItems: [
        {
          field: "total",
          label: "total",
          extractedValue: 90,
          suggestedValue: 100,
          confidence: 0.5,
          editable: true,
        },
      ],
    };

    await sendIngestionNotifications("entity-1", state, decision);

    expect(insertValues).toHaveBeenCalled();
    const values = insertValues.mock.calls[0][0].values;
    expect(values[0].type).toBe("ingestion_review");
    expect(values[0].priority).toBe("high");
    // Document id is embedded in data so the UI can deep-link.
    const data = JSON.parse(values[0].data);
    expect(data.documentId).toBe("doc-1234567890");
    // Title/body reference the vendor for scannability.
    expect(values[0].title).toContain("needs review");
    expect(values[0].body).toContain("Acme Supplies Ltd");
  });

  it("uses ingestion_escalated type for escalations", async () => {
    const state = makeState();
    const decision: PostingDecision = {
      action: "escalated",
      confidence: 0.5,
      reason: "Low confidence",
    };

    await sendIngestionNotifications("entity-1", state, decision);

    const values = insertValues.mock.calls[0][0].values;
    expect(values[0].type).toBe("ingestion_escalated");
    expect(values[0].priority).toBe("critical");
  });

  it("uses ingestion_rejected type for rejections", async () => {
    const state = makeState();
    const decision: PostingDecision = {
      action: "rejected",
      confidence: 0.3,
      reason: "Duplicate reference",
    };

    await sendIngestionNotifications("entity-1", state, decision);

    const values = insertValues.mock.calls[0][0].values;
    expect(values[0].type).toBe("ingestion_rejected");
    expect(values[0].priority).toBe("high");
  });

  it("notifies for auto-posts below the silent threshold", async () => {
    const state = makeState();
    const decision: PostingDecision = {
      action: "auto_post",
      confidence: 0.9,
      reason: "High confidence",
    };

    await sendIngestionNotifications("entity-1", state, decision, "je-1");

    const values = insertValues.mock.calls[0][0].values;
    expect(values[0].type).toBe("ingestion_posted");
    const data = JSON.parse(values[0].data);
    expect(data.journalEntryId).toBe("je-1");
  });

  it("is silent for high-confidence auto-posts (>= 0.95)", async () => {
    const state = makeState();
    const decision: PostingDecision = {
      action: "auto_post",
      confidence: 0.97,
      reason: "High confidence",
    };

    await sendIngestionNotifications("entity-1", state, decision, "je-1");

    expect(insertValues).not.toHaveBeenCalled();
  });

  it("uses ingestion_failed type from the posting-failure path", async () => {
    const state = makeState();

    await sendPostingFailureNotification("entity-1", state, "GL write failed");

    const values = insertValues.mock.calls[0][0].values;
    expect(values[0].type).toBe("ingestion_failed");
    expect(values[0].priority).toBe("high");
    const data = JSON.parse(values[0].data);
    expect(data.documentId).toBe("doc-1234567890");
    expect(data.error).toBe("GL write failed");
    expect(values[0].body).toContain("GL write failed");
  });

  it("falls back to a short document id when no vendor/customer is known", async () => {
    const state = makeState({
      extraction: {
        type: "other",
        confidence: 0.1,
        fieldConfidence: {},
        data: {},
      },
    });
    const decision: PostingDecision = {
      action: "rejected",
      confidence: 0.2,
      reason: "Unreadable",
    };

    await sendIngestionNotifications("entity-1", state, decision);

    const values = insertValues.mock.calls[0][0].values;
    expect(values[0].body).toContain("Document doc-1234");
  });

  it("deduplicates — skips insert when an unread notification exists", async () => {
    findFirstValues.mockResolvedValue({ id: "existing" });
    const state = makeState();
    const decision: PostingDecision = {
      action: "pending_review",
      confidence: 0.7,
      reason: "Low confidence",
    };

    await sendIngestionNotifications("entity-1", state, decision);

    expect(insertValues).not.toHaveBeenCalled();
  });

  it("queries the dedup check against jsonb-cast data (data is a text column)", async () => {
    // Regression: notifications.data is `text` (JSON-stringified at insert).
    // If the dedup query uses `->>` without a ::jsonb cast, Postgres throws
    // and the try/catch swallows the notification entirely. The unit mock
    // never exercises real SQL, so assert the query shape here instead.
    findFirstValues.mockResolvedValue({ id: "existing" });
    const state = makeState();
    const decision: PostingDecision = {
      action: "pending_review",
      confidence: 0.7,
      reason: "Low confidence",
    };

    await sendIngestionNotifications("entity-1", state, decision);

    const queryArgs = findFirstValues.mock.calls[0][0] as { where?: unknown };
    // The where clause embeds circular drizzle table objects, so serialize
    // with a seen-set replacer and pull the raw SQL text out.
    const seen = new WeakSet<object>();
    const serialized = JSON.stringify(queryArgs.where ?? {}, (_key, value) => {
      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) return "[Circular]";
        seen.add(value);
      }
      return value;
    });
    // The uncast form (`data->>'documentId'`) throws on a text column in
    // Postgres, so the cast must be present for the query to survive.
    expect(serialized).toContain("::jsonb->>'documentId'");
  });

  it("selects only userId from userEntityAccess", async () => {
    findManyValues.mockResolvedValue([{ userId: "user-1" }]);
    const state = makeState();
    const decision: PostingDecision = {
      action: "pending_review",
      confidence: 0.7,
      reason: "Low confidence",
    };

    await sendIngestionNotifications("entity-1", state, decision);

    const queryArgs = findManyValues.mock.calls[0][0];
    expect(queryArgs.columns).toEqual({ userId: true });
  });
});
