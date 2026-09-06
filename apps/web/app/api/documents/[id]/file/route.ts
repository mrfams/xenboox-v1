import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { GetObjectCommand } from "@aws-sdk/client-s3";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { documents } from "@xenboox/db/schema/documents";
import { resolveEntityAccess } from "@/lib/auth/entity-access";
import { getR2Client, R2_BUCKET } from "@/lib/r2";

export const runtime = "nodejs";

/**
 * GET /api/documents/[id]/file
 *
 * Streams the uploaded document file from R2 for in-review viewing.
 *
 * Auth model (Batch 3 / N32):
 *  - authenticated session required;
 *  - the caller must have access to the document's entity (org-level or
 *    entity-level) — cross-entity probes are indistinguishable from
 *    nonexistent documents;
 *  - served with `Content-Disposition: inline` so reviewers SEE the file
 *    (PDF/image) before accepting or rejecting an escalated extraction.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const doc = await db.query.documents.findFirst({
    where: eq(documents.id, id),
    columns: {
      id: true,
      entityId: true,
      name: true,
      mimeType: true,
      r2Key: true,
      r2Bucket: true,
    },
  });

  if (!doc) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const access = await resolveEntityAccess(session.user.id, doc.entityId);
  if (!access) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!doc.r2Key) {
    return NextResponse.json(
      { error: "This document has no stored file" },
      { status: 404 },
    );
  }

  const client = getR2Client();
  if (!client) {
    return NextResponse.json(
      { error: "File storage is not configured" },
      { status: 503 },
    );
  }

  try {
    const obj = await client.send(
      new GetObjectCommand({
        Bucket: doc.r2Bucket || R2_BUCKET,
        Key: doc.r2Key,
      }),
    );

    const bytes = await obj.Body?.transformToByteArray();
    if (!bytes) {
      return NextResponse.json({ error: "File is empty" }, { status: 404 });
    }

    return new Response(Buffer.from(bytes), {
      headers: {
        "Content-Type": doc.mimeType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${doc.name.replace(/"/g, "")}"`,
        "Cache-Control": "private, max-age=300",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    // Missing object in R2 surfaces here — never leak driver internals.
    return NextResponse.json(
      { error: "File could not be loaded" },
      { status: 404 },
    );
  }
}
