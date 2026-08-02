import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { DocsPageHeader } from "../../components/docs-page-header";
import { FeatureGrid } from "../../components/feature-grid";
import { InfoCallout } from "../../components/info-callout";
import { RelatedLinks } from "../../components/related-links";
import {
  MessageSquare,
  FileText,
  Mic,
  Search,
  Share2,
  Zap,
} from "lucide-react";

const capabilities = [
  {
    title: "Natural Language Queries",
    description:
      "Accepts commands and queries in plain English. Understands accounting terminology and business context for accurate responses.",
    icon: MessageSquare,
  },
  {
    title: "Multi-Agent Coordination",
    description:
      "Routes requests to the appropriate agent. CFO Agent handles strategic queries. Worker agents handle specific tasks.",
    icon: Zap,
  },
  {
    title: "Document Upload",
    description:
      "Accepts document uploads via chat. Routes to Document Agent for OCR processing. Supports drag-and-drop and mobile camera.",
    icon: FileText,
  },
  {
    title: "Session Management",
    description:
      "Maintains conversation context across sessions. Users can review history, share conversations, and continue interrupted workflows.",
    icon: Share2,
  },
  {
    title: "Command Execution",
    description:
      "Executes accounting commands directly from chat. Create journal entries, generate reports, process payments using natural language.",
    icon: Search,
  },
];

export default function ChatAgentDocPage() {
  return (
    <>
      <DocsPageHeader
        title="Chat Agent"
        description="The Chat Agent provides the natural language interface to Xenboox. It understands accounting commands and coordinates responses from all other agents."
        breadcrumbs={[
          { label: "Agents", href: "/docs/agents" },
          { label: "Chat", href: "/docs/agents/chat" },
        ]}
        icon={MessageSquare}
      />

      <div className="space-y-10">
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Overview</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                The Chat Agent is the user-facing interface to Xenboox's AI
                agent system. It processes natural language commands and
                queries, routes them to the appropriate specialized agent, and
                presents responses in a conversational format. The agent
                understands accounting-specific terminology and business
                context, making it easy for users to interact with the platform
                without navigating complex menus. It supports document uploads,
                conversation history, and multi-turn interactions for complex
                workflows.
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
            Query Categories
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Informational Queries</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li>"What's my current cash balance?"</li>
                  <li>"Show me overdue invoices"</li>
                  <li>"How many employees are active?"</li>
                  <li>"What's the trial balance total?"</li>
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Transactional Queries</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li>"Create a journal entry for..."</li>
                  <li>"Pay invoice INV-100"</li>
                  <li>"Process payroll for this month"</li>
                  <li>"Reconcile bank account ABC"</li>
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Analytical Queries</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li>"Compare this quarter to last"</li>
                  <li>"What are our top expenses?"</li>
                  <li>"Forecast cash for next month"</li>
                  <li>"Show budget variance"</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Architecture
          </h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">
                The Chat Agent is built on LangGraph and uses a multi-step
                processing pipeline:
              </p>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                  <span>
                    <strong>Intent Classification</strong> — Identifies the
                    user's intent: informational, transactional, or analytical
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                  <span>
                    <strong>Entity Resolution</strong> — Identifies relevant
                    entities, accounts, and records mentioned in the query
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                  <span>
                    <strong>Agent Routing</strong> — Routes the request to the
                    most appropriate agent based on the resolved intent
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                  <span>
                    <strong>Response Generation</strong> — Synthesizes responses
                    with confidence scores and references back to source data
                  </span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </section>

        <InfoCallout type="info" title="Model Usage">
          The Chat Agent uses Claude Haiku 4.5 for routine queries and Claude
          Sonnet 4.6 for complex analytical requests. Model selection is
          automatic based on query complexity. The CFO Agent always uses Sonnet.
        </InfoCallout>

        <RelatedLinks
          links={[
            {
              title: "Chat Module",
              href: "/docs/modules/chat",
              description: "Chat interface",
            },
            {
              title: "Document Agent",
              href: "/docs/agents/document",
              description: "Document processing via chat",
            },
            {
              title: "CFO Agent",
              href: "/docs/agents/cfo",
              description: "Strategic queries",
            },
            {
              title: "Analytics Agent",
              href: "/docs/agents/analytics",
              description: "Analytical queries",
            },
          ]}
        />
      </div>
    </>
  );
}
