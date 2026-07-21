import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, desc } from "drizzle-orm";
import { router, protectedProcedure, requireRole } from "@/lib/trpc/server";
import { db } from "@/lib/db";
import {
  employees,
  employeeContracts,
  payrollRuns,
  payrollLineItems,
  payrollDeductionTypes,
  payslips,
  staffLoans,
  auditLog,
} from "@xenboox/db/schema";
import { sendEmployeeCreatedEmail } from "@/lib/email";
import { getEnrichedEntityContext } from "@/lib/entity-context-enrichment";

// ─── Payroll Router ────────────────────────────────────────────────────────

export const payrollRouter = router({
  // ── Employees ──
  listEmployees: protectedProcedure.query(({ ctx }) => {
    return db.query.employees.findMany({
      where: eq(employees.entityId, ctx.entityId!),
      orderBy: [desc(employees.createdAt)],
    });
  }),

  getEmployeeById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const emp = await db.query.employees.findFirst({
        where: and(
          eq(employees.id, input.id),
          eq(employees.entityId, ctx.entityId!),
        ),
      });
      if (!emp) return null;

      const contracts = await db.query.employeeContracts.findMany({
        where: and(
          eq(employeeContracts.employeeId, emp.id),
          eq(employeeContracts.entityId, ctx.entityId!),
        ),
        orderBy: [desc(employeeContracts.effectiveDate)],
      });

      const loans = await db.query.staffLoans.findMany({
        where: and(
          eq(staffLoans.employeeId, emp.id),
          eq(staffLoans.entityId, ctx.entityId!),
        ),
      });

      return { ...emp, contracts, loans };
    }),

  createEmployee: protectedProcedure
    .input(
      z.object({
        employeeNumber: z.string().min(1),
        name: z.string().min(1),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        hireDate: z.string(),
        department: z.string().optional(),
        jobTitle: z.string().optional(),
        employmentType: z
          .enum(["full_time", "part_time", "contractor", "intern"])
          .default("full_time"),
        bankName: z.string().optional(),
        bankAccountNumber: z.string().optional(),
        taxId: z.string().optional(),
        basicSalary: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { basicSalary, ...empData } = input;
        const [emp] = await db
          .insert(employees)
          .values({ ...empData, entityId: ctx.entityId!, isActive: true })
          .returning();

        if (!emp) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create employee",
          });
        }

        await db.insert(employeeContracts).values({
          entityId: ctx.entityId!,
          employeeId: emp.id,
          effectiveDate: input.hireDate,
          basicSalary,
          currency: "GMD",
          payFrequency: "monthly",
          isActive: true,
        });

        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "payroll.createEmployee",
          entityType: "employee",
          entityIdRef: emp.id,
          newValues: {
            name: input.name,
            employeeNumber: input.employeeNumber,
            department: input.department,
            jobTitle: input.jobTitle,
            employmentType: input.employmentType,
            basicSalary,
          },
        });

        // Send email notification (non-blocking)
        if (input.email) {
          getEnrichedEntityContext(ctx.entityId!)
            .then((entityCtx) => {
              sendEmployeeCreatedEmail(input.email!, {
                employeeName: input.name,
                employeeNumber: input.employeeNumber,
                department: input.department,
                jobTitle: input.jobTitle,
                hireDate: input.hireDate,
                basicSalary,
                currency: entityCtx.currency,
                entityName: entityCtx.entityName,
              }).catch(console.error);
            })
            .catch(console.error);
        }

        return emp;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create employee",
        });
      }
    }),

  // ── Payroll Runs ──
  listPayrollRuns: protectedProcedure.query(({ ctx }) => {
    return db.query.payrollRuns.findMany({
      where: eq(payrollRuns.entityId, ctx.entityId!),
      orderBy: [desc(payrollRuns.createdAt)],
    });
  }),

  getPayrollRunById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const run = await db.query.payrollRuns.findFirst({
        where: and(
          eq(payrollRuns.id, input.id),
          eq(payrollRuns.entityId, ctx.entityId!),
        ),
      });
      if (!run) return null;

      const lineItems = await db.query.payrollLineItems.findMany({
        where: and(
          eq(payrollLineItems.payrollRunId, run.id),
          eq(payrollLineItems.entityId, ctx.entityId!),
        ),
      });

      return { ...run, lineItems };
    }),

  createPayrollRun: protectedProcedure
    .use(requireRole("owner", "admin", "payroll_officer"))
    .input(
      z.object({
        period: z.string().regex(/^\d{4}-\d{2}$/),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const [run] = await db
          .insert(payrollRuns)
          .values({
            entityId: ctx.entityId!,
            period: input.period,
            status: "draft",
            notes: input.notes,
          })
          .returning();

        if (!run) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create payroll run",
          });
        }

        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "payroll.createPayrollRun",
          entityType: "payroll_run",
          entityIdRef: run.id,
          newValues: { period: input.period, status: "draft" },
        });

        return run;
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create payroll run",
        });
      }
    }),

  // ── Deduction Types ──
  listDeductionTypes: protectedProcedure.query(({ ctx }) => {
    return db.query.payrollDeductionTypes.findMany({
      where: eq(payrollDeductionTypes.entityId, ctx.entityId!),
    });
  }),

  // ── Payslips ──
  listPayslips: protectedProcedure
    .input(z.object({ payrollRunId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return db.query.payslips.findMany({
        where: and(
          eq(payslips.payrollRunId, input.payrollRunId),
          eq(payslips.entityId, ctx.entityId!),
        ),
      });
    }),

  // ── Delete ──
  deleteEmployee: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const emp = await db.query.employees.findFirst({
          where: and(
            eq(employees.id, input.id),
            eq(employees.entityId, ctx.entityId!),
          ),
        });
        if (!emp) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Employee not found",
          });
        }

        await db.delete(employees).where(eq(employees.id, input.id));

        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "payroll.deleteEmployee",
          entityType: "employee",
          entityIdRef: emp.id,
          oldValues: {
            name: emp.name,
            employeeNumber: emp.employeeNumber,
            department: emp.department,
            jobTitle: emp.jobTitle,
            employmentType: emp.employmentType,
          },
        });

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete employee",
        });
      }
    }),

  deletePayrollRun: protectedProcedure
    .use(requireRole("owner", "admin", "payroll_officer"))
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const run = await db.query.payrollRuns.findFirst({
          where: and(
            eq(payrollRuns.id, input.id),
            eq(payrollRuns.entityId, ctx.entityId!),
          ),
        });
        if (!run) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Payroll run not found",
          });
        }
        if (run.status !== "draft") {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Cannot delete a payroll run that is not in draft status",
          });
        }

        await db.delete(payrollRuns).where(eq(payrollRuns.id, input.id));

        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "payroll.deletePayrollRun",
          entityType: "payroll_run",
          entityIdRef: run.id,
          oldValues: { period: run.period, status: run.status },
        });

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete payroll run",
        });
      }
    }),
});
