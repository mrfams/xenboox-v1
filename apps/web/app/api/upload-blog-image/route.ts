import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { logger } from "@/lib/logger";
import {
  getPresignedUploadUrl,
  getPublicUrl,
} from "@/lib/r2";

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
 * Accepts an image file, stores it in R2 under blog-images/,
 * and returns the public URL for use as a blog post cover image.
 *
 * Body: multipart/form-data with:
 *   - file: The image file (jpeg, png, webp, avif; max 5 MB)
 */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 },
      );
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `File type not supported: ${file.type}. Use JPEG, PNG, WebP, or AVIF.` },
        { status: 400 },
      );
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
      headers: {
        "Content-Type": file.type,
      },
    });

    if (!uploadResponse.ok) {
      logger.error(
        { status: uploadResponse.status, storagePath },
        "Failed to upload blog image to R2",
      );
      return NextResponse.json(
        { error: "Failed to upload image" },
        { status: 500 },
      );
    }

    const publicUrl = getPublicUrl(storagePath);

    return NextResponse.json({
      url: publicUrl,
      storagePath,
      name: file.name,
      size: file.size,
    });
  } catch (error) {
    logger.error({ err: error }, "Blog image upload failed");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
