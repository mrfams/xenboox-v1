import { db } from "@xenboox/db"
import { eq, and } from "drizzle-orm"
import { employees, employeeContracts, payrollLineItems, payrollDeductionTypes } from "@xenboox/db/schema/payroll"
import type { PayslipData } from "./state"

// ─── PAYE Tax Calculation (Gambia tax bands) ───────────────────────────────

export function calculatePAYE(grossPay: number): number {
  // Gambia tax bands (monthly)
  const bands = [
    { limit: 10000, rate: 0 },
    { limit: 15000, rate: 0.1 },
    { limit: 20000, rate: 0.15 },
    { limit: 25000, rate: 0.2 },
    { limit: 30000, rate: 0.25 },
    { limit: Infinity, rate: 0.35 },
  ]

  let remaining = grossPay
  let tax = 0
  let prevLimit = 0

  for (const band of bands) {
    const taxable = Math.min(remaining, band.limit - prevLimit)
    if (taxable <= 0) break
    tax += taxable * band.rate
    remaining -= taxable
    prevLimit = band.limit
  }

  return Math.round(tax * 100) / 100
}

// ─── Social Security Calculation ────────────────────────────────────────────

export function calculateSocialSecurity(grossPay: number): { employee: number; employer: number } {
  const maxContribution = 7500 // Monthly ceiling
  const employeeRate = 0.05
  const employerRate = 0.10

  const contribution = Math.min(grossPay, maxContribution)

  return {
    employee: Math.round(contribution * employeeRate * 100) / 100,
    employer: Math.round(contribution * employerRate * 100) / 100,
  }
}

// ─── Calculate Individual Payslip ───────────────────────────────────────────

export async function calculatePayslip(
  entityId: string,
  employeeId: string,
  period: string
): Promise<PayslipData> {
  const emp = await db.query.employees.findFirst({
    where: and(
      eq(employees.id, employeeId),
      eq(employees.entityId, entityId),
    ),
  })

  if (!emp) throw new Error(`Employee ${employeeId} not found`)

  const contract = await db.query.employeeContracts.findFirst({
    where: and(
      eq(employeeContracts.employeeId, employeeId),
      eq(employeeContracts.entityId, entityId),
      eq(employeeContracts.isActive, true),
    ),
  })

  const basicSalary = contract ? Number(contract.basicSalary) : 0
  const payeTax = calculatePAYE(basicSalary)
  const socialSecurity = calculateSocialSecurity(basicSalary)
  const totalDeductions = payeTax + socialSecurity.employee
  const netPay = basicSalary - totalDeductions

  return {
    employeeId: emp.id,
    employeeName: emp.name,
    period,
    basicSalary,
    allowances: 0,
    grossPay: basicSalary,
    payeTax,
    socialSecurityEmployee: socialSecurity.employee,
    socialSecurityEmployer: socialSecurity.employer,
    otherDeductions: 0,
    loanDeduction: 0,
    totalDeductions,
    netPay,
  }
}

// ─── Calculate Batch Payslips ───────────────────────────────────────────────

export async function calculateBatchPayslips(
  entityId: string,
  period: string
): Promise<PayslipData[]> {
  const activeEmployees = await db.query.employees.findMany({
    where: and(
      eq(employees.entityId, entityId),
      eq(employees.isActive, true),
    ),
  })

  const payslips: PayslipData[] = []

  for (const emp of activeEmployees) {
    const payslip = await calculatePayslip(entityId, emp.id, period)
    payslips.push(payslip)
  }

  return payslips
}

// ─── Get Deduction Types ────────────────────────────────────────────────────

export async function getDeductionTypes(entityId: string) {
  return db.query.payrollDeductionTypes.findMany({
    where: and(
      eq(payrollDeductionTypes.entityId, entityId),
      eq(payrollDeductionTypes.isActive, true),
    ),
  })
}
