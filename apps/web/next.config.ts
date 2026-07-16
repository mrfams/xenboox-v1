import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  transpilePackages: ["@xenboox/ui", "@xenboox/db"],
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb"
    }
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.r2.cloudflarestorage.com"
      }
    ]
  },
  // Security headers handled by middleware (with nonce support)
  async headers() {
    return []
  },
  // Security optimizations
  compress: true,
  poweredByHeader: false,
  // Enterprise logging
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
}

export default nextConfig
