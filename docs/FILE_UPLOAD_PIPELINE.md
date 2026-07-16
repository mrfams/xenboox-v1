# FILE_UPLOAD_PIPELINE.md — File Upload & Document Processing Pipeline

> End-to-end design for file uploads in Xenboox.
> Covers client → R2 → processing → agent pipeline with OCR, classification, virus scanning, and cleanup.

---

## 1. Upload Flow

```
Client (Browser / Mobile / Desktop)
    │
    1. User selects file (drag-drop or browse)
    2. Client validates: size, type, format
    3. Client requests presigned upload URL from tRPC
    │
    ▼
tRPC Route: `documents.getUploadUrl`
    │
    4. Server validates: entity access, quota, rate limit
    5. Returns presigned R2 PUT URL (expires in 15 min)
    │
    ▼
Client → Cloudflare R2
    │
    6. Uploads directly to R2 via presigned URL
    7. Returns ETag + storage path
    │
    ▼
tRPC Route: `documents.confirmUpload`
    │
    8. Creates document record in database (status: pending)
    9. Triggers Trigger.dev job for processing
    10. Returns document ID to client
    │
    ▼
Trigger.dev: `processDocument`
    │
    11. Virus scan (ClamAV via API)
    12. Extract metadata (type, page count, size)
    13. OCR / text extraction based on file type
    14. AI document classification
    15. Route to appropriate agent (AP, AR, etc.)
    16. Update document status (processed | failed)
    │
    ▼
Client polls or receives SSE notification
    │
    17. Document shows as processed in UI
    18. Data available for agent review
```

---

## 2. Presigned URL Generation

```typescript
// packages/db/schema/documents.ts
import { pgTable, uuid, text, timestamp, integer, jsonb, pgEnum } from "drizzle-orm/pg-core"
import { entities, users } from "./organization"

export const documentStatusEnum = pgEnum("document_status", [
  "pending", "uploading", "processing", "processed", "failed", "quarantined",
])

export const documentCategoryEnum = pgEnum("document_category", [
  "invoice", "receipt", "bank_statement", "contract", "payroll",
  "tax_document", "financial_report", "identification", "other",
])

export const documents = pgTable("documents", {
  id:            uuid("id").primaryKey().defaultRandom(),
  entityId:      uuid("entity_id").notNull().references(() => entities.id),
  uploadedBy:    uuid("uploaded_by").notNull().references(() => users.id),
  status:        documentStatusEnum("status").notNull().default("pending"),
  category:      documentCategoryEnum("category"),     // Set after AI classification
  fileName:      text("file_name").notNull(),
  originalName:  text("original_name").notNull(),       // User-facing name
  mimeType:      text("mime_type").notNull(),
  fileSize:      integer("file_size").notNull(),        // Bytes
  storagePath:   text("storage_path").notNull(),        // R2 key (org-id/entity-id/uuid.ext)
  thumbnailPath: text("thumbnail_path"),                // R2 key for generated thumbnail
  checksum:      text("checksum"),                      // SHA-256 of file content
  pageCount:     integer("page_count"),
  extractedText: text("extracted_text"),                 // OCR / text extraction result
  metadata:      jsonb("metadata").default({}),         // AI classification result, OCR confidence, etc.
  processingError: text("processing_error"),
  retentionUntil: timestamp("retention_until"),          // Auto-delete date
  completedAt:   timestamp("completed_at"),
  createdAt:     timestamp("created_at").notNull().defaultNow(),
  updatedAt:     timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("documents_entity_idx").on(table.entityId),
  index("documents_status_idx").on(table.status),
  index("documents_category_idx").on(table.category),
])
```

### Upload Route

```typescript
// apps/web/app/api/trpc/routers/documents.ts
import { z } from "zod"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { TRPCError } from "@trpc/server"

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg", "image/png", "image/tiff",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
  "application/vnd.ms-excel",  // .xls
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  "application/msword",  // .doc
]

const FILE_SIZE_LIMITS: Record<string, number> = {
  free:       5 * 1024 * 1024,    // 5 MB
  starter:    10 * 1024 * 1024,   // 10 MB
  business:   25 * 1024 * 1024,   // 25 MB
  enterprise: 100 * 1024 * 1024,  // 100 MB
}

export const documentRouter = router({
  getUploadUrl: protectedProcedure
    .input(z.object({
      entityId: z.string().uuid(),
      fileName: z.string().min(1).max(255),
      fileSize: z.number().min(1).max(100 * 1024 * 1024),
      mimeType: z.enum(ALLOWED_MIME_TYPES as [string, ...string[]]),
    }))
    .mutation(async ({ ctx, input }) => {
      // Validate file size by plan
      const org = await db.query.organizations.findFirst({
        where: eq(organizations.id, ctx.entityId), // via entity → org
        columns: { plan: true },
      })
      const maxSize = FILE_SIZE_LIMITS[org?.plan ?? "free"]
      if (input.fileSize > maxSize) {
        throw new TRPCError({
          code: "PAYLOAD_TOO_LARGE",
          message: `File size exceeds ${maxSize / 1024 / 1024}MB limit for your plan`,
        })
      }

      // Validate MIME type
      if (!ALLOWED_MIME_TYPES.includes(input.mimeType)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "File type not supported",
        })
      }

      const fileExtension = input.fileName.split(".").pop()
      const storagePath = `${ctx.entityId}/${crypto.randomUUID()}.${fileExtension}`

      const presignedUrl = await getSignedUrl(
        r2,
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME!,
          Key: storagePath,
          ContentType: input.mimeType,
          ContentLength: input.fileSize,
        }),
        { expiresIn: 900 }, // 15 minutes
      )

      return {
        uploadUrl: presignedUrl,
        storagePath,
        publicUrl: `https://${process.env.R2_BUCKET_NAME}.r2.dev/${storagePath}`,
      }
    }),

  confirmUpload: protectedProcedure
    .input(z.object({
      entityId: z.string().uuid(),
      storagePath: z.string(),
      fileName: z.string(),
      fileSize: z.number(),
      mimeType: z.string(),
      checksum: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const doc = await db.insert(documents).values({
        entityId: ctx.entityId,
        uploadedBy: ctx.session.user.id,
        status: "pending",
        fileName: input.storagePath,
        originalName: input.fileName,
        mimeType: input.mimeType,
        fileSize: input.fileSize,
        storagePath: input.storagePath,
        checksum: input.checksum,
      }).returning()

      // Trigger processing job
      await triggerTask("process-document", {
        documentId: doc.id,
        entityId: ctx.entityId,
        storagePath: input.storagePath,
        mimeType: input.mimeType,
      })

      return { documentId: doc.id }
    }),
})
```

---

## 3. File Size Limits Per Plan Tier

| Plan | Max File Size | Max Uploads/Day | Storage Quota | Retention |
|------|--------------|-----------------|---------------|-----------|
| Free | 5 MB | 20 | 500 MB | 90 days |
| Starter | 10 MB | 100 | 5 GB | 1 year |
| Business | 25 MB | 500 | 25 GB | 3 years |
| Enterprise | 100 MB | Unlimited | 100 GB | 7 years |

---

## 4. Supported Formats and Validation

### Client-Side Validation (Before Upload)

```typescript
// apps/web/lib/upload/validation.ts
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/tiff",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
]

const MAX_FILENAME_LENGTH = 255

export function validateFile(file: File, plan: string): { valid: boolean; error?: string } {
  if (file.name.length > MAX_FILENAME_LENGTH) {
    return { valid: false, error: "Filename too long" }
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: `Unsupported file type: ${file.type}` }
  }

  const limit = FILE_SIZE_LIMITS[plan] ?? FILE_SIZE_LIMITS.free
  if (file.size > limit) {
    const mb = limit / 1024 / 1024
    return { valid: false, error: `File too large. Maximum: ${mb}MB` }
  }

  return { valid: true }
}
```

### Upload Component

```tsx
// apps/web/components/upload/file-uploader.tsx
"use client"

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { trpc } from "@/lib/trpc"
import { Upload, File, X, CheckCircle2, AlertCircle } from "lucide-react"

type UploadState = {
  file: File
  progress: number
  status: "pending" | "uploading" | "processing" | "done" | "error"
  documentId?: string
  error?: string
}

export function FileUploader({ entityId }: { entityId: string }) {
  const [uploads, setUploads] = useState<UploadState[]>([])
  const getUploadUrl = trpc.documents.getUploadUrl.useMutation()
  const confirmUpload = trpc.documents.confirmUpload.useMutation()

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    for (const file of acceptedFiles) {
      const id = crypto.randomUUID()
      setUploads((prev) => [...prev, { file, progress: 0, status: "pending" }])

      try {
        // 1. Get presigned URL
        const { uploadUrl, storagePath } = await getUploadUrl.mutateAsync({
          entityId,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        })

        // 2. Upload directly to R2
        setUploads((prev) => prev.map((u) =>
          u.file === file ? { ...u, status: "uploading" } : u
        ))

        const uploadResponse = await fetch(uploadUrl, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        })

        if (!uploadResponse.ok) throw new Error("Upload to R2 failed")
        const etag = uploadResponse.headers.get("etag") ?? ""

        // 3. Compute checksum
        const checksum = await computeSHA256(file)

        // 4. Confirm upload
        const { documentId } = await confirmUpload.mutateAsync({
          entityId,
          storagePath,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          checksum,
        })

        setUploads((prev) => prev.map((u) =>
          u.file === file ? { ...u, status: "processing", documentId } : u
        ))

        // 5. Poll for completion (or use SSE)
        pollDocumentStatus(documentId, (status) => {
          setUploads((prev) => prev.map((u) =>
            u.documentId === documentId
              ? { ...u, status: status === "processed" ? "done" : "processing" }
              : u
          ))
        })
      } catch (error) {
        setUploads((prev) => prev.map((u) =>
          u.file === file
            ? { ...u, status: "error", error: (error as Error).message }
            : u
        ))
      }
    }
  }, [entityId])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop })

  return (
    <div>
      <div {...getRootProps()} className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary">
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop files here...</p>
        ) : (
          <div>
            <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
            <p>Drag & drop files, or click to browse</p>
            <p className="text-sm text-muted-foreground">PDF, Images, Excel, CSV, Word</p>
          </div>
        )}
      </div>

      {uploads.map((u) => (
        <div key={u.file.name} className="flex items-center gap-3 p-2 mt-2 rounded bg-muted">
          <File className="h-4 w-4" />
          <span className="text-sm flex-1">{u.file.name}</span>
          {u.status === "done" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
          {u.status === "error" && <AlertCircle className="h-4 w-4 text-red-500" />}
          {u.status === "uploading" && <span className="text-xs text-muted-foreground">Uploading...</span>}
          {u.status === "processing" && <span className="text-xs text-muted-foreground">Processing...</span>}
        </div>
      ))}
    </div>
  )
}
```

---

## 5. Processing Queue (Trigger.dev)

```typescript
// packages/agents/jobs/document-processing.ts
import { task } from "@trigger.dev/sdk"
import { db } from "@xenboox/db"
import { documents } from "@xenboox/db/schema"
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3"
import { eq } from "drizzle-orm"

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

export const processDocument = task({
  id: "process-document",
  maxDuration: 300,      // 5 minutes max
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 5_000,
    maxTimeoutInMs: 60_000,
  },
  queue: {
    concurrencyLimit: 10, // Max 10 documents processed simultaneously
  },

  run: async (payload: {
    documentId: string
    entityId: string
    storagePath: string
    mimeType: string
  }) => {
    const { documentId, entityId, storagePath, mimeType } = payload

    // 1. Update to processing
    await db.update(documents)
      .set({ status: "processing" })
      .where(eq(documents.id, documentId))

    try {
      // 2. Download from R2
      const response = await r2.send(new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: storagePath,
      }))

      const fileBuffer = await response.Body?.transformToByteArray()
      if (!fileBuffer) throw new Error("Failed to read file from R2")

      // 3. Virus scan
      const scanResult = await scanFile(fileBuffer)
      if (scanResult.infected) {
        await db.update(documents)
          .set({
            status: "quarantined",
            processingError: `Virus detected: ${scanResult.virusName}`,
            completedAt: new Date(),
          })
          .where(eq(documents.id, documentId))
        return { status: "quarantined", virusName: scanResult.virusName }
      }

      // 4. Extract text based on file type
      let extractedText = ""
      let pageCount = 0

      if (mimeType === "application/pdf") {
        const result = await extractTextFromPDF(fileBuffer)
        extractedText = result.text
        pageCount = result.pages
      } else if (mimeType.startsWith("image/")) {
        const result = await ocrImage(fileBuffer)
        extractedText = result.text
        pageCount = 1
      } else if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) {
        const result = await extractTextFromExcel(fileBuffer)
        extractedText = result.text
        pageCount = result.sheets
      } else if (mimeType === "text/csv") {
        extractedText = new TextDecoder().decode(fileBuffer)
        pageCount = 1
      } else if (mimeType.includes("word") || mimeType === "application/msword") {
        const result = await extractTextFromWord(fileBuffer)
        extractedText = result.text
        pageCount = result.pages
      }

      // 5. AI classification
      const classification = await classifyDocument(extractedText, mimeType, fileBuffer)

      // 6. Update document record
      await db.update(documents)
        .set({
          status: "processed",
          category: classification.category,
          extractedText,
          pageCount,
          metadata: classification.metadata,
          completedAt: new Date(),
        })
        .where(eq(documents.id, documentId))

      // 7. Route to appropriate agent
      await routeDocumentToAgent(documentId, entityId, classification)

      return {
        status: "processed",
        category: classification.category,
        confidence: classification.confidence,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error"

      await db.update(documents)
        .set({
          status: "failed",
          processingError: message,
          completedAt: new Date(),
        })
        .where(eq(documents.id, documentId))

      throw error // Trigger.dev will retry
    }
  },
})
```

---

## 6. OCR Pipeline

```
File arrives
    │
    ├── PDF → pdf.js (PDF text extraction)
    │         └── If no text found → Render to image → Tesseract OCR
    │                                               └── If Tesseract confidence < 0.7
    │                                                   → Claude Vision API
    │
    ├── Image → Tesseract OCR
    │            └── If Tesseract confidence < 0.7 → Claude Vision API
    │
    ├── Excel → xlsx (parse library)
    │            → Extract all cell text as structured data
    │
    ├── CSV → csv-parse (parse library)
    │         → Extract rows and columns
    │
    └── Word → mammoth (parse .docx)
               → Extract text and tables
```

### OCR Implementation

```typescript
// packages/agents/platform/document-agent/ocr.ts
import { createWorker } from "tesseract.js"
import { Anthropic } from "@anthropic-ai/sdk"
import * as pdfjs from "pdfjs-dist"

// Tile extraction for PDFs without embedded text
export async function extractTextFromPDF(buffer: Uint8Array): Promise<{ text: string; pages: number }> {
  const doc = await pdfjs.getDocument({ data: buffer }).promise
  let fullText = ""
  let hasText = false

  // First: try extracting embedded text
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const content = await page.getTextContent()
    const pageText = content.items.map((item: any) => item.str).join(" ")
    fullText += pageText + "\n"
    if (pageText.trim().length > 0) hasText = true
  }

  // If no text found, render and OCR
  if (!hasText) {
    fullText = await ocrPDFPages(doc)
  }

  return { text: fullText, pages: doc.numPages }
}

async function ocrPDFPages(doc: pdfjs.PDFDocumentProxy): Promise<string> {
  const worker = await createWorker("eng")
  let fullText = ""

  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const viewport = page.getViewport({ scale: 2 })
    const canvas = new OffscreenCanvas(viewport.width, viewport.height)
    const ctx = canvas.getContext("2d")!
    await page.render({ canvasContext: ctx, viewport }).promise
    const blob = await canvas.convertToBlob({ type: "image/png" })
    const buffer = Buffer.from(await blob.arrayBuffer())
    const { data } = await worker.recognize(buffer)
    fullText += data.text + "\n"
  }

  await worker.terminate()
  return fullText
}

// Tesseract → Claude Vision fallback
export async function ocrImage(buffer: Uint8Array): Promise<{ text: string; confidence: number }> {
  const worker = await createWorker("eng")
  const { data } = await worker.recognize(buffer)
  await worker.terminate()

  const tesseractConfidence = data.confidence / 100

  if (tesseractConfidence >= 0.7) {
    return { text: data.text, confidence: tesseractConfidence }
  }

  // Fallback to Claude Vision for low-confidence results
  const anthropic = new Anthropic()
  const base64 = Buffer.from(buffer).toString("base64")
  const mimeType = detectMimeType(buffer)

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6-20250514",
    max_tokens: 4000,
    messages: [{
      role: "user",
      content: [
        {
          type: "text",
          text: "Extract all text from this document exactly as written. Return only the extracted text, no commentary.",
        },
        {
          type: "image",
          source: { type: "base64", media_type: mimeType, data: base64 },
        },
      ],
    }],
  })

  const textContent = response.content.find((c) => c.type === "text")
  return {
    text: textContent?.text ?? "",
    confidence: 0.95, // Claude Vision is highly reliable
  }
}
```

---

## 7. Document Classification by AI

```typescript
// packages/agents/platform/document-agent/classification.ts
import { Anthropic } from "@anthropic-ai/sdk"
import { z } from "zod"

const DocumentClassificationSchema = z.object({
  category: z.enum([
    "invoice", "receipt", "bank_statement", "contract",
    "payroll", "tax_document", "financial_report", "identification", "other",
  ]),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  metadata: z.object({
    vendorName: z.string().optional(),
    invoiceNumber: z.string().optional(),
    invoiceDate: z.string().optional(),
    totalAmount: z.number().optional(),
    currency: z.string().optional(),
    taxAmount: z.number().optional(),
    dueDate: z.string().optional(),
    poNumber: z.string().optional(),
    bankName: z.string().optional(),
    accountNumber: z.string().optional(),
    periodStart: z.string().optional(),
    periodEnd: z.string().optional(),
    employeeName: z.string().optional(),
    documentTitle: z.string().optional(),
    pageCount: z.number().optional(),
  }),
})

export async function classifyDocument(
  text: string,
  mimeType: string,
  fileBuffer?: Uint8Array,
) {
  const anthropic = new Anthropic()

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20250414", // Use Haiku for cost-effective classification
    max_tokens: 1000,
    messages: [{
      role: "user",
      content: `Classify this document. Return a JSON object with category, confidence, reasoning, and extracted metadata.

Document text:
${text.slice(0, 8000)}`,
    }],
    tools: [{
      name: "classify_document",
      description: "Classify a document and extract metadata",
      input_schema: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: ["invoice", "receipt", "bank_statement", "contract", "payroll", "tax_document", "financial_report", "identification", "other"],
          },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          reasoning: { type: "string" },
          metadata: {
            type: "object",
            properties: {
              vendorName: { type: "string" },
              invoiceNumber: { type: "string" },
              invoiceDate: { type: "string" },
              totalAmount: { type: "number" },
              currency: { type: "string" },
              taxAmount: { type: "number" },
              dueDate: { type: "string" },
              poNumber: { type: "string" },
              bankName: { type: "string" },
              employeeName: { type: "string" },
              documentTitle: { type: "string" },
            },
          },
        },
        required: ["category", "confidence", "reasoning"],
      },
    }],
    tool_choice: { type: "tool", name: "classify_document" },
  })

  const toolCall = response.content.find((c) => c.type === "tool_use")
  if (!toolCall?.input) {
    return {
      category: "other",
      confidence: 0.3,
      reasoning: "Classification failed",
      metadata: {},
    }
  }

  return DocumentClassificationSchema.parse(toolCall.input)
}

// Route classified documents to the appropriate agent
async function routeDocumentToAgent(
  documentId: string,
  entityId: string,
  classification: z.infer<typeof DocumentClassificationSchema>,
) {
  switch (classification.category) {
    case "invoice":
      await triggerTask("process-ap-invoice", {
        documentId,
        entityId,
        metadata: classification.metadata,
      })
      break
    case "receipt":
      await triggerTask("process-expense-receipt", {
        documentId,
        entityId,
        metadata: classification.metadata,
      })
      break
    case "bank_statement":
      await triggerTask("import-bank-statement", {
        documentId,
        entityId,
        metadata: classification.metadata,
      })
      break
    case "payroll":
      await triggerTask("process-payroll-document", {
        documentId,
        entityId,
        metadata: classification.metadata,
      })
      break
    // ... others
    default:
      // Leave as processed but unassigned
      break
  }
}
```

---

## 8. Error Handling for Failed Uploads

| Failure Point | Error | User-Facing Message | Recovery |
|--------------|-------|--------------------|----------|
| **Client validation** | File too large | "File exceeds your plan's size limit" | Upgrade plan or compress file |
| **Client validation** | Bad type | "File type not supported" | Convert to PDF or image |
| **Presigned URL generation** | R2 auth failure | "Upload service unavailable. Try again." | Retry with exponential backoff |
| **Direct upload to R2** | Network error | "Upload failed. Check your connection." | Resume / retry upload |
| **Direct upload to R2** | R2 quota exceeded | "Storage quota reached." | Upgrade plan |
| **Virus scan** | Malware detected | "File quarantined. Contact support." | File deleted, user notified |
| **OCR / text extraction** | Unreadable | "Could not extract text. Try a clearer scan." | Re-upload with higher quality |
| **AI classification** | Low confidence | "Document classified as 'other'. Please categorize manually." | Manual override in UI |
| **Agent processing** | Agent failure | "Document queued for manual review." | Escalated to human |

### Error Notification to User

```typescript
// Frontend polling function
async function pollDocumentStatus(
  documentId: string,
  onUpdate: (status: string) => void,
  maxAttempts = 60,
) {
  for (let i = 0; i < maxAttempts; i++) {
    const { status, error } = await trpc.documents.getStatus.query({ documentId })
    onUpdate(status)

    if (status === "processed" || status === "failed" || status === "quarantined") {
      if (status === "failed") {
        toast.error(`Document processing failed: ${error}`)
      }
      if (status === "quarantined") {
        toast.error("File quarantined due to security concerns")
      }
      return
    }

    await sleep(2000) // Poll every 2 seconds
  }

  toast.error("Document processing timed out. Please re-upload.")
}
```

---

## 9. Virus Scanning Strategy

### Architecture

```
File uploaded to R2
    │
Trigger.dev job starts
    │
    ▼
Send file bytes to ClamAV
    ├── Option A: ClamAV via TCP (clamd)
    │   → Deploy clamd as a sidecar or separate service
    │   → Send file, receive scan result
    │   → ~500ms per file
    │
    └── Option B: ClamAV via API (cloud)
        → ClamAV REST API (self-hosted)
        → Or third-party: VirusTotal API (rate-limited, $)
        → Or third-party: FileScan.io
```

### Implementation (ClamAV via TCP)

```typescript
// packages/agents/platform/document-agent/virus-scan.ts
import { createConnection } from "net"

type ScanResult = { infected: false } | { infected: true; virusName: string }

export async function scanFile(buffer: Uint8Array): Promise<ScanResult> {
  // Skip scanning if ClamAV is not configured (dev mode)
  if (!process.env.CLAMD_HOST) {
    return { infected: false }
  }

  return new Promise((resolve, reject) => {
    const client = createConnection({
      host: process.env.CLAMD_HOST,
      port: parseInt(process.env.CLAMD_PORT ?? "3310"),
    })

    const chunks: Buffer[] = []
    let timeout: NodeJS.Timeout

    client.on("connect", () => {
      // INSTREAM scan: send zINSTREAM + file size + data
      const size = Buffer.alloc(4)
      size.writeUInt32BE(buffer.length, 0)
      client.write(Buffer.concat([Buffer.from("zINSTREAM\0"), size, Buffer.from(buffer), Buffer.from([0, 0, 0, 0])]))

      timeout = setTimeout(() => {
        client.destroy()
        reject(new Error("ClamAV scan timeout"))
      }, 30_000)
    })

    client.on("data", (data) => {
      chunks.push(data)
    })

    client.on("end", () => {
      clearTimeout(timeout)
      const result = Buffer.concat(chunks).toString()

      if (result.includes("OK")) {
        resolve({ infected: false })
      } else if (result.startsWith("stream:")) {
        const virusName = result.replace("stream:", "").trim()
        resolve({ infected: true, virusName })
      } else {
        reject(new Error(`ClamAV unexpected response: ${result}`))
      }
    })

    client.on("error", (err) => {
      clearTimeout(timeout)
      // Fail open: if ClamAV is down, allow the file through but flag it
      console.error("[VirusScan] ClamAV error:", err)
      resolve({ infected: false })
    })
  })
}
```

### Scan Result Handling

| Scan Result | Action |
|-------------|--------|
| Clean | Continue processing |
| Infected | Set document status to `quarantined`, delete from R2, notify uploader |
| Error / Timeout | Flag as `unscanned`, allow processing but mark for manual review |

---

## 10. Storage Cleanup and Retention

### R2 Lifecycle Rules

```
Bucket: xenboox-uploads

Lifecycle Policy:
  - Expire objects after retention period (based on org plan)
  - Non-current versions expire after 30 days
  - Incomplete multipart uploads expire after 1 day
```

### Scheduled Cleanup Job

```typescript
// packages/agents/jobs/cleanup-expired-documents.ts
import { task } from "@trigger.dev/sdk"
import { db } from "@xenboox/db"
import { documents } from "@xenboox/db/schema"
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { lt } from "drizzle-orm"

export const cleanupExpiredDocuments = task({
  id: "cleanup-expired-documents",
  maxDuration: 300,
  cron: "0 3 * * *", // Daily at 3 AM

  run: async () => {
    const expired = await db.query.documents.findMany({
      where: lt(documents.retentionUntil, new Date()),
      columns: { id: true, storagePath: true, thumbnailPath: true },
    })

    for (const doc of expired) {
      // Delete from R2
      await r2.send(new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: doc.storagePath,
      }))

      if (doc.thumbnailPath) {
        await r2.send(new DeleteObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME!,
          Key: doc.thumbnailPath,
        }))
      }

      // Soft delete from database
      await db.delete(documents).where(eq(documents.id, doc.id))
    }

    return { deleted: expired.length }
  },
})
```

---

## 11. R2 Bucket Structure

```
xenboox-uploads/
├── {entity-id}/                    # Scoped by entity
│   ├── invoices/                   # Invoice documents
│   │   ├── {uuid}.pdf
│   │   ├── {uuid}.jpg
│   │   └── ...
│   ├── receipts/                   # Expense receipts
│   ├── bank-statements/            # Bank/GSM/Momo statements
│   ├── contracts/                  # Contracts and agreements
│   ├── payroll/                    # Payroll files
│   ├── tax/                        # Tax documents
│   └── other/                      # Uncategorized
│
├── thumbnails/                     # Generated previews (200px)
│   └── {entity-id}/
│       └── {uuid}_thumb.jpg
│
└── temp/                           # Temporary uploads (24h TTL)
    └── {uuid}.pdf
```

The category subdirectories are for human organization. The actual routing is driven by the AI classification result stored in the database, not by the upload path.

---

## 12. Code Pattern Summary

### Upload Flow (End-to-End)

```typescript
// 1. Client validates → 2. tRPC presigned URL → 3. Direct R2 upload → 4. tRPC confirm → 5. Trigger.dev processes

// Upload URL generation (tRPC mutation)
const { uploadUrl } = await trpc.documents.getUploadUrl.mutate({
  entityId, fileName: "invoice.pdf", fileSize: 1024000, mimeType: "application/pdf"
})

// Direct browser upload to R2 (fetch)
await fetch(uploadUrl, { method: "PUT", body: file })

// Confirm (tRPC mutation)
const { documentId } = await trpc.documents.confirmUpload.mutate({
  entityId, storagePath, fileName, fileSize, mimeType, checksum
})

// Poll for result (tRPC query)
const { status, category } = await trpc.documents.getStatus.query({ documentId })
```

### Document Retrieval

```typescript
// packages/db/queries/documents.ts
export async function getDocumentStream(documentId: string, entityId: string) {
  const doc = await db.query.documents.findFirst({
    where: and(
      eq(documents.id, documentId),
      eq(documents.entityId, entityId),
    ),
  })

  if (!doc) throw new TRPCError({ code: "NOT_FOUND" })

  // Generate presigned GET URL for secure access
  const presignedUrl = await getSignedUrl(
    r2,
    new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: doc.storagePath,
    }),
    { expiresIn: 3600 }, // 1 hour
  )

  return { ...doc, downloadUrl: presignedUrl }
}
```

### Preview Thumbnail Generation

```typescript
// packages/agents/platform/document-agent/thumbnail.ts
// On document process complete, generate a thumbnail for preview
import sharp from "sharp"

export async function generateThumbnail(buffer: Uint8Array): Promise<Uint8Array> {
  return sharp(buffer)
    .resize(200, 280, { fit: "inside" })
    .jpeg({ quality: 70 })
    .toBuffer()
}

// Stored at: thumbnails/{entity-id}/{doc-id}_thumb.jpg
```

---

*Last updated: July 2026*
*Reference: ARCHITECTURE.md §7 (File Upload), docs/STREAMING_CHAT_ARCHITECTURE.md §3 for chat attachments, NOTIFICATION_SYSTEM.md for upload failure notifications*
