import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { DocsPageHeader } from "../../components/docs-page-header";
import { FeatureGrid } from "../../components/feature-grid";
import { InfoCallout } from "../../components/info-callout";
import { RelatedLinks } from "../../components/related-links";
import { MarketingShell } from "../../../components/marketing-primitives";
import { FileText, Upload, Scan, Link2, Search, Shield } from "lucide-react";

const features = [
  {
    title: "Document Upload",
    description:
      "Upload receipts, invoices, contracts, and other financial documents. Support for PDF, images, and Office documents with drag-and-drop.",
    icon: Upload,
  },
  {
    title: "OCR Processing",
    description:
      "Automatic optical character recognition (OCR) on uploaded documents. Extracts text, amounts, dates, and vendor information.",
    icon: Scan,
  },
  {
    title: "Auto-Classification",
    description:
      "AI-powered document classification by type (invoice, receipt, contract, bank statement) and module association (AP, AR, Payroll).",
    icon: FileText,
  },
  {
    title: "Document Linking",
    description:
      "Link documents to transactions, journal entries, customers, suppliers, and other records. Multiple documents per transaction.",
    icon: Link2,
  },
];

export default function DocumentsDocPage() {
  return (
    <MarketingShell>
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <DocsPageHeader
          title="Documents"
          description="Upload, process, and manage financial documents with AI-powered OCR, classification, and automatic linking to transactions."
          breadcrumbs={[
            { label: "Modules", href: "/docs/modules" },
            { label: "Documents", href: "/docs/modules/documents" },
          ]}
          icon={FileText}
        />

        <div className="space-y-10">
          <section>
            <h2 className="text-2xl font-bold tracking-tight mb-4 text-white">
              Overview
            </h2>
            <Card className="border-white/10 bg-white/5">
              <CardContent className="pt-6">
                <p className="text-sm text-white/55 leading-relaxed">
                  The Documents module provides centralized document management
                  for all financial documents. Uploaded documents are
                  automatically processed using OCR technology to extract key
                  information, classified by type using AI, and linked to
                  relevant transactions. The Document Agent manages the entire
                  document lifecycle from upload through processing to archival.
                </p>
              </CardContent>
            </Card>
          </section>

          <section>
            <h2 className="text-2xl font-bold tracking-tight mb-4 text-white">
              Key Features
            </h2>
            <FeatureGrid features={features} />
          </section>

          <section>
            <h2 className="text-2xl font-bold tracking-tight mb-4 text-white">
              Document Processing Pipeline
            </h2>
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="border-white/10 bg-white/5">
                <CardHeader>
                  <CardTitle className="text-sm">1. Upload</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-white/55">
                    Drag & drop or upload via file picker. Support for PDF, PNG,
                    JPG, DOCX.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-white/10 bg-white/5">
                <CardHeader>
                  <CardTitle className="text-sm">2. OCR</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-white/55">
                    Text extraction using Azure OCR. Handles handwriting and
                    poor-quality scans.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-white/10 bg-white/5">
                <CardHeader>
                  <CardTitle className="text-sm">3. Classify</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-white/55">
                    AI classifies document type and suggests module association.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-white/10 bg-white/5">
                <CardHeader>
                  <CardTitle className="text-sm">4. Link</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-white/55">
                    Link to transactions, journal entries, or records. Store in
                    R2 with encryption.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          <InfoCallout type="tip" title="Document Agent">
            The Document Agent processes uploaded documents automatically. It
            extracts key data, suggests classifications, and links documents to
            relevant transactions. Ask "Process this invoice" or "Find all
            documents for supplier ABC."
          </InfoCallout>

          <RelatedLinks
            links={[
              {
                title: "AP Module",
                href: "/docs/modules/ap",
                description: "Invoice document linking",
              },
              {
                title: "Chat Module",
                href: "/docs/modules/chat",
                description: "AI-powered document Q&A",
              },
              {
                title: "Document Agent",
                href: "/docs/agents/document",
                description: "AI agent for document processing",
              },
              {
                title: "Security Overview",
                href: "/docs/security",
                description: "Document encryption and storage",
              },
            ]}
          />
        </div>
      </div>
    </MarketingShell>
  );
}
