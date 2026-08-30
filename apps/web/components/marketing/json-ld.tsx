/**
 * JSON-LD Structured Data components for SEO.
 *
 * Usage:
 *   <OrganizationJsonLd />
 *   <ProductJsonLd name="Xenboox Starter" price="29" />
 *   <ArticleJsonLd title="..." date="..." author="..." />
 *   <FaqJsonLd items={[{ q: "...", a: "..." }]} />
 *   <BreadcrumbJsonLd items={[{ name: "Home", url: "/" }, { name: "Pricing" }]} />
 */

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://xenboox.com";

type JsonLdProps = {
  data: Record<string, unknown>;
};

function JsonLdScript({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({
          "@context": "https://schema.org",
          ...data,
        }),
      }}
    />
  );
}

// ─── Organization ────────────────────────────────────────────────────────────

export function OrganizationJsonLd() {
  return (
    <JsonLdScript
      data={{
        "@type": "Organization",
        name: "Xenboox",
        description:
          "AI-native full-stack accounting platform with specialized agents for invoicing, payroll, compliance, and financial reporting.",
        url: SITE_URL,
        logo: `${SITE_URL}/favicon.svg`,
        sameAs: [
          "https://twitter.com/xenboox",
          "https://linkedin.com/company/xenboox",
          "https://github.com/mrfams/xenboox",
        ],
        contactPoint: {
          "@type": "ContactPoint",
          contactType: "customer support",
          email: "support@xenboox.com",
          availableLanguage: ["English"],
        },
      }}
    />
  );
}

// ─── SoftwareApplication (for the product itself) ────────────────────────────

export function SoftwareAppJsonLd() {
  return (
    <JsonLdScript
      data={{
        "@type": "SoftwareApplication",
        name: "Xenboox",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        description:
          "AI-native accounting platform with specialized agents that handle invoicing, payroll, compliance, month-end close, and financial reporting.",
        url: SITE_URL,
        offers: {
          "@type": "AggregateOffer",
          lowPrice: "0",
          highPrice: "199",
          priceCurrency: "USD",
          offerCount: 4,
        },
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: "4.8",
          ratingCount: "127",
        },
      }}
    />
  );
}

// ─── Product (for pricing tiers) ─────────────────────────────────────────────

type ProductJsonLdProps = {
  name: string;
  description: string;
  price: string;
  currency?: string;
};

export function ProductJsonLd({
  name,
  description,
  price,
  currency = "USD",
}: ProductJsonLdProps) {
  return (
    <JsonLdScript
      data={{
        "@type": "Product",
        name,
        description,
        brand: { "@type": "Brand", name: "Xenboox" },
        offers: {
          "@type": "Offer",
          price,
          priceCurrency: currency,
          url: `${SITE_URL}/pricing`,
          availability: "https://schema.org/InStock",
          priceValidUntil: "2027-12-31",
        },
      }}
    />
  );
}

// ─── Article (for blog posts) ────────────────────────────────────────────────

type ArticleJsonLdProps = {
  title: string;
  description: string;
  url: string;
  datePublished: string;
  dateModified?: string;
  authorName?: string;
  imageUrl?: string;
};

export function ArticleJsonLd({
  title,
  description,
  url,
  datePublished,
  dateModified,
  authorName = "Xenboox Team",
  imageUrl,
}: ArticleJsonLdProps) {
  return (
    <JsonLdScript
      data={{
        "@type": "Article",
        headline: title,
        description,
        url,
        datePublished,
        dateModified: dateModified || datePublished,
        author: {
          "@type": "Person",
          name: authorName,
        },
        publisher: {
          "@type": "Organization",
          name: "Xenboox",
          logo: {
            "@type": "ImageObject",
            url: `${SITE_URL}/favicon.svg`,
          },
        },
        ...(imageUrl ? { image: imageUrl } : {}),
      }}
    />
  );
}

// ─── FAQ ─────────────────────────────────────────────────────────────────────

type FaqJsonLdProps = {
  items: Array<{ question: string; answer: string }>;
};

export function FaqJsonLd({ items }: FaqJsonLdProps) {
  return (
    <JsonLdScript
      data={{
        "@type": "FAQPage",
        mainEntity: items.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.answer,
          },
        })),
      }}
    />
  );
}

// ─── VideoObject ─────────────────────────────────────────────────────────────

type VideoObjectJsonLdProps = {
  name: string;
  description: string;
  thumbnailUrl?: string;
  uploadDate?: string;
  duration?: string; // ISO 8601 e.g. PT2M
  embedUrl?: string;
  contentUrl?: string;
};

export function VideoObjectJsonLd({
  name,
  description,
  thumbnailUrl,
  uploadDate = new Date().toISOString().split("T")[0],
  duration = "PT2M",
  embedUrl,
  contentUrl,
}: VideoObjectJsonLdProps) {
  return (
    <JsonLdScript
      data={{
        "@type": "VideoObject",
        name,
        description,
        thumbnailUrl: thumbnailUrl
          ? [thumbnailUrl]
          : [`${SITE_URL}/opengraph-image`],
        uploadDate,
        duration,
        ...(embedUrl ? { embedUrl } : {}),
        ...(contentUrl ? { contentUrl } : {}),
      }}
    />
  );
}

// ─── BreadcrumbList ──────────────────────────────────────────────────────────

type BreadcrumbItem = {
  name: string;
  url?: string; // If omitted, it's the current page
};

type BreadcrumbJsonLdProps = {
  items: BreadcrumbItem[];
};

export function BreadcrumbJsonLd({ items }: BreadcrumbJsonLdProps) {
  return (
    <JsonLdScript
      data={{
        "@type": "BreadcrumbList",
        itemListElement: items.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.name,
          ...(item.url
            ? {
                item: item.url.startsWith("http")
                  ? item.url
                  : `${SITE_URL}${item.url}`,
              }
            : {}),
        })),
      }}
    />
  );
}
