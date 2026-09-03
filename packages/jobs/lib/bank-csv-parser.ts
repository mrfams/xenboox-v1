/**
 * Multi-format Bank CSV Parser
 *
 * Parses CSV bank statements from various African and international banks.
 * Auto-detects delimiter, column mapping, and date formats.
 * Supports: GTBank, Access Bank, Zenith Bank, KCB, Equity Bank, Standard Chartered, etc.
 */

import {
  categorizeByDescription,
  balanceEquationError,
  runningBalanceIssues,
} from "@xenboox/db/lib";

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
  categoryConfidence?: number;
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
  /** Deterministic validation failures — must block the import. */
  fatalErrors: string[];
}

// ─── Main Parser ───────────────────────────────────────────────────────────

export function parseBankCSV(content: string): ParseResult {
  const lines = content.split("\n").filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    return emptyResult("CSV has fewer than 2 lines", true);
  }

  // Detect delimiter
  const delimiter = detectDelimiter(lines[0] ?? "");

  // Find header row (skip metadata rows from some banks)
  const headerIndex = findHeaderRow(lines, delimiter);
  if (headerIndex === -1) {
    return emptyResult("Could not find header row in CSV", true);
  }

  // Parse header columns
  const headers = parseCSVLine(lines[headerIndex] ?? "", delimiter).map((h) =>
    h.trim().toLowerCase(),
  );

  // Map columns
  const columnMap = mapColumns(headers);

  // Parse metadata (bank name, account number, etc.) from rows before header
  const metadata = parseMetadata(lines.slice(0, headerIndex));

  // Parse transaction rows. `prevBalance` is threaded through the loop so a
  // single-amount column can infer direction deterministically from the
  // running-balance delta instead of guessing from the sign.
  const transactions: ParsedTransaction[] = [];
  const parseErrors: string[] = [];
  let prevBalance: number | undefined = metadata.openingBalance;

  for (let i = headerIndex + 1; i < lines.length; i++) {
    const line = lines[i]?.trim() ?? "";
    if (!line) continue;

    // Skip summary rows (some banks add totals at the end)
    if (isSummaryRow(line)) continue;

    try {
      const cells = parseCSVLine(line, delimiter);
      const tx = parseTransactionRow(cells, columnMap, prevBalance);
      if (tx) {
        transactions.push(tx);
        if (tx.balance !== undefined) prevBalance = tx.balance;
      }
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

  // Auto-categorize transactions with the shared, direction-aware
  // categorizer (canonical taxonomy). Only confident matches (>= 0.7) are
  // surfaced — everything else stays "Uncategorized" for rule/human review.
  transactions.forEach((tx) => {
    const match = categorizeByDescription({
      description: tx.description,
      amount: tx.amount,
      type: tx.type,
    });
    if (match && match.confidence >= 0.7) {
      tx.category = match.category;
      tx.categoryConfidence = match.confidence;
    } else {
      tx.category = undefined;
      tx.categoryConfidence = undefined;
    }
  });

  // ── Deterministic validation (TrustGuard) ──
  // Failures here mean the extracted rows cannot be trusted — the caller
  // must block the import rather than write garbage into the books.
  const fatalErrors: string[] = [];

  // Header diagnostics: if the required columns couldn't be mapped, name
  // what we looked for instead of silently producing zero rows.
  if (columnMap.date === -1 || columnMap.description === -1) {
    fatalErrors.push(
      `Could not map required columns from header: "${headers.join('", "')}". ` +
        'Expected columns such as "Date", "Description"/"Narration", and "Amount".',
    );
  }

  // Balance equation: the gold-standard check when opening/closing balances
  // are declared in the statement metadata.
  const eqError = balanceEquationError({
    openingBalance: metadata.openingBalance,
    closingBalance: metadata.closingBalance,
    totalCredits,
    totalDebits,
  });
  if (eqError) fatalErrors.push(eqError);

  const hasEquation =
    metadata.openingBalance !== undefined &&
    metadata.closingBalance !== undefined;

  // Running-balance consistency: the deterministic fallback when
  // opening/closing balances are absent.
  const rb = runningBalanceIssues(transactions);
  if (hasEquation) {
    parseErrors.push(...rb.warnings);
  } else {
    fatalErrors.push(...rb.fatal);
    parseErrors.push(...rb.warnings);
  }

  // Zero rows despite content — extraction produced nothing usable.
  if (transactions.length === 0 && headerIndex + 1 < lines.length) {
    fatalErrors.push(
      "No transactions could be parsed from the statement despite having content — " +
        "the file may be corrupted or in an unsupported format",
    );
  }

  // All amounts zero — extraction may have failed silently.
  if (totalCredits === 0 && totalDebits === 0 && transactions.length > 0) {
    fatalErrors.push(
      "All transaction amounts are zero — extraction may have failed",
    );
  }

  // No balance information at all — nothing was cross-validated. Surface
  // the gap instead of pretending the import is verified.
  if (!hasEquation && columnMap.balance === undefined) {
    parseErrors.push(
      "Statement provides no balance information — amounts could not be cross-validated",
    );
  }

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
    fatalErrors,
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
    if (result.date === -1 && datePatterns.some((p) => matchesHeader(h, p)))
      result.date = i;
    if (
      result.description === -1 &&
      descPatterns.some((p) => matchesHeader(h, p))
    )
      result.description = i;
    if (!result.reference && refPatterns.some((p) => matchesHeader(h, p)))
      result.reference = i;
    if (!result.debit && debitPatterns.some((p) => matchesHeader(h, p)))
      result.debit = i;
    if (!result.credit && creditPatterns.some((p) => matchesHeader(h, p)))
      result.credit = i;
    if (!result.amount && amountPatterns.some((p) => matchesHeader(h, p)))
      result.amount = i;
    if (!result.balance && balancePatterns.some((p) => matchesHeader(h, p)))
      result.balance = i;
  }

  return result;
}

/**
 * Header/pattern matcher. Long patterns match as substrings ("value date"
 * inside "Transaction Value Date"), but the 2-letter abbreviations "cr" /
 * "dr" must match as WHOLE WORDS — substring matching makes "description"
 * contain "cr" and silently hijack the credit column map.
 */
function matchesHeader(header: string, pattern: string): boolean {
  if (pattern.length <= 2) {
    return new RegExp(`(^|\\W)${pattern}(\\W|$)`, "i").test(header);
  }
  return header.includes(pattern);
}

// ─── Transaction Row Parsing ───────────────────────────────────────────────

function parseTransactionRow(
  cells: string[],
  columnMap: ColumnMap,
  prevBalance?: number,
): ParsedTransaction | null {
  if (columnMap.date === -1 || columnMap.description === -1) return null;

  const dateStr = cells[columnMap.date]?.trim();
  const description = cells[columnMap.description]?.trim();

  if (!dateStr || !description) return null;

  const date = parseDate(dateStr);
  if (!date) return null;

  // Balance is parsed early — a single-amount column can infer direction
  // deterministically from the running-balance delta (balance went down →
  // money left → debit) instead of guessing from the number's sign.
  const balance =
    columnMap.balance !== undefined
      ? parseFloat(
          cells[columnMap.balance]?.trim().replace(/[, ]/g, "") ?? "",
        ) || undefined
      : undefined;

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

    if (
      balance !== undefined &&
      prevBalance !== undefined &&
      balance !== prevBalance
    ) {
      // Deterministic: the running balance tells us which way money moved.
      // Many banks (African + US exports alike) print debits as positive
      // numbers in a single "Amount" column, so the sign is not reliable.
      type = balance < prevBalance ? "debit" : "credit";
    } else {
      // No balance delta to lean on — fall back to the sign convention.
      type =
        amountStr.startsWith("-") || amountStr.startsWith("(")
          ? "debit"
          : "credit";
    }
  }

  if (amount === 0) return null;

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
        return disambiguateDayFirstDate(
          match[1] ?? "",
          match[2] ?? "",
          match[3] ?? "",
        );
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

/**
 * Disambiguates DD/MM/YYYY vs MM/DD/YYYY numerically instead of guessing:
 *  - first field > 12 → it cannot be a month → day-first (DD/MM)
 *  - second field > 12 → it cannot be a month → month-first (MM/DD)
 *  - both ≤ 12 → ambiguous → day-first (dominant across target banks)
 *
 * Returns null when the layout is impossible (both fields > 12).
 */
function disambiguateDayFirstDate(
  first: string,
  second: string,
  year: string,
): string | null {
  const firstNum = Number(first);
  const secondNum = Number(second);

  let day = firstNum;
  let month = secondNum;

  // Second field can't be a month → it's the day (e.g. 02/13/2024 = Feb 13).
  if (secondNum > 12 && firstNum <= 12) {
    day = secondNum;
    month = firstNum;
  }

  if (month > 12 || month < 1 || day < 1 || day > 31) return null;

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
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

function emptyResult(error: string, fatal = false): ParseResult {
  return {
    transactions: [],
    totalCredits: 0,
    totalDebits: 0,
    rowCount: 0,
    parseErrors: fatal ? [] : [error],
    fatalErrors: fatal ? [error] : [],
  };
}
