import type { Metadata } from "next";
import {
  Gift,
  Users,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
} from "lucide-react";

import { Section } from "@/components/marketing/section";
import { ReferralDashboard } from "@/components/dashboard/referral-dashboard";

export const metadata: Metadata = {
  title: "Referral Program | Xenboox",
  description: "Refer friends to Xenboox and earn rewards.",
};

export default function ReferralsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Referral Program</h1>
        <p className="text-muted-foreground mt-1">
          Share Xenboox with friends and earn rewards for every successful
          referral.
        </p>
      </div>

      <ReferralDashboard />
    </div>
  );
}
