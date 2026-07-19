"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  Mail,
  MessageSquare,
  MapPin,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import {
  MarketingShell,
  PageHero,
  Reveal,
  GlassCard,
  CtaBand,
} from "../components/marketing-primitives";

const contactMethods = [
  {
    icon: Mail,
    title: "Email",
    description:
      "For general inquiries, support, or partnership opportunities.",
    detail: "hello@xenboox.com",
    href: "mailto:hello@xenboox.com",
  },
  {
    icon: MessageSquare,
    title: "Sales",
    description: "Interested in the Enterprise plan or custom integrations?",
    detail: "sales@xenboox.com",
    href: "mailto:sales@xenboox.com",
  },
  {
    icon: MapPin,
    title: "Location",
    description:
      "We're a remote-first company. Our team is distributed across Africa and Europe.",
    detail: "Remote-first",
    href: null,
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
      "Yes. Contact sales@xenboox.com to schedule a demo of the full platform. We'll walk you through the product and how it fits your workflow.",
  },
  {
    question: "I found a bug. How do I report it?",
    answer:
      "Email support@xenboox.com or open an issue on our GitHub repository. Please include steps to reproduce, expected behavior, and actual behavior.",
  },
  {
    question: "Can I contribute to Xenboox?",
    answer:
      "Xenboox is currently closed-source, but we're open to feedback and feature requests. Reach out to hello@xenboox.com.",
  },
];

function ContactCard({
  method,
  index,
}: {
  method: (typeof contactMethods)[number];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{
        duration: 0.55,
        delay: index * 0.08,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    >
      <GlassCard className="h-full p-7">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-fuchsia-500 shadow-lg">
          <method.icon className="h-6 w-6 text-white" />
        </div>
        <h2 className="font-semibold text-white">{method.title}</h2>
        <p className="mt-2 text-sm text-white/55">{method.description}</p>
        <div className="mt-4">
          {method.href ? (
            <a
              href={method.href}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-300 hover:text-indigo-200"
            >
              {method.detail}
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
          ) : (
            <span className="text-sm font-medium text-white/70">
              {method.detail}
            </span>
          )}
        </div>
      </GlassCard>
    </motion.div>
  );
}

export default function ContactPage() {
  return (
    <MarketingShell>
      <PageHero
        eyebrow="Contact"
        title="Let's talk"
        highlight="Xenboox"
        subtitle="Have a question, feedback, or want to work together? We'd love to hear from you."
      />

      <section className="py-12">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 md:grid-cols-3">
          {contactMethods.map((method, i) => (
            <ContactCard key={method.title} method={method} index={i} />
          ))}
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Reveal className="mb-10 text-center">
            <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-white/60">
              <Sparkles className="h-3 w-3 text-indigo-400" />
              Common questions
            </span>
            <h2 className="text-3xl font-bold tracking-tight text-white">
              Before you reach out
            </h2>
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-2">
            {faqs.map((f, i) => (
              <Reveal key={f.question} delay={i * 0.05}>
                <GlassCard className="h-full p-6">
                  <h3 className="font-semibold text-white">{f.question}</h3>
                  <p className="mt-2 text-sm text-white/55">{f.answer}</p>
                </GlassCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <CtaBand
        title="Prefer to dive in?"
        subtitle="Spin up a free account and explore the platform yourself."
        primaryHref="/register"
        primaryLabel="Create Free Account"
        secondaryHref="/docs"
        secondaryLabel="Read the Docs"
      />
    </MarketingShell>
  );
}
