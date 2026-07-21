export type COAAccount = {
  code: string;
  name: string;
  type: "asset" | "liability" | "equity" | "revenue" | "expense";
  subtype: string;
  description?: string;
};

export type COATemplate = {
  id: string;
  label: string;
  description: string;
  accounts: COAAccount[];
};

export const COA_TEMPLATES: COATemplate[] = [
  {
    id: "trading",
    label: "Trading Business",
    description: "Standard accounts for retail/trading businesses",
    accounts: [
      { code: "1000", name: "Cash", type: "asset", subtype: "cash" },
      {
        code: "1010",
        name: "Bank Account",
        type: "asset",
        subtype: "bank_account",
      },
      {
        code: "1020",
        name: "Accounts Receivable",
        type: "asset",
        subtype: "accounts_receivable",
      },
      { code: "1030", name: "Inventory", type: "asset", subtype: "inventory" },
      {
        code: "1040",
        name: "Prepaid Expenses",
        type: "asset",
        subtype: "prepaid",
      },
      {
        code: "1100",
        name: "Fixed Assets",
        type: "asset",
        subtype: "fixed_asset",
      },
      {
        code: "1200",
        name: "Accumulated Depreciation",
        type: "asset",
        subtype: "fixed_asset",
        description: "Contra-asset",
      },
      {
        code: "2000",
        name: "Accounts Payable",
        type: "liability",
        subtype: "accounts_payable",
      },
      {
        code: "2010",
        name: "Accrued Expenses",
        type: "liability",
        subtype: "accrued_liability",
      },
      {
        code: "2020",
        name: "Tax Payable",
        type: "liability",
        subtype: "tax_liability",
      },
      {
        code: "2100",
        name: "Long-term Loan",
        type: "liability",
        subtype: "long_term_liability",
      },
      {
        code: "3000",
        name: "Owner Equity",
        type: "equity",
        subtype: "owner_equity",
      },
      {
        code: "3100",
        name: "Retained Earnings",
        type: "equity",
        subtype: "retained_earnings",
      },
      {
        code: "4000",
        name: "Sales Revenue",
        type: "revenue",
        subtype: "sales_revenue",
      },
      {
        code: "4100",
        name: "Other Income",
        type: "revenue",
        subtype: "other_income",
      },
      {
        code: "5000",
        name: "Cost of Goods Sold",
        type: "expense",
        subtype: "cost_of_goods_sold",
      },
      {
        code: "5100",
        name: "Operating Expenses",
        type: "expense",
        subtype: "operating_expense",
      },
      {
        code: "5200",
        name: "Payroll Expenses",
        type: "expense",
        subtype: "payroll_expense",
      },
      {
        code: "5300",
        name: "Tax Expense",
        type: "expense",
        subtype: "tax_expense",
      },
      {
        code: "5400",
        name: "Depreciation",
        type: "expense",
        subtype: "depreciation",
      },
      {
        code: "5500",
        name: "Interest Expense",
        type: "expense",
        subtype: "interest_expense",
      },
      {
        code: "5900",
        name: "Other Expense",
        type: "expense",
        subtype: "other_expense",
      },
    ],
  },
  {
    id: "services",
    label: "Services Business",
    description: "Standard accounts for consultancy/services businesses",
    accounts: [
      { code: "1000", name: "Cash", type: "asset", subtype: "cash" },
      {
        code: "1010",
        name: "Bank Account",
        type: "asset",
        subtype: "bank_account",
      },
      {
        code: "1020",
        name: "Accounts Receivable",
        type: "asset",
        subtype: "accounts_receivable",
      },
      {
        code: "1030",
        name: "Prepaid Expenses",
        type: "asset",
        subtype: "prepaid",
      },
      {
        code: "1100",
        name: "Office Equipment",
        type: "asset",
        subtype: "fixed_asset",
      },
      {
        code: "1200",
        name: "Accumulated Depreciation",
        type: "asset",
        subtype: "depreciation",
        description: "Contra-asset",
      },
      {
        code: "2000",
        name: "Accounts Payable",
        type: "liability",
        subtype: "accounts_payable",
      },
      {
        code: "2010",
        name: "Accrued Expenses",
        type: "liability",
        subtype: "accrued_liability",
      },
      {
        code: "2020",
        name: "Tax Payable",
        type: "liability",
        subtype: "tax_liability",
      },
      {
        code: "3000",
        name: "Owner Equity",
        type: "equity",
        subtype: "owner_equity",
      },
      {
        code: "3100",
        name: "Retained Earnings",
        type: "equity",
        subtype: "retained_earnings",
      },
      {
        code: "4000",
        name: "Service Revenue",
        type: "revenue",
        subtype: "service_revenue",
      },
      {
        code: "4100",
        name: "Other Income",
        type: "revenue",
        subtype: "other_income",
      },
      {
        code: "5000",
        name: "Cost of Services",
        type: "expense",
        subtype: "cost_of_goods_sold",
      },
      {
        code: "5100",
        name: "Operating Expenses",
        type: "expense",
        subtype: "operating_expense",
      },
      {
        code: "5200",
        name: "Payroll Expenses",
        type: "expense",
        subtype: "payroll_expense",
      },
      {
        code: "5300",
        name: "Tax Expense",
        type: "expense",
        subtype: "tax_expense",
      },
      {
        code: "5400",
        name: "Depreciation",
        type: "expense",
        subtype: "depreciation",
      },
      {
        code: "5900",
        name: "Other Expense",
        type: "expense",
        subtype: "other_expense",
      },
    ],
  },
];
