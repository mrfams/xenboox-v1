import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { DocsPageHeader } from "../../components/docs-page-header";
import { FeatureGrid } from "../../components/feature-grid";
import { InfoCallout } from "../../components/info-callout";
import { RelatedLinks } from "../../components/related-links";
import { FileText, Scan, Search, Link, CheckCircle, Image } from "lucide-react";

const capabilities = [
  {
    title: "OCR Processing",
    description:
      "Extracts text from scanned documents and images using advanced OCR. Supports multiple languages and document types with high accuracy.",
    icon: Scan,
  },
  {
    title: "Document Classification",
    description:
      "Automatically classifies uploaded documents by type (invoice, receipt, contract, statement). Learns from user corrections.",
    icon: FileText,
  },
  {
    title: "Data Extraction",
    description:
      "Extracts key fields from documents including amounts, dates, reference numbers, and party information. Cross-references against known data.",
    icon: Search,
  },
  {
    title: "Document Linking",
    description:
      "Links documents to relevant records (invoices, purchase orders, journal entries). Provides full document traceability.",
    icon: Link,
  },
  {
    title: "Quality Validation",
    description:
      "Validates OCR confidence, checks document completeness, and flags low-quality scans for re-upload.",
    icon: CheckCircle,
  },
];

export default function DocumentAgentDocPage() {
  return (
    <>
      <DocsPageHeader
        title="Document Agent"
        description="The Document Agent processes uploaded documents using OCR, classifies them by type, extracts key data, and links them to relevant records."
        breadcrumbs={[
          { label: "Agents", href: "/docs/agents" },
          { label: "Document", href: "/docs/agents/document" },
        ]}
        icon={FileText}
      />

      <div className="space-y-10">
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Overview</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                The Document Agent is a platform-level agent that processes all
                documents uploaded to Xenboox. It uses advanced OCR to extract
                text from scanned documents and images, classifies documents by
                type (invoice, receipt, contract, bank statement), and extracts
                key data fields. The agent then links documents to relevant
                records in the system, providing full document traceability for
                audit purposes. It works with all modules to attach supporting
                documentation to transactions.
              </p>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Capabilities
          </h2>
          <FeatureGrid features={capabilities} />
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Document Processing Pipeline
          </h2>
          <div className="grid gap-4 md:grid-cols-5">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">1. Upload</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Document uploaded via web UI, mobile app, email, or API.
                  Supports PDF, JPG, PNG, and TIFF formats.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">2. Enhance</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Agent preprocesses image: deskew, denoise, contrast adjust,
                  and binarization for optimal OCR accuracy.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">3. Classify</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Agent classifies document type using AI. Confidently
                  categorizes as invoice, receipt, contract, statement, etc.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">4. Extract</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Key fields extracted: amounts, dates, reference numbers. Agent
                  cross-references against system data.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">5. Link</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Document linked to relevant records. Supporting document
                  attached to transaction. Full traceability.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Supported Document Types
          </h2>
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium">
                        Document Type
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        Extracted Fields
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        Link To
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="px-4 py-3">Invoice</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        Supplier, amount, date, items, tax
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        AP Invoice, PO
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-4 py-3">Receipt</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        Amount, date, vendor, category
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        Cash Expense, Imprest
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-4 py-3">Bank Statement</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        Transactions, balances, period
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        Bank Reconciliation
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-4 py-3">Contract</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        Parties, dates, terms, value
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        Supplier, Customer
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">Tax Certificate</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        Tax type, amount, period, ID
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        Tax Filing, Compliance
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>

        <InfoCallout type="tip" title="Example Prompts">
          "Process this invoice" • "Find all documents for supplier ABC" • "Show
          me unreviewed documents" • "Link document to entry J-2024-001" • "What
          documents are pending classification?"
        </InfoCallout>

        <RelatedLinks
          links={[
            {
              title: "Documents Module",
              href: "/docs/modules/documents",
              description: "Document management",
            },
            {
              title: "Chat Agent",
              href: "/docs/agents/chat",
              description: "Chat-based document upload",
            },
            {
              title: "AP Agent",
              href: "/docs/agents/ap",
              description: "Invoice processing",
            },
            {
              title: "Cash Agent",
              href: "/docs/agents/cash",
              description: "Receipt attachment",
            },
          ]}
        />
      </div>
    </>
  );
}
