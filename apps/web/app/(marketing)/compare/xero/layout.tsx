import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Xenboox vs Xero — Books That Run Themselves",
  description:
    "Xero vs Xenboox: close automation, approvals with evidence, multi-currency and mobile money from day one. Feature-by-feature comparison.",
  openGraph: {
    title: "Xenboox vs Xero",
    description:
      "Close automation, approvals with evidence, multi-currency from day one. Compare feature by feature.",
  },
};

export default function CompareXeroLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
