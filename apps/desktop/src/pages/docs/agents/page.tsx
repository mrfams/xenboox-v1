import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from "@xenboox/ui"
import { Link } from "react-router-dom"
import { Bot, Shield, FileText, Users, Banknote, BarChart3, AlertTriangle, Database } from "lucide-react"

const agents = [
  {
    name: "CFO Agent",
    href: "/docs/agents/cfo",
    description: "Strategic financial advisor and decision maker",
    icon: Banknote,
    tier: "Tier 1"
  },
  {
    name: "Controller Agent",
    href: "/docs/agents/controller",
    description: "Manages accounting processes and controls",
    icon: Shield,
    tier: "Tier 2"
  },
  {
    name: "Treasury Agent",
    href: "/docs/agents/treasury",
    description: "Manages cash, bank accounts, and liquidity",
    icon: Wallet,
    tier: "Tier 2"
  },
  {
    name: "Payroll Manager Agent",
    href: "/docs/agents/payroll",
    description: "Handles payroll processing and employee compensation",
    icon: Users,
    tier: "Tier 2"
  },
  {
    name: "Compliance Agent",
    href: "/docs/agents/compliance",
    description: "Ensures regulatory compliance and audit readiness",
    icon: AlertTriangle,
    tier: "Tier 2"
  },
  {
    name: "AP Agent",
    href: "/docs/agents/ap",
    description: "Manages accounts payable and supplier relationships",
    icon: CreditCard,
    tier: "Tier 3"
  },
  {
    name: "AR Agent",
    href: "/docs/agents/ar",
    description: "Manages accounts receivable and customer billing",
    icon: CreditCard,
    tier: "Tier 3"
  },
  {
    name: "Inventory Agent",
    href: "/docs/agents/inventory",
    description: "Tracks inventory levels and stock movements",
    icon: Boxes,
    tier: "Tier 3"
  },
  {
    name: "Asset Agent",
    href: "/docs/agents/assets",
    description: "Manages fixed assets and depreciation",
    icon: HardHat,
    tier: "Tier 3"
  },
  {
    name: "Cash Agent",
    href: "/docs/agents/cash",
    description: "Handles cash transactions and petty cash",
    icon: Wallet,
    tier: "Tier 3"
  },
  {
    name: "Mobile Money Agent",
    href: "/docs/agents/mobile-money",
    description: "Processes mobile money transactions",
    icon: Smartphone,
    tier: "Tier 3"
  },
  {
    name: "Ledger Agent",
    href: "/docs/agents/ledger",
    description: "Single point of entry for general ledger postings",
    icon: Database,
    tier: "Tier 3"
  },
  {
    name: "Reporting Agent",
    href: "/docs/agents/reporting",
    description: "Generates financial reports and analytics",
    icon: BarChart3,
    tier: "Tier 3"
  },
  {
    name: "Document Agent",
    href: "/docs/agents/documents",
    description: "Manages document storage and retrieval",
    icon: FileText,
    tier: "Tier 3"
  },
  {
    name: "Reconciliation Agent",
    href: "/docs/agents/reconciliation",
    description: "Automates bank reconciliation processes",
    icon: Shield,
    tier: "Tier 3"
  }
]

export default function AgentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Bot className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-3xl font-bold tracking-tight">Agent Documentation</h1>
      </div>

      <div className="mb-4">
        <p className="text-muted-foreground max-w-3xl">
          Xenboox uses AI agents at three tiers to handle accounting tasks. Tier 1 (CFO) provides strategic guidance,
          Tier 2 (management) oversees department operations, and Tier 3 (worker) agents execute specific tasks.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => (
          <Card key={agent.name}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <agent.icon className="h-5 w-5 text-primary" />
                  {agent.name}
                </span>
                <Badge>{agent.tier}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm mb-3">{agent.description}</p>
              <Button asChild size="sm">
                <Link to={agent.href}>View Docs</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}