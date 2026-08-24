import type { Metadata } from "next";

import { QBRReport } from "@/components/dashboard/qbr-report";

export const metadata: Metadata = {
  title: "Quarterly Business Review | Xenboox",
  description:
    "AI-generated quarterly business review with financial summary, KPIs, and recommendations.",
};

export default function QBRPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          Quarterly Business Review
        </h1>
        <p className="text-muted-foreground mt-1">
          AI-generated QBR with financial performance, KPIs, and actionable
          recommendations.
        </p>
      </div>

      <QBRReport />
    </div>
  );
}
