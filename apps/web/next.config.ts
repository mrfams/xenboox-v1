import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@xenboox/ui",
    "@xenboox/db",
    "@xenboox/agents",
    "@xenboox/jobs",
  ],
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
  eslint: {
    ignoreDuringBuilds: true,
  },
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

export default nextConfig;
