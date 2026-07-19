import type { MetadataRoute } from "next"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://xenboox.com"

export default function sitemap(): MetadataRoute.Sitemap {
  const marketingPages = ["", "/features", "/pricing", "/download", "/about", "/blog", "/careers", "/contact", "/privacy", "/terms", "/cookies", "/refund", "/sla"]
  const authPages = ["/login", "/register", "/forgot-password"]

  const staticPages = [...marketingPages, ...authPages].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }))

  return staticPages
}
