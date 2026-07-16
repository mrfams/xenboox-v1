import { db } from "@xenboox/db"
import { eq, and } from "drizzle-orm"
import { chartOfAccounts, journalEntries } from "@xenboox/db/schema/accounting"

export interface FilingStatus {
  vat: "current" | "overdue" | "not_applicable"
  incomeTax: "current" | "overdue"
  payroll: "current" | "overdue"
}

export async function reviewTaxPosition(entityId: string): Promise<{
  hasTaxEntries: boolean
  taxAccounts: Array<{ code: string; name: string; balance: number }>
}> {
  const taxAccounts = await db.query.chartOfAccounts.findMany({
    where: and(
      eq(chartOfAccounts.entityId, entityId),
    ),
  })

  const taxRelated = taxAccounts.filter(
    (a) => a.subtype === "tax_liability" || a.subtype === "tax_expense" || a.code.startsWith("24") || a.code.startsWith("52")
  )

  return {
    hasTaxEntries: taxRelated.length > 0,
    taxAccounts: taxRelated.map((a) => ({
      code: a.code,
      name: a.name,
      balance: 0,
    })),
  }
}

export async function checkFilingStatus(_entityId: string): Promise<FilingStatus> {
  return {
    vat: "current",
    incomeTax: "current",
    payroll: "current",
  }
}
