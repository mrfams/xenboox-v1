import {
  BarChart3,
  TrendingDown,
  DollarSign,
  Target,
  PieChart,
} from "lucide-react";

import { DocsPageHeader } from "../../components/docs-page-header";
import { FeatureGrid } from "../../components/feature-grid";
import { InfoCallout } from "../../components/info-callout";
import { RelatedLinks } from "../../components/related-links";

import { Card, CardContent } from "@/components/ui";

const capabilities = [
  {
    title: "Budget Planning",
    description:
      "Creates and manages budgets for departments, cost centers, and projects. Supports bottom-up and top-down budgeting approaches.",
    icon: Target,
  },
  {
    title: "Variance Analysis",
    description:
      "Compares actual performance against budget. Calculates variances in absolute and percentage terms. Highlights significant deviations.",
    icon: BarChart3,
  },
  {
    title: "Forecast Updates",
    description:
      "Updates budget forecasts based on actual performance and changing conditions. Provides rolling forecast capabilities.",
    icon: TrendingDown,
  },
  {
    title: "Department Budgeting",
    description:
      "Manages department-level budgets with allocation rules. Supports approval workflows for budget changes and reallocations.",
    icon: DollarSign,
  },
  {
    title: "Scenario Modeling",
    description:
      "Models multiple budget scenarios (best case, worst case, expected). Compares scenarios side by side for decision support.",
    icon: PieChart,
  },
];

export default function BudgetAgentDocPage() {
  return (
    <>
      <DocsPageHeader
        title="Budget Agent"
        description="The Budget Agent manages budget creation, variance analysis, forecasting, and scenario modeling. It provides real-time budget visibility and alerts."
        breadcrumbs={[
          { label: "Agents", href: "/docs/agents" },
          { label: "Budget", href: "/docs/agents/budget" },
        ]}
        icon={BarChart3}
      />

      <div className="space-y-10">
        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">Overview</h2>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground leading-relaxed">
                The Budget Agent manages the complete budget lifecycle — from
                creation through monitoring to variance analysis. It supports
                multiple budgeting approaches including bottom-up departmental
                budgets, top-down target-based budgets, and hybrid models. The
                agent continuously monitors actual performance against budget,
                highlights significant variances, and provides rolling forecast
                updates. It works closely with the CFO Agent for strategic
                planning and the Controller Agent for month-end reporting.
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
            Budget Process
          </h2>
          <div className="space-y-3">
            <Card>
              <CardContent className="p-4 flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold">Define Budget Framework</h3>
                  <p className="text-sm text-muted-foreground">
                    Set budget period, organizational scope, and methodology
                    (top-down, bottom-up, or hybrid).
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                  2
                </div>
                <div>
                  <h3 className="font-semibold">Collect Inputs</h3>
                  <p className="text-sm text-muted-foreground">
                    Department heads submit budget proposals. Agent validates
                    inputs against historical data and guidelines.
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                  3
                </div>
                <div>
                  <h3 className="font-semibold">Review & Approve</h3>
                  <p className="text-sm text-muted-foreground">
                    Agent flags inconsistencies and outliers. CFO Agent reviews
                    and approves. Adjustments iterated as needed.
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                  4
                </div>
                <div>
                  <h3 className="font-semibold">Monitor & Analyze</h3>
                  <p className="text-sm text-muted-foreground">
                    Continuous monitoring of actual vs budget. Agent generates
                    variance reports and alerts on significant deviations.
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                  5
                </div>
                <div>
                  <h3 className="font-semibold">Forecast & Revise</h3>
                  <p className="text-sm text-muted-foreground">
                    Agent updates forecasts based on actual results. Recommends
                    budget revisions when material changes occur.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold tracking-tight mb-4">
            Variance Analysis
          </h2>
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium">
                        Variance Type
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        Method
                      </th>
                      <th className="px-4 py-3 text-left font-medium">
                        Alert Threshold
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="px-4 py-3">Revenue Variance</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        Actual vs Budget Revenue
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        &gt; 10% deviation
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-4 py-3">Expense Variance</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        Actual vs Budget Expense
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        &gt; 5% over budget
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="px-4 py-3">Volume Variance</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        Quantity difference × Std Price
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        &gt; 15% deviation
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-3">Price Variance</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        Price difference × Actual Quantity
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        &gt; 10% deviation
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>

        <InfoCallout type="tip" title="Example Prompts">
          "Create budget for FY 2026" • "Show budget vs actual for this month" •
          "Flag budget overruns" • "Update forecast for Q3" • "Model 10% revenue
          growth scenario"
        </InfoCallout>

        <RelatedLinks
          links={[
            {
              title: "Analytics Agent",
              href: "/docs/agents/analytics",
              description: "Analytics and insights",
            },
            {
              title: "Reporting Agent",
              href: "/docs/agents/reporting",
              description: "Budget variance reports",
            },
            {
              title: "CFO Agent",
              href: "/docs/agents/cfo",
              description: "Strategic budget planning",
            },
            {
              title: "Controller Agent",
              href: "/docs/agents/controller",
              description: "Month-end budget review",
            },
          ]}
        />
      </div>
    </>
  );
}
