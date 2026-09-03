/**
 * Email Processing Job
 *
 * Processes inbound emails forwarded to Xenboox.
 * Extracts attachments, runs OCR/classification/extraction pipeline.
 */

import { randomUUID } from "crypto";
import { task, logger } from "@trigger.dev/sdk";
import { dlqOnFailure } from "./lib/dlq";
import { db } from "@xenboox/db";
import { inboundEmails, documents, auditLog } from "@xenboox/db/schema";
import { eq } from "drizzle-orm";
import { triggerClient } from "./trigger-client";
import { extractText } from "./lib/ocr";
import { classifyDocument } from "./lib/classification";
import { extractStructuredData } from "./lib/extraction";
import { uploadToR2 } from "./lib/r2";
import {
  buildEmailStoragePath,
  shouldTriggerBankImport,
} from "./lib/email-processing-helpers";
import { runTrustGuard } from "@xenboox/ingestion/engine/trust-guard";
import type { IngestionState } from "@xenboox/ingestion/core/types";

export const processInboundEmail = task({
  id: "process-inbound-email",
  maxDuration: 300,
  retry: {
    maxAttempts: 3,
    factor: 2,
    minTimeoutInMs: 5_000,
    maxTimeoutInMs: 60_000,
  },

  onFailure: dlqOnFailure<{
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
      buffer: string;
    }>;
  }>({
    task: "process-inbound-email",
    type: "data_validation",
    severity: "high",
    title: (p) => `Inbound email processing failed: ${p.emailId}`,
    entityIdFrom: (p) => p.entityId,
  }),

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

        // Store the attachment in R2 FIRST so downstream jobs (bank-import,
        // ingestion, auto-link) can read the real bytes. The old code passed
        // an empty storage path to import-bank-statement, guaranteeing an R2
        // miss.
        const storagePath = buildEmailStoragePath(emailId, attachment.filename);
        await uploadToR2(storagePath, fileBuffer, attachment.mimeType);

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
        const documentId = randomUUID();

        // Run the deterministic TrustGuard safety net inline — email bypasses
        // the queued document pipeline, so without this the LLM's extracted
        // figures would reach the GL unvalidated.
        const tgState: IngestionState = {
          documentId,
          entityId,
          mimeType: attachment.mimeType,
          ocrText: ocrResult.text,
          ocrConfidence: ocrResult.confidence,
          classification: {
            category: classification.category,
            confidence: classification.confidence,
            reasoning: classification.reasoning,
            metadata: classification.metadata ?? {},
          },
          extraction: {
            type: extraction.type,
            confidence: extraction.confidence,
            fieldConfidence: extraction.fieldConfidence ?? {},
            data: extraction.data ?? {},
          },
        } as IngestionState;
        const trustGuardResult = runTrustGuard(tgState);

        await db.insert(documents).values({
          id: documentId,
          entityId,
          name: attachment.filename,
          type: classification.category,
          status: "synced",
          mimeType: attachment.mimeType,
          sizeBytes: attachment.size,
          r2Key: storagePath,
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
            trustGuard: {
              passed: trustGuardResult.passed,
              checks: trustGuardResult.checks.length,
              passedCount: trustGuardResult.passedCount,
              confidenceImpact: trustGuardResult.confidenceImpact,
              summary: trustGuardResult.summary,
              failedChecks: trustGuardResult.checks
                .filter((c) => !c.passed)
                .map((c) => ({
                  name: c.name,
                  message: c.message,
                  severity: c.severity,
                })),
              validatedAt: new Date().toISOString(),
            },
          },
        });

        processedAttachments.push(documentId);

        // Always run the autonomous accounting ingestion pipeline — without
        // this, email documents sat at "synced" forever and no journal entry
        // was ever created (C1).
        await triggerClient.tasks.trigger(
          "run-document-ingestion",
          {
            documentId,
            entityId,
          },
          {
            concurrencyKey: entityId,
            idempotencyKey: `run-document-ingestion:${documentId}`,
          },
        );

        // If it's a bank statement, trigger bank import (now with a real
        // R2 storage path — the old code passed "" and guaranteed a miss)
        if (shouldTriggerBankImport(classification.category)) {
          await triggerClient.tasks.trigger(
            "import-bank-statement",
            {
              documentId,
              entityId,
              storagePath,
              mimeType: attachment.mimeType,
            },
            {
              concurrencyKey: entityId,
              idempotencyKey: `import-bank-statement:${documentId}`,
            },
          );
        }

        logger.info("Processed attachment", {
          emailId,
          documentId,
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
