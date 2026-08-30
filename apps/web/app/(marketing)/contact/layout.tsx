import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us — Xenboox AI Accounting Support",
  description:
    "Get in touch with Xenboox. Our team responds within 24 hours. Questions, demos, and support — we're here for you.",
  openGraph: {
    title: "Contact Us — Xenboox AI Accounting Support",
    description:
      "Get in touch with Xenboox. Our team responds within 24 hours.",
    url: "https://xenboox.com/contact",
    siteName: "Xenboox",
    type: "website",
  },
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
