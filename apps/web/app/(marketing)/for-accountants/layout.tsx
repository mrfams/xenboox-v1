import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "For Accountants — Every Client's Close in One Queue | Xenboox",
  description:
    "Multi-entity by design. Run every client's close from one queue with evidence on every posting and an audit trail reviewers love.",
  openGraph: {
    title: "Xenboox for Accountants",
    description:
      "One queue for every client's close. Evidence on every posting. Audit-ready, multi-entity, multi-currency.",
  },
};

export default function ForAccountantsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
