import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { donorProjects, donorReportSnapshots } from "@xenboox/db/schema/donor-grant";
import { customers } from "@xenboox/db/schema/ap-ar";

import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

const log = logger.child({ module: "donor-portal-projects" });

// ─── Donor Portal Projects API ──────────────────────────────────────────────
//
// GET /api/donor-portal/projects?donor=<donorCustomerId>&entity=<entityId>
//
// Returns all donor projects and their report snapshots for a specific donor.
// This is a public endpoint — access is controlled by the verify redirect
// which only provides valid donor/entity pairs.

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const donorId = searchParams.get("donor");
    const entityId = searchParams.get("entity");

    if (!donorId || !entityId) {
      return NextResponse.json(
        { error: "Missing donor or entity parameter" },
        { status: 400 },
      );
    }

    // Verify the donor exists and is marked as a donor
    const donor = await db.query.customers.findFirst({
      where: and(
        eq(customers.id, donorId),
        eq(customers.entityId, entityId),
        eq(customers.isDonor, true),
      ),
    });

    if (!donor) {
      return NextResponse.json(
        { error: "Donor not found" },
        { status: 404 },
      );
    }

    // Get all projects for this donor
    const projects = await db.query.donorProjects.findMany({
      where: and(
        eq(donorProjects.entityId, entityId),
        eq(donorProjects.donorCustomerId, donorId),
      ),
      with: {
        reportSnapshots: {
          orderBy: [donorReportSnapshots.period],
          limit: 12,
        },
      },
      orderBy: [donorProjects.createdAt],
    });

    log.info({
      donorId,
      entityId,
      projectCount: projects.length,
    }, "Donor projects returned");

    return NextResponse.json({ projects });
  } catch (error) {
    log.error({ error }, "Failed to fetch donor projects");
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 },
    );
  }
}
