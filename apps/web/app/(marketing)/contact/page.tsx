import { MarketingHero } from "@/components/marketing/hero";
import {
  Mail,
  MessageSquare,
  Phone,
  MapPin,
  ArrowRight,
  Send,
} from "lucide-react";
import Link from "next/link";

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
    action: "+233 30 000 0000",
    href: "tel:+233300000000",
  },
  {
    icon: MapPin,
    title: "Visit Us",
    description: "Our headquarters and primary support center.",
    action: "Accra, Ghana",
    href: "https://maps.google.com",
  },
];

export default function ContactPage() {
  return (
    <>
      <MarketingHero
        title="Get in Touch"
        description="Have a question about Xenboox? Want a demo? Need help with your account? We're here for you."
        cta={{ label: "Start a Conversation", href: "#form" }}
      />

      {/* Contact Methods */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {contactMethods.map((method) => {
              const Icon = method.icon;
              return (
                <Link
                  key={method.title}
                  href={method.href}
                  className="group rounded-xl border bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-3 font-semibold text-slate-900">
                    {method.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                    {method.description}
                  </p>
                  <p className="mt-3 text-sm font-medium text-blue-600 transition-colors group-hover:text-blue-500">
                    {method.action}{" "}
                    <ArrowRight className="ml-0.5 inline h-3.5 w-3.5" />
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Contact Form */}
      <section id="form" className="border-t bg-slate-50 py-16">
        <div className="mx-auto max-w-3xl px-4">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-slate-900">
              Send Us a Message
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Fill out the form and we'll get back to you within one business
              day.
            </p>
          </div>
          <form
            onSubmit={(e) => e.preventDefault()}
            className="rounded-2xl border bg-white p-6 shadow-sm sm:p-8"
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="name"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Full name
                </label>
                <input
                  id="name"
                  type="text"
                  placeholder="Your name"
                  className="w-full rounded-xl border bg-slate-50 px-4 py-2.5 text-sm outline-none transition-colors focus:border-blue-400 focus:bg-white"
                />
              </div>
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Email address
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  className="w-full rounded-xl border bg-slate-50 px-4 py-2.5 text-sm outline-none transition-colors focus:border-blue-400 focus:bg-white"
                />
              </div>
              <div>
                <label
                  htmlFor="company"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Company
                </label>
                <input
                  id="company"
                  type="text"
                  placeholder="Your company"
                  className="w-full rounded-xl border bg-slate-50 px-4 py-2.5 text-sm outline-none transition-colors focus:border-blue-400 focus:bg-white"
                />
              </div>
              <div>
                <label
                  htmlFor="subject"
                  className="mb-1.5 block text-sm font-medium text-slate-700"
                >
                  Subject
                </label>
                <select
                  id="subject"
                  className="w-full rounded-xl border bg-slate-50 px-4 py-2.5 text-sm outline-none transition-colors focus:border-blue-400 focus:bg-white"
                >
                  <option>General inquiry</option>
                  <option>Sales / Demo request</option>
                  <option>Technical support</option>
                  <option>Partnership inquiry</option>
                  <option>Other</option>
                </select>
              </div>
            </div>
            <div className="mt-5">
              <label
                htmlFor="message"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                Message
              </label>
              <textarea
                id="message"
                rows={4}
                placeholder="How can we help?"
                className="w-full rounded-xl border bg-slate-50 px-4 py-2.5 text-sm outline-none transition-colors focus:border-blue-400 focus:bg-white"
              />
            </div>
            <div className="mt-6 flex items-center justify-between">
              <p className="text-xs text-slate-400">
                We'll never share your information. By submitting, you agree to
                our{" "}
                <Link href="/privacy" className="text-blue-600 underline">
                  Privacy Policy
                </Link>
                .
              </p>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-blue-500 active:scale-[0.98]"
              >
                Send Message <Send className="h-4 w-4" />
              </button>
            </div>
          </form>
        </div>
      </section>
    </>
  );
}
