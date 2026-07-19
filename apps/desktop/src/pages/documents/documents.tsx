import { Card, CardContent, CardHeader, CardTitle } from "@xenboox/ui"
import { Badge } from "@xenboox/ui"
import { FolderOpen, Upload, FileText, Image, Download, Trash2 } from "lucide-react"
import { trpc } from "@/lib/trpc"
import { useState } from "react"

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
}

const DOCUMENT_TYPES = [
  { value: "invoice", label: "Invoice", icon: FileText },
  { value: "receipt", label: "Receipt", icon: FileText },
  { value: "contract", label: "Contract", icon: FileText },
  { value: "voucher", label: "Voucher", icon: FileText },
  { value: "bank_statement", label: "Bank Statement", icon: FileText },
  { value: "supporting", label: "Supporting", icon: FileText },
] as const

export default function DocumentsPage() {
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedType, setSelectedType] = useState<(typeof DOCUMENT_TYPES)[0]["value"]>("receipt")
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const { data: documents, isLoading, error, refetch } = trpc.document.listDocuments.useQuery()
  const getUploadUrl = trpc.document.getUploadUrl.useMutation()
  const confirmUpload = trpc.document.confirmUpload.useMutation()
  const downloadDoc = trpc.document.download.useMutation()
  const deleteDoc = trpc.document.delete.useMutation()

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      if (selected.size > 25 * 1024 * 1024) {
        alert("File too large. Maximum size is 25MB.")
        return
      }
      setFile(selected)
      const url = URL.createObjectURL(selected)
      setPreviewUrl(url)
    }
  }

  const handleUpload = async () => {
    if (!file) return

    try {
      const uploadInfo = await getUploadUrl.mutateAsync({
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type as any,
      })

      const uploadResult = await fetch(uploadInfo.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
          "x-ms-blob-type": "BlockBlob",
        },
        body: file,
      })

      if (!uploadResult.ok) {
        throw new Error("Upload failed")
      }

      await confirmUpload.mutateAsync({
        r2Key: uploadInfo.storagePath,
        r2Bucket: import.meta.env.VITE_R2_BUCKET_NAME || "xenboox-documents",
        name: file.name,
        type: selectedType,
        mimeType: file.type,
        fileSize: file.size,
      })

      await refetch()
      setShowUploadModal(false)
      setFile(null)
      setPreviewUrl(null)
      URL.revokeObjectURL(previewUrl!)
    } catch (err) {
      console.error("Upload error:", err)
      alert("Upload failed. Please try again.")
    }
  }

  const handleDownload = async (doc: { id: string; r2Key: string; mimeType?: string }) => {
    const result = await downloadDoc.mutateAsync({ id: doc.id })
    if (result.downloadUrl) {
      window.open(result.downloadUrl, "_blank")
    }
  }

  const handleDelete = async (doc: { id: string; name: string }) => {
    if (confirm(`Delete "${doc.name}"?`)) {
      await deleteDoc.mutateAsync({ id: doc.id })
      await refetch()
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <FolderOpen className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4 animate-pulse" />
            <h3 className="text-lg font-medium mb-2">Loading documents...</h3>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <FolderOpen className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FolderOpen className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-medium mb-2">Failed to load documents</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Please check your connection and try again.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FolderOpen className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium hover:bg-primary/90"
        >
          <Upload className="h-4 w-4" />
          Upload
        </button>
      </div>

      {documents?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No documents yet</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md">
              Upload receipts, invoices, and other financial documents. They will be automatically processed and categorized.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {documents?.map((doc) => (
            <Card key={doc.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{doc.name}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {doc.type?.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                  </Badge>
                  <Badge variant={doc.status === "processed" ? "success" : "secondary"} className="text-xs">
                    {doc.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{doc.mimeType || "Unknown file type"}</span>
                  <span>{doc.sizeBytes ? formatFileSize(parseInt(doc.sizeBytes)) : "Unknown size"}</span>
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => handleDownload(doc)}
                    disabled={downloadDoc.isPending}
                    className="text-sm text-primary hover:underline"
                  >
                    <Download className="h-3 w-3 inline mr-1" />
                    Download
                  </button>
                  <button
                    onClick={() => handleDelete(doc)}
                    disabled={deleteDoc.isPending}
                    className="text-sm text-destructive hover:underline"
                  >
                    <Trash2 className="h-3 w-3 inline mr-1" />
                    Delete
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {DOCUMENT_TYPES.map((type) => (
          <button
            key={type.value}
            onClick={() => {
              setSelectedType(type.value)
              setShowUploadModal(true)
            }}
            className="cursor-pointer hover:bg-accent/50 rounded-lg p-4 text-left"
          >
            <div className="flex items-center gap-3">
              <type.icon className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{type.label}</p>
                <p className="text-xs text-muted-foreground">Upload</p>
              </div>
            </div>
          </button>
        ))}
      </div>

      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Upload Document</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Document Type</label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as any)}
                  className="w-full rounded-md border p-2"
                >
                  {DOCUMENT_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">File</label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.csv"
                  onChange={handleFileSelect}
                  className="w-full"
                />
              </div>
              {previewUrl && (
                <div className="mt-2">
                  <p className="text-sm font-medium mb-2">Preview</p>
                  <img src={previewUrl} alt="Preview" className="max-h-48 object-contain rounded" />
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowUploadModal(false)
                    setFile(null)
                    setPreviewUrl(null)
                  }}
                  className="px-4 py-2 text-sm rounded-md border"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!file || getUploadUrl.isPending}
                  className="px-4 py-2 text-sm rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {getUploadUrl.isPending ? "Uploading..." : "Upload"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}