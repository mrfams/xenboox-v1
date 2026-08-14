// ─── Chat Artifact Service (server-only) ───────────────────────────────────
//
// When a user asks the chat for a document or file ("generate a P&L report",
// "export my trial balance to CSV", "give me a summary document"), this
// service produces a real file from real ledger data, stores it in the
// artifact registry (inline content in metadata + R2 when configured), and
// returns descriptors the stream route can emit to the conversation.
//
// Everything is deterministic and testable: intent detection has no LLM
// dependency, report data comes from the same reporting helpers the
// reporting agent uses, and failure to upload to R2 degrades gracefully to
// inline-only content (the client renders and downloads from the blob).

import { PutObjectCommand } from "@aws-sdk/client-s3";
import { eq } from "drizzle-orm";
import { artifactRegistry, fiscalPeriods } from "@xenboox/db/schema";
import { logger } from "@/lib/logger";
import {
  generateProfitLoss,
  generateBalanceSheet,
  generateTrialBalance,
  generateCashFlow,
  generateBudgetVsActual,
  generateNarrative,
} from "@xenboox/agents";

import type { ChatArtifactRef } from "./artifact-types";

import { db } from "@/lib/db";
import { r2, R2_BUCKET } from "@/lib/r2";

// ─── Types ─────────────────────────────────────────────────────────────────

export type ChatReportType =
  | "profit_loss"
  | "balance_sheet"
  | "trial_balance"
  | "cash_flow"
  | "budget_vs_actual"
  | "summary";

export interface ArtifactRequest {
  requested: boolean;
  reportType?: ChatReportType;
  wantExport?: boolean;
}

const MAX_INLINE_BYTES = 200_000; // 200 KB inline content cap

// ─── Intent Detection (deterministic, no LLM) ─────────────────────────────

const FILE_VERBS =
  /generate|create|make|prepare|produce|draft|build|export|download|send me|give me|write (out|up|me)|put together|i need|produce|compile/i;

const REPORT_NOUNS =
  /report|statement|p&l|profit and loss|profit & loss|income statement|balance sheet|trial balance|cash flow|budget vs actual|budget variance|expense (summary|report)|financial summary|overview of my (finances|books|accounts)/i;

const EXPORT_HINTS = /\b(csv|excel|spreadsheet|xlsx)\b/i;

const DOC_NOUNS = /\b(document|file|pdf)\b/i;

const SUMMARY_HINTS = /summary|overview|snapshot|recap/i;

const PROFIT_LOSS_RE = /p&l|profit and loss|profit & loss|income statement/i;
const BALANCE_SHEET_RE = /balance sheet/i;
const TRIAL_BALANCE_RE = /trial balance/i;
const CASH_FLOW_RE = /cash flow/i;
const BUDGET_RE = /budget vs actual|budget variance/i;

/** Classify whether a chat message is asking for a generated document. */
export function detectArtifactRequest(message: string): ArtifactRequest {
  const text = (message ?? "").trim();
  if (!text) return { requested: false };

  // CSV / Excel / spreadsheet → data export
  if (EXPORT_HINTS.test(text)) {
    return {
      requested: true,
      wantExport: true,
      reportType: detectReportType(text),
    };
  }

  const wantsFileNoun = DOC_NOUNS.test(text);
  const wantsReport = REPORT_NOUNS.test(text);
  const wantsSummary = SUMMARY_HINTS.test(text);
  const hasVerb = FILE_VERBS.test(text);

  // Explicit report/file request with an action verb
  if (hasVerb && (wantsReport || (wantsFileNoun && wantsSummary))) {
    return {
      requested: true,
      wantExport: false,
      reportType: wantsReport ? detectReportType(text) : "summary",
    };
  }

  // "I need a document/file" with a financial context
  if (
    wantsFileNoun &&
    hasVerb &&
    /financ|books|accounts|business|company|ledger/i.test(text)
  ) {
    return {
      requested: true,
      wantExport: false,
      reportType: "summary",
    };
  }

  return { requested: false };
}

function detectReportType(text: string): ChatReportType | undefined {
  if (BALANCE_SHEET_RE.test(text)) return "balance_sheet";
  if (TRIAL_BALANCE_RE.test(text)) return "trial_balance";
  if (CASH_FLOW_RE.test(text)) return "cash_flow";
  if (BUDGET_RE.test(text)) return "budget_vs_actual";
  if (PROFIT_LOSS_RE.test(text)) return "profit_loss";
  if (SUMMARY_HINTS.test(text)) return "summary";
  return undefined;
}

// ─── Fiscal Period Resolution ──────────────────────────────────────────────

async function resolveCurrentPeriod(
  entityId: string,
): Promise<{ id: string; label: string } | null> {
  const now = new Date();
  const periods = await db.query.fiscalPeriods.findMany({
    where: eq(fiscalPeriods.entityId, entityId),
  });
  if (periods.length === 0) return null;

  // Prefer the period containing today; otherwise the most recent one.
  const active = periods.find((p) => {
    if (!p.startDate || !p.endDate) return false;
    return now >= new Date(p.startDate) && now <= new Date(p.endDate);
  });
  const chosen =
    active ??
    [...periods].sort((a, b) => b.year - a.year || b.month - a.month)[0];

  return {
    id: chosen.id,
    label: `${chosen.year}-${String(chosen.month).padStart(2, "0")}`,
  };
}

// ─── Generation ────────────────────────────────────────────────────────────

export interface GenerateChatArtifactsParams {
  entityId: string;
  entityName: string;
  currency: string;
  userId: string;
  message: string;
}

/**
 * Generate document artifacts for a chat turn (if the message requests one).
 * Returns descriptors for the stream route to emit as `document_created`.
 */
export async function generateChatArtifacts(
  params: GenerateChatArtifactsParams,
): Promise<ChatArtifactRef[]> {
  const { entityId, entityName, currency, userId, message } = params;
  const request = detectArtifactRequest(message);
  if (!request.requested) return [];

  try {
    const refs: ChatArtifactRef[] = [];

    if (request.wantExport) {
      const csvRef = await generateCsvExport({
        entityId,
        entityName,
        currency,
        userId,
        request,
      });
      if (csvRef) refs.push(csvRef);
      return refs;
    }

    const reportRef = await generateReportArtifact({
      entityId,
      entityName,
      currency,
      userId,
      reportType: request.reportType ?? "profit_loss",
    });
    if (reportRef) refs.push(reportRef);
    return refs;
  } catch (error) {
    // A failed artifact must never break the chat response.
    logger.error({ err: error }, "[chat-artifacts] generation failed");
    return [];
  }
}

// ─── Report Artifact ───────────────────────────────────────────────────────

async function generateReportArtifact(params: {
  entityId: string;
  entityName: string;
  currency: string;
  userId: string;
  reportType: ChatReportType;
}): Promise<ChatArtifactRef | null> {
  const { entityId, entityName, currency, userId, reportType } = params;
  const period = await resolveCurrentPeriod(entityId);

  if (reportType === "summary") {
    const [pnl, bs, tb] = await Promise.all([
      period ? generateProfitLoss(entityId, period.id) : Promise.resolve(null),
      generateBalanceSheet(entityId),
      period
        ? generateTrialBalance(entityId, period.id)
        : Promise.resolve(null),
    ]);

    const narrative = generateNarrative(
      entityName,
      { profitAndLoss: pnl, balanceSheet: bs, trialBalance: tb },
      currency,
    );

    const html = buildReportHtml({
      entityName,
      currency,
      title: `Financial Summary — ${entityName}`,
      subtitle: period ? `Period: ${period.label}` : "Current position",
      generatedAt: new Date(),
      sections: [
        {
          heading: "Highlights",
          bullets: [
            ...narrative.highlights.map((h) => `✅ ${h}`),
            ...narrative.concerns.map((c) => `⚠️ ${c}`),
          ],
        },
        ...(pnl
          ? [
              pnlSection(pnl, currency),
              {
                heading: "Performance narrative",
                paragraphs: [narrative.summary],
              },
            ]
          : []),
        ...(bs ? [bsSection(bs, currency)] : []),
      ],
    });

    return persistArtifact({
      entityId,
      userId,
      kind: "report",
      name: `Financial Summary - ${period?.label ?? "Current"}`,
      description: "AI-generated financial summary from your posted books",
      mimeType: "text/html",
      content: html,
      docType: "Summary",
      agentName: "cfo-agent",
    });
  }

  const title = REPORT_TITLES[reportType];
  const fileName = FILE_NAMES[reportType];

  switch (reportType) {
    case "profit_loss": {
      if (!period) return null;
      const pnl = await generateProfitLoss(entityId, period.id);
      const html = buildReportHtml({
        entityName,
        currency,
        title: `${title} — ${period.label}`,
        subtitle: `${entityName} · Period ${period.label}`,
        generatedAt: new Date(),
        sections: [pnlSection(pnl, currency)],
      });
      return persistArtifact({
        entityId,
        userId,
        kind: "report",
        name: `${fileName} - ${period.label}`,
        description: "Profit & Loss statement generated from posted entries",
        mimeType: "text/html",
        content: html,
        docType: "Report",
        agentName: "cfo-agent",
      });
    }
    case "balance_sheet": {
      const bs = await generateBalanceSheet(entityId);
      const html = buildReportHtml({
        entityName,
        currency,
        title: `${title} — ${entityName}`,
        subtitle: `As at ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}`,
        generatedAt: new Date(),
        sections: [bsSection(bs, currency)],
      });
      return persistArtifact({
        entityId,
        userId,
        kind: "report",
        name: `${fileName} - ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`,
        description: "Balance sheet generated from posted entries",
        mimeType: "text/html",
        content: html,
        docType: "Report",
        agentName: "cfo-agent",
      });
    }
    case "trial_balance": {
      if (!period) return null;
      const tb = await generateTrialBalance(entityId, period.id);
      const html = buildReportHtml({
        entityName,
        currency,
        title: `${title} — ${period.label}`,
        subtitle: `${entityName} · Period ${period.label}`,
        generatedAt: new Date(),
        sections: [
          {
            heading: "Trial Balance",
            table: {
              columns: ["Account", "Debits", "Credits"],
              rows: tb.accounts.map((a) => [
                `${a.accountCode} — ${a.accountName}`,
                fmt(a.debitBalance, currency),
                fmt(a.creditBalance, currency),
              ]),
            },
            footer: [
              { label: "Total Debits", value: fmt(tb.totalDebits, currency) },
              { label: "Total Credits", value: fmt(tb.totalCredits, currency) },
              {
                label: "Status",
                value: tb.balanced ? "Balanced ✓" : "Out of balance ✗",
              },
            ],
          },
        ],
      });
      return persistArtifact({
        entityId,
        userId,
        kind: "report",
        name: `${fileName} - ${period.label}`,
        description: "Trial balance generated from posted entries",
        mimeType: "text/html",
        content: html,
        docType: "Report",
        agentName: "cfo-agent",
      });
    }
    case "budget_vs_actual": {
      if (!period) return null;
      const bva = await generateBudgetVsActual(entityId, period.id);
      const html = buildReportHtml({
        entityName,
        currency,
        title: `${title} — ${period.label}`,
        subtitle: `${entityName} · ${bva.budgetName}`,
        generatedAt: new Date(),
        sections: [
          {
            heading: "Budget vs Actual",
            table: {
              columns: ["Account", "Budgeted", "Actual", "Variance"],
              rows: bva.lines.map((l) => [
                `${l.accountCode} — ${l.accountName}`,
                fmt(l.budgetedAmount, currency),
                fmt(l.actualAmount, currency),
                fmt(l.variance, currency),
              ]),
            },
            footer: [
              {
                label: "Total Budgeted",
                value: fmt(bva.totalBudgeted, currency),
              },
              { label: "Total Actual", value: fmt(bva.totalActual, currency) },
              {
                label: "Total Variance",
                value: fmt(bva.totalVariance, currency),
              },
              { label: "Variance %", value: `${bva.totalVariancePct}%` },
            ],
          },
        ],
      });
      return persistArtifact({
        entityId,
        userId,
        kind: "report",
        name: `${fileName} - ${period.label}`,
        description:
          "Budget vs actual variance report generated from your budget and posted entries",
        mimeType: "text/html",
        content: html,
        docType: "Report",
        agentName: "cfo-agent",
      });
    }
    case "cash_flow": {
      if (!period) return null;
      const cf = await generateCashFlow(entityId, period.id);
      const sectionRows: Array<[string, string]> = [
        ...cf.operating.lines.map(
          (l) => [l.accountName, fmt(l.amount, currency)] as [string, string],
        ),
      ];
      const html = buildReportHtml({
        entityName,
        currency,
        title: `${title} — ${period.label}`,
        subtitle: `${entityName} · Period ${period.label}`,
        generatedAt: new Date(),
        sections: [
          {
            heading: "Operating Activities",
            table: {
              columns: ["Item", "Amount"],
              rows: sectionRows,
            },
          },
          {
            heading: "Investing Activities",
            table: {
              columns: ["Item", "Amount"],
              rows: cf.investing.lines.map((l) => [
                l.accountName,
                fmt(l.amount, currency),
              ]),
            },
          },
          {
            heading: "Financing Activities",
            table: {
              columns: ["Item", "Amount"],
              rows: cf.financing.lines.map((l) => [
                l.accountName,
                fmt(l.amount, currency),
              ]),
            },
          },
          {
            heading: "Summary",
            footer: [
              { label: "Opening cash", value: fmt(cf.openingCash, currency) },
              {
                label: "Net cash change",
                value: fmt(cf.netCashChange, currency),
              },
              { label: "Closing cash", value: fmt(cf.closingCash, currency) },
            ],
          },
        ],
      });
      return persistArtifact({
        entityId,
        userId,
        kind: "report",
        name: `${fileName} - ${period.label}`,
        description: "Cash flow statement generated from posted entries",
        mimeType: "text/html",
        content: html,
        docType: "Report",
        agentName: "cfo-agent",
      });
    }
    default:
      return null;
  }
}

// ─── CSV Export Artifact ───────────────────────────────────────────────────

async function generateCsvExport(params: {
  entityId: string;
  entityName: string;
  currency: string;
  userId: string;
  request: ArtifactRequest;
}): Promise<ChatArtifactRef | null> {
  const { entityId, entityName, currency, userId, request } = params;
  const period = await resolveCurrentPeriod(entityId);
  const reportType = request.reportType ?? "trial_balance";

  let csv = "";
  let name = "";

  if (reportType === "trial_balance" || !period) {
    const tb = period
      ? await generateTrialBalance(entityId, period.id)
      : { accounts: [], totalDebits: 0, totalCredits: 0, balanced: true };
    csv = toCsv([
      ["Trial Balance", period?.label ?? "Current", entityName],
      [],
      ["Account Code", "Account Name", "Debits", "Credits"],
      ...tb.accounts.map((a) => [
        a.accountCode,
        a.accountName,
        String(a.debitBalance),
        String(a.creditBalance),
      ]),
      [],
      ["Total Debits", "", String(tb.totalDebits), ""],
      ["Total Credits", "", "", String(tb.totalCredits)],
      ["Status", tb.balanced ? "Balanced" : "Out of balance", "", ""],
    ]);
    name = `Trial Balance Export - ${period?.label ?? "Current"}.csv`;
  } else {
    const pnl = await generateProfitLoss(entityId, period.id);
    csv = toCsv([
      ["Profit & Loss", period.label, entityName],
      [],
      ["Revenue", "", String(pnl.revenue)],
      ...pnl.revenueByAccount.map((a) => [
        a.accountCode,
        a.accountName,
        String(a.amount),
      ]),
      [],
      ["Expenses", "", String(pnl.expenses)],
      ...pnl.expensesByAccount.map((a) => [
        a.accountCode,
        a.accountName,
        String(a.amount),
      ]),
      [],
      ["Net Profit", "", String(pnl.netProfit)],
    ]);
    name = `Profit & Loss Export - ${period.label}.csv`;
  }

  return persistArtifact({
    entityId,
    userId,
    kind: "export",
    name,
    description: "CSV data export generated on request",
    mimeType: "text/csv",
    content: csv,
    docType: "Export",
    agentName: "cfo-agent",
    formatCurrency: currency,
  });
}

// ─── Persistence ───────────────────────────────────────────────────────────

async function persistArtifact(params: {
  entityId: string;
  userId: string;
  kind: "report" | "export";
  name: string;
  description: string;
  mimeType: string;
  content: string;
  docType: string;
  agentName: string;
  formatCurrency?: string;
}): Promise<ChatArtifactRef | null> {
  const contentBytes = Buffer.byteLength(params.content, "utf8");
  if (contentBytes > MAX_INLINE_BYTES) {
    logger.warn(
      { name: params.name },
      "[chat-artifacts] content too large, skipping",
    );
    return null;
  }

  const upload = await uploadToR2(
    params.entityId,
    params.name,
    params.mimeType,
    params.content,
  );

  const [artifact] = await db
    .insert(artifactRegistry)
    .values({
      entityId: params.entityId,
      kind: params.kind,
      name: params.name,
      description: params.description,
      mimeType: params.mimeType,
      sizeBytes: contentBytes,
      r2Key: upload?.r2Key ?? `inline://${crypto.randomUUID()}`,
      r2Bucket: upload?.r2Bucket ?? "inline",
      createdBy: params.userId,
      createdByName: "Xenboox AI",
      agentName: params.agentName,
      status: "ready",
      metadata: {
        source: "chat",
        content: params.content,
        docType: params.docType,
        formatCurrency: params.formatCurrency ?? "GMD",
        generatedAt: new Date().toISOString(),
      },
    })
    .returning();

  return {
    artifactId: artifact.id,
    name: artifact.name,
    docType: params.docType,
    mimeType: artifact.mimeType,
    sizeBytes: contentBytes,
  };
}

/**
 * Best-effort overwrite of an existing R2 object (used when an artifact is
 * edited in the viewer). Failures degrade gracefully to inline-only.
 */
export async function rewriteR2Object(params: {
  r2Key: string;
  r2Bucket: string;
  mimeType: string;
  content: string;
}): Promise<boolean> {
  if (params.r2Bucket === "inline" || params.r2Key.startsWith("inline://")) {
    return false;
  }
  try {
    await r2.send(
      new PutObjectCommand({
        Bucket: params.r2Bucket,
        Key: params.r2Key,
        Body: params.content,
        ContentType: params.mimeType,
      }),
    );
    return true;
  } catch (error) {
    logger.warn(
      { err: error },
      "[chat-artifacts] R2 rewrite unavailable, inline only",
    );
    return false;
  }
}

async function uploadToR2(
  entityId: string,
  fileName: string,
  mimeType: string,
  content: string,
): Promise<{ r2Key: string; r2Bucket: string } | null> {
  try {
    const ext = fileName.split(".").pop() ?? "html";
    const r2Key = `${entityId}/chat-artifacts/${crypto.randomUUID()}.${ext}`;
    await r2.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: r2Key,
        Body: content,
        ContentType: mimeType,
      }),
    );
    return { r2Key, r2Bucket: R2_BUCKET };
  } catch (error) {
    logger.warn(
      { err: error },
      "[chat-artifacts] R2 upload unavailable, storing inline only",
    );
    return null;
  }
}

// ─── HTML Report Builder ───────────────────────────────────────────────────

interface HtmlSection {
  heading: string;
  intro?: string;
  paragraphs?: string[];
  bullets?: string[];
  table?: { columns: string[]; rows: Array<Array<string>> };
  footer?: Array<{ label: string; value: string }>;
}

function buildReportHtml(params: {
  entityName: string;
  currency: string;
  title: string;
  subtitle?: string;
  generatedAt: Date;
  sections: HtmlSection[];
}): string {
  const { entityName, currency, title, subtitle, generatedAt, sections } =
    params;

  const sectionHtml = sections
    .map((s) => {
      const intro = s.intro
        ? `<p class="intro">${escapeHtml(s.intro)}</p>`
        : "";
      const paragraphs = (s.paragraphs ?? [])
        .map((p) => `<p>${escapeHtml(p)}</p>`)
        .join("");
      const bullets = (s.bullets ?? [])
        .map((b) => `<li>${escapeHtml(b)}</li>`)
        .join("");
      const table = s.table
        ? `<div class="table-wrap"><table><thead><tr>${s.table.columns
            .map((c) => `<th>${escapeHtml(c)}</th>`)
            .join("")}</tr></thead><tbody>${s.table.rows
            .map(
              (r) =>
                `<tr>${r.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`,
            )
            .join("")}</tbody></table></div>`
        : "";
      const footer = s.footer
        ? `<div class="totals">${s.footer
            .map(
              (f) =>
                `<div class="total-row"><span>${escapeHtml(f.label)}</span><strong>${escapeHtml(f.value)}</strong></div>`,
            )
            .join("")}</div>`
        : "";
      return `<section><h2>${escapeHtml(s.heading)}</h2>${intro}${paragraphs}${
        bullets ? `<ul>${bullets}</ul>` : ""
      }${table}${footer}</section>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>
  :root { --brand:#4f46e5; --ink:#0f172a; --muted:#64748b; --line:#e2e8f0; --bg:#f8fafc; --chip:#eef2ff; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
         background: var(--bg); color: var(--ink); line-height: 1.55; padding: 40px 24px; }
  .page { max-width: 860px; margin: 0 auto; background: #fff; border: 1px solid var(--line);
          border-radius: 16px; padding: 40px 48px; box-shadow: 0 8px 30px rgba(15,23,42,.06); }
  header { border-bottom: 2px solid var(--line); padding-bottom: 20px; margin-bottom: 28px; }
  h1 { font-size: 22px; letter-spacing: -0.02em; }
  .sub { color: var(--muted); font-size: 13px; margin-top: 4px; }
  .meta { display:flex; justify-content:space-between; color: var(--muted); font-size: 12px; margin-top: 14px; }
  section { margin-bottom: 28px; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: .06em; color: var(--brand);
       margin-bottom: 12px; }
  .intro { color: var(--muted); font-size: 13px; margin-bottom: 10px; }
  p { font-size: 14px; margin-bottom: 8px; }
  ul { list-style: none; margin: 8px 0; }
  li { font-size: 14px; padding: 8px 12px; background: #fff; border: 1px solid var(--line);
       border-radius: 10px; margin-bottom: 6px; }
  .table-wrap { overflow-x: auto; border: 1px solid var(--line); border-radius: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; background: var(--chip); color: var(--ink); font-weight: 600;
       padding: 10px 14px; white-space: nowrap; }
  td { padding: 9px 14px; border-top: 1px solid var(--line); }
  tbody tr:nth-child(even) { background: #fbfcff; }
  td:last-child, th:last-child { text-align: right; }
  .totals { margin-top: 12px; border: 1px solid var(--line); border-radius: 12px; overflow: hidden; }
  .total-row { display: flex; justify-content: space-between; padding: 9px 14px; font-size: 13px;
               border-top: 1px solid var(--line); }
  .total-row:first-child { border-top: 0; }
  .total-row:last-child { background: var(--chip); font-weight: 700; }
  footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid var(--line);
           color: var(--muted); font-size: 11px; display: flex; justify-content: space-between; }
  .badge { display:inline-block; background: var(--chip); color: var(--brand); font-size: 11px;
           font-weight: 600; border-radius: 999px; padding: 2px 10px; }
</style>
</head>
<body>
  <div class="page">
    <header>
      <h1>${escapeHtml(title)}</h1>
      ${subtitle ? `<p class="sub">${escapeHtml(subtitle)}</p>` : ""}
      <div class="meta"><span>Generated by Xenboox AI</span><span>${escapeHtml(
        entityName,
      )}</span></div>
    </header>
    ${sectionHtml}
    <footer>
      <span>Generated ${generatedAt.toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      })}</span>
      <span class="badge">Xenboox · ${escapeHtml(currency)}</span>
    </footer>
  </div>
</body>
</html>`;
}

function pnlSection(
  pnl: Awaited<ReturnType<typeof generateProfitLoss>>,
  currency: string,
): HtmlSection {
  return {
    heading: "Profit & Loss",
    table: {
      columns: ["Account", "Amount"],
      rows: [
        ...pnl.revenueByAccount.map((a) => [
          `${a.accountCode} — ${a.accountName}`,
          fmt(a.amount, currency),
        ]),
        ...pnl.expensesByAccount.map((a) => [
          `${a.accountCode} — ${a.accountName}`,
          fmt(-a.amount, currency),
        ]),
      ],
    },
    footer: [
      { label: "Total Revenue", value: fmt(pnl.revenue, currency) },
      { label: "Total Expenses", value: fmt(pnl.expenses, currency) },
      {
        label: "Net Profit / (Loss)",
        value: fmt(pnl.netProfit, currency),
      },
    ],
  };
}

function bsSection(
  bs: Awaited<ReturnType<typeof generateBalanceSheet>>,
  currency: string,
): HtmlSection {
  return {
    heading: "Balance Sheet",
    table: {
      columns: ["Account", "Amount"],
      rows: [
        ...bs.assetsByAccount.map((a) => [
          `${a.accountCode} — ${a.accountName}`,
          fmt(a.amount, currency),
        ]),
      ],
    },
    footer: [
      { label: "Total Assets", value: fmt(bs.assets, currency) },
      { label: "Total Liabilities", value: fmt(bs.liabilities, currency) },
      { label: "Total Equity", value: fmt(bs.equity, currency) },
      {
        label: "Balanced",
        value:
          Math.abs(bs.assets - (bs.liabilities + bs.equity)) < 0.01
            ? "Yes ✓"
            : "No ✗",
      },
    ],
  };
}

// ─── CSV Builder ───────────────────────────────────────────────────────────

function toCsv(rows: Array<Array<string | number>>): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const s = String(cell ?? "");
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    )
    .join("\n");
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function fmt(value: number, currency: string): string {
  return `${currency} ${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const REPORT_TITLES: Record<ChatReportType, string> = {
  profit_loss: "Profit & Loss Statement",
  balance_sheet: "Balance Sheet",
  trial_balance: "Trial Balance",
  cash_flow: "Cash Flow Statement",
  budget_vs_actual: "Budget vs Actual",
  summary: "Financial Summary",
};

const FILE_NAMES: Record<ChatReportType, string> = {
  profit_loss: "Profit & Loss",
  balance_sheet: "Balance Sheet",
  trial_balance: "Trial Balance",
  cash_flow: "Cash Flow Statement",
  budget_vs_actual: "Budget vs Actual",
  summary: "Financial Summary",
};
