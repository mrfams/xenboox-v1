import type { MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://xenboox.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const marketingPages = [
    "",
    "/features",
    "/pricing",
    "/download",
    "/about",
    "/blog",
    "/careers",
    "/contact",
    "/privacy",
    "/terms",
    "/cookies",
    "/refund",
    "/sla",
  ];

  const docsPages = [
    "/docs",
    "/docs/agents",
    "/docs/agents/analytics",
    "/docs/agents/ap",
    "/docs/agents/ar",
    "/docs/agents/audit",
    "/docs/agents/budget",
    "/docs/agents/cash",
    "/docs/agents/cfo",
    "/docs/agents/chat",
    "/docs/agents/compliance",
    "/docs/agents/controller",
    "/docs/agents/document",
    "/docs/agents/fiscal",
    "/docs/agents/fixed-assets",
    "/docs/agents/inventory",
    "/docs/agents/ledger",
    "/docs/agents/mobile-money",
    "/docs/agents/payroll",
    "/docs/agents/reporting",
    "/docs/agents/treasury",
    "/docs/changelog",
    "/docs/concepts",
    "/docs/devsecops",
    "/docs/faq",
    "/docs/getting-started",
    "/docs/modules",
    "/docs/modules/analytics",
    "/docs/modules/ap",
    "/docs/modules/ar",
    "/docs/modules/cash",
    "/docs/modules/chat",
    "/docs/modules/coa",
    "/docs/modules/currency",
    "/docs/modules/documents",
    "/docs/modules/fiscal",
    "/docs/modules/fixed-assets",
    "/docs/modules/inventory",
    "/docs/modules/journal",
    "/docs/modules/mobile-money",
    "/docs/modules/organizations",
    "/docs/modules/payroll",
    "/docs/modules/reports",
    "/docs/modules/settings",
    "/docs/modules/treasury",
    "/docs/quickstart",
    "/docs/security",
    "/docs/webhooks",
  ];

  const staticPages = [...marketingPages, ...docsPages].map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: path === "" ? 1 : 0.7,
  }));

  return staticPages;
}
