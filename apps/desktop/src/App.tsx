import { Routes, Route } from "react-router-dom"
import { AppShell } from "@/components/layout/app-shell"
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
import ReportsPage from "@/pages/reports/reports"
import SettingsPage from "@/pages/settings/settings"
import DocumentsPage from "@/pages/documents/documents"
import ChatPage from "@/pages/chat/chat"

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<AppShell />}>
        <Route index element={<Dashboard />} />

        {/* Accounting */}
        <Route path="coa" element={<COAPage />} />
        <Route path="journal" element={<JournalEntries />} />
        <Route path="journal/:id" element={<JournalEntryDetail />} />
        <Route path="fiscal" element={<COAPage />} />

        {/* Payables & Receivables */}
        <Route path="ap/suppliers" element={<SupplierList />} />
        <Route path="ap/suppliers/:id" element={<SupplierDetail />} />
        <Route path="ap/pos" element={<PurchaseOrders />} />
        <Route path="ap/invoices" element={<APInvoices />} />
        <Route path="ar/customers" element={<CustomerList />} />
        <Route path="ar/customers/:id" element={<CustomerDetail />} />
        <Route path="ar/invoices" element={<ARInvoices />} />

        {/* Treasury */}
        <Route path="treasury" element={<TreasuryPage />} />
        <Route path="cash" element={<CashPage />} />
        <Route path="mobile-money" element={<TreasuryPage />} />

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
        <Route path="help" element={<SettingsPage />} />
      </Route>
    </Routes>
  )
}