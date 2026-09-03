"use client";

import { useRef, type ReactNode } from "react";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { useEntity } from "@/lib/entity-context";
import {
  useDocumentUpload,
  type UploadableDocType,
} from "@/lib/hooks/use-document-upload";
import { cn } from "@/lib/utils";

/** Max file sizes per category (in bytes) — mirrors intake-service constants */
const MAX_FILE_SIZES: Record<string, number> = {
  pdf: 50 * 1024 * 1024,
  image: 25 * 1024 * 1024,
  spreadsheet: 10 * 1024 * 1024,
  document: 25 * 1024 * 1024,
  text: 5 * 1024 * 1024,
  default: 10 * 1024 * 1024,
};

/** Map file extension to category */
function getFileCategory(file: File): string {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "pdf";
  if (["jpg", "jpeg", "png", "tiff", "webp"].includes(ext)) return "image";
  if (["csv", "xlsx", "xls"].includes(ext)) return "spreadsheet";
  if (["doc", "docx"].includes(ext)) return "document";
  if (["txt", "eml", "msg"].includes(ext)) return "text";
  return "default";
}

/**
 * DocumentUploadButton — a real upload button for any page.
 *
 * Opens a native file picker, pushes the file through the presigned-R2
 * document pipeline, and confirms with a toast. Drop-in for the previously
 * dead "Upload / Import" buttons on documents, expenses, payroll and vendor
 * pages.
 */
export function DocumentUploadButton({
  docType,
  label = "Upload",
  className,
  accept = ".pdf,.csv,.xlsx,.png,.jpg,.jpeg,.webp,.tiff",
  icon,
  onUploaded,
}: {
  docType: UploadableDocType;
  label?: string;
  className?: string;
  accept?: string;
  icon?: ReactNode;
  onUploaded?: (documentId: string) => void;
}) {
  const { entityId, isLoaded } = useEntity();
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload, isUploading } = useDocumentUpload({
    entityId: entityId ?? "",
    docType,
  });

  const handleFile = async (file: File | undefined) => {
    if (!file || !entityId) return;

    // Client-side file size validation
    const category = getFileCategory(file);
    const maxSize = MAX_FILE_SIZES[category] ?? MAX_FILE_SIZES.default;
    if (file.size > maxSize) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      const maxMB = (maxSize / (1024 * 1024)).toFixed(0);
      toast.error(
        `${file.name} is ${sizeMB}MB — maximum for ${category} files is ${maxMB}MB.`,
      );
      return;
    }

    if (file.size === 0) {
      toast.error("File is empty — please select a valid file.");
      return;
    }

    toast.promise(upload(file), {
      loading: `Uploading ${file.name}…`,
      success: (documentId) => {
        onUploaded?.(documentId);
        return `${file.name} uploaded — processing with AI.`;
      },
      error: (err) =>
        err instanceof Error ? err.message : "Upload failed. Please try again.",
    });
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading || !isLoaded}
        className={cn(
          "inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60",
          className,
        )}
      >
        {isUploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          (icon ?? <Upload className="h-4 w-4" />)
        )}
        {isUploading ? "Uploading…" : label}
      </button>
    </>
  );
}
