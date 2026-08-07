import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, desc, sql, count, sum, gte, lte } from "drizzle-orm";
import {
  handleMutationError,
  router,
  rlsProtectedProcedure,
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
  // ── Payroll Overview ──
  getOverview: rlsProtectedProcedure
    .input(
      z.object({
        period: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;

      // Default to current month
      const now = new Date();
      const period =
        input.period ||
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const startDate = `${period}-01`;
      const endDate = `${period}-${new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}`;

      // Previous month for comparison
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const prevPeriod = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, "0")}`;

      // Get current month payroll run
      const currentRun = await db.query.payrollRuns.findFirst({
        where: and(
          eq(payrollRuns.entityId, entityId),
          eq(payrollRuns.period, period),
        ),
      });

      // Get previous month payroll run for comparison
      const prevRun = await db.query.payrollRuns.findFirst({
        where: and(
          eq(payrollRuns.entityId, entityId),
          eq(payrollRuns.period, prevPeriod),
        ),
      });

      // Get active employees count
      const activeEmployeesResult = await db
        .select({ count: count() })
        .from(employees)
        .where(
          and(eq(employees.entityId, entityId), eq(employees.isActive, true)),
        );
      const activeEmployees = activeEmployeesResult[0]?.count ?? 0;

      // Calculate totals from current run or defaults
      const totalPayroll = parseFloat(currentRun?.grossPay ?? "0");
      const netPay = parseFloat(currentRun?.netPay ?? "0");
      const totalDeductions = parseFloat(currentRun?.totalDeductions ?? "0");
      const employerContributions = parseFloat(
        currentRun?.totalEmployerContributions ?? "0",
      );

      // Previous month totals
      const prevTotalPayroll = parseFloat(prevRun?.grossPay ?? "0");
      const prevNetPay = parseFloat(prevRun?.netPay ?? "0");

      // Calculate changes
      const payrollChange =
        prevTotalPayroll > 0
          ? ((totalPayroll - prevTotalPayroll) / prevTotalPayroll) * 100
          : 0;

      // Calculate percentages
      const netPayPercent =
        totalPayroll > 0 ? Math.round((netPay / totalPayroll) * 1000) / 10 : 0;
      const deductionsPercent =
        totalPayroll > 0
          ? Math.round((totalDeductions / totalPayroll) * 1000) / 10
          : 0;
      const employerContribPercent =
        totalPayroll > 0
          ? Math.round((employerContributions / totalPayroll) * 1000) / 10
          : 0;

      return {
        totalPayroll,
        totalPayrollChange: Number(payrollChange.toFixed(1)),
        netPay,
        netPayPercent,
        totalDeductions,
        deductionsPercent,
        employerContributions,
        employerContribPercent,
        activeEmployees,
        period,
        hasRun: !!currentRun,
        runStatus: currentRun?.status ?? null,
      };
    }),

  // ── Employees ──
  listEmployees: rlsProtectedProcedure.query(({ ctx }) => {
    return db.query.employees.findMany({
      where: eq(employees.entityId, ctx.entityId!),
      orderBy: [desc(employees.createdAt)],
    });
  }),

  getEmployeeById: rlsProtectedProcedure
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

  createEmployee: rlsProtectedProcedure
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

  // ── Employee List with Payroll Data ──
  listEmployeesWithPayroll: rlsProtectedProcedure
    .input(
      z.object({
        period: z.string().optional(),
        search: z.string().optional(),
        department: z.string().optional(),
        limit: z.number().min(1).max(100).default(10),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;

      const now = new Date();
      const period =
        input.period ||
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      // Build conditions
      const conditions = [
        eq(employees.entityId, entityId),
        eq(employees.isActive, true),
      ];

      if (input.search) {
        conditions.push(sql`${employees.name} ILIKE ${`%${input.search}%`}`);
      }

      if (input.department) {
        conditions.push(eq(employees.department, input.department));
      }

      // Get total count
      const totalCountResult = await db
        .select({ count: count() })
        .from(employees)
        .where(and(...conditions));
      const totalCount = totalCountResult[0]?.count ?? 0;

      // Get employees with their contracts
      const employeeList = await db
        .select({
          id: employees.id,
          name: employees.name,
          employeeNumber: employees.employeeNumber,
          department: employees.department,
          jobTitle: employees.jobTitle,
          employmentType: employees.employmentType,
        })
        .from(employees)
        .where(and(...conditions))
        .orderBy(employees.name)
        .limit(input.limit)
        .offset(input.offset);

      // Get contracts for these employees
      const employeeIds = employeeList.map((e) => e.id);
      let contractMap = new Map<
        string,
        { basicSalary: string; payFrequency: string }
      >();

      if (employeeIds.length > 0) {
        const contracts = await db.query.employeeContracts.findMany({
          where: and(
            sql`${employeeContracts.employeeId} IN ${employeeIds}`,
            eq(employeeContracts.entityId, entityId),
            eq(employeeContracts.isActive, true),
          ),
        });

        for (const contract of contracts) {
          contractMap.set(contract.employeeId, {
            basicSalary: contract.basicSalary,
            payFrequency: contract.payFrequency,
          });
        }
      }

      // Get latest payroll run line items for these employees
      const latestRun = await db.query.payrollRuns.findFirst({
        where: and(
          eq(payrollRuns.entityId, entityId),
          eq(payrollRuns.period, period),
        ),
        orderBy: [desc(payrollRuns.createdAt)],
      });

      let lineItemMap = new Map<
        string,
        { grossPay: string; deductions: string; netPay: string; status: string }
      >();

      if (latestRun) {
        const lineItems = await db.query.payrollLineItems.findMany({
          where: and(
            sql`${payrollLineItems.employeeId} IN ${employeeIds}`,
            eq(payrollLineItems.payrollRunId, latestRun.id),
          ),
        });

        for (const item of lineItems) {
          const deductions =
            parseFloat(item.payeTax ?? "0") +
            parseFloat(item.socialSecurityEmployee ?? "0") +
            parseFloat(item.otherDeductions ?? "0") +
            parseFloat(item.loanDeduction ?? "0");
          lineItemMap.set(item.employeeId, {
            grossPay: item.grossPay,
            deductions: deductions.toString(),
            netPay: item.netPay,
            status: latestRun.status,
          });
        }
      }

      // Map employees to response format
      const mappedEmployees = employeeList.map((emp) => {
        const contract = contractMap.get(emp.id);
        const lineItem = lineItemMap.get(emp.id);
        const basicSalary = parseFloat(contract?.basicSalary ?? "0");
        const grossPay = parseFloat(
          lineItem?.grossPay ?? basicSalary.toString(),
        );
        const deductions = parseFloat(lineItem?.deductions ?? "0");
        const netPay = parseFloat(
          lineItem?.netPay ?? (grossPay - deductions).toString(),
        );

        return {
          id: emp.id,
          name: emp.name,
          employeeNumber: emp.employeeNumber,
          department: emp.department ?? "Unassigned",
          payType: contract?.payFrequency ?? "monthly",
          grossPay,
          grossPayFormatted: `GMD ${grossPay.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          deductions,
          deductionsFormatted: `GMD ${deductions.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          netPay,
          netPayFormatted: `GMD ${netPay.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          status: lineItem?.status ?? "pending",
        };
      });

      return {
        employees: mappedEmployees,
        totalCount,
        page: Math.floor(input.offset / input.limit) + 1,
        pageSize: input.limit,
        totalPages: Math.ceil(totalCount / input.limit),
      };
    }),

  // ── Department Breakdown ──
  getDepartmentBreakdown: rlsProtectedProcedure
    .input(
      z.object({
        period: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;

      const now = new Date();
      const period =
        input.period ||
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      // Get latest payroll run
      const latestRun = await db.query.payrollRuns.findFirst({
        where: and(
          eq(payrollRuns.entityId, entityId),
          eq(payrollRuns.period, period),
        ),
        orderBy: [desc(payrollRuns.createdAt)],
      });

      if (!latestRun) {
        return {
          departments: [],
          totalPayroll: 0,
        };
      }

      // Get all line items for this run
      const lineItems = await db.query.payrollLineItems.findMany({
        where: eq(payrollLineItems.payrollRunId, latestRun.id),
      });

      // Get employees for these line items
      const employeeIds = [...new Set(lineItems.map((li) => li.employeeId))];
      const employeeList = await db.query.employees.findMany({
        where: sql`${employees.id} IN ${employeeIds}`,
      });

      const employeeMap = new Map(employeeList.map((e) => [e.id, e]));

      // Group by department
      const departmentMap = new Map<string, number>();
      for (const item of lineItems) {
        const emp = employeeMap.get(item.employeeId);
        const dept = emp?.department ?? "Unassigned";
        const existing = departmentMap.get(dept) ?? 0;
        departmentMap.set(dept, existing + parseFloat(item.grossPay));
      }

      const totalPayroll = parseFloat(latestRun.grossPay);

      // Convert to array with percentages
      const departments = Array.from(departmentMap.entries())
        .map(([name, amount]) => ({
          name,
          amount,
          amountFormatted: `GMD ${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          percent:
            totalPayroll > 0
              ? Math.round((amount / totalPayroll) * 1000) / 10
              : 0,
        }))
        .sort((a, b) => b.amount - a.amount);

      return {
        departments,
        totalPayroll,
      };
    }),

  // ── Payroll Trend ──
  getPayrollTrend: rlsProtectedProcedure.query(async ({ ctx }) => {
    const entityId = ctx.entityId!;

    // Get last 6 months of data
    const months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const period = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, "0")}`;

      const result = await db
        .select({ total: sum(payrollRuns.grossPay) })
        .from(payrollRuns)
        .where(
          and(
            eq(payrollRuns.entityId, entityId),
            eq(payrollRuns.period, period),
          ),
        );

      months.push({
        month: monthDate.toLocaleString("en-US", {
          month: "short",
          year: "numeric",
        }),
        amount: parseFloat(result[0]?.total ?? "0"),
      });
    }

    return months;
  }),

  // ── Statutory Payments ──
  getStatutoryPayments: rlsProtectedProcedure
    .input(
      z.object({
        period: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;

      const now = new Date();
      const period =
        input.period ||
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      // Get latest payroll run
      const latestRun = await db.query.payrollRuns.findFirst({
        where: and(
          eq(payrollRuns.entityId, entityId),
          eq(payrollRuns.period, period),
        ),
        orderBy: [desc(payrollRuns.createdAt)],
      });

      if (!latestRun) {
        return { payments: [] };
      }

      // Calculate statutory amounts based on payroll data
      const totalDeductions = parseFloat(latestRun.totalDeductions);
      const employerContributions = parseFloat(
        latestRun.totalEmployerContributions,
      );

      // NASSIT (Social Security) - typically 10% employee + 12.5% employer
      const nassitEmployee = totalDeductions * 0.4; // Approximate
      const nassitEmployer = employerContributions * 0.5; // Approximate
      const nassitTotal = nassitEmployee + nassitEmployer;

      // PAYE (Income Tax)
      const payeAmount = totalDeductions * 0.5; // Approximate

      // Skills Development Levy (SDL)
      const sdlAmount = parseFloat(latestRun.grossPay) * 0.01; // 1% of gross

      // Due dates (typically 15th or 25th of following month)
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const dueDate25 = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}-25`;
      const dueDate30 = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}-30`;

      // Calculate days left
      const daysLeft25 = Math.ceil(
        (new Date(dueDate25).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      const daysLeft30 = Math.ceil(
        (new Date(dueDate30).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      return {
        payments: [
          {
            name: "NASSIT (Employer & Employee)",
            dueDate: dueDate25,
            amount: nassitTotal,
            amountFormatted: `GMD ${nassitTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            daysLeft: Math.max(0, daysLeft25),
            status:
              daysLeft25 <= 0 ? "overdue" : daysLeft25 <= 5 ? "urgent" : "ok",
          },
          {
            name: "PAYE (Withholding Tax)",
            dueDate: dueDate25,
            amount: payeAmount,
            amountFormatted: `GMD ${payeAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            daysLeft: Math.max(0, daysLeft25),
            status:
              daysLeft25 <= 0 ? "overdue" : daysLeft25 <= 5 ? "urgent" : "ok",
          },
          {
            name: "GRA (Skills Development Levy)",
            dueDate: dueDate30,
            amount: sdlAmount,
            amountFormatted: `GMD ${sdlAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            daysLeft: Math.max(0, daysLeft30),
            status:
              daysLeft30 <= 0 ? "overdue" : daysLeft30 <= 5 ? "urgent" : "ok",
          },
        ],
      };
    }),

  // ── AI Insights ──
  getAiInsights: rlsProtectedProcedure
    .input(
      z.object({
        period: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const entityId = ctx.entityId!;

      const now = new Date();
      const period =
        input.period ||
        `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const prevPeriod = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, "0")}`;

      // Get current and previous runs
      const currentRun = await db.query.payrollRuns.findFirst({
        where: and(
          eq(payrollRuns.entityId, entityId),
          eq(payrollRuns.period, period),
        ),
      });

      const prevRun = await db.query.payrollRuns.findFirst({
        where: and(
          eq(payrollRuns.entityId, entityId),
          eq(payrollRuns.period, prevPeriod),
        ),
      });

      const insights: Array<{
        id: string;
        type: "warning" | "info" | "success";
        title: string;
        description: string;
        actionLabel: string;
      }> = [];

      if (currentRun && prevRun) {
        const currentGross = parseFloat(currentRun.grossPay);
        const prevGross = parseFloat(prevRun.grossPay);
        const change =
          prevGross > 0 ? ((currentGross - prevGross) / prevGross) * 100 : 0;

        if (change > 10) {
          insights.push({
            id: "overtime-increase",
            type: "warning",
            title: "High Overtime This Month",
            description: `Overtime pay increased by ${Math.round(change)}% vs last month`,
            actionLabel: "View details",
          });
        }
      }

      // Check for upcoming statutory payments
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 25);
      const daysUntilDue = Math.ceil(
        (nextMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysUntilDue <= 7 && daysUntilDue > 0) {
        insights.push({
          id: "statutory-due",
          type: "info",
          title: "Statutory Payment Due Soon",
          description: `NASSIT payment of GMD ${(parseFloat(currentRun?.totalEmployerContributions ?? "0") * 0.5).toLocaleString()} is due by ${nextMonth.toLocaleDateString()}`,
          actionLabel: "View compliance",
        });
      }

      // Success if run is complete
      if (currentRun?.status === "paid") {
        insights.push({
          id: "run-complete",
          type: "success",
          title: "Payroll Run Looks Good",
          description: `All ${currentRun.employeeCount} employees paid. No failed payments.`,
          actionLabel: "Great job!",
        });
      }

      return insights;
    }),

  // ── Payroll Runs ──
  listPayrollRuns: rlsProtectedProcedure.query(({ ctx }) => {
    return db.query.payrollRuns.findMany({
      where: eq(payrollRuns.entityId, ctx.entityId!),
      orderBy: [desc(payrollRuns.createdAt)],
    });
  }),

  getPayrollRunById: rlsProtectedProcedure
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

  createPayrollRun: rlsProtectedProcedure
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
  listDeductionTypes: rlsProtectedProcedure.query(({ ctx }) => {
    return db.query.payrollDeductionTypes.findMany({
      where: eq(payrollDeductionTypes.entityId, ctx.entityId!),
    });
  }),

  // ── Payslips ──
  listPayslips: rlsProtectedProcedure
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
  updateEmployee: rlsProtectedProcedure
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

  updatePayrollRun: rlsProtectedProcedure
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
  getPayslipById: rlsProtectedProcedure
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
  listStaffLoans: rlsProtectedProcedure
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
  createDeductionType: rlsProtectedProcedure
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

  updateDeductionType: rlsProtectedProcedure
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

  deleteDeductionType: rlsProtectedProcedure
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
  deleteEmployee: rlsProtectedProcedure
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

  deletePayrollRun: rlsProtectedProcedure
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
  runPayrollPipeline: rlsProtectedProcedure
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
  getPayrollPipelineStatus: rlsProtectedProcedure
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
