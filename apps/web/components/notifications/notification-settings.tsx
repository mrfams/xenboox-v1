"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Bell, BellOff, BellRing, Check, X, Settings } from "lucide-react";

import {
  requestNotificationPermission,
  getNotificationPermission,
  type NotificationType,
} from "@/lib/notifications";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";

// ─── Notification Settings ─────────────────────────────────────────────────
//
// Manages browser notification preferences. Shows permission status
// and lets users toggle specific notification types.

type NotificationSetting = {
  type: NotificationType;
  label: string;
  description: string;
  enabled: boolean;
};

const DEFAULT_SETTINGS: NotificationSetting[] = [
  {
    type: "approval_needed",
    label: "Approvals",
    description: "When an agent needs your approval",
    enabled: true,
  },
  {
    type: "deadline_approaching",
    label: "Deadlines",
    description: "When a deadline is approaching",
    enabled: true,
  },
  {
    type: "anomaly_detected",
    label: "Anomalies",
    description: "When AI detects financial anomalies",
    enabled: true,
  },
  {
    type: "ai_insight",
    label: "AI Insights",
    description: "When AI has an important insight",
    enabled: false,
  },
  {
    type: "batch_complete",
    label: "Batch Processing",
    description: "When document processing completes",
    enabled: true,
  },
  {
    type: "reconciliation_needed",
    label: "Reconciliation",
    description: "When reconciliation is needed",
    enabled: true,
  },
];

export function NotificationSettings() {
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [settings, setSettings] =
    useState<NotificationSetting[]>(DEFAULT_SETTINGS);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const { data: session } = useSession();
  const getSettings = trpc.settings.get.useQuery(undefined, {
    enabled: !!session?.user?.id,
    staleTime: 5 * 60 * 1000,
  });
  const setSettingsMutation = trpc.settings.set.useMutation();

  useEffect(() => {
    setPermission(getNotificationPermission());

    // Try server first (cross-device persistence)
    if (getSettings.data) {
      const serverSettings = getSettings.data as Record<string, unknown>;
      const notifPrefs = serverSettings.notifications as Record<string, boolean> | undefined;
      if (notifPrefs) {
        const merged = DEFAULT_SETTINGS.map((s) => ({
          ...s,
          enabled: notifPrefs[s.type] ?? s.enabled,
        }));
        setSettings(merged);
        // Sync localStorage
        localStorage.setItem("xenboox-notification-settings", JSON.stringify(merged));
        return;
      }
    }

    // Fallback to localStorage
    try {
      const saved = localStorage.getItem("xenboox-notification-settings");
      if (saved) {
        setSettings(JSON.parse(saved));
      }
    } catch {
      // Use defaults
    }
  }, [getSettings.data]);

  const handleRequestPermission = async () => {
    const newPermission = await requestNotificationPermission();
    setPermission(newPermission);

    if (newPermission === "granted") {
      showToastMessage("Notifications enabled!");
    } else {
      showToastMessage("Notifications blocked. Enable in browser settings.");
    }
  };

  const handleToggleSetting = (type: NotificationType) => {
    const newSettings = settings.map((s) =>
      s.type === type ? { ...s, enabled: !s.enabled } : s,
    );
    setSettings(newSettings);

    // Save to localStorage (instant)
    try {
      localStorage.setItem(
        "xenboox-notification-settings",
        JSON.stringify(newSettings),
      );
    } catch {
      // Storage full
    }

    // Persist to server (cross-device)
    if (session?.user?.id) {
      const prefs: Record<string, boolean> = {};
      for (const s of newSettings) {
        prefs[s.type] = s.enabled;
      }
      setSettingsMutation.mutate({ notifications: prefs });
    }
  };

  const showToastMessage = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  return (
    <div className="space-y-4">
      {/* Permission status */}
      <div
        className={cn(
          "rounded-xl border p-4",
          permission === "granted"
            ? "border-emerald-500/20 bg-emerald-500/[0.03]"
            : permission === "denied"
              ? "border-red-500/20 bg-red-500/[0.03]"
              : "border-amber-500/20 bg-amber-500/[0.03]",
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {permission === "granted" ? (
              <BellRing className="h-5 w-5 text-emerald-500" />
            ) : permission === "denied" ? (
              <BellOff className="h-5 w-5 text-red-500" />
            ) : (
              <Bell className="h-5 w-5 text-amber-500" />
            )}
            <div>
              <p className="text-sm font-medium text-foreground">
                {permission === "granted"
                  ? "Notifications Enabled"
                  : permission === "denied"
                    ? "Notifications Blocked"
                    : "Notifications Not Configured"}
              </p>
              <p className="text-xs text-muted-foreground">
                {permission === "granted"
                  ? "You'll receive browser notifications for urgent items"
                  : permission === "denied"
                    ? "Enable in browser settings to receive notifications"
                    : "Click below to enable browser notifications"}
              </p>
            </div>
          </div>
          {permission !== "granted" && permission !== "denied" && (
            <button
              type="button"
              onClick={handleRequestPermission}
              className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 transition-colors"
            >
              <Bell className="h-3.5 w-3.5" />
              Enable
            </button>
          )}
        </div>
      </div>

      {/* Notification types */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3">
          Notification Types
        </h4>
        <div className="space-y-2">
          {settings.map((setting) => (
            <div
              key={setting.type}
              className="flex items-center justify-between rounded-lg border border-border/50 bg-card p-3"
            >
              <div>
                <p className="text-sm font-medium text-foreground">
                  {setting.label}
                </p>
                <p className="text-xs text-muted-foreground">
                  {setting.description}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggleSetting(setting.type)}
                disabled={permission !== "granted"}
                className={cn(
                  "relative inline-flex h-5 w-9 items-center rounded-full transition-colors",
                  setting.enabled ? "bg-primary" : "bg-muted",
                  permission !== "granted" && "opacity-50 cursor-not-allowed",
                )}
              >
                <span
                  className={cn(
                    "inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform",
                    setting.enabled ? "translate-x-4" : "translate-x-0.5",
                  )}
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Toast */}
      {showToast && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg border border-border/50 bg-card p-3 shadow-lg">
          <Check className="h-4 w-4 text-emerald-500" />
          <p className="text-sm text-foreground">{toastMessage}</p>
        </div>
      )}
    </div>
  );
}
