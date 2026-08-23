export const dynamic = "force-dynamic";

import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
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
  // Live canonical domain — xenboox.com is not yet resolving; the Vercel
  // deployment is the source of truth until a custom domain is configured.
  return "https://xenboox.vercel.app";
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The CSP nonce is generated per-request in middleware and forwarded on the
  // request headers. next-themes renders its theme-init <script> inline, so it
  // needs the nonce to survive the strict production script-src policy.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html
      lang="en"
      className={`${inter.variable} ${ibmPlexMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background font-sans antialiased">
        {/* §4.7 — DNS/TCP/TLS warm-up for the external image hosts the app
            actually fetches from (user avatars via GitHub/Gravatar/Google,
            uploaded documents via R2 public URLs, `<bucket>.r2.dev`).
            next/font self-hosts the typefaces, so no font CDN preconnect is
            needed. CSP `img-src https:` already permits these. */}
        <link rel="preconnect" href="https://avatars.githubusercontent.com" />
        <link rel="preconnect" href="https://secure.gravatar.com" />
        <link rel="preconnect" href="https://lh3.googleusercontent.com" />
        <link rel="preconnect" href="https://r2.dev" />
        <ThemeProvider nonce={nonce}>
          <TRPCProvider>{children}</TRPCProvider>
        </ThemeProvider>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: "Xenboox",
              description:
                "AI-native full-stack accounting platform for African businesses",
              url: baseUrl,
              logo: `${baseUrl}/favicon.svg`,
              sameAs: [
                "https://twitter.com/xenboox",
                "https://linkedin.com/company/xenboox",
                "https://github.com/mrfams/xenboox",
              ],
            }),
          }}
        />
      </body>
    </html>
  );
}
// trigger rebuild
