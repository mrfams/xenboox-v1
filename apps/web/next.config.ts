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
  transpilePackages: [
    "@xenboox/ui",
    "@xenboox/db",
    "@xenboox/agents",
    "@xenboox/jobs",
  ],
  // Disk-constrained environments: the webpack filesystem cache grows ~3.5 GB
  // per build and can fill the disk mid-build (ENOSPC, seen repeatedly on this
  // dev machine). Disable it — costs a slower cold compile, saves the disk.
  webpack: (config, { isServer }) => {
    config.cache = false;
    // OpenTelemetry: the NodeSDK barrel statically imports the gRPC exporter
    // chain, which webpack cannot bundle under pnpm's strict layout, and the
    // ESM builds of several OTel packages trip webpack's parser
    // ("SyntaxError: Invalid or unexpected token"). Per the Next.js OTel
    // guidance these server-only packages must run from node_modules at
    // runtime, not be bundled (we only use the OTLP/HTTP exporter). Missing
    // externals = "Module not found: '@grpc/grpc-js'" / parse errors.
    if (isServer) {
      const existing = Array.isArray(config.externals)
        ? config.externals
        : config.externals && typeof config.externals === "object"
          ? [config.externals]
          : [];
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
