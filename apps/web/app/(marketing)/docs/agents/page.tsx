import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import {
  Crown,
  LayoutDashboard,
  Landmark,
  Shield,
  FileText,
  CreditCard,
  Package,
  BarChart3,
  Calendar,
  MessageSquare,
  AlertCircle,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

const agents = [
  {
    title: "CFO Agent",
    description:
      "Strategic financial planning, budget analysis, high-level reporting, AI comparison insights.",
    href: "/docs/agents/cfo",
    icon: Crown,
  },
  {
    title: "Controller Agent",
    description:
      "Close checklist, period management, reconciliation oversight, compliance verification.",
    href: "/docs/agents/controller",
    icon: LayoutDashboard,
  },
  {
    title: "Ledger Agent",
    description:
      "Double-entry posting, journal creation, account reconciliation, bookkeeping automation.",
    href: "/docs/agents/ledger",
    icon: FileText,
  },
  {
    title: "Treasury Agent",
    description:
      "Bank reconciliation, cash flow forecasting, liquidity management, payment processing.",
    href: "/docs/agents/treasury",
    icon: Landmark,
  },
  {
    title: "Payroll Manager Agent",
    description:
      "Payroll runs, deduction calculations, payslip generation, tax compliance.",
    href: "/docs/agents/payroll",
    icon: Shield,
  },
  {
    title: "Compliance Agent",
    description:
      "Tax calculations, regulatory checks, audit preparation, statutory reporting.",
    href: "/docs/agents/compliance",
    icon: AlertCircle,
  },
  {
    title: "AP Agent",
    description:
      "Invoice processing, payment scheduling, supplier management, approval workflows.",
    href: "/docs/agents/ap",
    icon: CreditCard,
  },
  {
    title: "AR Agent",
    description:
      "Invoice generation, payment reminders, collections, customer communication.",
    href: "/docs/agents/ar",
    icon: CreditCard,
  },
  {
    title: "Inventory Agent",
    description:
      "Stock management, valuation, reorder alerts, warehouse optimization.",
    href: "/docs/agents/inventory",
    icon: Package,
  },
  {
    title: "Fixed Assets Agent",
    description:
      "Asset tracking, depreciation schedules, disposal processing, tax reporting.",
    href: "/docs/agents/fixed-assets",
    icon: BarChart3,
  },
  {
    title: "Cash Agent",
    description:
      "Petty cash management, imprest float tracking, cash reconciliation.",
    href: "/docs/agents/cash",
    icon: BarChart3,
  },
  {
    title: "Mobile Money Agent",
    description:
      "Transaction processing, mobile money reconciliation, payment notifications.",
    href: "/docs/agents/mobile-money",
    icon: BarChart3,
  },
  {
    title: "Chat Agent",
    description:
      "Natural language commands, document processing, AI assistance.",
    href: "/docs/agents/chat",
    icon: MessageSquare,
  },
  {
    title: "Reporting Agent",
    description:
      "Report generation, export formats, custom queries, data visualization.",
    href: "/docs/agents/reporting",
    icon: BarChart3,
  },
  {
    title: "Fiscal Agent",
    description: "Period closing, journal posting, fiscal year management.",
    href: "/docs/agents/fiscal",
    icon: Calendar,
  },
  {
    title: "Document Agent",
    description: "OCR processing, document classification, data extraction.",
    href: "/docs/agents/document",
    icon: FileText,
  },
  {
    title: "Analytics Agent",
    description: "Spend analysis, insights generation, predictive modeling.",
    href: "/docs/agents/analytics",
    icon: TrendingUp,
  },
  {
    title: "Budget Agent",
    description: "Budget planning, variance analysis, forecasting.",
    href: "/docs/agents/budget",
    icon: BarChart3,
  },
  {
    title: "Audit Agent",
    description:
      "Compliance checking, anomaly detection, audit trail generation.",
    href: "/docs/agents/audit",
    icon: AlertCircle,
  },
];

export default function AgentsDocsPage() {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-4xl font-bold tracking-tight">
          AI Agents Documentation
        </h1>
        <p className="mt-4 text-muted-foreground">
          Guides for all 19 AI-powered accounting assistants in Xenboox. Each
          agent operates with confidence scoring and human oversight.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => (
          <Link key={agent.title} href={agent.href}>
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <agent.icon className="h-5 w-5 text-muted-foreground" />
                  {agent.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {agent.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-12">
        <Link href="/docs">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-sm text-muted-foreground">
                ← Back to Documentation Hub
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </>
  );
}
