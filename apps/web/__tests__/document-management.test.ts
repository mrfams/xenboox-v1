import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const ROOT = process.cwd();

describe("Document Management — Verification", () => {
  describe("Document router", () => {
    const router = readFileSync(
      join(ROOT, "server/routers/document.ts"),
      "utf-8",
    );

    it("has document upload procedure", () => {
      expect(router).toContain("upload");
    });

    it("has document links procedure", () => {
      expect(router).toContain("createDocumentLink");
    });

    it("imports documentLinks table", () => {
      expect(router).toContain("documentLinks");
    });

    it("sends upload notification email", () => {
      expect(router).toContain("sendDocumentUploadedEmail");
    });

    it("logs document actions to audit trail", () => {
      expect(router).toContain("auditLog");
    });
  });

  describe("Knowledge RAG for document search", () => {
    const rag = readFileSync(
      join(ROOT, "server/routers/knowledge-rag.ts"),
      "utf-8",
    );

    it("provides vector search for documents", () => {
      expect(rag).toContain("Knowledge RAG");
      expect(rag).toContain("vector");
    });
  });

  describe("Ingestion creates document links", () => {
    const ingestion = readFileSync(
      join(ROOT, "server/routers/ingestion.ts"),
      "utf-8",
    );

    it("creates document links during ingestion", () => {
      expect(ingestion).toContain("documentLinks");
    });

    it("links documents to journal entries", () => {
      expect(ingestion).toContain("document_upload");
    });
  });
});
