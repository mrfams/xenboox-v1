"use client"

import { useState, useRef, useCallback } from "react"
import { trpc } from "@/lib/trpc/client"
import { CreateDialog } from "@/components/dashboard/create-dialog"
import {
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui"
import { toast } from "sonner"
import { Upload, X, FileText } from "lucide-react"
import { cn } from "@/lib/utils"

type UploadDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const documentTypes = [
  { value: "invoice", label: "Invoice" },
  { value: "receipt", label: "Receipt" },
  { value: "contract", label: "Contract" },
  { value: "voucher", label: "Voucher" },
  { value: "bank_statement", label: "Bank Statement" },
  { value: "tax_return", label: "Tax Return" },
  { value: "payroll_report", label: "Payroll Report" },
  { value: "journal_entry", label: "Journal Entry" },
  { value: "po", label: "Purchase Order" },
  { value: "supporting", label: "Supporting Doc" },
]

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/tiff",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
] as const

type AllowedMime = (typeof ALLOWED_MIME_TYPES)[number]

function isAllowedMime(type: string): type is AllowedMime {
  return (ALLOWED_MIME_TYPES as readonly string[]).includes(type)
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function UploadDialog({ open, onOpenChange }: UploadDialogProps) {
  const utils = trpc.useUtils()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [docType, setDocType] = useState("invoice")
  const [tags, setTags] = useState("")
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [dragOver, setDragOver] = useState(false)

  const getUploadUrl = trpc.document.getUploadUrl.useMutation()
  const confirmUpload = trpc.document.confirmUpload.useMutation()

  function resetForm() {
    setFile(null)
    setDocType("invoice")
    setTags("")
    setUploading(false)
    setProgress(0)
  }

  const handleFileSelect = useCallback((selected: File | null) => {
    if (!selected) return
    if (!isAllowedMime(selected.type)) {
      toast.error("File type not supported. Please upload PDF, images, Excel, or Word files.")
      return
    }
    setFile(selected)
  }, [])

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    handleFileSelect(dropped)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
  }

  async function handleSubmit() {
    if (!file) {
      toast.error("Please select a file to upload")
      return
    }

    setUploading(true)
    setProgress(10)

    try {
      const { uploadUrl, storagePath } = await getUploadUrl.mutateAsync({
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type as AllowedMime,
      })

      setProgress(40)

      await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      })

      setProgress(70)

      const r2Bucket = process.env.NEXT_PUBLIC_R2_BUCKET_NAME ?? ""
      const parsedTags = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)

      await confirmUpload.mutateAsync({
        r2Key: storagePath,
        r2Bucket: r2Bucket || "xenboox-docs",
        name: file.name,
        type: docType as "invoice" | "receipt" | "contract" | "voucher" | "bank_statement" | "tax_return" | "payroll_report" | "journal_entry" | "po" | "supporting",
        mimeType: file.type,
        fileSize: file.size,
      })

      setProgress(100)

      toast.success("Document uploaded successfully")
      utils.document.listDocuments.invalidate()
      onOpenChange(false)
      resetForm()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed"
      toast.error(message)
      setUploading(false)
      setProgress(0)
    }
  }

  return (
    <CreateDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) resetForm()
        onOpenChange(o)
      }}
      title="Upload Document"
      description="Upload a file to your document library."
      onSubmit={handleSubmit}
      isLoading={uploading}
    >
      <div className="space-y-4">
        {!file ? (
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-colors",
              dragOver
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-muted-foreground/50"
            )}
          >
            <Upload className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm font-medium">Click to browse or drag and drop</p>
            <p className="text-xs text-muted-foreground mt-1">
              PDF, Images, Excel, Word (max 100 MB)
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-lg border p-4">
            <FileText className="h-8 w-8 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
            </div>
            <button
              type="button"
              onClick={() => setFile(null)}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {uploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Uploading...</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label>Document Type</Label>
          <Select value={docType} onValueChange={setDocType}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {documentTypes.map((dt) => (
                <SelectItem key={dt.value} value={dt.value}>
                  {dt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="tags">Tags</Label>
          <Input
            id="tags"
            placeholder="e.g. q1-2026, expense, recurring"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Comma-separated tags for organization</p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_MIME_TYPES.join(",")}
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
        />
      </div>
    </CreateDialog>
  )
}
