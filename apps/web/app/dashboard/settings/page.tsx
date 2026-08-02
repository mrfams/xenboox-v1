"use client";

import {
  Settings,
  User,
  Building2,
  CreditCard,
  Bell,
  Shield,
  Globe,
} from "lucide-react";

export default function SettingsPage() {
  const sections = [
    {
      icon: User,
      title: "Profile",
      description: "Manage your personal information and preferences",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      icon: Building2,
      title: "Organization",
      description: "Company details, branding, and entity settings",
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
    {
      icon: CreditCard,
      title: "Billing",
      description: "Subscription, payment methods, and invoices",
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      icon: Bell,
      title: "Notifications",
      description: "Email, push, and in-app notification preferences",
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      icon: Shield,
      title: "Security",
      description: "Password, 2FA, and session management",
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      icon: Globe,
      title: "Integrations",
      description: "Connect banks, payment providers, and other services",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
  ];

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      <div className="border-b border-slate-200 bg-white p-4">
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
          <span className="text-2xl">⚙️</span>
          Settings
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your account, organization, and application preferences.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl mx-auto">
          <div className="grid gap-4">
            {sections.map((section) => (
              <button
                key={section.title}
                className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50 hover:border-slate-300 transition-colors"
              >
                <div
                  className={`h-12 w-12 rounded-xl ${section.bgColor} flex items-center justify-center`}
                >
                  <section.icon className={`h-6 w-6 ${section.color}`} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">
                    {section.title}
                  </p>
                  <p className="text-xs text-slate-500">
                    {section.description}
                  </p>
                </div>
                <span className="text-slate-400">→</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
