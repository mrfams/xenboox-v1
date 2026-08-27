"use client";

import { useState } from "react";
import { Gift, Users, CheckCircle2, Clock, Copy, Share2 } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Badge } from "@/components/ui";

export function ReferralDashboard() {
  const [copied, setCopied] = useState(false);

  const { data: code } = trpc.referrals.getMyCode.useQuery();
  const { data: stats } = trpc.referrals.getStats.useQuery();
  const { data: referrals } = trpc.referrals.listReferrals.useQuery();

  const referralUrl = code
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/register?ref=${code.code}`
    : "";

  const handleCopy = async () => {
    if (referralUrl) {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Referral Link Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Your Referral Link
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-md bg-muted px-3 py-2 text-sm font-mono">
              {referralUrl || "Generating..."}
            </code>
            <Button size="sm" onClick={handleCopy} disabled={!referralUrl}>
              {copied ? (
                <CheckCircle2 className="h-4 w-4 mr-1" />
              ) : (
                <Copy className="h-4 w-4 mr-1" />
              )}
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Share this link with friends. When they sign up and activate their
            account, you both earn a reward.
          </p>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Referrals
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalReferrals ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activated</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-balanced-green" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.activatedReferrals ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.pendingReferrals ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rewards */}
      {stats?.rewards && stats.rewards.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Your Rewards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.rewards.map(
                (reward: {
                  id: string;
                  description: string;
                  type: string;
                  grantedAt: Date;
                }) => (
                  <div
                    key={reward.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {reward.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(reward.grantedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="secondary">{reward.type}</Badge>
                  </div>
                ),
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Referral History */}
      {referrals && referrals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Referral History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {referrals.map(
                (referral: {
                  id: string;
                  refereeEmail: string;
                  createdAt: Date;
                  status: string;
                }) => (
                  <div
                    key={referral.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {referral.refereeEmail}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(referral.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge
                      variant={
                        referral.status === "rewarded"
                          ? "default"
                          : referral.status === "activated"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {referral.status}
                    </Badge>
                  </div>
                ),
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {referrals && referrals.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center">
            <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">No referrals yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Share your referral link to start earning rewards.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
