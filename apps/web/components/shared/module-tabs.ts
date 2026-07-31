export const MODULE_TABS = {
  money: [
    { label: "Cash", href: "/dashboard/cash" },
    { label: "Bank & Recon", href: "/dashboard/treasury" },
    { label: "Mobile Money", href: "/dashboard/mobile-money" },
  ],
  sales: [
    { label: "Invoices", href: "/dashboard/ar/invoices" },
    { label: "Customers", href: "/dashboard/ar/customers" },
    { label: "AR Aging", href: "/dashboard/ar/aging" },
  ],
  purchases: [
    { label: "Bills", href: "/dashboard/ap/invoices" },
    { label: "Suppliers", href: "/dashboard/ap/suppliers" },
    { label: "Purchase Orders", href: "/dashboard/ap/pos" },
    { label: "Payment Schedule", href: "/dashboard/ap/payment-schedule" },
  ],
  payroll: [
    { label: "Payroll", href: "/dashboard/payroll/pipeline" },
    { label: "Expenses", href: "/dashboard/expense/pipeline" },
  ],
  assets: [
    { label: "Inventory", href: "/dashboard/inventory/pipeline" },
    { label: "Fixed Assets", href: "/dashboard/fixed-assets/pipeline" },
  ],
  reports: [
    { label: "Reports", href: "/dashboard/reports" },
    { label: "Budget vs Actual", href: "/dashboard/budget/pipeline" },
    { label: "Analytics", href: "/dashboard/analytics/pipeline" },
    { label: "Benchmarking", href: "/dashboard/benchmarking" },
  ],
  accounting: [
    { label: "Chart of Accounts", href: "/dashboard/coa" },
    { label: "Journal Entries", href: "/dashboard/journal" },
    { label: "Trial Balance", href: "/dashboard/trial-balance" },
    { label: "Month-End Close", href: "/dashboard/close" },
    { label: "Consolidation", href: "/dashboard/consolidation" },
  ],
  compliance: [
    { label: "Compliance Calendar", href: "/dashboard/compliance" },
    { label: "Tax & Filings", href: "/dashboard/tax-compliance/pipeline" },
    { label: "Audit Preparation", href: "/dashboard/audit/pipeline" },
  ],
} as const;
