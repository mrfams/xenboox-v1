import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────
// Same convention as the tax-config router test: mock the data + auth layers,
// then drive the REAL appRouter via createCaller so zod validation and entity
// scoping run for real.

vi.mock("@/lib/db", () => ({
  db: {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
    execute: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockReturnThis(),
    query: {
      organizations: { findFirst: vi.fn() },
      entities: { findFirst: vi.fn() },
      userEntityAccess: { findFirst: vi.fn() },
      orgRoles: { findFirst: vi.fn(), findMany: vi.fn() },
      sessions: { findFirst: vi.fn().mockResolvedValue({ id: "session-1" }) },
      users: { findFirst: vi.fn() },
      documents: { findFirst: vi.fn() },
      documentLinks: { findMany: vi.fn().mockResolvedValue([]) },
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    child: vi.fn().mockReturnValue({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

vi.mock("@/lib/trigger", () => ({
  triggerClient: { tasks: { trigger: vi.fn() } },
}));

vi.mock("@/lib/r2", () => ({
  getPresignedUploadUrl: vi.fn(),
  getPresignedDownloadUrl: vi.fn(),
  generateStoragePath: vi.fn(),
  deleteObject: vi.fn(),
  ALLOWED_MIME_TYPES: [],
  FILE_SIZE_LIMITS: {},
}));

vi.mock("@/lib/email", () => ({
  sendDocumentUploadedEmail: vi.fn(),
  sendDocumentProcessedEmail: vi.fn(),
}));

vi.mock("@xenboox/models", () => ({
  callModel: vi.fn(),
}));

import { callModel } from "@xenboox/models";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { appRouter } from "@/server/routers/_app";

const entityId = "entity-1";
const DOC_ID = "11111111-1111-4111-8111-111111111111";

function makeCaller(entityRole = "admin") {
  vi.mocked(db.query.userEntityAccess.findFirst).mockResolvedValue({
    userId: "user-1",
    entityId,
    role: entityRole,
  } as never);
  return appRouter.createCaller({
    session: {
      user: { id: "user-1", email: "test@test.com" },
      expires: "2099",
    },
    entityId,
    headers: {},
  });
}

function mockDoc(overrides: Record<string, unknown> = {}) {
  vi.mocked(db.query.documents.findFirst).mockResolvedValue({
    id: DOC_ID,
    entityId,
    name: "Invoice-2026-001.pdf",
    type: "invoice",
    status: "processed",
    mimeType: "application/pdf",
    sizeBytes: 2048,
    r2Key: "k",
    r2Bucket: "b",
    ocrText:
      "Invoice #001\nKerr Jula Trading Co.\nPayment terms: net 30\nTotal due: GMD 12,500.00",
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as never);
}

describe("documentRouter — AI document editing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", name: "Test", email: "test@test.com" },
      expires: "2099-01-01",
    } as never);
    vi.mocked(db.query.entities.findFirst).mockResolvedValue({
      id: entityId,
      organizationId: "org-1",
    } as never);
    vi.mocked(db.query.orgRoles.findFirst).mockResolvedValue(null as never);
    vi.mocked(db.query.userEntityAccess.findFirst).mockResolvedValue({
      userId: "user-1",
      entityId,
      role: "admin",
    } as never);
    vi.mocked(db.query.organizations.findFirst).mockResolvedValue({
      id: "org-1",
    } as never);
    vi.mocked(db.query.users.findFirst).mockResolvedValue({
      id: "user-1",
      emailVerified: new Date(),
    } as never);
  });

  describe("editDocumentText", () => {
    it("splices a model replacement into a selection edit", async () => {
      mockDoc();
      vi.mocked(callModel).mockResolvedValue({
        content: "Payment terms: net 45",
        toolCalls: [],
      } as never);

      const caller = makeCaller();
      const result = await caller.document.editDocumentText({
        id: DOC_ID,
        mode: "selection",
        selection: "Payment terms: net 30",
        instruction: "Change payment terms to net 45",
      });

      expect(result.editCount).toBe(1);
      expect(result.content).toContain("Payment terms: net 45");
      expect(result.content).not.toContain("Payment terms: net 30");
      // Original extraction is never mutated.
      expect(db.update).toHaveBeenCalled();
    });

    it("rewrites the whole document for a whole-document edit", async () => {
      mockDoc();
      vi.mocked(callModel).mockResolvedValue({
        content:
          "Invoice #001\nKerr Jula Trading Co.\nPayment terms: net 30\nTotal due: GMD 12,500.00\nThis document was rewritten.",
        toolCalls: [],
      } as never);

      const caller = makeCaller();
      const result = await caller.document.editDocumentText({
        id: DOC_ID,
        mode: "whole",
        instruction: "Make it clearer",
      });

      expect(result.editCount).toBe(1);
      expect(result.content).toContain("This document was rewritten.");
    });

    it("rejects when the document has no extracted text", async () => {
      mockDoc({ ocrText: null });
      const caller = makeCaller();
      await expect(
        caller.document.editDocumentText({
          id: DOC_ID,
          mode: "whole",
          instruction: "Rewrite",
        }),
      ).rejects.toThrow();
    });

    it("rejects a selection edit without a selection", async () => {
      mockDoc();
      const caller = makeCaller();
      await expect(
        caller.document.editDocumentText({
          id: DOC_ID,
          mode: "selection",
          instruction: "Change it",
        }),
      ).rejects.toThrow();
    });

    it("rejects when the document belongs to another entity", async () => {
      vi.mocked(db.query.documents.findFirst).mockResolvedValue(null as never);
      const caller = makeCaller();
      await expect(
        caller.document.editDocumentText({
          id: DOC_ID,
          mode: "whole",
          instruction: "Rewrite",
        }),
      ).rejects.toThrow();
    });
  });

  describe("undoDocumentEdit", () => {
    it("reverts one edit and drops the edit layer at count 0", async () => {
      mockDoc({
        metadata: {
          editedContent: "Edited copy v1",
          previousContent: "Original extracted text",
          editCount: 1,
        },
      });

      const caller = makeCaller();
      const result = await caller.document.undoDocumentEdit({ id: DOC_ID });

      expect(result).toMatchObject({
        content: "Original extracted text",
        editCount: 0,
      });
      expect(db.update).toHaveBeenCalled();
    });

    it("rejects when there is nothing to undo", async () => {
      mockDoc({ metadata: {} });
      const caller = makeCaller();
      await expect(
        caller.document.undoDocumentEdit({ id: DOC_ID }),
      ).rejects.toThrow();
    });
  });
});
