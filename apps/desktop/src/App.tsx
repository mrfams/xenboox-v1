import { Routes, Route } from "react-router-dom"
import { AppShell } from "@/components/layout/app-shell"
import { EntityProvider } from "@/lib/entity-context"
import Dashboard from "@/pages/dashboard"
import EmployeeList from "@/pages/payroll/employees"
import EmployeeDetail from "@/pages/payroll/employee-detail"
import PayrollRuns from "@/pages/payroll/runs"
import AssetList from "@/pages/fixed-assets/list"
import AssetDetail from "@/pages/fixed-assets/detail"
import InventoryList from "@/pages/inventory/list"
import ItemDetail from "@/pages/inventory/detail"
import Warehouses from "@/pages/inventory/warehouses"
import SupplierList from "@/pages/ap/suppliers"
import SupplierDetail from "@/pages/ap/supplier-detail"
import PurchaseOrders from "@/pages/ap/purchase-orders"
import APInvoices from "@/pages/ap/invoices"
import CustomerList from "@/pages/ar/customers"
import CustomerDetail from "@/pages/ar/customer-detail"
import ARInvoices from "@/pages/ar/invoices"
import JournalEntries from "@/pages/journal/entries"
import JournalEntryDetail from "@/pages/journal/entry-detail"
import COAPage from "@/pages/coa/coa"
import TreasuryPage from "@/pages/treasury/bank-accounts"
import CashPage from "@/pages/treasury/cash"
import MobileMoneyPage from "@/pages/mobile-money/page"
import FiscalPage from "@/pages/fiscal/page"
import ReportsPage from "@/pages/reports/reports"
import SettingsPage from "@/pages/settings/settings"
import DocumentsPage from "@/pages/documents/documents"
import ChatPage from "@/pages/chat/chat"
import HelpPage from "@/pages/help/page"
import GettingStartedPage from "@/pages/docs/getting-started/page"
import FAQPage from "@/pages/docs/faq/page"
import ModulesPage from "@/pages/docs/modules/page"
import AgentsPage from "@/pages/docs/agents/page"

export default function App() {
  return (
    <EntityProvider>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<Dashboard />} />

          {/* Accounting */}
          <Route path="coa" element={<COAPage />} />
          <Route path="journal" element={<JournalEntries />} />
          <Route path="journal/:id" element={<JournalEntryDetail />} />
          <Route path="fiscal" element={<FiscalPage />} />

          {/* Payables & Receivables */}
          <Route path="ap/suppliers" element={<SupplierList />} />
          <Route path="ap/suppliers/:id" element={<SupplierDetail />} />
          <Route path="ap/purchase-orders" element={<PurchaseOrders />} />
          <Route path="ap/invoices" element={<APInvoices />} />
          <Route path="ar/customers" element={<CustomerList />} />
          <Route path="ar/customers/:id" element={<CustomerDetail />} />
          <Route path="ar/invoices" element={<ARInvoices />} />

          {/* Treasury */}
          <Route path="treasury" element={<TreasuryPage />} />
          <Route path="cash" element={<CashPage />} />
          <Route path="mobile-money" element={<MobileMoneyPage />} />

          {/* Payroll */}
          <Route path="payroll/employees" element={<EmployeeList />} />
          <Route path="payroll/employees/:id" element={<EmployeeDetail />} />
          <Route path="payroll/runs" element={<PayrollRuns />} />

          {/* Fixed Assets */}
          <Route path="fixed-assets" element={<AssetList />} />
          <Route path="fixed-assets/:id" element={<AssetDetail />} />

          {/* Inventory */}
          <Route path="inventory" element={<InventoryList />} />
          <Route path="inventory/warehouses" element={<Warehouses />} />
          <Route path="inventory/:id" element={<ItemDetail />} />

          {/* Reports */}
          <Route path="reports" element={<ReportsPage />} />

          {/* Documents */}
          <Route path="documents" element={<DocumentsPage />} />

          {/* Chat */}
          <Route path="chat" element={<ChatPage />} />

          {/* Settings */}
          <Route path="settings" element={<SettingsPage />} />
          <Route path="help" element={<HelpPage />} />

          {/* Documentation */}
          <Route path="docs" element={<ModulesPage />} />
          <Route path="docs/getting-started" element={<GettingStartedPage />} />
          <Route path="docs/faq" element={<FAQPage />} />
          <Route path="docs/agents" element={<AgentsPage />} />
          <Route path="docs/agents/cfo" element={<div className="p-6">CFO Agent Documentation</div>} />
          <Route path="docs/agents/controller" element={<div className="p-6">Controller Agent Documentation</div>} />
          <Route path="docs/agents/treasury" element={<div className="p-6">Treasury Agent Documentation</div>} />
          <Route path="docs/agents/payroll" element={<div className="p-6">Payroll Manager Agent Documentation</div>} />
          <Route path="docs/agents/compliance" element={<div className="p-6">Compliance Agent Documentation</div>} />
          <Route path="docs/agents/ap" element={<div className="p-6">AP Agent Documentation</div>} />
          <Route path="docs/agents/ar" element={<div className="p-6">AR Agent Documentation</div>} />
          <Route path="docs/agents/inventory" element={<div className="p-6">Inventory Agent Documentation</div>} />
          <Route path="docs/agents/assets" element={<div className="p-6">Asset Agent Documentation</div>} />
          <Route path="docs/agents/cash" element={<div className="p-6">Cash Agent Documentation</div>} />
          <Route path="docs/agents/mobile-money" element={<div className="p-6">Mobile Money Agent Documentation</div>} />
          <Route path="docs/agents/ledger" element={<div className="p-6">Ledger Agent Documentation</div>} />
          <Route path="docs/agents/reporting" element={<div className="p-6">Reporting Agent Documentation</div>} />
          <Route path="docs/agents/documents" element={<div className="p-6">Document Agent Documentation</div>} />
          <Route path="docs/agents/reconciliation" element={<div className="p-6">Reconciliation Agent Documentation</div>} />
          <Route path="docs/modules" element={<ModulesPage />} />
          <Route path="docs/modules/coa" element={<div className="p-6">Chart of Accounts Documentation</div>} />
          <Route path="docs/modules/journal" element={<div className="p-6">Journal Entries Documentation</div>} />
          <Route path="docs/modules/ap" element={<div className="p-6">Accounts Payable Documentation</div>} />
          <Route path="docs/modules/ar" element={<div className="p-6">Accounts Receivable Documentation</div>} />
          <Route path="docs/modules/fiscal" element={<div className="p-6">Fiscal Periods Documentation</div>} />
          <Route path="docs/modules/treasury" element={<div className="p-6">Treasury Documentation</div>} />
          <Route path="docs/modules/payroll" element={<div className="p-6">Payroll Documentation</div>} />
          <Route path="docs/modules/assets" element={<div className="p-6">Fixed Assets Documentation</div>} />
          <Route path="docs/modules/inventory" element={<div className="p-6">Inventory Documentation</div>} />
          <Route path="docs/modules/reports" element={<div className="p-6">Financial Reports Documentation</div>} />
          <Route path="docs/modules/documents" element={<div className="p-6">Documents Documentation</div>} />
        </Route>
      </Routes>
    </EntityProvider>
  )
}