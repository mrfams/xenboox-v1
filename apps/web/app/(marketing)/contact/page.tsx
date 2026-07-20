import {
  Mail,
  MessageSquare,
  MapPin,
  ArrowRight,
  Sparkles,
  Phone,
} from "lucide-react";
import Link from "next/link";

const contactMethods = [
  {
    icon: Mail,
    title: "Email",
    description:
      "For general inquiries, support, or partnership opportunities.",
    detail: "hello@xenboox.com",
    href: "mailto:hello@xenboox.com",
    gradient: "from-blue-500 to-indigo-500",
  },
  {
    icon: MessageSquare,
    title: "Sales",
    description: "Interested in the Enterprise plan or custom integrations?",
    detail: "sales@xenboox.com",
    href: "mailto:sales@xenboox.com",
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    icon: Phone,
    title: "Support",
    description: "Technical issues or billing questions? We're here to help.",
    detail: "support@xenboox.com",
    href: "mailto:support@xenboox.com",
    gradient: "from-amber-500 to-orange-500",
  },
  {
    icon: MapPin,
    title: "Location",
    description:
      "We're a remote-first company distributed across Africa and Europe.",
    detail: "Remote-first",
    href: null,
    gradient: "from-violet-500 to-purple-500",
  },
];

const faqs = [
  {
    question: "How do I get support for a technical issue?",
    answer:
      "Email support@xenboox.com with a description of the issue. Include your account email and any relevant screenshots. We typically respond within 24 hours.",
  },
  {
    question: "Do you offer demos for teams?",
    answer:
      "Yes. Contact sales@xenboox.com to schedule a demo of the full platform. We'll walk you through all 19 AI agents and how they fit your workflow.",
  },
  {
    question: "I found a bug. How do I report it?",
    answer:
      "Email support@xenboox.com. Please include steps to reproduce, expected behavior, and actual behavior. We appreciate your help making Xenboox better.",
  },
  {
    question: "Can I contribute to Xenboox?",
    answer:
      "Xenboox is currently closed-source, but we're open to feedback and feature requests. Reach out to hello@xenboox.com.",
  },
  {
    question: "What is your typical response time?",
    answer:
      "For support inquiries, we respond within 24 hours. Sales inquiries typically receive a response within 12 hours. Critical issues are addressed within 1 hour per our SLA.",
  },
];

export default function ContactPage() {
  return (
    <>
      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950">
        <div className="absolute inset-0 bg-grid-dark opacity-30" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm px-4 py-1.5 text-xs font-medium text-white/60">
              <Sparkles className="h-3 w-3 text-blue-400" />
              Get in Touch
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.1]">
              <span className="text-white">Let&apos;s talk about</span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
                transforming your accounting
              </span>
            </h1>
            <p className="mt-4 text-lg text-white/50 max-w-xl">
              Have a question, feedback, or want to work together? We&apos;d
              love to hear from you.
            </p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </section>

      {/* ── Contact Methods ── */}
      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 md:grid-cols-2">
            {contactMethods.map((method) => (
              <div
                key={method.title}
                className="group relative rounded-2xl border bg-white p-6 md:p-8 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5"
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${method.gradient} shadow-sm mb-4`}
                >
                  <method.icon className="h-6 w-6 text-white" />
                </div>
                <h2 className="text-lg font-semibold">{method.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {method.description}
                </p>
                <div className="mt-4">
                  {method.href ? (
                    <a
                      href={method.href}
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      {method.detail}
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </a>
                  ) : (
                    <span className="text-sm font-medium text-muted-foreground">
                      {method.detail}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="border-y bg-gradient-to-b from-slate-50 to-white py-16 md:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight">
              Common Questions
            </h2>
            <p className="mt-3 text-muted-foreground">
              Quick answers to the most common inquiries we receive.
            </p>
          </div>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <details
                key={faq.question}
                className="group rounded-xl border bg-white transition-all duration-200 hover:shadow-sm open:shadow-sm"
              >
                <summary className="flex cursor-pointer items-center justify-between px-6 py-4 text-sm font-medium text-foreground list-none">
                  {faq.question}
                  <ChevronDownIcon className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <div className="px-6 pb-4">
                  <p className="text-sm text-muted-foreground">{faq.answer}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-16 md:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold tracking-tight">
            Ready to get started?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Create your free account in 30 seconds. No credit card required.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/register"
              className="group relative inline-flex h-12 items-center rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-8 text-sm font-medium text-white shadow-lg shadow-blue-600/25 transition-all duration-300 hover:shadow-blue-600/40 hover:scale-105"
            >
              <span className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-400 to-indigo-400 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-40" />
              <span className="relative flex items-center gap-2">
                Create Free Account
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
