"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { trpc } from "@/lib/trpc/client"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState } from "@/components/shared/empty-state"
import { TableSkeleton } from "@/components/shared/loading"
import { FilterBar } from "@/components/dashboard/filter-bar"
import { UploadDialog } from "./upload-dialog"
import { Badge } from "@/components/ui"
import {
  FolderOpen,
  Plus,
  FileText,
  Receipt,
  FileSignature,
  FileSpreadsheet,
  BookOpen,
  Landmark,
  FileCheck,
  ScrollText,
  ShoppingCart,
  Paperclip,
  Download,
} from "lucide-react"
import { formatDateTime } from "@/lib/utils"
import { toast } from "sonner"
import type { FilterState } from "@/components/dashboard/filter-bar"
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

const typeIcons: Record<string, React.ReactNode> = {
  invoice: <FileText className="h-4 w-4" />,
  receipt: <Receipt className="h-4 w-4" />,
  contract: <FileSignature className="h-4 w-4" />,
  voucher: <FileSpreadsheet className="h-4 w-4" />,
  bank_statement: <Landmark className="h-4 w-4" />,
  tax_return: <ScrollText className="h-4 w-4" />,
  payroll_report: <FileCheck className="h-4 w-4" />,
  journal_entry: <BookOpen className="h-4 w-4" />,
  po: <ShoppingCart className="h-4 w-4" />,
  supporting: <Paperclip className="h-4 w-4" />,
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

export default function DocumentsPage() {
  const router = useRouter()
  const { data: documents, isLoading } = trpc.document.listDocuments.useQuery()
  const downloadMutation = trpc.document.download.useMutation()
  const [uploadOpen, setUploadOpen] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    search: "", dateFrom: "", dateTo: "", status: "", sort: "date-desc",
  })

  const filtered = useMemo(() => {
    if (!documents) return []
    let result = [...documents]
    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter((d) => d.name.toLowerCase().includes(q))
    }
    if (filters.status) {
      result = result.filter((d) => d.type === filters.status)
    }
    if (filters.sort === "date-asc") {
      result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    } else if (filters.sort === "name-asc") {
      result.sort((a, b) => a.name.localeCompare(b.name))
    } else if (filters.sort === "name-desc") {
      result.sort((a, b) => b.name.localeCompare(a.name))
    } else {
      result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }
    return result
  }, [documents, filters])

  async function handleDownload(docId: string) {
    try {
      const { downloadUrl } = await downloadMutation.mutateAsync({ id: docId })
      window.open(downloadUrl, "_blank")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Download failed"
      toast.error(message)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        description="Manage uploaded documents and files"
        action={{
          label: "Upload Document",
          onClick: () => setUploadOpen(true),
          icon: <Plus className="mr-2 h-4 w-4" />,
        }}
      />

      <FilterBar
        onFilterChange={setFilters}
        statusOptions={Object.entries(typeLabels).map(([value, label]) => ({ value, label }))}
        sortOptions={[
          { value: "date-desc", label: "Date (newest first)" },
          { value: "date-asc", label: "Date (oldest first)" },
          { value: "name-asc", label: "Name (A–Z)" },
          { value: "name-desc", label: "Name (Z–A)" },
        ]}
      />

      {isLoading ? (
        <TableSkeleton rows={6} columns={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="h-12 w-12" />}
          title="No documents"
          description="Upload your first document to start building your document library."
        />
      ) : (
          <div className="overflow-x-auto rounded-lg border bg-card">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Name</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Type</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Size</th>
                <th className="py-3 px-4 text-left text-xs font-medium text-muted-foreground">Uploaded</th>
                <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">Status</th>
                <th className="py-3 px-4 text-center text-xs font-medium text-muted-foreground">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((doc) => (
                <tr
                  key={doc.id}
                  className="border-b hover:bg-muted/50 cursor-pointer"
                  onClick={() => router.push(`/dashboard/documents/${doc.id}`)}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{typeIcons[doc.type] ?? <FileText className="h-4 w-4" />}</span>
                      <span className="text-sm font-medium">{doc.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant="secondary" className={typeBadgeColors[doc.type]}>
                      {typeLabels[doc.type] || doc.type}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">
                    {formatFileSize(doc.sizeBytes)}
                  </td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">
                    {formatDateTime(doc.createdAt)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Badge variant="secondary" className={statusBadgeClass(doc.status)}>
                      {doc.status}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDownload(doc.id)
                      }}
                      disabled={downloadMutation.isPending}
                      className="inline-flex items-center justify-center rounded-md p-1 text-muted-foreground hover:text-foreground transition-colors"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <UploadDialog open={uploadOpen} onOpenChange={setUploadOpen} />
    </div>
  )
}
