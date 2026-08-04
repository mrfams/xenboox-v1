"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Button,
  Separator,
} from "@xenboox/ui";
import {
  Palette,
  Globe,
  Clock,
  Save,
  Loader2,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
  { code: "wo", label: "Wolof" },
  { code: "ha", label: "Hausa" },
  { code: "sw", label: "Swahili" },
  { code: "pt", label: "Português" },
  { code: "ar", label: "العربية" },
];

const TIMEZONES = [
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  { value: "Africa/Banjul", label: "GMT (Banjul, Gambia)" },
  { value: "Africa/Lagos", label: "WAT (Lagos, Nigeria)" },
  { value: "Africa/Accra", label: "GMT (Accra, Ghana)" },
  { value: "Africa/Dakar", label: "GMT (Dakar, Senegal)" },
  { value: "Africa/Nairobi", label: "EAT (Nairobi, Kenya)" },
  { value: "America/New_York", label: "EST (New York, US)" },
  { value: "Europe/London", label: "GMT (London, UK)" },
  { value: "Europe/Paris", label: "CET (Paris, France)" },
];

const DATE_FORMATS = [
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD (ISO)" },
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
  { value: "DD.MM.YYYY", label: "DD.MM.YYYY" },
];

export function AppearanceSection() {
  const [form, setForm] = useState({
    theme: "system" as "light" | "dark" | "system",
    language: "en",
    timezone: "UTC",
    dateFormat: "YYYY-MM-DD",
  });

  const { data: prefs, isLoading } =
    trpc.settings.getAppearancePrefs.useQuery();
  const updatePrefs = trpc.settings.updateAppearancePrefs.useMutation({
    onSuccess: () => {
      toast.success("Appearance preferences saved");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save preferences");
    },
  });

  useEffect(() => {
    if (prefs) {
      setForm({
        theme: (prefs.theme as "light" | "dark" | "system") ?? "system",
        language: prefs.language ?? "en",
        timezone: prefs.timezone ?? "UTC",
        dateFormat: prefs.dateFormat ?? "YYYY-MM-DD",
      });
    }
  }, [prefs]);

  const handleSave = () => {
    updatePrefs.mutate(form);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Theme */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Theme
          </CardTitle>
          <CardDescription>
            Choose your preferred color scheme for the interface.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={() => setForm({ ...form, theme: "light" })}
                className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all hover:bg-muted/50 ${
                  form.theme === "light"
                    ? "border-primary bg-primary/5"
                    : "border-transparent"
                }`}
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-white shadow-sm">
                  <Sun className="h-6 w-6 text-amber-500" />
                </div>
                <span className="text-sm font-medium">Light</span>
              </button>
              <button
                onClick={() => setForm({ ...form, theme: "dark" })}
                className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all hover:bg-muted/50 ${
                  form.theme === "dark"
                    ? "border-primary bg-primary/5"
                    : "border-transparent"
                }`}
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-slate-900 shadow-sm">
                  <Moon className="h-6 w-6 text-blue-400" />
                </div>
                <span className="text-sm font-medium">Dark</span>
              </button>
              <button
                onClick={() => setForm({ ...form, theme: "system" })}
                className={`flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all hover:bg-muted/50 ${
                  form.theme === "system"
                    ? "border-primary bg-primary/5"
                    : "border-transparent"
                }`}
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gradient-to-br from-white to-slate-900 shadow-sm">
                  <Monitor className="h-6 w-6 text-slate-500" />
                </div>
                <span className="text-sm font-medium">System</span>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Language & Region */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Language & Region
          </CardTitle>
          <CardDescription>
            Select your preferred language and regional settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Display Language</Label>
              <Select
                value={form.language}
                onValueChange={(v) => setForm({ ...form, language: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select
                value={form.timezone}
                onValueChange={(v) => setForm({ ...form, timezone: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz.value} value={tz.value}>
                      {tz.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date Format</Label>
              <Select
                value={form.dateFormat}
                onValueChange={(v) => setForm({ ...form, dateFormat: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_FORMATS.map((fmt) => (
                    <SelectItem key={fmt.value} value={fmt.value}>
                      {fmt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={updatePrefs.isPending}>
          {updatePrefs.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Appearance Settings
        </Button>
      </div>
    </div>
  );
}
