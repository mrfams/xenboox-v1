import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { DocsPageHeader } from "../../components/docs-page-header";
import { FeatureGrid } from "../../components/feature-grid";
import { InfoCallout } from "../../components/info-callout";
import { RelatedLinks } from "../../components/related-links";
import {
  MessageSquare,
  Bot,
  Upload,
  Share2,
  Search,
  Command,
} from "lucide-react";

const features = [
  {
    title: "AI Chat Interface",
    description:
      "Natural language interface to interact with all 19 AI agents. Ask questions, give commands, and receive insights in plain English.",
    icon: MessageSquare,
  },
  {
    title: "File Upload to Chat",
    description:
      "Upload documents directly in chat for immediate processing. The Document Agent analyzes and responds with extracted information.",
    icon: Upload,
  },
  {
    title: "Command Library",
    description:
      "Pre-built commands for common accounting tasks. Type / to see available commands or ask the AI for guidance.",
    icon: Command,
  },
  {
    title: "Conversation History",
    description:
      "Full conversation history with search capabilities. Review past interactions, re-run analyses, and share conversations with team members.",
    icon: Share2,
  },
];

const exampleCommands = [
  {
    command: "Show my trial balance",
    description: "Displays the trial balance for the current period",
  },
  {
    command: "Run payroll for this month",
    description: "Initiates the payroll run process",
  },
  {
    command: "What invoices are overdue?",
    description: "Lists all overdue customer invoices",
  },
  {
    command: "Reconcile bank account XYZ",
    description: "Starts bank reconciliation process",
  },
  {
    command: "Create journal entry",
    description: "Opens journal entry creation with AI assistance",
  },
  {
    command: "Generate P&L for Q1",
    description: "Generates profit and loss statement for Q1",
  },
  {
    command: "Compare AI model costs",
    description: "Shows AI usage and cost comparison across models",
  },
];

export default function ChatDocPage() {
  return (
    <>
      <DocsPageHeader
        title="Chat & AI Assistant"
        description="Interact with Xenboox's 19 AI agents through a natural language chat interface. Ask questions, give commands, and automate accounting tasks."
        breadcrumbs={[
          { label: "Modules", href: "/docs/modules" },
          { label: "Chat", href: "/docs/modules/chat" },
        ]}
        icon={MessageSquare}
      />

      <div className="space-y-10">
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Overview</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                The Chat module is the primary interface for interacting with
                Xenboox's AI agents. Using natural language, you can ask
                questions about your financial data, give commands to process
                transactions, and receive insights from specialized AI agents.
                The chat interface supports file uploads, command shortcuts, and
                conversation history with search. Each message is processed by
                the appropriate agent based on context and intent.
              </p>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Key Features
          </h2>
          <FeatureGrid features={features} />
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Example Commands
          </h2>
          <div className="space-y-2">
            {exampleCommands.map((item) => (
              <Card key={item.command}>
                <CardContent className="p-3 flex items-start gap-3">
                  <code className="px-2 py-1 rounded bg-muted text-xs font-mono shrink-0">
                    {item.command}
                  </code>
                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Agent Routing
          </h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                When you send a message in chat, the system routes your request
                to the appropriate AI agent based on context and intent. For
                example, a question about overdue invoices is routed to the AR
                Agent, while a payroll question goes to the Payroll Manager
                Agent. The CFO Agent handles strategic questions and coordinates
                responses from multiple agents when needed.
              </p>
            </CardContent>
          </Card>
        </section>

        <InfoCallout type="tip" title="Getting Started with Chat">
          Try starting with simple questions about your data. The AI agents are
          designed to be conversational and will guide you through complex tasks
          step by step. Type "/help" to see all available commands.
        </InfoCallout>

        <RelatedLinks
          links={[
            {
              title: "CFO Agent",
              href: "/docs/agents/cfo",
              description: "Strategic AI agent",
            },
            {
              title: "Chat Agent",
              href: "/docs/agents/chat",
              description: "Conversational AI agent",
            },
            {
              title: "Documents Module",
              href: "/docs/modules/documents",
              description: "Document upload and processing",
            },
            {
              title: "Getting Started",
              href: "/docs/getting-started",
              description: "Setup and first steps",
            },
          ]}
        />
      </div>
    </>
  );
}
