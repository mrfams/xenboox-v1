import crypto from "crypto";

import { eq, and, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { pendingInvites } from "@xenboox/db/schema/invitations";
import { orgRoles } from "@xenboox/db/schema/org-roles";
import {
  userEntityAccess,
  entities,
  organizations,
} from "@xenboox/db/schema/organization";
import { users } from "@xenboox/db/schema/auth";
import { auditLog } from "@xenboox/db/schema/documents";

import {
  router,
  protectedProcedure,
  mutateProcedure,
  publicProcedure,
  handleMutationError,
} from "@/lib/trpc/server";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { sendInvitationEmail } from "@/lib/email";

const INVITE_EXPIRY_DAYS = 7;

export const invitationsRouter = router({
  // ─── ISSUE INVITE ──────────────────────────────

  issue: protectedProcedure
    .input(
      z.object({
        email: z.string().email(),
        entityId: z.string().uuid().optional(),
        orgId: z.string().uuid().optional(),
        role: z.string().min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Exactly one of entityId/orgId must be set
        if (!input.entityId && !input.orgId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Either entityId or orgId is required",
          });
        }
        if (input.entityId && input.orgId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Provide either entityId or orgId, not both",
          });
        }

        // Check inviter has permission to invite
        if (input.entityId) {
          const access = await db.query.userEntityAccess.findFirst({
            where: and(
              eq(userEntityAccess.userId, ctx.session!.user!.id!),
              eq(userEntityAccess.entityId, input.entityId),
            ),
          });
          if (
            !access ||
            !["owner", "admin", "finance_director"].includes(access.role)
          ) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message:
                "You don't have permission to invite users to this entity",
            });
          }
        } else if (input.orgId) {
          const role = await db.query.orgRoles.findFirst({
            where: and(
              eq(orgRoles.userId, ctx.session!.user!.id!),
              eq(orgRoles.orgId, input.orgId),
            ),
          });
          if (!role || role.role !== "owner") {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Only org owners can issue org-level invites",
            });
          }
        }

        // Check for existing pending invite
        const existing = await db.query.pendingInvites.findFirst({
          where: and(
            eq(pendingInvites.email, input.email.toLowerCase()),
            eq(pendingInvites.status, "pending"),
            input.entityId
              ? eq(pendingInvites.entityId!, input.entityId)
              : eq(pendingInvites.orgId!, input.orgId!),
          ),
        });
        if (existing) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A pending invite already exists for this email",
          });
        }

        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(
          Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
        );

        const [invite] = await db
          .insert(pendingInvites)
          .values({
            email: input.email.toLowerCase(),
            entityId: input.entityId ?? null,
            orgId: input.orgId ?? null,
            role: input.role,
            token,
            invitedBy: ctx.session!.user!.id!,
            expiresAt,
          })
          .returning();

        // Audit trail: invite issued
        try {
          await db.insert(auditLog).values({
            entityId: invite.entityId ?? ctx.entityId!,
            userId: ctx.session!.user!.id!,
            action: "invitations.issue",
            entityType: "pending_invites",
            entityIdRef: invite.id,
            newValues: {
              email: input.email.toLowerCase(),
              role: input.role,
              entityId: input.entityId ?? null,
              orgId: input.orgId ?? null,
              expiresAt: invite.expiresAt.toISOString(),
            },
          });
        } catch {
          // Non-blocking
          logger.error(
            { inviteId: invite.id },
            "Failed to log invite issuance",
          );
        }

        // Send invitation email (fire-and-forget)
        const inviteUrl = `${process.env.NEXTAUTH_URL || "https://xenboox.vercel.app"}/invite/${token}`;
        const expiresAtFormatted = expiresAt.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        // Get inviter name and entity name for the email
        const inviter = await db.query.users.findFirst({
          where: eq(users.id, ctx.session!.user!.id!),
        });
        const entity = input.entityId
          ? await db.query.entities.findFirst({
              where: eq(entities.id, input.entityId),
            })
          : null;

        sendInvitationEmail(input.email, {
          inviterName: inviter?.name || inviter?.email || "Team member",
          inviterEmail: inviter?.email || "",
          entityName: entity?.name || "your organization",
          role: input.role.replace(/_/g, " "),
          inviteUrl,
          expiresAt: expiresAtFormatted,
        }).catch((err) => {
          logger.error({ err, inviteId: invite.id }, "Failed to send invitation email");
        });

        return { ...invite, token };
      } catch (error) {
        handleMutationError(error, "Failed to issue invitation");
      }
    }),

  // ─── ACCEPT INVITE (via token) ─────────────────

  accept: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      try {
        const invite = await db.query.pendingInvites.findFirst({
          where: eq(pendingInvites.token, input.token),
        });

        if (!invite) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Invitation not found or already used",
          });
        }

        if (invite.status === "accepted") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "This invitation has already been accepted",
          });
        }

        if (invite.status === "revoked") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "This invitation has been revoked",
          });
        }

        if (invite.status === "expired" || invite.expiresAt < new Date()) {
          // Auto-expire if past due
          if (invite.status !== "expired") {
            await db
              .update(pendingInvites)
              .set({ status: "expired" })
              .where(eq(pendingInvites.id, invite.id));
          }
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "This invitation has expired. Ask the sender to resend.",
          });
        }

        const userId = ctx.session?.user?.id;
        if (!userId) {
          // User must be logged in to accept — but we can return invite info
          // so the signup form can pre-fill the email
          return {
            requiresAuth: true,
            email: invite.email,
            token: input.token,
            message: "Please sign up or sign in to accept this invitation",
          };
        }

        // Verify the logged-in user's email matches the invite
        const currentUser = await db.query.users.findFirst({
          where: eq(users.id, userId),
        });
        if (
          !currentUser ||
          currentUser.email.toLowerCase() !== invite.email.toLowerCase()
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "This invitation was sent to a different email address",
          });
        }

        // Grant access based on invite type
        if (invite.entityId) {
          // Entity-level invite
          await db
            .insert(userEntityAccess)
            .values({
              userId,
              entityId: invite.entityId,
              role: invite.role as any,
              grantedBy: invite.invitedBy,
            })
            .onConflictDoNothing();
        } else if (invite.orgId) {
          // Org-level invite (owner/admin)
          await db
            .insert(orgRoles)
            .values({
              userId,
              orgId: invite.orgId,
              role: invite.role as "owner" | "admin",
              grantedBy: invite.invitedBy,
            })
            .onConflictDoNothing();
        }

        // Mark invite as accepted
        await db
          .update(pendingInvites)
          .set({ status: "accepted", acceptedAt: new Date() })
          .where(eq(pendingInvites.id, invite.id));

        // Audit trail: invite accepted (guard: accept is publicProcedure — no entity context guaranteed)
        const auditEntityId = invite.entityId ?? (ctx as any).entityId;
        if (auditEntityId) {
          try {
            await db.insert(auditLog).values({
              entityId: auditEntityId,
              userId,
              action: "invitations.accept",
              entityType: "pending_invites",
              entityIdRef: invite.id,
              newValues: {
                role: invite.role,
                entityId: invite.entityId ?? null,
                orgId: invite.orgId ?? null,
              },
            });
          } catch {
            // Non-blocking
            logger.error(
              { inviteId: invite.id },
              "Failed to log invite acceptance",
            );
          }
        }

        return { success: true, entityId: invite.entityId ?? null };
      } catch (error) {
        handleMutationError(error, "Failed to accept invitation");
      }
    }),

  // ─── CHECK FOR PENDING INVITES (post-signup) ──

  checkByEmail: publicProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ ctx, input }) => {
      const invites = await db.query.pendingInvites.findMany({
        where: and(
          eq(pendingInvites.email, input.email.toLowerCase()),
          eq(pendingInvites.status, "pending"),
        ),
      });
      return invites.map((i) => ({
        id: i.id,
        role: i.role,
        entityId: i.entityId,
        orgId: i.orgId,
        token: i.token,
        expiresAt: i.expiresAt,
      }));
    }),

  // ─── LIST INVITES (for the inviter) ────────────

  listByEntity: protectedProcedure
    .input(z.object({ entityId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const access = await db.query.userEntityAccess.findFirst({
        where: and(
          eq(userEntityAccess.userId, ctx.session!.user!.id!),
          eq(userEntityAccess.entityId, input.entityId),
        ),
      });
      if (
        !access ||
        !["owner", "admin", "finance_director"].includes(access.role)
      ) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Access denied" });
      }
      return db.query.pendingInvites.findMany({
        where: eq(pendingInvites.entityId!, input.entityId),
        orderBy: (invites, { desc }) => [desc(invites.createdAt)],
      });
    }),

  // ─── REVOKE INVITE ─────────────────────────────

  revoke: protectedProcedure
    .input(z.object({ inviteId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const invite = await db.query.pendingInvites.findFirst({
          where: eq(pendingInvites.id, input.inviteId),
        });
        if (!invite) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Invite not found",
          });
        }
        if (invite.status !== "pending") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Cannot revoke a ${invite.status} invitation`,
          });
        }
        // Verify inviter has permission
        if (invite.invitedBy !== ctx.session!.user!.id!) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only the inviter can revoke this invitation",
          });
        }
        await db
          .update(pendingInvites)
          .set({ status: "revoked" })
          .where(eq(pendingInvites.id, input.inviteId));
        return { success: true };
      } catch (error) {
        handleMutationError(error, "Failed to revoke invitation");
      }
    }),

  // ─── RESEND INVITE ─────────────────────────────

  resend: protectedProcedure
    .input(z.object({ inviteId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const invite = await db.query.pendingInvites.findFirst({
          where: eq(pendingInvites.id, input.inviteId),
        });
        if (!invite) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Invite not found",
          });
        }
        if (invite.status !== "expired" && invite.status !== "pending") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Cannot resend a ${invite.status} invitation`,
          });
        }
        if (invite.invitedBy !== ctx.session!.user!.id!) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Only the inviter can resend this invitation",
          });
        }
        const token = crypto.randomBytes(32).toString("hex");
        const expiresAt = new Date(
          Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
        );
        await db
          .update(pendingInvites)
          .set({ token, expiresAt, status: "pending" })
          .where(eq(pendingInvites.id, input.inviteId));

        // Send invitation email (fire-and-forget)
        const inviteUrl = `${process.env.NEXTAUTH_URL || "https://xenboox.vercel.app"}/invite/${token}`;
        const expiresAtFormatted = expiresAt.toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        const inviter = await db.query.users.findFirst({
          where: eq(users.id, ctx.session!.user!.id!),
        });
        const entity = invite.entityId
          ? await db.query.entities.findFirst({
              where: eq(entities.id, invite.entityId),
            })
          : null;

        sendInvitationEmail(invite.email, {
          inviterName: inviter?.name || inviter?.email || "Team member",
          inviterEmail: inviter?.email || "",
          entityName: entity?.name || "your organization",
          role: invite.role.replace(/_/g, " "),
          inviteUrl,
          expiresAt: expiresAtFormatted,
        }).catch((err) => {
          logger.error({ err, inviteId: invite.id }, "Failed to resend invitation email");
        });

        return { success: true, token };
      } catch (error) {
        handleMutationError(error, "Failed to resend invitation");
      }
    }),
});
