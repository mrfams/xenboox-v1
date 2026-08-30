import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About — AI-Native Accounting for the World | Xenboox",
  description:
    "We built Xenboox to give every business a finance team that works. Multi-currency, multi-entity, multi-jurisdiction from day one. Meet the team behind the AI.",
  openGraph: {
    title: "About — AI-Native Accounting for the World | Xenboox",
    description:
      "We built Xenboox to give every business a finance team that works. Multi-currency, multi-entity, multi-jurisdiction from day one.",
    url: "https://xenboox.com/about",
    siteName: "Xenboox",
    type: "website",
  },
};

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
