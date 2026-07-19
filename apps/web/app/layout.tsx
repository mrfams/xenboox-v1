export const dynamic = "force-dynamic";

import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/layout/theme-provider";
import { TRPCProvider } from "@/lib/trpc/provider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://xenboox.com";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Xenboox — AI-Native Accounting for Africa",
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
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider>
          <TRPCProvider>{children}</TRPCProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
