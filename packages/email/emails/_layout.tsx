import {
  Body,
  Container,
  Head,
  Html,
  Link,
  Preview,
  Section,
  Tailwind,
  Text,
  Hr,
} from "@react-email/components";
import type { ReactNode } from "react";

// ─── Xenboox Brand Tokens ──────────────────────────────────────────────────
// These mirror the web app's design system for brand consistency.

export const BRAND = {
  name: "Xenboox",
  tagline: "AI-Native Accounting",
  color: {
    primary: "#4F46E5", // indigo-600
    primaryDark: "#4338CA", // indigo-700
    text: "#0F172A", // slate-900
    textSecondary: "#64748B", // slate-500
    textMuted: "#94A3B8", // slate-400
    background: "#F8FAFC", // slate-50
    surface: "#FFFFFF",
    border: "#E2E8F0", // slate-200
    success: "#16A34A", // green-600
    warning: "#D97706", // amber-600
    danger: "#DC2626", // red-600
  },
  urls: {
    app: "https://app.xenboox.com",
    website: "https://xenboox.com",
    docs: "https://xenboox.com/docs",
    privacy: "https://xenboox.com/privacy",
    terms: "https://xenboox.com/terms",
    support: "mailto:support@xenboox.com",
    unsubscribe: "https://app.xenboox.com/settings/notifications",
  },
} as const;

// ─── Layout Props ──────────────────────────────────────────────────────────

export type EmailLayoutProps = {
  /** Preview text shown in email client inbox (before opening) */
  preview: string;
  /** Email subject line (used in Preview component) */
  subject?: string;
  /** Main content rendered between header and footer */
  children: ReactNode;
  /** Optional preheader text override */
  preheader?: string;
};

// ─── Layout Component ──────────────────────────────────────────────────────

export function EmailLayout({ preview, children }: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Tailwind>
        <Body className="bg-[#F8FAFC] font-sans m-0 p-0">
          <Preview>{preview}</Preview>

          {/* ── Outer wrapper ──────────────────────────────────── */}
          <Section className="bg-[#F8FAFC] py-8 px-4">
            <Container className="mx-auto max-w-[600px]">

              {/* ── Header / Logo ──────────────────────────────── */}
              <Section className="mb-6 text-center">
                <Link href={BRAND.urls.app} className="no-underline">
                  {/* Inline SVG logo — renders in all email clients */}
                  <Text className="text-[28px] font-bold text-[#4F46E5] m-0 leading-none tracking-tight">
                    xenboox
                  </Text>
                  <Text className="text-[11px] text-[#94A3B8] m-0 mt-1 tracking-widest uppercase">
                    {BRAND.tagline}
                  </Text>
                </Link>
              </Section>

              {/* ── Main Card ──────────────────────────────────── */}
              <Section className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
                {/* Accent bar */}
                <Section className="h-[4px] bg-gradient-to-r from-[#4F46E5] to-[#7C3AED]" />

                {/* Content */}
                <Section className="px-8 py-8">
                  {children}
                </Section>
              </Section>

              {/* ── Footer ─────────────────────────────────────── */}
              <Section className="mt-6 px-4">
                {/* Separator */}
                <Hr className="border-[#E2E8F0] mb-6" />

                {/* Company info */}
                <Text className="text-[12px] text-[#94A3B8] text-center m-0 mb-2">
                  {BRAND.name} — {BRAND.tagline}
                </Text>
                <Text className="text-[12px] text-[#94A3B8] text-center m-0 mb-4">
                  AI-native accounting for modern businesses
                </Text>

                {/* Links */}
                <Text className="text-[11px] text-[#94A3B8] text-center m-0">
                  <Link href={BRAND.urls.website} className="text-[#64748B] underline">
                    Website
                  </Link>
                  {" · "}
                  <Link href={BRAND.urls.docs} className="text-[#64748B] underline">
                    Docs
                  </Link>
                  {" · "}
                  <Link href={BRAND.urls.support} className="text-[#64748B] underline">
                    Support
                  </Link>
                  {" · "}
                  <Link href={BRAND.urls.privacy} className="text-[#64748B] underline">
                    Privacy
                  </Link>
                  {" · "}
                  <Link href={BRAND.urls.terms} className="text-[#64748B] underline">
                    Terms
                  </Link>
                </Text>

                {/* Unsubscribe */}
                <Text className="text-[10px] text-[#CBD5E1] text-center m-0 mt-4">
                  You received this because you have an active Xenboox account.{" "}
                  <Link
                    href={BRAND.urls.unsubscribe}
                    className="text-[#94A3B8] underline"
                  >
                    Manage notification preferences
                  </Link>
                </Text>

                <Text className="text-[10px] text-[#CBD5E1] text-center m-0 mt-2">
                  © {new Date().getFullYear()} Xenboox. All rights reserved.
                </Text>
              </Section>

            </Container>
          </Section>
        </Body>
      </Tailwind>
    </Html>
  );
}

// ─── Reusable Sub-Components ───────────────────────────────────────────────
// Shared building blocks used across multiple email templates.

/**
 * A key-value row for financial data display (e.g., "Revenue: $12,500").
 */
export function DataRow({
  label,
  value,
  bold = false,
  color,
}: {
  label: string;
  value: string;
  bold?: boolean;
  color?: string;
}) {
  return (
    <Section className="flex justify-between py-2">
      <Text className="text-[14px] text-[#64748B] m-0">{label}</Text>
      <Text
        className={`text-[14px] m-0 ${bold ? "font-bold" : "font-semibold"} ${
          color ?? "text-[#0F172A]"
        }`}
      >
        {value}
      </Text>
    </Section>
  );
}

/**
 * A horizontal divider with optional label.
 */
export function Divider({ label }: { label?: string }) {
  if (label) {
    return (
      <Section className="flex items-center my-4">
        <Hr className="flex-1 border-[#E2E8F0]" />
        <Text className="text-[11px] text-[#94A3B8] px-3 m-0 whitespace-nowrap">
          {label}
        </Text>
        <Hr className="flex-1 border-[#E2E8F0]" />
      </Section>
    );
  }
  return <Hr className="border-[#E2E8F0] my-4" />;
}

/**
 * A CTA button with Xenboox branding.
 */
export function CTAButton({
  href,
  label,
  variant = "primary",
}: {
  href: string;
  label: string;
  variant?: "primary" | "success" | "danger";
}) {
  const colors = {
    primary: "bg-[#4F46E5] hover:bg-[#4338CA]",
    success: "bg-[#16A34A] hover:bg-[#15803D]",
    danger: "bg-[#DC2626] hover:bg-[#B91C1C]",
  };

  return (
    <Section className="mt-6 mb-2">
      <Link
        href={href}
        className={`block w-full text-center text-white text-[14px] font-semibold py-3 px-6 rounded-lg no-underline ${colors[variant]}`}
      >
        {label}
      </Link>
    </Section>
  );
}

/**
 * Info box with colored background (for tips, warnings, etc.).
 */
export function InfoBox({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "danger";
}) {
  const bgColors = {
    default: "bg-[#F1F5F9] border-[#E2E8F0]",
    success: "bg-[#F0FDF4] border-[#BBF7D0]",
    warning: "bg-[#FFFBEB] border-[#FDE68A]",
    danger: "bg-[#FEF2F2] border-[#FECACA]",
  };

  return (
    <Section className={`rounded-lg border p-4 my-4 ${bgColors[variant]}`}>
      {children}
    </Section>
  );
}
