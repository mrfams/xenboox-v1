"use client";

import { useState } from "react";
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
} from "lucide-react";

import { cn } from "@/lib/utils";
import { ProfileSection } from "@/components/settings/profile-section";
import { OrganizationSection } from "@/components/settings/organization-section";
import { TeamSection } from "@/components/settings/team-section";
import { InviteMemberSection } from "@/components/settings/invite-member-section";
import { NotificationsSection } from "@/components/settings/notifications-section";
import { SecuritySection } from "@/components/settings/security-section";
import { EntitySettingsSection } from "@/components/settings/entity-settings-section";
import { AppearanceSection } from "@/components/settings/appearance-section";
import { BillingSection } from "@/components/settings/billing-section";
import { ApiKeysSection } from "@/components/settings/api-keys-section";
import { AuditLogSection } from "@/components/settings/audit-log-section";
import { PrivacySection } from "@/components/settings/privacy-section";
import { IntegrationsSection } from "@/components/settings/integrations-section";
import { WebhooksSection } from "@/components/settings/webhooks-section";
import { SsoSection } from "@/components/settings/sso-section";

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
];

// Flatten all tabs for quick lookup
const TABS = TAB_GROUPS.flatMap((g) => g.tabs) as readonly {
  id: string;
  label: string;
  icon: typeof User;
  description: string;
}[];

type TabId = (typeof TABS)[number]["id"];

const SECTION_COMPONENTS: Record<string, React.ComponentType> = {
  profile: ProfileSection,
  organization: OrganizationSection,
  team: TeamSection,
  "invite-member": InviteMemberSection,
  notifications: NotificationsSection,
  security: SecuritySection,
  "entity-settings": EntitySettingsSection,
  appearance: AppearanceSection,
  billing: BillingSection,
  "api-keys": ApiKeysSection,
  webhooks: WebhooksSection,
  sso: SsoSection,
  "audit-log": AuditLogSection,
  privacy: PrivacySection,
  integrations: IntegrationsSection,
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("profile");

  const ActiveComponent = SECTION_COMPONENTS[activeTab];
  const activeTabInfo = TABS.find((t) => t.id === activeTab);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-950">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          Settings
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {activeTabInfo?.description}
        </p>
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
