import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

// §4.4/§15.5 — bundle-size monitoring. `ANALYZE=true` (or =1) makes `next
// build` emit the interactive bundle analyzer report to .next/analyze
// (server + client trees) so regressions are visible pre-launch. Off by
// default — zero impact on normal builds.
const withBundleAnalyzer =
  process.env.ANALYZE === "true" || process.env.ANALYZE === "1"
    ? require("@next/bundle-analyzer")({ enabled: true })
    : (config: NextConfig) => config;

const baseConfig: NextConfig = {
  // ESLint runs as its own CI gate (`pnpm lint` — 0 errors). Running it again
  // inside `next build` on Vercel's container OOM-kills the build worker on
  // this codebase (hundreds of files, ~560 warnings; the flat-config run never
  // reaches its summary line). Standard practice: lint in CI, not in the build.
  eslint: {
    ignoreDuringBuilds: true,
  },
  // The AppRouter type aggregates ~85 sub-routers, each with zod-validated
  // procedures. TypeScript's type-inference depth limit is exceeded on
  // Vercel's constrained build machine (2 cores, 8 GB), causing the
  // AppRouter type to collapse. Type-checking runs as a separate CI gate.
  typescript: {
    ignoreBuildErrors: true,
  },
  transpilePackages: [
    "@xenboox/ui",
    "@xenboox/db",
    "@xenboox/agents",
    "@xenboox/jobs",
  ],
  // Disk-constrained environments: the webpack filesystem cache grows ~3.5 GB
  // per build and can fill the disk mid-build (ENOSPC, seen repeatedly on this
  // dev machine). Disable it — costs a slower cold compile, saves the disk.
  webpack: (config, { isServer, nextRuntime }) => {
    config.cache = false;
    // OpenTelemetry: the NodeSDK barrel statically imports the gRPC exporter
    // chain, which webpack cannot bundle under pnpm's strict layout, and the
    // ESM builds of several OTel packages trip webpack's parser
    // ("SyntaxError: Invalid or unexpected token"). Per the Next.js OTel
    // guidance these server-only packages must run from node_modules at
    // runtime, not be bundled (we only use the OTLP/HTTP exporter). Missing
    // externals = "Module not found: '@grpc/grpc-js'" / parse errors.
    //
    // Runtimes are handled separately:
    //
    // NODEJS — the whole @opentelemetry/* scope is externalized so the
    // SDK runs from node_modules at runtime (the NodeSDK barrel statically
    // imports the gRPC exporter chain; missing externals = "Module not
    // found: '@grpc/grpc-js'" / parse errors under pnpm's strict layout).
    //
    // EDGE — @sentry/nextjs's edge entry statically imports the pure-JS
    // @opentelemetry/api / core / sdk-trace-base, and an externalized
    // require would fail at runtime with "Native module not found:
    // @opentelemetry/api" (edge has no node_modules). So on edge those
    // packages are BUNDLED, and only the NodeSDK chain (@opentelemetry/
    // sdk-node and its gRPC deps) is externalized — it requires Node
    // builtins that don't exist on edge, and it is only reachable through
    // register()'s node-only dynamic import, so it is never executed there.
    const existing = Array.isArray(config.externals)
      ? config.externals
      : config.externals && typeof config.externals === "object"
        ? [config.externals]
        : [];
    if (isServer && nextRuntime === "nodejs") {
      config.externals = [
        ...existing,
        // Whole @opentelemetry/* scope — every package runs from node_modules.
        (
          { request }: { request?: string },
          callback: (err?: unknown, ext?: string) => void,
        ) => {
          if (request && request.startsWith("@opentelemetry/")) {
            return callback(null, `commonjs ${request}`);
          }
          callback();
        },
        // NodeSDK's static gRPC imports (bundled as externals even though we
        // only use the OTLP/HTTP exporter).
        "@grpc/grpc-js",
        "@grpc/proto-loader",
      ];
    } else if (isServer && nextRuntime === "edge") {
      // Edge bundle: keep ONLY the heavy NodeSDK chain out. These are never
      // required at runtime on edge (register() skips the nodejs branch), so
      // externalizing them is safe and prevents webpack from bundling
      // grpc-js's Node-builtin requires. Everything else @opentelemetry/*
      // (api, core, sdk-trace-base) must BUNDLE — Sentry's edge entry
      // imports them and edge cannot require from node_modules.
      config.externals = [
        ...existing,
        "@opentelemetry/sdk-node",
        "@opentelemetry/auto-instrumentations-node",
        "@opentelemetry/otlp-grpc-exporter-base",
        "@grpc/grpc-js",
        "@grpc/proto-loader",
      ];
    }
    if (isServer && nextRuntime === "nodejs") {
      // Scope-hoisting (module concatenation) cannot inline namespace imports
      // of the externalized OTel packages — disable it on the server graph.
      if (config.optimization && typeof config.optimization === "object") {
        config.optimization.concatenateModules = false;
      }
    }
    return config;
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.r2.cloudflarestorage.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "*.gravatar.com",
      },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },
  // §4.1 — cache headers. Static hashed assets are immutable (Next.js emits
  // content-hashed filenames under /_next/static, so a 1-year cache is safe);
  // public /static assets get the same treatment. Everything else (pages,
  // API, tRPC, auth) stays uncached at the edge — session/entity data must
  // never be cached. Security headers are handled by middleware (with nonce).
  async headers() {
    return [
      {
        // Security headers for all routes
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/favicon.ico",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400",
          },
        ],
      },
      {
        source: "/robots.txt",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400",
          },
        ],
      },
      {
        source: "/sitemap.xml",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400",
          },
        ],
      },
    ];
  },
  // AI-Native redirect map — old 22-page routes to new 5-surface architecture.
  // Every old route gets a permanent redirect so no bookmarks or links break.
  async redirects() {
    return [
      // Command Center absorbs: chat, explore, activity, agent-monitor
      { source: "/dashboard/chat", destination: "/dashboard", permanent: true },
      {
        source: "/dashboard/explore",
        destination: "/dashboard",
        permanent: true,
      },
      {
        source: "/dashboard/activity",
        destination: "/dashboard",
        permanent: true,
      },
      {
        source: "/dashboard/agent-monitor",
        destination: "/dashboard",
        permanent: true,
      },
      // Tasks absorbs: inbox, review-queue, notifications, work, activity-hub
      {
        source: "/dashboard/inbox",
        destination: "/dashboard/tasks",
        permanent: true,
      },
      {
        source: "/dashboard/review-queue",
        destination: "/dashboard/tasks",
        permanent: true,
      },
      {
        source: "/dashboard/notifications",
        destination: "/dashboard/tasks",
        permanent: true,
      },
      {
        source: "/dashboard/work",
        destination: "/dashboard/tasks",
        permanent: true,
      },
      {
        source: "/dashboard/activity-hub",
        destination: "/dashboard/tasks",
        permanent: true,
      },
      // Phase C: absorbed routes — approvals live in Tasks, knowledge and
      // reports live in chat/Pulse, referrals live in Settings.
      {
        source: "/dashboard/auto-approve",
        destination: "/dashboard/tasks",
        permanent: true,
      },
      {
        source: "/dashboard/knowledge",
        destination: "/dashboard",
        permanent: true,
      },
      {
        source: "/dashboard/help",
        destination: "/docs",
        permanent: true,
      },
      {
        source: "/dashboard/qbr",
        destination: "/dashboard/financial-pulse",
        permanent: true,
      },
      {
        source: "/dashboard/donor-reporting",
        destination: "/dashboard/financial-pulse",
        permanent: true,
      },
      {
        source: "/dashboard/people",
        destination: "/dashboard/operations",
        permanent: true,
      },
      {
        source: "/dashboard/referrals",
        destination: "/dashboard/settings",
        permanent: true,
      },
      // Financial Pulse absorbs: reports, insights
      {
        source: "/dashboard/reports",
        destination: "/dashboard/financial-pulse",
        permanent: true,
      },
      {
        source: "/dashboard/insights",
        destination: "/dashboard/financial-pulse",
        permanent: true,
      },
      // Ledger absorbs: journal, chart-of-accounts, trial-balance, fixed-assets, transactions
      {
        source: "/dashboard/journal",
        destination: "/dashboard/ledger",
        permanent: true,
      },
      {
        source: "/dashboard/chart-of-accounts",
        destination: "/dashboard/ledger",
        permanent: true,
      },
      {
        source: "/dashboard/trial-balance",
        destination: "/dashboard/ledger",
        permanent: true,
      },
      {
        source: "/dashboard/fixed-assets",
        destination: "/dashboard/ledger",
        permanent: true,
      },
      {
        source: "/dashboard/transactions",
        destination: "/dashboard/ledger",
        permanent: true,
      },
      // Operations absorbs: invoicing, estimates, bills, expenses, banking, money,
      // payroll, reconciliation, tax-compliance, close, documents, customers, vendors, inventory
      {
        source: "/dashboard/invoicing",
        destination: "/dashboard/operations",
        permanent: true,
      },
      {
        source: "/dashboard/estimates",
        destination: "/dashboard/operations",
        permanent: true,
      },
      {
        source: "/dashboard/bills",
        destination: "/dashboard/operations",
        permanent: true,
      },
      {
        source: "/dashboard/expenses",
        destination: "/dashboard/operations",
        permanent: true,
      },
      {
        source: "/dashboard/banking",
        destination: "/dashboard/operations",
        permanent: true,
      },
      {
        source: "/dashboard/money",
        destination: "/dashboard/operations",
        permanent: true,
      },
      {
        source: "/dashboard/payroll",
        destination: "/dashboard/operations",
        permanent: true,
      },
      {
        source: "/dashboard/reconciliation/center",
        destination: "/dashboard/operations",
        permanent: true,
      },
      {
        source: "/dashboard/tax-compliance",
        destination: "/dashboard/operations",
        permanent: true,
      },
      {
        source: "/dashboard/close",
        destination: "/dashboard/operations",
        permanent: true,
      },
      {
        source: "/dashboard/documents",
        destination: "/dashboard/operations",
        permanent: true,
      },
      {
        source: "/dashboard/customers",
        destination: "/dashboard/operations",
        permanent: true,
      },
      {
        source: "/dashboard/vendors",
        destination: "/dashboard/operations",
        permanent: true,
      },
      {
        source: "/dashboard/inventory",
        destination: "/dashboard/operations",
        permanent: true,
      },
      // Admin pages move out of dashboard
      {
        source: "/dashboard/agents",
        destination: "/admin/agents",
        permanent: true,
      },
      {
        source: "/dashboard/automation",
        destination: "/admin/automation",
        permanent: true,
      },
    ];
  },
  // Security & performance optimizations
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
  productionBrowserSourceMaps: false,
  // Enterprise logging (only in development)
  logging:
    process.env.NODE_ENV === "development"
      ? {
          fetches: {
            fullUrl: true,
          },
        }
      : undefined,
};

const nextConfig = withBundleAnalyzer(baseConfig);

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Release = commit SHA so source maps and stack traces line up per deploy.
  // Vercel exposes it as VERCEL_GIT_COMMIT_SHA; fall back to git for local.
  release: {
    create: true,
    name: process.env.VERCEL_GIT_COMMIT_SHA || process.env.SENTRY_RELEASE,
  },
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
  tunnelRoute: "/api/sentry",
  sourcemaps: {
    // §2.1 — upload happens at build time (Vercel build) via the webpack
    // plugin when SENTRY_ORG/PROJECT/AUTH_TOKEN are set; delete the maps
    // from the bundle after upload so they never ship to the browser.
    deleteSourcemapsAfterUpload: true,
  },
});
