import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
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
  // Security headers handled by middleware (with nonce support)
  async headers() {
    return [];
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

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
  tunnelRoute: "/api/sentry",
});
