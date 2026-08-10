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
