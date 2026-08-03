import Link from "next/link";
import { DocsPageHeader } from "../components/docs-page-header";
import { RelatedLinks } from "../components/related-links";
import { BookOpen, ArrowRight } from "lucide-react";

const concepts = [
  {
    title: "Organization & Entity",
    description:
      "An Organization is the top-level container. Entities represent individual companies, branches, or departments within an organization.",
    href: "/docs/concepts/organization-entity",
    icon: "🏢",
  },
  {
    title: "Chart of Accounts",
    description:
      "The structured list of all accounts used to record financial transactions. Each account has a type (Asset, Liability, Equity, Revenue, Expense) and a unique code.",
    href: "/docs/concepts/chart-of-accounts",
    icon: "📊",
  },
  {
    title: "Journal Entries",
    description:
      "The foundation of double-entry accounting. Every transaction is recorded as a journal entry with equal debits and credits.",
    href: "/docs/concepts/journal-entries",
    icon: "📝",
  },
  {
    title: "Fiscal Periods",
    description:
      "Time periods for financial reporting. Each period can be open, closed, or locked to control when transactions can be posted.",
    href: "/docs/concepts/fiscal-periods",
    icon: "📅",
  },
  {
    title: "Multi-Currency",
    description:
      "Handle transactions in multiple currencies with automatic exchange rate synchronization and currency conversion.",
    href: "/docs/concepts/multi-currency",
    icon: "💱",
  },
  {
    title: "User Roles & Permissions",
    description:
      "Control access with role-based permissions. Assign users to specific entities and roles to manage what they can see and do.",
    href: "/docs/concepts/roles-permissions",
    icon: "🔐",
  },
  {
    title: "AI Automation",
    description:
      "Xenboox uses AI to automate routine accounting tasks. All AI actions are logged, reversible, and require your approval.",
    href: "/docs/concepts/ai-automation",
    icon: "🤖",
  },
  {
    title: "Audit Trail",
    description:
      "Every action in Xenboox is logged with who did it, when, and what changed. This provides a complete history for compliance.",
    href: "/docs/concepts/audit-trail",
    icon: "📋",
  },
];

export default function ConceptsPage() {
  return (
    <>
      <DocsPageHeader
        title="Core Concepts"
        description="Understand the fundamental concepts behind Xenboox. This guide covers the key building blocks you'll use throughout the platform."
        breadcrumbs={[{ label: "Core Concepts", href: "/docs/concepts" }]}
        icon={BookOpen}
      />

      <div className="space-y-6">
        <section className="grid gap-4 sm:grid-cols-2">
          {concepts.map((concept) => (
            <Link
              key={concept.title}
              href={concept.href}
              className="group rounded-xl border border-border bg-card p-5 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{concept.icon}</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground transition-colors group-hover:text-primary">
                    {concept.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                    {concept.description}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 group-hover:text-primary" />
              </div>
            </Link>
          ))}
        </section>

        <section className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-lg font-semibold text-foreground">Glossary</h3>
          <div className="mt-4 space-y-3">
            {[
              {
                term: "Double-Entry Accounting",
                definition:
                  "A system where every transaction affects at least two accounts, with debits always equaling credits.",
              },
              {
                term: "Debit (Dr)",
                definition:
                  "An entry on the left side of an account. Increases assets and expenses; decreases liabilities, equity, and revenue.",
              },
              {
                term: "Credit (Cr)",
                definition:
                  "An entry on the right side of an account. Decreases assets and expenses; increases liabilities, equity, and revenue.",
              },
              {
                term: "Trial Balance",
                definition:
                  "A report listing all accounts and their balances to verify that total debits equal total credits.",
              },
              {
                term: "Period-End Close",
                definition:
                  "The process of finalizing all transactions for a fiscal period, reconciling accounts, and generating financial statements.",
              },
            ].map((item) => (
              <div
                key={item.term}
                className="border-b border-border pb-3 last:border-0 last:pb-0"
              >
                <dt className="text-sm font-medium text-foreground">
                  {item.term}
                </dt>
                <dd className="mt-1 text-sm text-muted-foreground">
                  {item.definition}
                </dd>
              </div>
            ))}
          </div>
        </section>

        <RelatedLinks
          links={[
            {
              title: "Getting Started",
              href: "/docs/getting-started",
              description: "Set up your first organization",
            },
            {
              title: "Modules Overview",
              href: "/docs/modules",
              description: "Explore all accounting modules",
            },
            {
              title: "FAQ",
              href: "/docs/faq",
              description: "Common questions answered",
            },
          ]}
        />
      </div>
    </>
  );
}
