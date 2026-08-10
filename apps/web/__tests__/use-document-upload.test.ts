import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

import { useDocumentUpload } from "@/lib/hooks/use-document-upload";

const mocks = vi.hoisted(() => ({
  getUploadUrl: vi.fn(),
  confirmUpload: vi.fn(),
  invalidate: vi.fn(),
}));

vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    document: {
      getUploadUrl: {
        useMutation: () => ({ mutateAsync: mocks.getUploadUrl }),
      },
      confirmUpload: {
        useMutation: () => ({ mutateAsync: mocks.confirmUpload }),
      },
    },
    useUtils: () => ({
      document: { listDocuments: { invalidate: mocks.invalidate } },
    }),
  },
}));

function makeFile(name = "receipt.pdf", size = 1024, type = "application/pdf") {
  return new File([new Uint8Array(size)], name, { type });
}

describe("useDocumentUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true }) as Response),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uploads through presigned R2 and confirms with the document router", async () => {
    mocks.getUploadUrl.mockResolvedValue({
      uploadUrl: "https://r2.example.com/presign?token=abc",
      storagePath: "entity-1/uploads/receipt.pdf",
    });
    mocks.confirmUpload.mockResolvedValue({ documentId: "doc-1" });

    const { result } = renderHook(() =>
      useDocumentUpload({ entityId: "entity-1", docType: "receipt" }),
    );

    await act(async () => {
      await result.current.upload(makeFile());
    });

    // Presigned URL fetched with correct metadata.
    expect(mocks.getUploadUrl).toHaveBeenCalledWith({
      fileName: "receipt.pdf",
      fileSize: 1024,
      mimeType: "application/pdf",
    });
    // File PUT to R2 (the fetch is stubbed in the helper below).
    expect(result.current.isUploading).toBe(false);
    expect(result.current.error).toBeNull();
    // Document row confirmed + list invalidated.
    expect(mocks.confirmUpload).toHaveBeenCalledWith(
      expect.objectContaining({
        r2Key: "entity-1/uploads/receipt.pdf",
        name: "receipt.pdf",
        type: "receipt",
      }),
    );
    expect(mocks.invalidate).toHaveBeenCalled();
    expect(result.current.lastUploadedId).toBe("doc-1");
  });

  it("clears error state before a new upload", async () => {
    mocks.getUploadUrl.mockRejectedValueOnce(new Error("boom"));
    mocks.getUploadUrl.mockResolvedValue({
      uploadUrl: "https://r2.example.com/presign",
      storagePath: "entity-1/uploads/x.pdf",
    });
    mocks.confirmUpload.mockResolvedValue({ documentId: "doc-2" });

    const { result } = renderHook(() =>
      useDocumentUpload({ entityId: "entity-1", docType: "receipt" }),
    );

    // First attempt fails.
    await act(async () => {
      await expect(result.current.upload(makeFile("x.pdf"))).rejects.toThrow(
        "boom",
      );
    });
    expect(result.current.error).toContain("boom");

    // Second attempt succeeds and clears the error.
    await act(async () => {
      await result.current.upload(makeFile("x.pdf"));
    });
    expect(result.current.error).toBeNull();
    expect(result.current.lastUploadedId).toBe("doc-2");
  });

  it("rejects files that are too large before any network call", async () => {
    const { result } = renderHook(() =>
      useDocumentUpload({
        entityId: "entity-1",
        docType: "receipt",
        maxSizeBytes: 100,
      }),
    );

    await act(async () => {
      await expect(
        result.current.upload(makeFile("big.pdf", 5000)),
      ).rejects.toThrow(/too large/i);
    });
    expect(mocks.getUploadUrl).not.toHaveBeenCalled();
  });

  it("rejects unsupported mime types", async () => {
    const { result } = renderHook(() =>
      useDocumentUpload({ entityId: "entity-1", docType: "receipt" }),
    );

    await act(async () => {
      await expect(
        result.current.upload(
          makeFile("virus.exe", 10, "application/x-msdownload"),
        ),
      ).rejects.toThrow(/unsupported/i);
    });
    expect(mocks.getUploadUrl).not.toHaveBeenCalled();
  });
});
