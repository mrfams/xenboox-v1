/**
 * Multi-format Bank CSV Parser
 *
 * Parses CSV bank statements from various African and international banks.
 * Auto-detects delimiter, column mapping, and date formats.
 * Supports: GTBank, Access Bank, Zenith Bank, KCB, Equity Bank, Standard Chartered, etc.
 */

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ParsedTransaction {
  date: string;
  valueDate?: string;
  description: string;
  reference?: string;
  amount: number;
  type: "credit" | "debit";
  balance?: number;
  category?: string;
}

export interface ParseResult {
  transactions: ParsedTransaction[];
  accountNumber?: string;
  bankName?: string;
  statementPeriod?: { start: string; end: string };
  openingBalance?: number;
  closingBalance?: number;
  currency?: string;
  totalCredits: number;
  totalDebits: number;
  rowCount: number;
  parseErrors: string[];
}

// ─── Main Parser ───────────────────────────────────────────────────────────

export function parseBankCSV(content: string): ParseResult {
  const lines = content.split("\n").filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    return emptyResult("CSV has fewer than 2 lines");
  }

  // Detect delimiter
  const delimiter = detectDelimiter(lines[0] ?? "");

  // Find header row (skip metadata rows from some banks)
  const headerIndex = findHeaderRow(lines, delimiter);
  if (headerIndex === -1) {
    return emptyResult("Could not find header row in CSV");
  }

  // Parse header columns
  const headers = parseCSVLine(lines[headerIndex] ?? "", delimiter).map((h) =>
    h.trim().toLowerCase(),
  );

  // Map columns
  const columnMap = mapColumns(headers);

  // Parse metadata (bank name, account number, etc.) from rows before header
  const metadata = parseMetadata(lines.slice(0, headerIndex));

  // Parse transaction rows
  const transactions: ParsedTransaction[] = [];
  const parseErrors: string[] = [];

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i]?.trim() ?? "";
    if (!line) continue;

    // Skip summary rows (some banks add totals at the end)
    if (isSummaryRow(line)) continue;

    try {
      const cells = parseCSVLine(line, delimiter);
      const tx = parseTransactionRow(cells, columnMap);
      if (tx) transactions.push(tx);
    } catch (e) {
      parseErrors.push(
        `Row ${i + 1}: ${e instanceof Error ? e.message : "parse error"}`,
      );
    }
  }

  // Calculate totals
  const totalCredits = transactions
    .filter((t) => t.type === "credit")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const totalDebits = transactions
    .filter((t) => t.type === "debit")
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  // Auto-categorize transactions
  transactions.forEach((tx) => {
    tx.category = categorizeTransaction(tx.description);
  });

  return {
    transactions,
    accountNumber: metadata.accountNumber,
    bankName: metadata.bankName,
    statementPeriod: metadata.statementPeriod,
    openingBalance: metadata.openingBalance,
    closingBalance: metadata.closingBalance,
    currency: metadata.currency,
    totalCredits,
    totalDebits,
    rowCount: transactions.length,
    parseErrors,
  };
}

// ─── Delimiter Detection ───────────────────────────────────────────────────

function detectDelimiter(headerLine: string): string {
  const commaCount = (headerLine.match(/,/g) ?? []).length;
  const semicolonCount = (headerLine.match(/;/g) ?? []).length;
  const tabCount = (headerLine.match(/\t/g) ?? []).length;
  const pipeCount = (headerLine.match(/\|/g) ?? []).length;

  const max = Math.max(commaCount, semicolonCount, tabCount, pipeCount);
  if (max === commaCount) return ",";
  if (max === semicolonCount) return ";";
  if (max === tabCount) return "\t";
  if (max === pipeCount) return "|";
  return ",";
}

// ─── Header Row Detection ──────────────────────────────────────────────────

function findHeaderRow(lines: string[], delimiter: string): number {
  const headerKeywords = [
    "date",
    "description",
    "amount",
    "debit",
    "credit",
    "balance",
    "transaction",
    "narration",
    "reference",
    "particulars",
    "details",
  ];

  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const cells = parseCSVLine(lines[i] ?? "", delimiter).map((c) =>
      c.trim().toLowerCase(),
    );
    const matchCount = headerKeywords.filter((kw) =>
      cells.some((c) => c.includes(kw)),
    ).length;
    if (matchCount >= 2) return i;
  }

  return -1;
}

// ─── Column Mapping ────────────────────────────────────────────────────────

interface ColumnMap {
  date: number;
  valueDate?: number;
  description: number;
  reference?: number;
  debit?: number;
  credit?: number;
  amount?: number;
  balance?: number;
}

function mapColumns(headers: string[]): ColumnMap {
  const result: ColumnMap = { date: -1, description: -1 };

  const datePatterns = [
    "date",
    "transaction date",
    "value date",
    "posting date",
    "txn date",
  ];
  const descPatterns = [
    "description",
    "narration",
    "particulars",
    "details",
    "memo",
    "transaction description",
  ];
  const refPatterns = [
    "reference",
    "ref",
    "cheque",
    "check",
    "txn ref",
    "transaction ref",
  ];
  const debitPatterns = [
    "debit",
    "debit amount",
    "dr",
    "withdrawal",
    "debit(ghs)",
    "debit(gmd)",
  ];
  const creditPatterns = [
    "credit",
    "credit amount",
    "cr",
    "deposit",
    "credit(ghs)",
    "credit(gmd)",
  ];
  const amountPatterns = ["amount", "transaction amount", "txn amount"];
  const balancePatterns = [
    "balance",
    "running balance",
    "closing balance",
    "available balance",
  ];

  for (let i = 0; i < headers.length; i++) {
    const h = headers[i] ?? "";
    if (result.date === -1 && datePatterns.some((p) => h.includes(p)))
      result.date = i;
    if (result.description === -1 && descPatterns.some((p) => h.includes(p)))
      result.description = i;
    if (!result.reference && refPatterns.some((p) => h.includes(p)))
      result.reference = i;
    if (!result.debit && debitPatterns.some((p) => h.includes(p)))
      result.debit = i;
    if (!result.credit && creditPatterns.some((p) => h.includes(p)))
      result.credit = i;
    if (!result.amount && amountPatterns.some((p) => h.includes(p)))
      result.amount = i;
    if (!result.balance && balancePatterns.some((p) => h.includes(p)))
      result.balance = i;
  }

  return result;
}

// ─── Transaction Row Parsing ───────────────────────────────────────────────

function parseTransactionRow(
  cells: string[],
  columnMap: ColumnMap,
): ParsedTransaction | null {
  if (columnMap.date === -1 || columnMap.description === -1) return null;

  const dateStr = cells[columnMap.date]?.trim();
  const description = cells[columnMap.description]?.trim();

  if (!dateStr || !description) return null;

  const date = parseDate(dateStr);
  if (!date) return null;

  let amount = 0;
  let type: "credit" | "debit" = "debit";

  // Parse amount from debit/credit columns or single amount column
  if (columnMap.debit !== undefined && columnMap.credit !== undefined) {
    const debitStr = cells[columnMap.debit]?.trim().replace(/[, ]/g, "") ?? "";
    const creditStr =
      cells[columnMap.credit]?.trim().replace(/[, ]/g, "") ?? "";
    const debitAmount = parseFloat(debitStr) || 0;
    const creditAmount = parseFloat(creditStr) || 0;

    if (creditAmount > 0) {
      amount = creditAmount;
      type = "credit";
    } else if (debitAmount > 0) {
      amount = debitAmount;
      type = "debit";
    }
  } else if (columnMap.amount !== undefined) {
    const amountStr =
      cells[columnMap.amount]?.trim().replace(/[, ]/g, "") ?? "";
    amount = Math.abs(parseFloat(amountStr) || 0);
    type =
      amountStr.startsWith("-") || amountStr.startsWith("(")
        ? "debit"
        : "credit";
  }

  if (amount === 0) return null;

  const balance =
    columnMap.balance !== undefined
      ? parseFloat(
          cells[columnMap.balance]?.trim().replace(/[, ]/g, "") ?? "",
        ) || undefined
      : undefined;

  const reference =
    columnMap.reference !== undefined
      ? cells[columnMap.reference]?.trim() || undefined
      : undefined;

  return {
    date,
    description,
    amount,
    type,
    balance,
    reference,
  };
}

// ─── Date Parsing ──────────────────────────────────────────────────────────

function parseDate(dateStr: string): string | null {
  // Try various formats
  const formats = [
    /(\d{4})-(\d{2})-(\d{2})/, // 2024-01-15
    /(\d{2})\/(\d{2})\/(\d{4})/, // 15/01/2024
    /(\d{2})-(\d{2})-(\d{4})/, // 15-01-2024
    /(\d{2})\.(\d{2})\.(\d{4})/, // 15.01.2024
    /(\d{2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{4})/i, // 15 Jan 2024
  ];

  for (const fmt of formats) {
    const match = dateStr.match(fmt);
    if (match) {
      // ISO format already
      if (fmt === formats[0]) return match[0];
      // DD/MM/YYYY or DD-MM-YYYY
      if (fmt === formats[1] || fmt === formats[2] || fmt === formats[3]) {
        return `${match[3]}-${(match[2] ?? "").padStart(2, "0")}-${(match[1] ?? "").padStart(2, "0")}`;
      }
      // DD Mon YYYY
      if (fmt === formats[4]) {
        const months: Record<string, string> = {
          jan: "01",
          feb: "02",
          mar: "03",
          apr: "04",
          may: "05",
          jun: "06",
          jul: "07",
          aug: "08",
          sep: "09",
          oct: "10",
          nov: "11",
          dec: "12",
        };
        const month = months[(match[2] ?? "").toLowerCase().slice(0, 3)];
        if (month) {
          return `${match[3]}-${month}-${(match[1] ?? "").padStart(2, "0")}`;
        }
      }
    }
  }

  // Try Date.parse as last resort
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0] ?? null;
  }

  return null;
}

// ─── Metadata Parsing ──────────────────────────────────────────────────────

function parseMetadata(lines: string[]): {
  bankName?: string;
  accountNumber?: string;
  statementPeriod?: { start: string; end: string };
  openingBalance?: number;
  closingBalance?: number;
  currency?: string;
} {
  const metadata: ReturnType<typeof parseMetadata> = {};

  for (const line of lines) {
    const lower = line.toLowerCase();

    // Bank name
    if (lower.includes("bank") && !metadata.bankName) {
      const bankMatch = line.match(
        /(?:bank|institution)[:\s]+(.+?)(?:\s*,|\s*$)/i,
      );
      if (bankMatch) metadata.bankName = (bankMatch[1] ?? "").trim();
    }

    // Account number
    if (lower.includes("account") && !metadata.accountNumber) {
      const accMatch = line.match(/account[:\s#]*(\d[\d\s-]*\d)/i);
      if (accMatch)
        metadata.accountNumber = (accMatch[1] ?? "").replace(/\s/g, "");
    }

    // Opening/closing balance
    if (lower.includes("opening balance")) {
      const balMatch = line.match(/([\d,]+\.?\d*)/);
      if (balMatch)
        metadata.openingBalance = parseFloat(
          (balMatch[1] ?? "").replace(/,/g, ""),
        );
    }
    if (lower.includes("closing balance")) {
      const balMatch = line.match(/([\d,]+\.?\d*)/);
      if (balMatch)
        metadata.closingBalance = parseFloat(
          (balMatch[1] ?? "").replace(/,/g, ""),
        );
    }

    // Currency
    if (lower.includes("currency")) {
      const curMatch = line.match(/currency[:\s]+(\w{3})/i);
      if (curMatch) metadata.currency = (curMatch[1] ?? "").toUpperCase();
    }
  }

  return metadata;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function parseCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }
  }

  result.push(current);
  return result;
}

function isSummaryRow(line: string): boolean {
  const lower = line.toLowerCase();
  return (
    lower.includes("total") ||
    lower.includes("summary") ||
    lower.includes("closing balance") ||
    lower.includes("opening balance") ||
    lower.includes("---")
  );
}

function categorizeTransaction(description: string): string {
  const lower = description.toLowerCase();

  if (lower.includes("salary") || lower.includes("payroll")) return "payroll";
  if (lower.includes("rent") || lower.includes("lease")) return "rent";
  if (
    lower.includes("electric") ||
    lower.includes("power") ||
    lower.includes("nedec") ||
    lower.includes("pra")
  )
    return "utilities";
  if (lower.includes("water") || lower.includes("nawec")) return "utilities";
  if (
    lower.includes("internet") ||
    lower.includes("wifi") ||
    lower.includes("data")
  )
    return "telecom";
  if (lower.includes("airtime") || lower.includes("credit")) return "telecom";
  if (lower.includes("transfer") || lower.includes("wire")) return "transfer";
  if (
    lower.includes("fee") ||
    lower.includes("charges") ||
    lower.includes("commission")
  )
    return "bank_charges";
  if (lower.includes("interest")) return "interest";
  if (lower.includes("tax") || lower.includes("vat") || lower.includes("paye"))
    return "tax";
  if (lower.includes("insurance")) return "insurance";
  if (
    lower.includes("fuel") ||
    lower.includes("petrol") ||
    lower.includes("diesel")
  )
    return "transport";
  if (lower.includes("office") || lower.includes("supplies"))
    return "office_supplies";
  if (lower.includes("marketing") || lower.includes("广告")) return "marketing";
  if (
    lower.includes("travel") ||
    lower.includes("hotel") ||
    lower.includes("flight")
  )
    return "travel";
  if (
    lower.includes("food") ||
    lower.includes("catering") ||
    lower.includes("restaurant")
  )
    return "entertainment";

  return "other";
}

function emptyResult(error: string): ParseResult {
  return {
    transactions: [],
    totalCredits: 0,
    totalDebits: 0,
    rowCount: 0,
    parseErrors: [error],
  };
}
