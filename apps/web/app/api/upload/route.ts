import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { documents } from "@xenboox/db/schema";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { getPresignedUploadUrl } from "@/lib/r2";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const ALLOWED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/csv",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/msword",
]);

/**
 * POST /api/upload
 *
 * Accepts a file upload, stores it in R2, creates a document registry
 * entry, and returns the document ID for use in chat.
 *
 * Body: multipart/form-data with:
 *   - file: The file to upload
 *   - entityId: The entity this document belongs to
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const entityId = formData.get("entityId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!entityId) {
      return NextResponse.json(
        { error: "Entity ID is required" },
        { status: 400 },
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
        },
        { status: 400 },
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `File type not supported: ${file.type}` },
        { status: 400 },
      );
    }

    // Generate storage path
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `chat-uploads/${entityId}/${timestamp}_${safeName}`;

    // Get presigned upload URL
    const uploadUrl = await getPresignedUploadUrl(
      storagePath,
      file.type,
      file.size,
    );

    // Upload to R2
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      body: file,
      headers: {
        "Content-Type": file.type,
      },
    });

    if (!uploadResponse.ok) {
      logger.error(
        { status: uploadResponse.status, storagePath },
        "Failed to upload to R2",
      );
      return NextResponse.json(
        { error: "Failed to upload file" },
        { status: 500 },
      );
    }

    // Map MIME type to document type enum (default to "supporting")
    const docType =
      file.type === "application/pdf"
        ? "supporting"
        : file.type.startsWith("image/")
          ? "receipt"
          : file.type.includes("spreadsheet") || file.type.includes("excel")
            ? "invoice"
            : file.type.includes("word") || file.type.includes("document")
              ? "contract"
              : "supporting";

    // Create document registry entry
    const [doc] = await db
      .insert(documents)
      .values({
        entityId,
        name: file.name,
        type: docType,
        mimeType: file.type,
        sizeBytes: file.size,
        r2Key: storagePath,
        r2Bucket: process.env.R2_BUCKET_NAME ?? "xenboox-documents",
        uploadedBy: session.user.id,
        metadata: {
          uploadedBy: session.user.id,
          uploadedAt: new Date().toISOString(),
          source: "chat-upload",
        },
      })
      .returning();

    return NextResponse.json({
      documentId: doc.id,
      name: file.name,
      type: doc.type,
      size: doc.sizeBytes,
    });
  } catch (error) {
    logger.error({ err: error }, "Upload failed");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
