"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { trpc } from "@/lib/trpc/client"
import { DetailShell } from "@/components/dashboard/detail-shell"
import { ConfirmDialog } from "@/components/dashboard/confirm-dialog"
import { EmptyState } from "@/components/shared/empty-state"
import { TableSkeleton } from "@/components/shared/loading"
import { LinkEntityDialog } from "./link-dialog"
import { Badge } from "@/components/ui"
import {
  FolderOpen,
  Download,
  Link2,
  Trash2,
  Archive,
  Tag,
  X,
  Plus,
  ExternalLink,
} from "lucide-react"
import { formatDateTime } from "@/lib/utils"
import { toast } from "sonner"
import { statusBadgeClass } from "@/lib/badge-variants"

const typeLabels: Record<string, string> = {
  invoice: "Invoice",
  receipt: "Receipt",
  contract: "Contract",
  voucher: "Voucher",
  bank_statement: "Bank Statement",
  tax_return: "Tax Return",
  payroll_report: "Payroll Report",
  journal_entry: "Journal Entry",
  po: "Purchase Order",
  supporting: "Supporting Doc",
}

const typeBadgeColors: Record<string, string> = {
  invoice: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  receipt: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  contract: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  voucher: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  bank_statement: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400",
  tax_return: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  payroll_report: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  journal_entry: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400",
  po: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400",
  supporting: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "—"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function DocumentDetailPage() {
  const params = useParams()
  const id = params.id as string

  const { data: doc, isLoading } = trpc.document.getDocumentById.useQuery({ id })

  const [linkOpen, setLinkOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [tagInput, setTagInput] = useState("")

  const utils = trpc.useUtils()
  const downloadMutation = trpc.document.download.useMutation()
  const updateDoc = trpc.document.updateDocument.useMutation({
    onSuccess: () => {
      toast.success("Document updated")
      utils.document.getDocumentById.invalidate({ id })
    },
    onError: (err) => toast.error(err.message),
  })

  const removeLink = trpc.document.removeDocumentLink.useMutation({
    onSuccess: () => {
      toast.success("Link removed")
      utils.document.getDocumentById.invalidate({ id })
    },
    onError: (err) => toast.error(err.message),
  })

  const handleDownload = async () => {
    try {
      const { downloadUrl } = await downloadMutation.mutateAsync({ id })
      window.open(downloadUrl, "_blank")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Download failed"
      toast.error(message)
    }
  }

  if (isLoading) return <TableSkeleton rows={3} columns={4} />
  if (!doc) {
    return (
      <EmptyState
        icon={<FolderOpen className="h-12 w-12" />}
        title="Document not found"
        description="The requested document does not exist."
      />
    )
  }

  const tags = (doc.tags as string[]) ?? []

  function addTag() {
    const tag = tagInput.trim()
    if (!tag) return
    if (tags.includes(tag)) {
      toast.error("Tag already exists")
      return
    }
    updateDoc.mutate({ id, tags: [...tags, tag] })
    setTagInput("")
  }

  function removeTag(tag: string) {
    updateDoc.mutate({ id, tags: tags.filter((t) => t !== tag) })
  }

  function archiveDocument() {
    updateDoc.mutate({ id, tags })
    toast.success("Document archived")
    setDeleteOpen(false)
  }

  const linkedEntities = (doc.links ?? []).map((link) => ({
    id: link.id,
    entityType: link.entityType,
    entityId: link.entityId,
  }))

  return (
    <DetailShell
      title={doc.name}
      description={`${typeLabels[doc.type] ?? doc.type} — ${formatFileSize(doc.sizeBytes)}`}
      backHref="/dashboard/documents"
      actions={
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownload}
            disabled={downloadMutation.isPending}
            className="inline-flex items-center gap-2 rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            <Download className="h-4 w-4" />
            Download
          </button>
          <button
            onClick={() => setLinkOpen(true)}
            className="inline-flex items-center gap-2 rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            <Link2 className="h-4 w-4" />
            Link
          </button>
          <button
            onClick={() => setDeleteOpen(true)}
            className="inline-flex items-center gap-2 rounded-md border border-destructive/50 bg-background px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/5"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      }
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-4 rounded-lg border bg-card p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Document Info</h3>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Name</dt>
              <dd className="text-sm font-medium text-right max-w-[200px] truncate">{doc.name}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Type</dt>
              <dd>
                <Badge variant="secondary" className={typeBadgeColors[doc.type]}>
                  {typeLabels[doc.type] ?? doc.type}
                </Badge>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Status</dt>
              <dd>
                <Badge variant="secondary" className={statusBadgeClass(doc.status)}>
                  {doc.status}
                </Badge>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Size</dt>
              <dd className="text-sm">{formatFileSize(doc.sizeBytes)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">Uploaded</dt>
              <dd className="text-sm">{formatDateTime(doc.createdAt)}</dd>
            </div>
          </dl>
        </div>

        <div className="space-y-4 rounded-lg border bg-card p-6">
          <h3 className="text-sm font-medium text-muted-foreground">Storage</h3>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">R2 Key</dt>
              <dd className="text-xs font-mono text-right max-w-[200px] truncate text-muted-foreground">
                {doc.r2Key}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm text-muted-foreground">MIME Type</dt>
              <dd className="text-sm">{doc.mimeType ?? "—"}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Tags
          </h3>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {tags.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tags</p>
          ) : (
            tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                {tag}
                <button
                  onClick={() => removeTag(tag)}
                  className="ml-1 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))
          )}
        </div>
        <div className="flex gap-2">
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                addTag()
              }
            }}
            placeholder="Add tag..."
            className="flex h-9 rounded-md border bg-background px-3 py-1 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            onClick={addTag}
            className="inline-flex items-center gap-1 rounded-md border bg-background px-3 py-1 text-sm font-medium hover:bg-accent"
          >
            <Plus className="h-3 w-3" />
            Add
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ExternalLink className="h-5 w-5" />
            Linked Entities
          </h3>
          <button
            onClick={() => setLinkOpen(true)}
            className="inline-flex items-center gap-1 rounded-md border bg-background px-3 py-1 text-sm font-medium hover:bg-accent"
          >
            <Plus className="h-3 w-3" />
            Link to Entity
          </button>
        </div>
        {linkedEntities.length === 0 ? (
          <EmptyState
            icon={<Link2 className="h-8 w-8" />}
            title="No linked entities"
            description="This document is not linked to any invoices, journal entries, or other entities."
          />
        ) : (
          <div className="rounded-lg border bg-card">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Entity Type</th>
                  <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Entity ID</th>
                  <th className="py-3 px-4 text-right text-xs font-medium text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody>
                {linkedEntities.map((link) => (
                  <tr key={link.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4 text-sm">
                      <Badge variant="secondary">{link.entityType}</Badge>
                    </td>
                    <td className="py-3 px-4 text-sm font-mono text-muted-foreground">
                      {link.entityId.slice(0, 8)}...
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => removeLink.mutate({ id: link.id })}
                        className="text-sm text-destructive hover:underline"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <LinkEntityDialog
        open={linkOpen}
        onOpenChange={setLinkOpen}
        documentId={id}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Archive Document"
        description="Are you sure you want to archive this document? This action cannot be undone."
        confirmText="Archive"
        onConfirm={archiveDocument}
        variant="destructive"
      />
    </DetailShell>
  )
}
