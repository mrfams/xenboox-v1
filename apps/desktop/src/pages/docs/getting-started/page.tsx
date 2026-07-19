import { Card, CardContent, CardHeader, CardTitle, Button } from "@xenboox/ui"
import { BookOpen, CreditCard, FileText, Users, BarChart3, Settings, FolderOpen, HelpCircle, Shield } from "lucide-react"
import { Link } from "react-router-dom"

export default function GettingStartedPage() {
  const sections = [
    {
      title: "Introduction",
      description: "Overview of Xenboox accounting platform and its features",
      href: "/docs/getting-started/introduction",
      icon: BookOpen
    },
    {
      title: "Setup Guide",
      description: "Step-by-step guide to set up your company and configure settings",
      href: "/docs/getting-started/setup",
      icon: Settings
    },
    {
      title: "Entity Management",
      description: "How to manage multiple entities and switch between them",
      href: "/docs/getting-started/entities",
      icon: Users
    },
    {
      title: "Quick Start",
      description: "Get up and running in minutes with our quick start guide",
      href: "/docs/getting-started/quick-start",
      icon: CreditCard
    }
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <BookOpen className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-3xl font-bold tracking-tight">Getting Started</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {sections.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <section.icon className="h-5 w-5 text-primary" />
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">{section.description}</p>
              <Button asChild size="sm">
                <Link to={section.href}>Read more</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Need More Help?</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-4">
            Browse our complete documentation or contact support for assistance.
          </p>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/docs">Browse Documentation</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/help">Help Center</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}