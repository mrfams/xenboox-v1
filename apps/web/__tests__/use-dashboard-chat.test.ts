import { describe, it, expect } from "vitest";

import { mapHistoryRowToMessage } from "@/lib/hooks/use-dashboard-chat";

function makeRow(
  overrides: Partial<Parameters<typeof mapHistoryRowToMessage>[0]> = {},
) {
  return {
    id: "msg-1",
    role: "assistant",
    content: "Your cash balance is GMD 12,500.",
    status: "completed",
    confidence: 0.95,
    latencyMs: 1200,
    metadata: null,
    createdAt: new Date("2026-08-01T10:00:00Z"),
    ...overrides,
  };
}

describe("mapHistoryRowToMessage", () => {
  it("maps a completed assistant row with confidence and duration", () => {
    const msg = mapHistoryRowToMessage(makeRow());

    expect(msg.role).toBe("assistant");
    expect(msg.status).toBe("completed");
    expect(msg.content).toBe("Your cash balance is GMD 12,500.");
    expect(msg.confidence).toBe(0.95);
    expect(msg.durationMs).toBe(1200);
    expect(msg.createdAt).toBe(new Date("2026-08-01T10:00:00Z").getTime());
    expect(msg.activities).toEqual([]);
    expect(msg.delegations).toEqual([]);
    expect(msg.approvals).toEqual([]);
    expect(msg.documents).toEqual([]);
  });

  it("maps user rows to the user role", () => {
    const msg = mapHistoryRowToMessage(
      makeRow({ role: "user", content: "What is my cash?" }),
    );
    expect(msg.role).toBe("user");
  });

  it("treats a failed row as an error status", () => {
    const msg = mapHistoryRowToMessage(
      makeRow({ status: "failed", content: "Sorry, I failed." }),
    );
    expect(msg.status).toBe("error");
  });

  it("defaults null content to an empty string", () => {
    const msg = mapHistoryRowToMessage(makeRow({ content: null }));
    expect(msg.content).toBe("");
  });

  it("rehydrates generated documents from message metadata", () => {
    const msg = mapHistoryRowToMessage(
      makeRow({
        metadata: {
          artifacts: [
            {
              artifactId: "art-1",
              name: "P&L Report.pdf",
              docType: "Report",
              mimeType: "application/pdf",
              sizeBytes: 2048,
              url: "https://cdn.example.test/pnl.pdf",
            },
          ],
        },
      }),
    );

    expect(msg.documents).toHaveLength(1);
    expect(msg.documents[0]).toMatchObject({
      type: "document_created",
      artifactId: "art-1",
      name: "P&L Report.pdf",
      docType: "Report",
      mimeType: "application/pdf",
      sizeBytes: 2048,
      url: "https://cdn.example.test/pnl.pdf",
    });
  });

  it("ignores malformed metadata", () => {
    const msg = mapHistoryRowToMessage(makeRow({ metadata: "not-json" }));
    expect(msg.documents).toEqual([]);
  });
});
