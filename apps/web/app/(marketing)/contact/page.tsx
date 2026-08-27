import type { Metadata } from "next";
import Link from "next/link";
import { Mail, MessageSquare, Phone, MapPin, ArrowRight } from "lucide-react";

import { Section } from "@/components/marketing/section";
import { FadeInUp } from "@/components/marketing/reveal";
import { ContactForm } from "@/components/marketing/contact-form";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with Xenboox. Our team is here to help with questions, demos, and support.",
};

const contactMethods = [
  {
    icon: Mail,
    title: "Email Us",
    description:
      "Our team typically responds within 2 hours during business hours.",
    action: "hello@xenboox.com",
    href: "mailto:hello@xenboox.com",
  },
  {
    icon: MessageSquare,
    title: "Live Chat",
    description:
      "Chat with our team directly from the app or website during business hours.",
    action: "Start a conversation",
    href: "#",
  },
  {
    icon: Phone,
    title: "Phone",
    description: "Available for priority support and enterprise inquiries.",
    action: "Contact us for details",
    href: "mailto:hello@xenboox.com",
  },
  {
    icon: MapPin,
    title: "Visit Us",
    description: "Our headquarters and primary support center.",
    action: "Banjul, The Gambia",
    href: "https://maps.google.com",
  },
];

export default function ContactPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-paper">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden="true"
          style={{
            backgroundImage:
              "radial-gradient(rgba(20, 33, 61, 0.06) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            maskImage:
              "radial-gradient(ellipse at center, black 30%, transparent 75%)",
            WebkitMaskImage:
              "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <FadeInUp>
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                We&apos;d love to{" "}
                <span className="text-primary">hear from you</span>
              </h1>
              <p className="mt-6 max-w-2xl mx-auto text-lg leading-relaxed text-muted-foreground">
                Questions about Xenboox? Want a demo? Need help with your
                account? Our team responds within 24 hours.
              </p>
              <div className="mt-8">
                <Link
                  href="#form"
                  className="inline-flex h-12 items-center rounded-full bg-primary px-8 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-300 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98]"
                >
                  Send us a message
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </div>
          </FadeInUp>
        </div>
      </section>

      {/* Contact Methods */}
      <Section className="!pt-0">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {contactMethods.map((method, index) => (
              <FadeInUp key={method.title} delay={index * 0.1}>
                <Link
                  href={method.href}
                  className="group flex flex-col rounded-2xl border border-border/60 bg-card p-6 transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-[0_20px_50px_-20px_rgba(20,33,61,0.15)] hover:-translate-y-1 hover:border-border/40"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                    <method.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 font-semibold text-foreground">
                    {method.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {method.description}
                  </p>
                  <p className="mt-4 text-sm font-medium text-primary flex items-center gap-1">
                    {method.action}
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </p>
                </Link>
              </FadeInUp>
            ))}
          </div>
        </div>
      </Section>

      {/* Contact Form */}
      <section
        id="form"
        className="border-t border-border bg-paper-2/60 py-12 sm:py-16"
      >
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <FadeInUp>
            <div className="mb-10 text-center">
              <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                Send Us a Message
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Fill out the form and we&apos;ll get back to you within one
                business day.
              </p>
            </div>
          </FadeInUp>

          <FadeInUp delay={0.1}>
            <ContactForm />
          </FadeInUp>
        </div>
      </section>
    </>
  );
}
