"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import {
  User,
  Building2,
  Users,
  Bell,
  Shield,
  Settings,
  Palette,
  CreditCard,
  Key,
  History,
  Lock,
  Link,
  Fingerprint,
  Coins,
  Percent,
  RefreshCw,
  Database,
  Sparkles,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { AiSimulationTrigger } from "@/components/ai-ux/simulation-trigger";

// §4.4 — every section is a lazy chunk: only the ACTIVE tab's component is
// ever downloaded. The settings shell (nav + header) stays in the initial
// route chunk; TaxesSection alone is ~1.4K lines, so this keeps the Settings
// route payload to a fraction of what a static import map would ship.
// ssr:false is safe — the active tab is a client-side interaction and each
// section renders its own data-fetching state once mounted.
const SECTION_COMPONENTS: Record<string, React.ComponentType> = {
  profile: dynamic(
    () =>
      import("@/components/settings/profile-section").then(
        (m) => m.ProfileSection,
      ),
    { ssr: false },
  ),
  organization: dynamic(
    () =>
      import("@/components/settings/organization-section").then(
        (m) => m.OrganizationSection,
      ),
    { ssr: false },
  ),
  team: dynamic(
    () =>
      import("@/components/settings/team-section").then((m) => m.TeamSection),
    { ssr: false },
  ),
  "invite-member": dynamic(
    () =>
      import("@/components/settings/invite-member-section").then(
        (m) => m.InviteMemberSection,
      ),
    { ssr: false },
  ),
  notifications: dynamic(
    () =>
      import("@/components/settings/notifications-section").then(
        (m) => m.NotificationsSection,
      ),
    { ssr: false },
  ),
  security: dynamic(
    () =>
      import("@/components/settings/security-section").then(
        (m) => m.SecuritySection,
      ),
    { ssr: false },
  ),
  "entity-settings": dynamic(
    () =>
      import("@/components/settings/entity-settings-section").then(
        (m) => m.EntitySettingsSection,
      ),
    { ssr: false },
  ),
  appearance: dynamic(
    () =>
      import("@/components/settings/appearance-section").then(
        (m) => m.AppearanceSection,
      ),
    { ssr: false },
  ),
  billing: dynamic(
    () =>
      import("@/components/settings/billing-section").then(
        (m) => m.BillingSection,
      ),
    { ssr: false },
  ),
  "api-keys": dynamic(
    () =>
      import("@/components/settings/api-keys-section").then(
        (m) => m.ApiKeysSection,
      ),
    { ssr: false },
  ),
  webhooks: dynamic(
    () =>
      import("@/components/settings/webhooks-section").then(
        (m) => m.WebhooksSection,
      ),
    { ssr: false },
  ),
  sso: dynamic(
    () => import("@/components/settings/sso-section").then((m) => m.SsoSection),
    { ssr: false },
  ),
  "audit-log": dynamic(
    () =>
      import("@/components/settings/audit-log-section").then(
        (m) => m.AuditLogSection,
      ),
    { ssr: false },
  ),
  privacy: dynamic(
    () =>
      import("@/components/settings/privacy-section").then(
        (m) => m.PrivacySection,
      ),
    { ssr: false },
  ),
  integrations: dynamic(
    () =>
      import("@/components/settings/integrations-section").then(
        (m) => m.IntegrationsSection,
      ),
    { ssr: false },
  ),
  currency: dynamic(
    () =>
      import("@/components/settings/currency-section").then(
        (m) => m.CurrencySection,
      ),
    { ssr: false },
  ),
  taxes: dynamic(
    () =>
      import("@/components/settings/taxes-section").then((m) => m.TaxesSection),
    { ssr: false },
  ),
  backup: dynamic(
    () =>
      import("@/components/settings/backup-section").then(
        (m) => m.BackupSection,
      ),
    { ssr: false },
  ),
  "conflict-resolution": dynamic(
    () =>
      import("@/components/settings/conflict-resolution-section").then(
        (m) => m.ConflictResolutionSection,
      ),
    { ssr: false },
  ),
  sync: dynamic(
    () =>
      import("@/components/settings/sync-section").then((m) => m.SyncSection),
    { ssr: false },
  ),
  "ai-data": dynamic(
    () =>
      import("@/components/settings/ai-data-section").then(
        (m) => m.AIDataSection,
      ),
    { ssr: false },
  ),
};

interface TabGroup {
  label: string;
  tabs: typeof TABS extends readonly (infer T)[] ? T[] : never;
}

const TAB_GROUPS: TabGroup[] = [
  {
    label: "General",
    tabs: [
      {
        id: "profile",
        label: "Profile",
        icon: User,
        description: "Personal information and preferences",
      },
      {
        id: "organization",
        label: "Organization",
        icon: Building2,
        description: "Company details and entity management",
      },
      {
        id: "team",
        label: "Team",
        icon: Users,
        description: "User access and role management",
      },
      {
        id: "notifications",
        label: "Notifications",
        icon: Bell,
        description: "Email and push notification preferences",
      },
      {
        id: "appearance",
        label: "Appearance",
        icon: Palette,
        description: "Theme and language preferences",
      },
    ],
  },
  {
    label: "Security & Access",
    tabs: [
      {
        id: "security",
        label: "Security",
        icon: Shield,
        description: "Password, 2FA, and session management",
      },
      {
        id: "api-keys",
        label: "API Keys",
        icon: Key,
        description: "Manage API keys for integrations",
      },
      {
        id: "webhooks",
        label: "Webhooks",
        icon: Link,
        description: "Real-time event notifications to your systems",
      },
      {
        id: "sso",
        label: "SSO",
        icon: Fingerprint,
        description: "Single sign-on with your identity provider",
      },
      {
        id: "audit-log",
        label: "Audit Log",
        icon: History,
        description: "Track all account activity",
      },
    ],
  },
  {
    label: "Finance & Billing",
    tabs: [
      {
        id: "entity-settings",
        label: "Entity Settings",
        icon: Settings,
        description: "Approval thresholds and fiscal configuration",
      },
      {
        id: "billing",
        label: "Billing",
        icon: CreditCard,
        description: "Subscription and payment management",
      },
      {
        id: "integrations",
        label: "Integrations",
        icon: Link,
        description: "Bank connections and third-party services",
      },
      {
        id: "currency",
        label: "Currency",
        icon: Coins,
        description: "Exchange rates and multi-currency settings",
      },
      {
        id: "taxes",
        label: "Taxes",
        icon: Percent,
        description:
          "Configure VAT, PAYE, withholding, social security and custom taxes",
      },
    ],
  },
  {
    label: "Data & Privacy",
    tabs: [
      {
        id: "privacy",
        label: "Privacy & Data",
        icon: Lock,
        description: "Data export and account deletion",
      },
    ],
  },
  {
    label: "Data & Sync",
    tabs: [
      {
        id: "backup",
        label: "Backup & Versions",
        icon: History,
        description: "Settings backups, version history, and rollback",
      },
      {
        id: "conflict-resolution",
        label: "Conflicts",
        icon: RefreshCw,
        description: "Resolve multi-device settings conflicts",
      },
      {
        id: "sync",
        label: "Sync & Audit",
        icon: Database,
        description: "Real-time sync status and settings audit log",
      },
      {
        id: "ai-data",
        label: "AI & Data",
        icon: Sparkles,
        description: "AI usage stats and preference summary",
      },
    ],
  },
];

// Flatten all tabs for quick lookup
const TABS = TAB_GROUPS.flatMap((g) => g.tabs) as readonly {
  id: string;
  label: string;
  icon: typeof User;
  description: string;
}[];

type TabId = (typeof TABS)[number]["id"];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("profile");

  const ActiveComponent = SECTION_COMPONENTS[activeTab];
  const activeTabInfo = TABS.find((t) => t.id === activeTab);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-950">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Settings
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {activeTabInfo?.description}
          </p>
        </div>
        <AiSimulationTrigger
          traceId="workspace-setup"
          label="Set Up with AI"
          variant="outline"
          className="shrink-0"
        />
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <nav className="w-64 shrink-0 border-r border-slate-200 bg-slate-50/50 overflow-y-auto dark:border-slate-800 dark:bg-slate-900/50">
          <div className="space-y-6 p-3">
            {TAB_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="px-3 mb-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {group.label}
                </p>
                <div className="space-y-1">
                  {group.tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;

                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-all",
                          isActive
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100",
                        )}
                      >
                        <Icon
                          className={cn(
                            "h-4 w-4 shrink-0",
                            isActive
                              ? "text-primary"
                              : "text-slate-400 dark:text-slate-500",
                          )}
                        />
                        <span className="flex-1 truncate">{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </nav>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-6 py-6">
            <ActiveComponent />
          </div>
        </div>
      </div>
    </div>
  );
}
