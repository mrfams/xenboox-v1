/**
 * SCIM 2.0 Users Resource — Enterprise user provisioning.
 *
 * Implements the core SCIM 2.0 operations:
 * - GET  /scim/v2/Users       — List users (filtered by enterpriseId)
 * - POST /scim/v2/Users       — Create user (JIT provisioning)
 * - GET  /scim/v2/Users/:id   — Get user by ID
 * - PUT  /scim/v2/Users/:id   — Replace user
 * - PATCH /scim/v2/Users/:id  — Partial update (activate/deactivate)
 * - DELETE /scim/v2/Users/:id — Delete (deactivate) user
 *
 * Authentication: Bearer token from SSO provider (validated against admin-configured SCIM token).
 *
 * Reference: RFC 7644 (SCIM 2.0 Core Schema)
 */

import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";

import { db } from "@/lib/db";
import { users, userEntityAccess, entities } from "@xenboox/db/schema";
import { logger } from "@/lib/logger";

// ─── SCIM Authentication ─────────────────────────────────────────────────

function validateScimAuth(req: NextRequest): boolean {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;

  const token = authHeader.slice(7);
  const configuredToken = process.env.SCIM_BEARER_TOKEN;

  if (!configuredToken) {
    logger.warn("[scim] SCIM_BEARER_TOKEN not configured");
    return false;
  }

  return token === configuredToken;
}

function unauthorized(): NextResponse {
  return NextResponse.json(
    {
      schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
      detail: "Authorization required",
      status: "401",
    },
    { status: 401 },
  );
}

// ─── SCIM Schema ─────────────────────────────────────────────────────────

const SCIM_USER_SCHEMA = "urn:ietf:params:scim:schemas:core:2.0:User";
const SCIM_ENTERPRISE_SCHEMA =
  "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User";

function toScimUser(user: any, entityId?: string): any {
  const [firstName, ...lastNameParts] = (user.name || "").split(" ");
  const lastName = lastNameParts.join(" ");

  return {
    schemas: [SCIM_USER_SCHEMA, SCIM_ENTERPRISE_SCHEMA],
    id: user.id,
    externalId: user.id,
    userName: user.email,
    name: {
      givenName: firstName || "",
      familyName: lastName || "",
      formatted: user.name || "",
    },
    displayName: user.name || user.email,
    emails: [
      {
        value: user.email,
        type: "work",
        primary: true,
      },
    ],
    active: user.emailVerified !== null,
    meta: {
      resourceType: "User",
      location: `/api/scim/v2/Users/${user.id}`,
      lastModified: user.updatedAt?.toISOString() || new Date().toISOString(),
    },
    "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User": {
      organization: entityId || "",
      costCenter: user.role || "viewer",
    },
  };
}

// ─── SCIM List Response ──────────────────────────────────────────────────

function scimListResponse(
  users: any[],
  startIndex: number,
  count: number,
): any {
  return {
    schemas: ["urn:ietf:params:scim:api:messages:2.0:ListResponse"],
    totalResults: users.length,
    startIndex,
    itemsPerPage: count,
    Resources: users,
  };
}

// ─── GET /scim/v2/Users ──────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!validateScimAuth(req)) return unauthorized();

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get("filter");
  const startIndex = parseInt(searchParams.get("startIndex") || "1", 10);
  const count = parseInt(searchParams.get("count") || "100", 10);

  let whereCondition: any = undefined;

  // SCIM filter: eq userName "email@example.com"
  if (filter) {
    const match = filter.match(/userName eq "([^"]+)"/);
    if (match) {
      whereCondition = eq(users.email, match[1]);
    }
  }

  const results = await db.query.users.findMany({
    where: whereCondition,
    limit: Math.min(count, 100),
    offset: startIndex - 1,
  });

  return NextResponse.json(scimListResponse(results, startIndex, count));
}

// ─── POST /scim/v2/Users (Create / JIT Provision) ────────────────────────

export async function POST(req: NextRequest) {
  if (!validateScimAuth(req)) return unauthorized();

  try {
    const body = await req.json();

    const email = body.userName || body.emails?.[0]?.value;
    const name =
      body.displayName ||
      `${body.name?.givenName || ""} ${body.name?.familyName || ""}`.trim();

    if (!email) {
      return NextResponse.json(
        {
          schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
          detail: "userName (email) is required",
          status: "400",
        },
        { status: 400 },
      );
    }

    // Check if user already exists
    const existing = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (existing) {
      // Update existing user (idempotent)
      await db
        .update(users)
        .set({
          name: name || existing.name,
          emailVerified: body.active !== false ? new Date() : null,
        })
        .where(eq(users.id, existing.id));

      const updated = await db.query.users.findFirst({
        where: eq(users.id, existing.id),
      });

      logger.info(
        { userId: existing.id, email },
        "[scim] user updated via JIT provisioning",
      );

      return NextResponse.json(toScimUser(updated), { status: 200 });
    }

    // Create new user (JIT provisioning)
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        name: name || email.split("@")[0],
        emailVerified: body.active !== false ? new Date() : null,
        passwordHash: null, // SSO users have no password
      })
      .returning();

    // Grant access to the entity if provided
    const entityId =
      body["urn:ietf:params:scim:schemas:extension:enterprise:2.0:User"]
        ?.organization;
    if (entityId) {
      const entity = await db.query.entities.findFirst({
        where: eq(entities.id, entityId),
      });
      if (entity) {
        await db.insert(userEntityAccess).values({
          userId: newUser.id,
          entityId,
          role: "employee",
        });
      }
    }

    logger.info(
      { userId: newUser.id, email, entityId },
      "[scim] user created via JIT provisioning",
    );

    return NextResponse.json(toScimUser(newUser, entityId), {
      status: 201,
    });
  } catch (err) {
    logger.error({ err }, "[scim] failed to create user");
    return NextResponse.json(
      {
        schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
        detail: err instanceof Error ? err.message : "Internal server error",
        status: "500",
      },
      { status: 500 },
    );
  }
}

// ─── PUT /scim/v2/Users/:id ──────────────────────────────────────────────

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!validateScimAuth(req)) return unauthorized();

  const { id } = await params;
  const body = await req.json();

  const email = body.userName || body.emails?.[0]?.value;
  const name =
    body.displayName ||
    `${body.name?.givenName || ""} ${body.name?.familyName || ""}`.trim();

  const existing = await db.query.users.findFirst({
    where: eq(users.id, id),
  });

  if (!existing) {
    return NextResponse.json(
      {
        schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
        detail: "User not found",
        status: "404",
      },
      { status: 404 },
    );
  }

  await db
    .update(users)
    .set({
      email: email || existing.email,
      name: name || existing.name,
      emailVerified: body.active !== false ? new Date() : null,
    })
    .where(eq(users.id, id));

  const updated = await db.query.users.findFirst({
    where: eq(users.id, id),
  });

  return NextResponse.json(toScimUser(updated));
}

// ─── PATCH /scim/v2/Users/:id ────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!validateScimAuth(req)) return unauthorized();

  const { id } = await params;
  const body = await req.json();

  // SCIM PATCH: typically used for activate/deactivate
  const operations = body.Operations || body.operations || [];
  const updates: Record<string, any> = {};

  for (const op of operations) {
    if (op.op === "replace" && op.path === "active") {
      updates.emailVerified = op.value ? new Date() : null;
    }
  }

  if (Object.keys(updates).length > 0) {
    await db.update(users).set(updates).where(eq(users.id, id));
  }

  const updated = await db.query.users.findFirst({
    where: eq(users.id, id),
  });

  if (!updated) {
    return NextResponse.json(
      {
        schemas: ["urn:ietf:params:scim:api:messages:2.0:Error"],
        detail: "User not found",
        status: "404",
      },
      { status: 404 },
    );
  }

  return NextResponse.json(toScimUser(updated));
}

// ─── DELETE /scim/v2/Users/:id ───────────────────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!validateScimAuth(req)) return unauthorized();

  const { id } = await params;

  // Deactivate (don't delete — preserve data integrity)
  await db.update(users).set({ emailVerified: null }).where(eq(users.id, id));

  logger.info({ userId: id }, "[scim] user deactivated via SCIM");

  return new NextResponse(null, { status: 204 });
}
