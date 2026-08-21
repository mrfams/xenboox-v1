import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { artifactRegistry } from "@xenboox/db/schema";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

/**
 * GET /api/artifacts/[id]
 *
 * Serves the content of a generated document artifact (HTML, PDF, etc.).
 * Used by InlineDocumentViewer to render documents in chat.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const artifact = await db.query.artifactRegistry.findFirst({
      where: and(eq(artifactRegistry.id, id)),
      columns: {
        id: true,
        entityId: true,
        kind: true,
        name: true,
        mimeType: true,
        r2Key: true,
        metadata: true,
      },
    });

    if (!artifact) {
      return NextResponse.json(
        { error: "Artifact not found" },
        { status: 404 },
      );
    }

    // Return artifact info — content served from R2
    if (artifact.r2Key) {
      return NextResponse.json({
        id: artifact.id,
        name: artifact.name,
        type: artifact.kind,
        mimeType: artifact.mimeType,
        r2Key: artifact.r2Key,
        metadata: artifact.metadata,
      });
    }

    return NextResponse.json(
      { error: "No content available" },
      { status: 404 },
    );
  } catch (error) {
    logger.error({ err: error, artifactId: id }, "Failed to fetch artifact");
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
