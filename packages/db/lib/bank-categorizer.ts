// ─── Bank Transaction Categorizer ──────────────────────────────────────────
//
// Single source of truth for bank-transaction categorization across the
// platform. Used by:
//   - apps/web banking router  (autoCategorize / batchCategorize)
//   - packages/jobs parsers    (statement CSV/PDF import)
//   - packages/jobs sync jobs  (plaid / mono — provider category mapping)
//
// Conventions locked in Sub-Part B:
//   bank_transactions.amount = POSITIVE magnitude
//   bank_transactions.type   = deposit | withdrawal | transfer | fee | interest
// Direction is carried by `type`, NEVER by the sign of `amount`.

import type { BankTxType } from "./bank-amount";

// Canonical display taxonomy — matches the UI color map + common-category list.
export const CANONICAL_CATEGORIES = [
  "Uncategorized",
  "Office Supplies",
  "Travel & Transport",
  "Meals & Entertainment",
  "Software & Subscriptions",
  "Professional Services",
  "Utilities",
  "Revenue",
  "Payroll",
  "Bank Fees",
  "Marketing",
  "Rent & Lease",
  "Insurance",
  "Taxes",
  "Cost of Goods Sold",
  "Mobile Money",
  "Transfer",
  "Interest",
  "Other",
] as const;

export type CanonicalCategory = (typeof CANONICAL_CATEGORIES)[number];

export interface CategoryMatch {
  category: string;
  confidence: number; // 0..1
  categorizedBy: "rule" | "ai" | "manual";
  glAccountId?: string | null;
}

export interface CategorizeInput {
  description: string;
  reference?: string | null;
  amount?: string | number | null;
  type?: string | null; // BankTxType | "credit" | "debit" | "unknown"
  providerCategory?: string | null; // e.g. Plaid personal_finance_category
}

export interface BankRuleLike {
  matchType: string;
  matchValue: string;
  category: string;
  glAccountId?: string | null;
  priority?: number;
}

// Money-in types (credit to the account).
const INCOMING: ReadonlySet<string> = new Set([
  "deposit",
  "interest",
  "credit",
]);

function isIncoming(type?: string | null): boolean {
  if (!type) return false;
  return INCOMING.has(type.toLowerCase());
}

function isOutgoing(type?: string | null): boolean {
  if (!type) return false;
  return ["withdrawal", "debit", "fee", "transfer"].includes(
    type.toLowerCase(),
  );
}

// ─── Provider category → canonical mapping ─────────────────────────────────
// Plaid personal_finance_category + Mono/parser categories best-effort mapped
// into the canonical taxonomy. Exact strings are matched first; falls back to
// a case-insensitive substring scan.

const PROVIDER_EXACT: Record<string, string> = {
  // Plaid personal_finance_category (top-level + detailed)
  TRANSFER_IN: "Revenue",
  TRANSFER_OUT: "Transfer",
  LOAN_PAYMENTS: "Transfer",
  BANK_FEES: "Bank Fees",
  ENTERTAINMENT: "Meals & Entertainment",
  FOOD_AND_DRINK: "Meals & Entertainment",
  GENERAL_MERCHANDISE: "Office Supplies",
  GENERAL_SERVICES: "Professional Services",
  GOVERNMENT_AND_NON_PROFIT: "Taxes",
  HOME_IMPROVEMENT: "Office Supplies",
  INCOME: "Revenue",
  MEDICAL: "Professional Services",
  PERSONAL_CARE: "Office Supplies",
  RENT_AND_UTILITIES: "Rent & Lease",
  TRANSPORTATION: "Travel & Transport",
  TRAVEL: "Travel & Transport",
  // Mono categories (freeform — sample corpus)
  Utility: "Utilities",
  Utilities: "Utilities",
  Transport: "Travel & Transport",
  Shopping: "Office Supplies",
  "Food & Drinks": "Meals & Entertainment",
  "Food and Drink": "Meals & Entertainment",
  Airtime: "Telecom",
  Data: "Software & Subscriptions",
  Transfer: "Transfer",
  Salary: "Revenue",
  Payout: "Revenue",
  Income: "Revenue",
  Loan: "Transfer",
  Fees: "Bank Fees",
  "Bank Charges": "Bank Fees",
  Tax: "Taxes",
  Rent: "Rent & Lease",
};

// Substring signals: provider string fragment → canonical category.
const PROVIDER_FRAGMENTS: Array<[RegExp, string, number]> = [
  [/electric|power|water|utility|utilities|nawec|nedco/i, "Utilities", 0.9],
  [/rent|lease/i, "Rent & Lease", 0.9],
  [/salary|payroll|wage/i, "Payroll", 0.9],
  [/stripe|paypal|payment.?fee|bank.?fee|service.?charge/i, "Bank Fees", 0.8],
  [/tax|vat|paye|withholding/i, "Taxes", 0.85],
  [/insurance/i, "Insurance", 0.9],
  [
    /uber|lyft|bolt|taxi|fuel|petrol|diesel|transport|bus|train/i,
    "Travel & Transport",
    0.8,
  ],
  [/airtime|telecom|mobile.*data/i, "Telecom", 0.8],
  [
    /food|restaurant|meal|cafe|coffee|bar|grocery|supermarket/i,
    "Meals & Entertainment",
    0.8,
  ],
  [
    /software|saas|subscription|hosting|cloud|adobe|microsoft|google|netflix|spotify/i,
    "Software & Subscriptions",
    0.8,
  ],
  [/office|supplies|stationery|furniture/i, "Office Supplies", 0.8],
  [/marketing|advert|ads?|facebook|google.*ads/i, "Marketing", 0.8],
  [/travel|hotel|flight|airline|booking/i, "Travel & Transport", 0.85],
  [/interest/i, "Interest", 0.95],
  [/refund|reversal|payout|settlement/i, "Revenue", 0.7],
];

/**
 * Map a provider-supplied category (Plaid/Mono/parser raw category) into the
 * canonical taxonomy. Returns null when unmappable — the caller falls back to
 * description heuristics rather than guessing.
 */
export function mapProviderCategory(
  providerCategory?: string | null,
): { category: string; confidence: number } | null {
  if (!providerCategory) return null;
  const trimmed = providerCategory.trim();
  if (!trimmed) return null;

  // Exact (case-insensitive) hit on the lookup table.
  const exact =
    PROVIDER_EXACT[trimmed] ??
    PROVIDER_EXACT[trimmed.toLowerCase()] ??
    Object.entries(PROVIDER_EXACT).find(
      ([k]) => k.toLowerCase() === trimmed.toLowerCase(),
    )?.[1];
  if (exact) return { category: exact, confidence: 0.85 };

  // Some providers send the detailed Plaid path "GENERAL_MERCHANDISE:SUPERMARKETS"
  // where the first segment is the authoritative primary category — resolve
  // that BEFORE the fragment scan so the primary wins over a subcategory word.
  const colon = trimmed.indexOf(":");
  if (colon > 0) {
    const primary = mapProviderCategory(trimmed.slice(0, colon));
    if (primary) return primary;
  }

  // Fragment scan (covers full sentences + unmapped freeform categories).
  for (const [re, category, confidence] of PROVIDER_FRAGMENTS) {
    if (re.test(trimmed)) return { category, confidence };
  }

  return null;
}

// ─── Description keyword heuristics ────────────────────────────────────────
// Direction-aware: deposit/interest types can only match income-ish categories;
// expense keywords apply to withdrawals/fees/transfers. Exact-substring
// heuristics are ordered by confidence. Returns a CategoryMatch or null when
// the description is not confidently classifiable.

const EXPENSE_KEYWORDS: Array<[RegExp, string, number]> = [
  [/^(rent|lease)\b/i, "Rent & Lease", 0.95],
  [/electric|electricity|power bill|nedco|nawec|water bill/i, "Utilities", 0.9],
  [/internet|broadband|wifi|isp\b/i, "Software & Subscriptions", 0.85],
  [/payroll|salary|wage|ssnit|social security/i, "Payroll", 0.92],
  [/tax|vat|paye|withholding|customs/i, "Taxes", 0.9],
  [/insurance|premium/i, "Insurance", 0.9],
  [
    /bank fee|service fee|monthly fee|account fee|overdraft fee|card fee/i,
    "Bank Fees",
    0.95,
  ],
  [/stripe|paypal|processor|merchant fee|gateway/i, "Bank Fees", 0.8],
  [/uber|lyft|bolt|taxi|cab\b/i, "Travel & Transport", 0.85],
  [/fuel|petrol|diesel|gas station/i, "Travel & Transport", 0.85],
  [/airtime|mtn|vodafone|airtel|glo\b/i, "Telecom", 0.8],
  [
    /restaurant|food|meal|cafe|coffee|bar|grill|pizza|grocer|supermarket/i,
    "Meals & Entertainment",
    0.8,
  ],
  [/hotel|flight|airline|booking\.com|travel/i, "Travel & Transport", 0.85],
  [
    /software|saas|subscription|hosting|cloud|adobe|figma|slack|notion|github/i,
    "Software & Subscriptions",
    0.85,
  ],
  [/office|stationery|supplies|printer|furniture/i, "Office Supplies", 0.8],
  [
    /marketing|facebook ads|google ads|advert|sponsored|广告/i,
    "Marketing",
    0.8,
  ],
  [
    /lawyer|legal|attorney|consultant|accountant|audit|notary/i,
    "Professional Services",
    0.85,
  ],
  [/freight|shipping|delivery|courier|logistics/i, "Cost of Goods Sold", 0.7],
  [/stock|inventory|raw material|wholesale/i, "Cost of Goods Sold", 0.7],
];

const INCOME_KEYWORDS: Array<[RegExp, string, number]> = [
  [/client payment|invoice|payment received|acme|receipt/i, "Revenue", 0.85],
  [/refund|reversal|chargeback/i, "Revenue", 0.85],
  [/payout|settlement|sales proceeds/i, "Revenue", 0.8],
  [/interest/i, "Interest", 0.95],
  [/dividend/i, "Interest", 0.8],
];

/**
 * Pure description+type classifier. Deterministic, no LLM, no DB. Used by the
 * routers (after rules) and the parsers (when no rules exist).
 */
export function categorizeByDescription(
  input: CategorizeInput,
): CategoryMatch | null {
  const desc = (input.description ?? "").trim().toLowerCase();
  if (!desc) return null;

  // Provider category is the strongest non-rule signal — try it first.
  const provider = mapProviderCategory(input.providerCategory);
  if (provider) {
    return {
      category: provider.category,
      confidence: provider.confidence,
      categorizedBy: "ai",
    };
  }

  const incoming = isIncoming(input.type);
  const outgoing = isOutgoing(input.type);
  const unknown = !incoming && !outgoing;

  // Money in: income keywords only.
  if (incoming || (unknown && !input.type)) {
    for (const [re, category, confidence] of INCOME_KEYWORDS) {
      if (re.test(desc)) {
        return { category, confidence, categorizedBy: "ai" };
      }
    }
  }

  // Money out + unknown-direction descriptions: expense keywords.
  // Transfers between own accounts should never be expensed, but we can't
  // know ownership from a description alone — classify as transfer when the
  // description clearly says so.
  if (outgoing || unknown || !input.type) {
    if (
      /transfer to|transfer from|own account|savings acct|between accounts/i.test(
        desc,
      )
    ) {
      return { category: "Transfer", confidence: 0.9, categorizedBy: "ai" };
    }
    for (const [re, category, confidence] of EXPENSE_KEYWORDS) {
      if (re.test(desc)) {
        return { category, confidence, categorizedBy: "ai" };
      }
    }
  }

  return null;
}

/**
 * Direction normalization: statements/CSV come in as credit/debit; sync jobs
 * as deposit/withdrawal/transfer/fee/interest. Normalize to BankTxType.
 */
export function normalizeTxType(type?: string | null): BankTxType | null {
  if (!type) return null;
  switch (type.toLowerCase()) {
    case "deposit":
    case "credit":
      return "deposit";
    case "withdrawal":
    case "debit":
      return "withdrawal";
    case "transfer":
      return "transfer";
    case "fee":
      return "fee";
    case "interest":
      return "interest";
    default:
      return null;
  }
}

/**
 * Match an entity's user-defined rules against a transaction. Rules outrank
 * heuristics (they encode the user's explicit intent). Returns the best
 * (highest priority) matching rule.
 */
export function matchBankRules(
  tx: CategorizeInput,
  rules: BankRuleLike[],
): CategoryMatch | null {
  const desc = (tx.description ?? "").toLowerCase();
  const reference = (tx.reference ?? "").toLowerCase();
  const amount = tx.amount == null ? NaN : Number(tx.amount);
  const txType = normalizeTxType(tx.type);

  const sorted = [...rules].sort(
    (a, b) => (a.priority ?? 0) - (b.priority ?? 0),
  );

  for (const rule of sorted) {
    const matchVal = rule.matchValue.toLowerCase();
    let matches = false;

    switch (rule.matchType) {
      case "description_contains":
        matches = desc.includes(matchVal);
        break;
      case "description_equals":
        matches = desc === matchVal;
        break;
      case "reference_contains":
        matches = reference.includes(matchVal);
        break;
      case "amount_equals":
        // Direction-aware: amount rules only apply to matching direction.
        if (isAmountRuleForDirection(rule, txType)) {
          matches = !Number.isNaN(amount) && amount === Number(rule.matchValue);
        }
        break;
      case "amount_above":
        if (isAmountRuleForDirection(rule, txType)) {
          matches = !Number.isNaN(amount) && amount > Number(rule.matchValue);
        }
        break;
      case "amount_below":
        if (isAmountRuleForDirection(rule, txType)) {
          matches = !Number.isNaN(amount) && amount < Number(rule.matchValue);
        }
        break;
    }

    if (matches) {
      return {
        category: rule.category,
        glAccountId: rule.glAccountId ?? null,
        categorizedBy: "rule",
        confidence: 0.98,
      };
    }
  }
  return null;
}

/**
 * Amount rules are ambiguous about direction. When the rule's matchValue is
 * explicitly signed (+ means income, - means expense) we honor it; otherwise
 * the rule applies to any transaction (legacy behavior) — direction filtering
 * happens through description rules.
 */
function isAmountRuleForDirection(
  rule: BankRuleLike,
  txType: BankTxType | null,
): boolean {
  const v = rule.matchValue.trim();
  if (v.startsWith("+")) {
    return txType === "deposit" || txType === "interest";
  }
  if (v.startsWith("-")) {
    return txType === "withdrawal" || txType === "fee";
  }
  return true; // unsigned — legacy: applies to both directions
}
