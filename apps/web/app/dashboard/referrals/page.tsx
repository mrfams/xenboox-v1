import type { Metadata } from "next";
import { Gift } from "lucide-react";

import { ReferralDashboard } from "@/components/dashboard/referral-dashboard";
import { ModulePageShell } from "@/components/module/module-page-shell";

export const metadata: Metadata = {
  title: "Referral Program | Xenboox",
  description: "Refer friends to Xenboox and earn rewards.",
};

export default function ReferralsPage() {
  return (
    <ModulePageShell
      title="Referral Program"
      description="Share Xenboox with friends and earn rewards for every successful referral."
      icon={Gift}
      aiSuggestions={[
        {
          label: "How is my referral performance?",
          prompt:
            "Show me my referral stats. How many referrals have I made and what rewards have I earned?",
        },
      ]}
    >
      <div className="p-3 pb-20 sm:p-6 md:pb-6">
        <ReferralDashboard />
      </div>
    </ModulePageShell>
  );
}
