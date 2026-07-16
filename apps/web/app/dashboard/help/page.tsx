import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui"
import {
  BookOpen,
  MessageSquare,
  FileText,
  Mail,
} from "lucide-react"
import Link from "next/link"

const resources = [
  {
    icon: BookOpen,
    title: "Documentation",
    description: "Comprehensive guides for setting up and using Xenboox.",
    href: "/features",
  },
  {
    icon: MessageSquare,
    title: "AI Assistant",
    description: "Ask our AI agent your accounting questions directly.",
    href: "/dashboard/chat",
  },
  {
    icon: FileText,
    title: "Financial Reports",
    description: "Generate trial balance, P&L, and balance sheet reports.",
    href: "/dashboard/reports",
  },
  {
    icon: Mail,
    title: "Contact Support",
    description: "Get help from our support team.",
    href: "mailto:support@xenboox.com",
  },
]

export default function HelpPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Help & Support</h1>
        <p className="text-sm text-muted-foreground">
          Resources to help you get the most out of Xenboox.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {resources.map((resource) => (
          <Link key={resource.title} href={resource.href}>
            <Card className="transition-colors hover:bg-muted/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <resource.icon className="h-5 w-5 text-muted-foreground" />
                  {resource.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {resource.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Reference</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="font-medium">Keyboard Shortcuts</p>
            <p className="text-muted-foreground">
              Press <kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs font-mono">Ctrl+K</kbd> to open the command palette (coming soon).
            </p>
          </div>
          <div>
            <p className="font-medium">AI Commands</p>
            <p className="text-muted-foreground">
              Type natural language commands in the AI Assistant to create journal entries, run reports, or reconcile accounts.
            </p>
          </div>
          <div>
            <p className="font-medium">Entity Switching</p>
            <p className="text-muted-foreground">
              Use the entity switcher in the top navigation bar to switch between business entities.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}