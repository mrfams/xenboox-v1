import { Card, CardContent } from "@xenboox/ui"
import { FolderOpen, Upload, FileText, Image } from "lucide-react"

export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FolderOpen className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-3xl font-bold tracking-tight">Documents</h1>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16">
          <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No documents yet</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Upload receipts, invoices, and other financial documents. They will be automatically processed and categorized.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="cursor-pointer hover:bg-accent/50">
          <CardContent className="flex items-center gap-3 py-4">
            <Upload className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Upload Receipt</p>
              <p className="text-xs text-muted-foreground">Scan or upload</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-accent/50">
          <CardContent className="flex items-center gap-3 py-4">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Upload Invoice</p>
              <p className="text-xs text-muted-foreground">PDF or image</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-accent/50">
          <CardContent className="flex items-center gap-3 py-4">
            <Image className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Upload Photo</p>
              <p className="text-xs text-muted-foreground">Camera or gallery</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}