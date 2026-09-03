/**
 * Bank PDF Statement Parser
 *
 * Extracts transaction data from PDF bank statements.
 * Uses PDF.js text extraction + pattern matching for structured tables.
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

export function parseBankStatementPDF(text: string): ParseResult {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 5) {
    return emptyResult("PDF text too short to be a bank statement", true);
  }

  // Detect bank from header
  const bankName = detectBank(lines);

  // Extract metadata
  const metadata = extractMetadata(lines, bankName);

  // Find transaction table boundaries (-1 → no table header found)
  const tableStart = findTableStart(lines);
  const tableEnd = findTableEnd(lines, Math.max(0, tableStart));

  // Parse transactions
  const transactions: ParsedTransaction[] = [];
  const parseErrors: string[] = [];
  const fatalErrors: string[] = [];

  // When the transaction table header can't be located, name the problem
  // instead of silently attempting garbage extraction.
  if (tableStart === -1) {
    fatalErrors.push(
      "Could not locate the transaction table header (Date / Description / Amount) in the statement",
    );
  }

  for (let i = Math.max(0, tableStart); i < tableEnd; i++) {
    try {
      const tx = parseTransactionLine(lines[i] ?? "", lines[i + 1]);
      if (tx) {
        transactions.push(tx);
      }
    } catch (e) {
      parseErrors.push(
        `Line ${i + 1}: ${e instanceof Error ? e.message : "parse error"}`,
      );
    }
  }

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

  // Balance equation: opening + credits - debits ≈ closing balance. The
  // gold-standard check that catches garbled OCR extraction.
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
  if (transactions.length === 0 && lines.length > 10) {
    fatalErrors.push(
      "No transactions found in statement despite having content — file may be corrupted or in an unsupported format",
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
  if (!hasEquation && transactions.every((t) => t.balance === undefined)) {
    parseErrors.push(
      "Statement provides no balance information — amounts could not be cross-validated",
    );
  }

  return {
    transactions,
    accountNumber: metadata.accountNumber,
    bankName: metadata.bankName ?? bankName,
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

// ─── Bank Detection ────────────────────────────────────────────────────────

function detectBank(lines: string[]): string | undefined {
  const headerText = lines.slice(0, 20).join(" ").toLowerCase();

  const banks: [RegExp, string][] = [
    [/guaranty trust|gtbank|gt bank/i, "GTBank"],
    [/access bank|accessbank/i, "Access Bank"],
    [/zenith bank|zenithbank/i, "Zenith Bank"],
    [/united bank for africa|uba/i, "UBA"],
    [/first bank|firstbank|first bank of nigeria/i, "First Bank"],
    [/fidelity bank/i, "Fidelity Bank"],
    [/sterling bank/i, "Sterling Bank"],
    [/wema bank/i, "Wema Bank"],
    [/polaris bank/i, "Polaris Bank"],
    [/ecobank/i, "Ecobank"],
    [/standard chartered/i, "Standard Chartered"],
    [/absa|absa bank/i, "ABSA"],
    [/nedbank/i, "Nedbank"],
    [/fnb|first national bank/i, "FNB"],
    [/capitec/i, "Capitec"],
    [/standard bank/i, "Standard Bank"],
    [/equity bank/i, "Equity Bank"],
    [/kcb|kenya commercial bank/i, "KCB"],
    [/cooperative bank/i, "Cooperative Bank"],
    [/equitel/i, "Equitel"],
    [/ncba bank/i, "NCBA"],
    [/dtb|diamond trust bank/i, "DTB"],
    [/bank of africa|boa/i, "Bank of Africa"],
    [/ncb|national commercial bank/i, "NCB"],
    [/scotia bank|scotiabank/i, "Scotiabank"],
    [/citibank|citizen/i, "Citibank"],
    [/hsbc/i, "HSBC"],
    [/barclays/i, "Barclays"],
    [/bank of ghana|boa gh/i, "Bank of Ghana"],
  ];

  for (const [pattern, name] of banks) {
    if (pattern.test(headerText)) return name;
  }

  return undefined;
}

// ─── Metadata Extraction ──────────────────────────────────────────────────

function extractMetadata(
  lines: string[],
  bankName: string | undefined,
): {
  accountNumber?: string;
  bankName?: string;
  statementPeriod?: { start: string; end: string };
  openingBalance?: number;
  closingBalance?: number;
  currency?: string;
} {
  const headerLines = lines.slice(0, 30).join(" ");
  const metadata: ReturnType<typeof extractMetadata> = { bankName };

  // Account number
  const accPatterns = [
    /account[:\s#]*(\d[\d\s-]*\d)/i,
    /a\/c[:\s#]*(\d[\d\s-]*\d)/i,
    /acct[:\s#]*(\d[\d\s-]*\d)/i,
    /number[:\s]*(\d{8,})/i,
  ];
  for (const pat of accPatterns) {
    const m = headerLines.match(pat);
    if (m) {
      metadata.accountNumber = (m[1] ?? "").replace(/[\s-]/g, "");
      break;
    }
  }

  // Statement period
  const periodPatterns = [
    /statement\s+period[:\s]*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})\s*(?:to|-)\s*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i,
    /from[:\s]*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})\s*(?:to|-)\s*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/i,
    /(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})\s*(?:to|-)\s*(\d{1,2}[\/-]\d{1,2}[\/-]\d{2,4})/,
  ];
  for (const pat of periodPatterns) {
    const m = headerLines.match(pat);
    if (m) {
      metadata.statementPeriod = {
        start: normalizeDate(m[1] ?? ""),
        end: normalizeDate(m[2] ?? ""),
      };
      break;
    }
  }

  // Opening/closing balance
  const openMatch = headerLines.match(/opening\s+balance[:\s]*([\d,]+\.?\d*)/i);
  if (openMatch)
    metadata.openingBalance = parseFloat(
      (openMatch[1] ?? "").replace(/,/g, ""),
    );

  const closeMatch = headerLines.match(
    /closing\s+balance[:\s]*([\d,]+\.?\d*)/i,
  );
  if (closeMatch)
    metadata.closingBalance = parseFloat(
      (closeMatch[1] ?? "").replace(/,/g, ""),
    );

  // Currency
  const curMatch = headerLines.match(/currency[:\s]*(\w{3})/i);
  if (curMatch) metadata.currency = (curMatch[1] ?? "").toUpperCase();

  return metadata;
}

// ─── Table Detection ──────────────────────────────────────────────────────

function findTableStart(lines: string[]): number {
  const headerKeywords = [
    "date",
    "description",
    "debit",
    "credit",
    "balance",
    "amount",
    "narration",
  ];

  for (let i = 0; i < lines.length; i++) {
    const lower = (lines[i] ?? "").toLowerCase();
    const matchCount = headerKeywords.filter((kw) => lower.includes(kw)).length;
    if (matchCount >= 2) return i + 1;
  }

  // -1 signals "no table header found" so the caller can fail loudly
  // instead of attempting garbage extraction from arbitrary lines.
  return -1;
}

function findTableEnd(lines: string[], start: number): number {
  for (let i = lines.length - 1; i >= start; i--) {
    const lower = (lines[i] ?? "").toLowerCase();
    if (
      lower.includes("total") ||
      lower.includes("closing balance") ||
      lower.includes("summary")
    ) {
      return i;
    }
  }
  return lines.length;
}

// ─── Transaction Line Parsing ─────────────────────────────────────────────

function parseTransactionLine(
  line: string,
  nextLine: string | undefined,
): ParsedTransaction | null {
  // Try to match various transaction line formats
  // Format 1: DD/MM/YYYY  Description  Amount  Balance
  // Format 2: DD Mon YYYY  Description  Debit  Credit  Balance
  // Format 3: YYYY-MM-DD  Description  Amount  Balance

  const datePatterns = [
    // DD/MM/YYYY or DD-MM-YYYY
    /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/,
    // YYYY-MM-DD
    /(\d{4}-\d{2}-\d{2})/,
    // DD Mon YYYY
    /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{4})/i,
  ];

  let dateStr: string | undefined;
  let dateEndIndex = 0;

  for (const pat of datePatterns) {
    const m = line.match(pat);
    if (m) {
      dateStr = m[1];
      dateEndIndex = (m.index ?? 0) + m[0].length;
      break;
    }
  }

  if (!dateStr) return null;

  const date = parseDate(dateStr);
  if (!date) return null;

  // Extract the rest of the line after the date
  const rest = line.slice(dateEndIndex).trim();

  // Try to find amounts (look for numbers with optional commas and decimals)
  const amountPattern = /([\d,]+\.?\d{0,2})/g;
  const amounts: { value: number; index: number }[] = [];

  let m;
  while ((m = amountPattern.exec(rest)) !== null) {
    const val = parseFloat((m[1] ?? "").replace(/,/g, ""));
    if (!isNaN(val) && val > 0) {
      amounts.push({ value: val, index: m.index });
    }
  }

  if (amounts.length === 0) return null;

  // Description is everything before the first number
  const firstAmountIndex = amounts[0]?.index ?? 0;
  let description = rest.slice(0, firstAmountIndex).trim();

  // If description is empty, try the next line
  if (!description && nextLine) {
    const nextDatePattern =
      /\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+\d{4}/i;
    if (!nextDatePattern.test(nextLine)) {
      description = nextLine.trim();
    }
  }

  if (!description) return null;

  // Clean description
  description = description.replace(/\s+/g, " ").trim();

  // Determine credit/debit/amount/balance
  let amount = 0;
  let type: "credit" | "debit" = "debit";
  let balance: number | undefined;

  if (amounts.length === 1) {
    // Single amount — check if it's negative
    const lineHasMinus = rest.includes("-") || rest.includes("(");
    amount = amounts[0]!.value;
    type = lineHasMinus ? "debit" : "credit";
  } else if (amounts.length === 2) {
    // Two amounts: debit and credit, or amount and balance
    // Heuristic: if the description suggests a credit, it's credit
    const isCredit =
      /deposit|credit|transfer in|salary|payment received|interest earned/i.test(
        description,
      );
    const isDebit =
      /withdrawal|debit|transfer out|fee|charge|tax|payment made/i.test(
        description,
      );

    if (isCredit) {
      amount = amounts[0]!.value;
      type = "credit";
      balance = amounts[1]!.value;
    } else if (isDebit) {
      amount = amounts[0]!.value;
      type = "debit";
      balance = amounts[1]!.value;
    } else {
      // Default: first is amount, second is balance
      amount = amounts[0]!.value;
      type = /fee|charge|tax|interest|withdrawal/i.test(description)
        ? "debit"
        : "credit";
      balance = amounts[1]!.value;
    }
  } else if (amounts.length >= 3) {
    // Three amounts: debit, credit, balance
    // Or: amount, fee, balance
    const creditCol = amounts.find((a) => {
      const before = rest.slice(Math.max(0, a.index - 5), a.index);
      return /credit|deposit|cr/i.test(before);
    });
    const debitCol = amounts.find((a) => {
      const before = rest.slice(Math.max(0, a.index - 5), a.index);
      return /debit|withdrawal|dr/i.test(before);
    });

    if (creditCol && creditCol.value > 0) {
      amount = creditCol.value;
      type = "credit";
    } else if (debitCol && debitCol.value > 0) {
      amount = debitCol.value;
      type = "debit";
    } else {
      // Fallback: use first amount
      amount = amounts[0]!.value;
      type = /fee|charge|tax|interest|withdrawal/i.test(description)
        ? "debit"
        : "credit";
    }

    // Last amount is likely balance
    balance = amounts[amounts.length - 1]!.value;
  }

  if (amount === 0) return null;

  return {
    date,
    description,
    amount,
    type,
    balance,
  };
}

// ─── Date Parsing ──────────────────────────────────────────────────────────

function parseDate(dateStr: string): string | null {
  const formats = [
    /(\d{4})-(\d{2})-(\d{2})/,
    /(\d{2})\/(\d{2})\/(\d{4})/,
    /(\d{2})-(\d{2})-(\d{4})/,
    /(\d{2})\.(\d{2})\.(\d{4})/,
    /(\d{2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(\d{4})/i,
  ];

  for (const fmt of formats) {
    const match = dateStr.match(fmt);
    if (match) {
      if (fmt === formats[0]) return match[0];
      if (fmt === formats[1] || fmt === formats[2] || fmt === formats[3]) {
        return disambiguateDayFirstDate(
          match[1] ?? "",
          match[2] ?? "",
          match[3] ?? "",
        );
      }
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
        if (month) return `${match[3]!}-${month}-${match[1]!.padStart(2, "0")}`;
      }
    }
  }

  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime()))
    return parsed.toISOString().split("T")[0] ?? null;

  return null;
}

function normalizeDate(dateStr: string): string {
  return parseDate(dateStr) ?? dateStr;
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

// ─── Helpers ───────────────────────────────────────────────────────────────

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
