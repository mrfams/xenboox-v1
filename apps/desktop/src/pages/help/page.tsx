import { AppShell } from "@/components/layout/app-shell"
import { Button } from "@/components/ui/button"
import { HelpCircle, ExternalLink, Book, Settings, Shield } from "lucide-react"

export default function HelpPage() {
  const helpTopics = [
    { title: "Getting Started", description: "Set up your account and create your first entity", icon: Book },
    { title: "Accounts Payable", description: "Manage suppliers, purchase orders, and invoices", icon: Settings },
    { title: "Accounts Receivable", description: "Manage customers and sales invoices", icon: Settings },
    { title: "Treasury", description: "Bank accounts, transactions, and reconciliations", icon: Shield },
    { title: "Security Center", description: "View security settings and audit logs", icon: Shield },
  ]

  return (
    <AppShell>
      <div className="p-6 max-w-4xl">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <HelpCircle className="h-6 w-6" />
          Help & Support
        </h1>
        
        <div className="space-y-4">
          {helpTopics.map((topic) => (
            <div key={topic.title} className="border rounded-lg p-4">
              <div className="flex items-center gap-3">
                <topic.icon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <h3 className="font-semibold">{topic.title}</h3>
                  <p className="text-sm text-muted-foreground">{topic.description}</p>
                </div>
                <Button variant="ghost" size="sm" className="ml-auto">
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-8 p-4 bg-muted rounded-lg">
          <h3 className="font-semibold mb-2">Need more help?</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Visit our documentation or contact support
          </p>
          <div className="flex gap-2">
            <Button size="sm" asChild>
              <a href="https://docs.xenboox.com" target="_blank" rel="noopener noreferrer">
                Documentation
              </a>
            </Button>
            <Button size="sm" variant="outline" asChild>
              <a href="mailto:support@xenboox.com">
                Contact Support
              </a>
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  )
}