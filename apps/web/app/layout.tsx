import type { Metadata, Viewport } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/layout/theme-provider"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
})

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://xenboox.com"

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
    "SaaS accounting",
    "Gambia accounting",
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
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Xenboox — AI-Native Accounting",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Xenboox — AI-Native Accounting for Africa",
    description:
      "Full-stack accounting platform for African businesses. Multi-entity, multi-currency, AI-powered.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: baseUrl,
  },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
