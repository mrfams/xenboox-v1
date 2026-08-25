import type { Metadata } from "next";
import { BarChart3 } from "lucide-react";

import { QBRReport } from "@/components/dashboard/qbr-report";
import { ModulePageShell } from "@/components/module/module-page-shell";

export const metadata: Metadata = {
  title: "Quarterly Business Review | Xenboox",
  description:
    "AI-generated quarterly business review with financial summary, KPIs, and recommendations.",
};

export default function QBRPage() {
  return (
    <ModulePageShell
      title="Quarterly Business Review"
      description="AI-generated QBR with financial performance, KPIs, and actionable recommendations."
      icon={BarChart3}
      aiSuggestions={[
        {
          label: "Generate QBR report",
          prompt:
            "Generate my quarterly business review with financial summary and recommendations",
        },
        {
          label: "Key metrics this quarter",
          prompt: "What were my key financial metrics this quarter?",
        },
      ]}
    >
      <div className="p-3 pb-20 sm:p-6 md:pb-6">
        <QBRReport />
      </div>
    </ModulePageShell>
  );
}
