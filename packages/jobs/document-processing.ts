import { task, logger } from "@trigger.dev/sdk"
import { db } from "@xenboox/db"
import { documents } from "@xenboox/db/schema"
import { eq } from "drizzle-orm"

export const processDocument = task({
  id: "process-document",
  maxDuration: 300,
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 5_000,
    maxTimeoutInMs: 60_000,
  },
  queue: {
    concurrencyLimit: 10,
  },

  run: async (payload: {
    documentId: string
    entityId: string
    storagePath: string
    mimeType: string
  }) => {
    const { documentId, entityId, storagePath, mimeType } = payload

    logger.info("Processing document", { documentId, mimeType })

    // 1. Update status to processing
    await db
      .update(documents)
      .set({ status: "processing" })
      .where(eq(documents.id, documentId))

    try {
      // 2. Extract content based on mime type
      const extractedContent = await extractContent(storagePath, mimeType)

      // 3. Update document with extracted data
      await db
        .update(documents)
        .set({
          status: "processed",
          metadata: {
            ...extractedContent,
            processedAt: new Date().toISOString(),
          },
        })
        .where(eq(documents.id, documentId))

      logger.info("Document processed successfully", { documentId })

      return {
        success: true,
        documentId,
        extractedContent,
      }
    } catch (error) {
      // 4. Mark as error on failure
      await db
        .update(documents)
        .set({
          status: "failed",
          metadata: {
            error: error instanceof Error ? error.message : "Unknown error",
            failedAt: new Date().toISOString(),
          },
        })
        .where(eq(documents.id, documentId))

      throw error
    }
  },
})

async function extractContent(
  storagePath: string,
  mimeType: string
): Promise<Record<string, unknown>> {
  logger.info("Extracting content", { storagePath, mimeType })

  // Placeholder for actual R2 download + extraction logic
  // In production: download from R2, use appropriate parser
  switch (mimeType) {
    case "application/pdf":
      return { type: "pdf", pages: 0, text: "" }
    case "image/png":
    case "image/jpeg":
      return { type: "image", width: 0, height: 0 }
    case "text/csv":
      return { type: "csv", rows: 0, columns: [] }
    case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      return { type: "xlsx", sheets: 0 }
    default:
      return { type: "unknown" }
  }
}
