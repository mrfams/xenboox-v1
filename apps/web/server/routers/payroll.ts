import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { eq, and, desc } from "drizzle-orm"
import { router, protectedProcedure } from "@/lib/trpc/server"
import { db } from "@/lib/db"
import {
  employees,
  employeeContracts,
  payrollRuns,
  payrollLineItems,
  payrollDeductionTypes,
  payslips,
  staffLoans,
  auditLog,
} from "@xenboox/db/schema"
import { sendEmployeeCreatedEmail } from "@/lib/email"

// ─── Payroll Router ────────────────────────────────────────────────────────

export const payrollRouter = router({
  // ── Employees ──
  listEmployees: protectedProcedure.query(({ ctx }) => {
    return db.query.employees.findMany({
      where: eq(employees.entityId, ctx.entityId!),
      orderBy: [desc(employees.createdAt)],
    })
  }),

  getEmployeeById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const emp = await db.query.employees.findFirst({
        where: eq(employees.id, input.id),
      })
      if (!emp) return null

      const contracts = await db.query.employeeContracts.findMany({
        where: eq(employeeContracts.employeeId, emp.id),
        orderBy: [desc(employeeContracts.effectiveDate)],
      })

      const loans = await db.query.staffLoans.findMany({
        where: eq(staffLoans.employeeId, emp.id),
      })

      return { ...emp, contracts, loans }
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
        employmentType: z.enum(["full_time", "part_time", "contractor", "intern"]).default("full_time"),
        bankName: z.string().optional(),
        bankAccountNumber: z.string().optional(),
        taxId: z.string().optional(),
        basicSalary: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const { basicSalary, ...empData } = input
        const [emp] = await db
          .insert(employees)
          .values({ ...empData, entityId: ctx.entityId!, isActive: true })
          .returning()

        if (!emp) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create employee" })
        }

        await db.insert(employeeContracts).values({
          entityId: ctx.entityId!,
          employeeId: emp.id,
          effectiveDate: input.hireDate,
          basicSalary,
          currency: "GMD",
          payFrequency: "monthly",
          isActive: true,
        })

        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "payroll.createEmployee",
          entityType: "employee",
          entityIdRef: emp.id,
          newValues: { name: input.name, employeeNumber: input.employeeNumber, department: input.department, jobTitle: input.jobTitle, employmentType: input.employmentType, basicSalary },
        })

        // Send email notification (non-blocking)
        if (input.email) {
          sendEmployeeCreatedEmail(input.email, {
            employeeName: input.name,
            employeeNumber: input.employeeNumber,
            department: input.department,
            jobTitle: input.jobTitle,
            hireDate: input.hireDate,
            basicSalary,
            currency: "GMD",
            entityName: "Xenboox",
          }).catch(console.error)
        }

        return emp
      } catch (error) {
        if (error instanceof TRPCError) throw error
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create employee" })
      }
    }),

  // ── Payroll Runs ──
  listPayrollRuns: protectedProcedure.query(({ ctx }) => {
    return db.query.payrollRuns.findMany({
      where: eq(payrollRuns.entityId, ctx.entityId!),
      orderBy: [desc(payrollRuns.createdAt)],
    })
  }),

  getPayrollRunById: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const run = await db.query.payrollRuns.findFirst({
        where: eq(payrollRuns.id, input.id),
      })
      if (!run) return null

      const lineItems = await db.query.payrollLineItems.findMany({
        where: eq(payrollLineItems.payrollRunId, run.id),
      })

      return { ...run, lineItems }
    }),

  createPayrollRun: protectedProcedure
    .input(
      z.object({
        period: z.string().regex(/^\d{4}-\d{2}$/),
        notes: z.string().optional(),
      })
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
          .returning()

        if (!run) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create payroll run" })
        }

        await db.insert(auditLog).values({
          entityId: ctx.entityId!,
          userId: ctx.session!.user!.id!,
          action: "payroll.createPayrollRun",
          entityType: "payroll_run",
          entityIdRef: run.id,
          newValues: { period: input.period, status: "draft" },
        })

        return run
      } catch (error) {
        if (error instanceof TRPCError) throw error
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create payroll run" })
      }
    }),

  // ── Deduction Types ──
  listDeductionTypes: protectedProcedure.query(({ ctx }) => {
    return db.query.payrollDeductionTypes.findMany({
      where: eq(payrollDeductionTypes.entityId, ctx.entityId!),
    })
  }),

  // ── Payslips ──
  listPayslips: protectedProcedure
    .input(z.object({ payrollRunId: z.string().uuid() }))
    .query(async ({ input }) => {
      return db.query.payslips.findMany({
        where: eq(payslips.payrollRunId, input.payrollRunId),
      })
    }),
})
