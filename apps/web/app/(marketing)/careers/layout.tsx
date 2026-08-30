import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Careers — Build AI-Native Accounting | Xenboox",
  description:
    "Join the team building the future of AI-native accounting. We're hiring engineers, designers, and operators who want to ship products that matter.",
  openGraph: {
    title: "Careers — Build AI-Native Accounting | Xenboox",
    description:
      "Join the team building the future of AI-native accounting. We're hiring engineers, designers, and operators.",
    url: "https://xenboox.com/careers",
    siteName: "Xenboox",
    type: "website",
  },
};

export default function CareersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
