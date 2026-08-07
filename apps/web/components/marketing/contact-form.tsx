"use client";

import Link from "next/link";
import { Send } from "lucide-react";

export function ContactForm() {
  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label
            htmlFor="name"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Full name
          </label>
          <input
            id="name"
            type="text"
            placeholder="Your name"
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Email address
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@company.com"
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label
            htmlFor="company"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Company
          </label>
          <input
            id="company"
            type="text"
            placeholder="Your company"
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label
            htmlFor="subject"
            className="mb-1.5 block text-sm font-medium text-foreground"
          >
            Subject
          </label>
          <select
            id="subject"
            className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
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
          className="mb-1.5 block text-sm font-medium text-foreground"
        >
          Message
        </label>
        <textarea
          id="message"
          rows={4}
          placeholder="How can we help?"
          className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>
      <div className="mt-6 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          We&apos;ll never share your information. By submitting, you agree to
          our{" "}
          <Link href="/privacy" className="text-primary underline">
            Privacy Policy
          </Link>
          .
        </p>
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all duration-200 hover:shadow-md hover:scale-[1.02]"
        >
          Send Message <Send className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}
