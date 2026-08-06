/**
 * Email Processing Job
 *
 * Processes inbound emails forwarded to Xenboox.
 * Extracts attachments, runs OCR/classification/extraction pipeline.
 */

import { task, logger } from "@trigger.dev/sdk";
import { db } from "@xenboox/db";
import { inboundEmails, documents, auditLog } from "@xenboox/db/schema";
import { eq } from "drizzle-orm";
import { triggerClient } from "./trigger-client";
import { extractText } from "./lib/ocr";
import { classifyDocument } from "./lib/classification";
import { extractStructuredData } from "./lib/extraction";

export const processInboundEmail = task({
  id: "process-inbound-email",
  maxDuration: 300,
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 5_000,
    maxTimeoutInMs: 60_000,
  },

  run: async (payload: {
    emailId: string;
    entityId: string;
    from: string;
    subject: string;
    textBody: string;
    htmlBody?: string;
    attachments: Array<{
      filename: string;
      mimeType: string;
      size: number;
      buffer: string; // base64 encoded
    }>;
  }) => {
    const { emailId, entityId, from, subject, textBody, attachments } = payload;

    logger.info("Processing inbound email", {
      emailId,
      from,
      attachmentCount: attachments.length,
    });

    // Update email status to processing
    await db
      .update(inboundEmails)
      .set({ status: "processing" })
      .where(eq(inboundEmails.id, emailId));

    try {
      const processedAttachments: string[] = [];

      for (const attachment of attachments) {
        // Skip non-document attachments
        if (!isProcessableAttachment(attachment.mimeType)) {
          logger.info("Skipping non-processable attachment", {
            emailId,
            filename: attachment.filename,
            mimeType: attachment.mimeType,
          });
          continue;
        }

        // Decode attachment
        const fileBuffer = Buffer.from(attachment.buffer, "base64");

        // Run OCR
        const ocrResult = await extractText(
          fileBuffer,
          attachment.mimeType,
          entityId,
        );

        // Classify
        const classification = await classifyDocument(
          ocrResult.text,
          attachment.mimeType,
          entityId,
        );

        // Extract structured data
        const extraction = await extractStructuredData(
          ocrResult.text,
          classification.category,
          entityId,
        );

        // Create document record - inline pipeline complete, set to 'synced'
        // (email job runs OCR/classify/extract inline, bypassing the queued pipeline)
        const [doc] = await db
          .insert(documents)
          .values({
            entityId,
            name: attachment.filename,
            type: classification.category as any,
            status: "synced",
            mimeType: attachment.mimeType,
            sizeBytes: attachment.size,
            r2Key: `email/${emailId}/${attachment.filename}`,
            r2Bucket: "xenboox-documents",
            ocrText: ocrResult.text,
            ocrConfidence: String(ocrResult.confidence),
            metadata: {
              source: "email",
              emailId,
              emailFrom: from,
              emailSubject: subject,
              processedAt: new Date().toISOString(),
              ocr: {
                method: ocrResult.method,
                confidence: ocrResult.confidence,
              },
              classification: {
                category: classification.category,
                confidence: classification.confidence,
                reasoning: classification.reasoning,
              },
              extraction: {
                type: extraction.type,
                confidence: extraction.confidence,
                fieldConfidence: extraction.fieldConfidence,
                data: extraction.data,
              },
            },
          })
          .returning();

        processedAttachments.push(doc!.id);

        // If it's a bank statement, trigger bank import
        if (classification.category === "bank_statement") {
          await triggerClient.tasks.trigger("import-bank-statement", {
            documentId: doc!.id,
            entityId,
            storagePath: "",
            mimeType: attachment.mimeType,
          });
        }

        logger.info("Processed attachment", {
          emailId,
          documentId: doc!.id,
          filename: attachment.filename,
          category: classification.category,
          confidence: classification.confidence,
        });
      }

      // Update email status
      await db
        .update(inboundEmails)
        .set({
          status: "processed",
          documentId: processedAttachments[0],
          attachmentPaths: processedAttachments,
        })
        .where(eq(inboundEmails.id, emailId));

      // Audit log
      await db.insert(auditLog).values({
        entityId,
        action: "email.process",
        entityType: "inbound_email",
        entityIdRef: emailId,
        newValues: {
          from,
          subject,
          attachmentsProcessed: processedAttachments.length,
          documentIds: processedAttachments,
        },
      });

      logger.info("Email processing completed", {
        emailId,
        documentsCreated: processedAttachments.length,
      });

      return {
        success: true,
        documentsCreated: processedAttachments.length,
        documentIds: processedAttachments,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";

      await db
        .update(inboundEmails)
        .set({
          status: "failed",
          processingError: errorMessage,
        })
        .where(eq(inboundEmails.id, emailId));

      logger.error("Email processing failed", { emailId, error: errorMessage });
      throw error;
    }
  },
});

// ─── Helpers ───────────────────────────────────────────────────────────────

function isProcessableAttachment(mimeType: string): boolean {
  const processableTypes = [
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/tiff",
    "text/csv",
    "application/csv",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  return processableTypes.includes(mimeType);
}
