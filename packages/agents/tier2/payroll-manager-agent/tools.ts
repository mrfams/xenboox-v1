import { db } from "@xenboox/db"
import { eq, and, sql } from "drizzle-orm"
import { employees, payrollRuns, payrollLineItems, employeeContracts } from "@xenboox/db/schema/payroll"

// ─── Types ─────────────────────────────────────────────────────────────────

export interface PayrollData {
  period: string
  employees: Array<{
    name: string
    grossPay: number
    taxWithheld: number
    benefits: number
    netPay: number
  }>
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export function validatePayrollData(data: PayrollData): ValidationResult {
  const errors: string[] = []

  if (!data.period) errors.push("Missing payroll period")
  if (!data.employees || data.employees.length === 0) {
    errors.push("No employees in payroll")
    return { valid: false, errors }
  }

  for (let i = 0; i < data.employees.length; i++) {
    const emp = data.employees[i]
    if (emp.grossPay <= 0) errors.push(`Employee ${i + 1}: gross pay must be positive`)
    if (emp.netPay < 0) errors.push(`Employee ${i + 1}: net pay cannot be negative`)
    if (emp.taxWithheld < 0) errors.push(`Employee ${i + 1}: tax withheld cannot be negative`)
    if (emp.taxWithheld > emp.grossPay * 0.5) {
      errors.push(`Employee ${i + 1}: tax withheld exceeds 50% of gross pay`)
    }
  }

  return { valid: errors.length === 0, errors }
}

export function checkTaxCalculations(data: PayrollData): ValidationResult {
  const errors: string[] = []

  for (let i = 0; i < data.employees.length; i++) {
    const emp = data.employees[i]
    const expectedNet = emp.grossPay - emp.taxWithheld - emp.benefits
    if (Math.abs(expectedNet - emp.netPay) > 0.01) {
      errors.push(
        `Employee ${i + 1} (${emp.name}): net pay ${emp.netPay} doesn't match ` +
        `gross ${emp.grossPay} - tax ${emp.taxWithheld} - benefits ${emp.benefits} = ${expectedNet}`
      )
    }
  }

  return { valid: errors.length === 0, errors }
}

// ─── DB Query Functions ────────────────────────────────────────────────────

export async function getActiveEmployees(entityId: string) {
  return db.query.employees.findMany({
    where: and(
      eq(employees.entityId, entityId),
      eq(employees.isActive, true),
    ),
  })
}

export async function getEmployeeContracts(entityId: string, employeeId: string) {
  return db.query.employeeContracts.findMany({
    where: and(
      eq(employeeContracts.entityId, entityId),
      eq(employeeContracts.employeeId, employeeId),
      eq(employeeContracts.isActive, true),
    ),
  })
}

export async function getPayrollRuns(entityId: string, period?: string) {
  if (period) {
    return db.query.payrollRuns.findMany({
      where: and(
        eq(payrollRuns.entityId, entityId),
        eq(payrollRuns.period, period),
      ),
    })
  }
  return db.query.payrollRuns.findMany({
    where: eq(payrollRuns.entityId, entityId),
  })
}

export async function getPayrollLineItems(entityId: string, payrollRunId: string) {
  return db.query.payrollLineItems.findMany({
    where: and(
      eq(payrollLineItems.entityId, entityId),
      eq(payrollLineItems.payrollRunId, payrollRunId),
    ),
  })
}

export async function getLatestPayrollRun(entityId: string) {
  const runs = await db.query.payrollRuns.findMany({
    where: eq(payrollRuns.entityId, entityId),
    orderBy: (runs, { desc }) => [desc(runs.createdAt)],
    limit: 1,
  })
  return runs[0] ?? null
}
