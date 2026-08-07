export const dynamic = "force-dynamic";

import type { Metadata, Viewport } from "next";
import { Inter, IBM_Plex_Mono } from "next/font/google";

import { ThemeProvider } from "@/components/layout/theme-provider";
import { TRPCProvider } from "@/lib/trpc/provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});

/**
 * Resolve the canonical app URL defensively.
 *
 * At build time Next.js may inline a redacted value (e.g. "[SENSITIVE]") for
 * NEXT_PUBLIC_* env vars, which would throw `ERR_INVALID_URL` inside
 * `new URL()` during page-data collection. Validate the candidate and fall
 * back to the canonical domain so a bad/redacted value can never crash
 * `next build` or produce broken metadata templates.
 */
function resolveBaseUrl(): string {
  const candidate = process.env.NEXT_PUBLIC_APP_URL;
  if (candidate) {
    try {
      const parsed = new URL(candidate);
      if (parsed.protocol === "http:" || parsed.protocol === "https:") {
        return parsed.origin;
      }
    } catch {
      // fall through to the canonical default below
    }
  }
  return "https://xenboox.com";
}

const baseUrl = resolveBaseUrl();

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Home | Xenboox",
    template: "%s | Xenboox",
  },
  description:
    "Full-stack accounting platform for African businesses. Multi-entity, multi-currency, AI-powered double-entry bookkeeping, invoicing, payroll, and financial reporting.",
  keywords: [
    "accounting software",
    "Africa accounting",
    "AI accounting",
    "double-entry bookkeeping",
    "invoicing",
    "payroll",
    "multi-currency",
    "financial reporting",
  ],
  authors: [{ name: "Xenboox" }],
  creator: "Xenboox",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: baseUrl,
    siteName: "Xenboox",
    title: "Xenboox — AI-Native Accounting for Africa",
    description:
      "Full-stack accounting platform for African businesses. Multi-entity, multi-currency, AI-powered.",
    images: [
      {
        url: `${baseUrl}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "Xenboox",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Xenboox — AI-Native Accounting for Africa",
    description:
      "Full-stack accounting platform for African businesses. Multi-entity, multi-currency, AI-powered.",
    images: [`${baseUrl}/og-image.png`],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${ibmPlexMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider>
          <TRPCProvider>{children}</TRPCProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
