import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { entities, documents } from "@xenboox/db/schema";
import { eq } from "drizzle-orm";
import {
  getPresignedUploadUrl,
  getPresignedDownloadUrl,
  R2_BUCKET,
} from "@/lib/r2";
import { logger } from "@/lib/logger";

// ─── Helpers ────────────────────────────────────────────────────────────────

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/csv",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
] as const;

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

function sanitizeFileName(name: string): string {
  // Strip path traversal, control chars, dotfiles
  return name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/\.{2,}/g, ".")
    .replace(/^\.+/, "")
    .slice(0, 255);
}

function generateStoragePath(entityId: string, fileName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  const ext = fileName.split(".").pop() ?? "bin";
  return `uploads/${entityId}/${timestamp}-${random}.${ext}`;
}

// ─── POST /api/upload ───────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    // Auth check
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const entityId = formData.get("entityId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!entityId) {
      return NextResponse.json({ error: "No entity ID" }, { status: 400 });
    }

    // Validate file type
    if (
      !ALLOWED_MIME_TYPES.includes(
        file.type as (typeof ALLOWED_MIME_TYPES)[number],
      )
    ) {
      return NextResponse.json(
        { error: "File type not allowed" },
        { status: 400 },
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large (max 20MB)" },
        { status: 400 },
      );
    }

    // Verify entity exists and user has access
    const entity = await db.query.entities.findFirst({
      where: eq(entities.id, entityId),
    });
    if (!entity) {
      return NextResponse.json({ error: "Entity not found" }, { status: 404 });
    }

    // Generate presigned upload URL
    const safeName = sanitizeFileName(file.name);
    const storagePath = generateStoragePath(entityId, safeName);

    const uploadUrl = await getPresignedUploadUrl(
      storagePath,
      file.type,
      file.size,
    );

    // Upload file to R2
    const arrayBuffer = await file.arrayBuffer();
    const uploadResponse = await fetch(uploadUrl, {
      method: "PUT",
      body: arrayBuffer,
      headers: {
        "Content-Type": file.type,
      },
    });

    if (!uploadResponse.ok) {
      logger.error("R2 upload failed", {
        status: uploadResponse.status,
        storagePath,
      });
      return NextResponse.json(
        { error: "Upload to storage failed" },
        { status: 500 },
      );
    }

    // Create document record
    const [doc] = await db
      .insert(documents)
      .values({
        name: safeName,
        type: "supporting",
        mimeType: file.type,
        fileSize: file.size,
        r2Key: storagePath,
        r2Bucket: R2_BUCKET,
        uploadedBy: session.user.id,
        entityId,
      })
      .returning();

    // Generate download URL for immediate use
    const downloadUrl = await getPresignedDownloadUrl(storagePath);

    return NextResponse.json({
      documentId: doc.id,
      name: safeName,
      type: file.type,
      size: file.size,
      downloadUrl,
      r2Key: storagePath,
    });
  } catch (error) {
    logger.error("Upload failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
