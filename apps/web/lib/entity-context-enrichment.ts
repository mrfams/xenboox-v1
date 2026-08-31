import { eq, and, desc } from "drizzle-orm";
import { entities } from "@xenboox/db/schema/organization";
import { fiscalPeriods } from "@xenboox/db/schema/accounting";

import { db } from "@/lib/db";

export type EnrichedEntityContext = {
  entityId: string;
  entityName: string;
  currency: string;
  fiscalYearEnd: string;
  currentPeriod: string;
  lastCloseDate: string;
  orgType: string;
  timezone: string;
};

/**
 * Fetches real entity context from the database for prompt enrichment.
 * Replaces hardcoded "TBD" values with actual data.
 */
export async function getEnrichedEntityContext(
  entityId: string,
): Promise<EnrichedEntityContext> {
  // Fetch entity with organization
  const entity = await db.query.entities.findFirst({
    where: eq(entities.id, entityId),
    with: {
      organization: true,
    },
  });

  if (!entity) {
    return getDefaultContext(entityId);
  }

  // Fetch the most recent closed period (last close date)
  const lastClosedPeriod = await db.query.fiscalPeriods.findFirst({
    where: and(
      eq(fiscalPeriods.entityId, entityId),
      eq(fiscalPeriods.status, "closed"),
    ),
    orderBy: [desc(fiscalPeriods.closedAt)],
    columns: {
      year: true,
      month: true,
      closedAt: true,
      endDate: true,
    },
  });

  // Fetch the current open period
  const currentPeriod = await db.query.fiscalPeriods.findFirst({
    where: and(
      eq(fiscalPeriods.entityId, entityId),
      eq(fiscalPeriods.status, "open"),
    ),
    orderBy: [desc(fiscalPeriods.year), desc(fiscalPeriods.month)],
    columns: {
      year: true,
      month: true,
    },
  });

  // Format current period as "Month YYYY" (e.g., "July 2026")
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const now = new Date();
  const currentYear = currentPeriod?.year ?? now.getFullYear();
  const currentMonth = currentPeriod?.month ?? now.getMonth() + 1;
  const currentPeriodStr = `${monthNames[currentMonth - 1]} ${currentYear}`;

  // Format last close date
  let lastCloseDateStr = "No prior close";
  if (lastClosedPeriod?.closedAt) {
    lastCloseDateStr = lastClosedPeriod.closedAt.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } else if (lastClosedPeriod?.endDate) {
    lastCloseDateStr = lastClosedPeriod.endDate;
  }

  // Map fiscal year end month number to name
  const fiscalYearEndMonth = parseInt(entity.fiscalYearEnd ?? "12", 10);
  const fiscalYearEndStr = monthNames[fiscalYearEndMonth - 1] ?? "December";

  // Determine timezone from country
  const timezoneMap: Record<string, string> = {
    GM: "Africa/Banjul",
    NG: "Africa/Lagos",
    GH: "Africa/Accra",
    SN: "Africa/Dakar",
    KE: "Africa/Nairobi",
  };

  return {
    entityId: entity.id,
    entityName: entity.name,
    currency: entity.currency ?? "USD",
    fiscalYearEnd: fiscalYearEndStr,
    currentPeriod: currentPeriodStr,
    lastCloseDate: lastCloseDateStr,
    orgType:
      (entity.organization as { type?: string } | null | undefined)?.type ??
      "business",
    timezone: timezoneMap[entity.country ?? "GM"] ?? "Africa/Banjul",
  };
}

function getDefaultContext(entityId: string): EnrichedEntityContext {
  const now = new Date();
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  return {
    entityId,
    entityName: "Organization",
    currency: "USD",
    fiscalYearEnd: "December",
    currentPeriod: `${monthNames[now.getMonth()]} ${now.getFullYear()}`,
    lastCloseDate: "No prior close",
    orgType: "business",
    timezone: "Africa/Banjul",
  };
}

/**
 * Enriches a system prompt template with real entity context.
 * Replaces all {{VARIABLE}} placeholders with actual values.
 */
export function enrichPrompt(
  template: string,
  ctx: EnrichedEntityContext,
): string {
  return template
    .replace(/\{\{ENTITY_NAME\}\}/g, ctx.entityName)
    .replace(/\{\{ENTITY_ID\}\}/g, ctx.entityId)
    .replace(/\{\{BASE_CURRENCY\}\}/g, ctx.currency)
    .replace(/\{\{FISCAL_YEAR_END\}\}/g, ctx.fiscalYearEnd)
    .replace(/\{\{CURRENT_PERIOD\}\}/g, ctx.currentPeriod)
    .replace(/\{\{ORG_TYPE\}\}/g, ctx.orgType)
    .replace(/\{\{TIMEZONE\}\}/g, ctx.timezone)
    .replace(/\{\{LAST_CLOSE_DATE\}\}/g, ctx.lastCloseDate);
}
