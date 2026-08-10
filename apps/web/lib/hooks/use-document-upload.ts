"use client";

import { useCallback, useState } from "react";

import { ALLOWED_MIME_TYPES } from "@/lib/r2";
import { trpc } from "@/lib/trpc/client";

export type UploadableDocType =
  | "invoice"
  | "receipt"
  | "contract"
  | "voucher"
  | "bank_statement"
  | "tax_return"
  | "payroll_report"
  | "journal_entry"
  | "po"
  | "supporting";

interface UseDocumentUploadOptions {
  entityId: string;
  docType: UploadableDocType;
  maxSizeBytes?: number;
}

/**
 * useDocumentUpload — wires a real file upload through the existing
 * document pipeline: getUploadUrl (presigned R2) → PUT → confirmUpload
 * (persists the row + triggers AI processing) → invalidates the list.
 *
 * Never touches the DOM or fake data — this is the same flow the Documents
 * module uses, exposed as a hook for any page's Upload/Import button.
 */
export function useDocumentUpload({
  entityId,
  docType,
  maxSizeBytes = 25 * 1024 * 1024,
}: UseDocumentUploadOptions) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUploadedId, setLastUploadedId] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const getUploadUrl = trpc.document.getUploadUrl.useMutation();
  const confirmUpload = trpc.document.confirmUpload.useMutation();

  const upload = useCallback(
    async (file: File) => {
      setError(null);
      setLastUploadedId(null);

      if (file.size > maxSizeBytes) {
        const mb = Math.round(maxSizeBytes / 1024 / 1024);
        const message = `File too large — max ${mb}MB.`;
        setError(message);
        throw new Error(message);
      }
      if (!ALLOWED_MIME_TYPES.includes(file.type as never)) {
        const message =
          "Unsupported file type. Use PDF, image, CSV, or a spreadsheet.";
        setError(message);
        throw new Error(message);
      }

      setIsUploading(true);
      try {
        const { uploadUrl, storagePath } = await getUploadUrl.mutateAsync({
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type as (typeof ALLOWED_MIME_TYPES)[number],
        });

        const put = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!put.ok) {
          throw new Error("Upload to storage failed. Please try again.");
        }

        // The R2 bucket is a server-side constant; the client doesn't need to
        // know it to confirm the row (r2Key is what download/delete use).
        const res = await confirmUpload.mutateAsync({
          r2Key: storagePath,
          r2Bucket: "xenboox-uploads",
          name: file.name,
          type: docType,
          mimeType: file.type,
          fileSize: file.size,
        });

        setLastUploadedId(res.documentId);
        await utils.document.listDocuments.invalidate();
        return res.documentId;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Upload failed. Please try again.";
        setError(message);
        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    [entityId, docType, maxSizeBytes, getUploadUrl, confirmUpload, utils],
  );

  return { upload, isUploading, error, lastUploadedId };
}
