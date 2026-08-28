import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { getPresignedUploadUrl, getPublicUrl } from "@/lib/r2";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
]);

/**
 * POST /api/upload-blog-image
 *
 * Accepts one or more image files, stores them in R2,
 * and returns their public URLs.
 *
 * Body: multipart/form-data with:
 *   - file: A single image file (for backward compat)
 *   - files: Multiple image files (for batch upload)
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();

    // Collect all files — support both "file" (single) and "files" (batch)
    const files: File[] = [];
    const single = formData.get("file") as File | null;
    if (single) files.push(single);

    for (let i = 0; ; i++) {
      const batch = formData.get(`files`) as File | null;
      // FormData.get returns the last value for a key, so we iterate entries
      break; // handled below via entries
    }

    // Iterate all entries to find every File under "file" or "files"
    if (files.length === 0) {
      for (const [key, value] of formData.entries()) {
        if ((key === "file" || key === "files") && value instanceof File) {
          files.push(value);
        }
      }
    }

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const results: { url: string; name: string }[] = [];
    const errors: { name: string; error: string }[] = [];

    for (const file of files) {
      // Validate type
      if (!ALLOWED_TYPES.has(file.type)) {
        errors.push({
          name: file.name,
          error: `Unsupported type: ${file.type}`,
        });
        continue;
      }

      // Validate size
      if (file.size > MAX_FILE_SIZE) {
        errors.push({
          name: file.name,
          error: `Too large (max 5 MB)`,
        });
        continue;
      }

      // Generate storage path
      const timestamp = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const storagePath = `blog-images/${timestamp}_${safeName}`;

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
        headers: { "Content-Type": file.type },
      });

      if (!uploadResponse.ok) {
        logger.error(
          { status: uploadResponse.status, storagePath },
          "Failed to upload blog image to R2",
        );
        errors.push({ name: file.name, error: "Upload failed" });
        continue;
      }

      results.push({ url: getPublicUrl(storagePath), name: file.name });
    }

    // Single-file backward compat: return { url }
    if (results.length === 1 && errors.length === 0) {
      return NextResponse.json({ url: results[0].url });
    }

    return NextResponse.json({ uploaded: results, errors });
  } catch (error) {
    logger.error({ err: error }, "Blog image upload failed");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
