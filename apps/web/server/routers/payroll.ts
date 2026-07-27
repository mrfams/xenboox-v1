import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, desc } from "drizzle-orm";
import {
  handleMutationError,
  router,
  protectedProcedure,
  requirePermission,
} from "@/lib/trpc/server";
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
import { runPayrollPipeline, getPayrollStatus } from "@xenboox/agents";
import type { ExceptionIntakeItem } from "@xenboox/agents";

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
    .use(requirePermission("payroll", "create"))
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
        handleMutationError(error, "Failed to create employee");
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
    .use(requirePermission("payroll", "create"))
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
        handleMutationError(error, "Failed to create payroll run");
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

  // ── Update ──
  updateEmployee: protectedProcedure
    .use(requirePermission("payroll", "edit"))
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        department: z.string().optional(),
        jobTitle: z.string().optional(),
        employmentType: z
          .enum(["full_time", "part_time", "contractor", "intern"])
          .optional(),
        bankName: z.string().optional(),
        bankAccountNumber: z.string().optional(),
        taxId: z.string().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, ...data } = input;
        const [updated] = await db
          .update(employees)
          .set(data)
          .where(
            and(eq(employees.id, id), eq(employees.entityId, ctx.entityId!)),
          )
          .returning();

        if (updated) {
          await db.insert(auditLog).values({
            entityId: ctx.entityId!,
            userId: ctx.session!.user!.id!,
            action: "payroll.updateEmployee",
            entityType: "employee",
            entityIdRef: updated.id,
            newValues: data,
          });
        }
        return updated;
      } catch (error) {
        handleMutationError(error, "Failed to update employee");
      }
    }),

  updatePayrollRun: protectedProcedure
    .use(requirePermission("payroll", "edit"))
    .input(
      z.object({
        id: z.string().uuid(),
        status: z
          .enum(["draft", "validated", "approved", "paid", "closed"])
          .optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, ...data } = input;
        const [updated] = await db
          .update(payrollRuns)
          .set(data)
          .where(
            and(
              eq(payrollRuns.id, id),
              eq(payrollRuns.entityId, ctx.entityId!),
            ),
          )
          .returning();

        if (updated) {
          await db.insert(auditLog).values({
            entityId: ctx.entityId!,
            userId: ctx.session!.user!.id!,
            action: "payroll.updatePayrollRun",
            entityType: "payroll_run",
            entityIdRef: updated.id,
            newValues: data,
          });
        }
        return updated;
      } catch (error) {
        handleMutationError(error, "Failed to update payroll run");
      }
    }),

  // ── Payslips ──
  getPayslipById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return db.query.payslips.findFirst({
        where: and(
          eq(payslips.id, input.id),
          eq(payslips.entityId, ctx.entityId!),
        ),
      });
    }),

  // ── Staff Loans ──
  listStaffLoans: protectedProcedure
    .input(z.object({ employeeId: z.string().uuid().optional() }))
    .query(async ({ ctx, input }) => {
      const conditions = [eq(staffLoans.entityId, ctx.entityId!)];
      if (input.employeeId) {
        conditions.push(eq(staffLoans.employeeId, input.employeeId));
      }
      return db.query.staffLoans.findMany({
        where: and(...conditions),
      });
    }),

  // ── Deduction Types ──
  createDeductionType: protectedProcedure
    .use(requirePermission("payroll", "create"))
    .input(
      z.object({
        name: z.string().min(1),
        code: z.string().min(1),
        type: z.enum(["tax", "social_security", "benefit", "loan", "other"]),
        description: z.string().optional(),
        isMandatory: z.boolean().default(false),
        isPercentage: z.boolean().default(false),
        defaultAmount: z.string().default("0"),
        glAccountId: z.string().uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const [deduction] = await db
          .insert(payrollDeductionTypes)
          .values({ ...input, entityId: ctx.entityId! })
          .returning();

        if (deduction) {
          await db.insert(auditLog).values({
            entityId: ctx.entityId!,
            userId: ctx.session!.user!.id!,
            action: "payroll.createDeductionType",
            entityType: "payroll_deduction_type",
            entityIdRef: deduction.id,
            newValues: { name: input.name, isMandatory: input.isMandatory },
          });
        }
        return deduction;
      } catch (error) {
        handleMutationError(error, "Failed to create deduction type");
      }
    }),

  updateDeductionType: protectedProcedure
    .use(requirePermission("payroll", "edit"))
    .input(
      z.object({
        id: z.string().uuid(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        isMandatory: z.boolean().optional(),
        isPercentage: z.boolean().optional(),
        defaultAmount: z.string().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { id, ...data } = input;
        const [updated] = await db
          .update(payrollDeductionTypes)
          .set(data)
          .where(
            and(
              eq(payrollDeductionTypes.id, id),
              eq(payrollDeductionTypes.entityId, ctx.entityId!),
            ),
          )
          .returning();

        if (updated) {
          await db.insert(auditLog).values({
            entityId: ctx.entityId!,
            userId: ctx.session!.user!.id!,
            action: "payroll.updateDeductionType",
            entityType: "payroll_deduction_type",
            entityIdRef: updated.id,
            newValues: data,
          });
        }
        return updated;
      } catch (error) {
        handleMutationError(error, "Failed to update deduction type");
      }
    }),

  deleteDeductionType: protectedProcedure
    .use(requirePermission("payroll", "delete"))
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const existing = await db.query.payrollDeductionTypes.findFirst({
          where: and(
            eq(payrollDeductionTypes.id, input.id),
            eq(payrollDeductionTypes.entityId, ctx.entityId!),
          ),
        });
        if (!existing)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Deduction type not found",
          });

        await db
          .delete(payrollDeductionTypes)
          .where(eq(payrollDeductionTypes.id, input.id));

        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "payroll.deleteDeductionType",
          entityType: "payroll_deduction_type",
          entityIdRef: input.id,
          oldValues: { name: existing.name },
        });
        return { success: true };
      } catch (error) {
        handleMutationError(error, "Failed to delete deduction type");
      }
    }),

  // ── Delete ──
  deleteEmployee: protectedProcedure
    .use(requirePermission("payroll", "delete"))
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
        handleMutationError(error, "Failed to delete employee");
      }
    }),

  deletePayrollRun: protectedProcedure
    .use(requirePermission("payroll", "delete"))
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
        handleMutationError(error, "Failed to delete payroll run");
      }
    }),

  // ── Payroll Pipeline ──

  /**
   * Run the full autonomous payroll pipeline for a given period.
   * Role-gated: only owner, admin, finance_director, and payroll_officer can trigger.
   * Salary data is enforcement at the query layer via entity scoping.
   * Payroll Worker Agent never posts to the ledger directly.
   */
  runPayrollPipeline: protectedProcedure
    .use(requirePermission("payroll", "approve"))
    .input(
      z.object({
        period: z.string().regex(/^\d{4}-\d{2}$/),
        triggerSource: z
          .enum(["manual", "scheduled", "agent"])
          .default("manual"),
        skipValidation: z.boolean().default(false),
        exceptions: z
          .array(
            z.object({
              type: z.enum([
                "new_starter",
                "leaver",
                "salary_change",
                "bonus",
                "allowance_change",
              ]),
              employeeId: z.string().uuid().optional(),
              employeeNumber: z.string().optional(),
              effectiveDate: z.string(),
              details: z.record(z.unknown()),
              applied: z.boolean().default(false),
              appliedAt: z.string().optional(),
            }),
          )
          .optional()
          .default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const entityCtx = await getEnrichedEntityContext(ctx.entityId!);
        const result = await runPayrollPipeline({
          entityId: ctx.entityId!,
          entityName: entityCtx.entityName,
          currency: entityCtx.currency,
          period: input.period,
          userId: ctx.session!.user!.id!,
          triggerSource: input.triggerSource,
          skipValidation: input.skipValidation,
          exceptions: input.exceptions as ExceptionIntakeItem[],
        });

        // Audit log
        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "payroll.runPipeline",
          entityType: "payroll_run",
          entityIdRef: result.payrollRunId ?? "",
          newValues: {
            period: input.period,
            status: result.status,
            employeeCount: result.employeeCount,
            totalGrossPay: result.totalGrossPay,
            totalNetPay: result.totalNetPay,
            escalated: result.escalated,
            confidence: result.overallConfidence,
          },
        });

        return result;
      } catch (error) {
        handleMutationError(error, "Failed to run payroll pipeline");
      }
    }),

  /**
   * Get payroll pipeline status — summary of recent runs and compliance deadlines.
   * Read-only, accessible to any authenticated entity member.
   */
  getPayrollPipelineStatus: protectedProcedure
    .input(
      z
        .object({
          period: z
            .string()
            .regex(/^\d{4}-\d{2}$/)
            .optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return getPayrollStatus(ctx.entityId!, input?.period);
    }),
});
