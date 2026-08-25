import type { Metadata } from "next";
import Link from "next/link";

import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Create Account — Xenboox",
  description:
    "Create your free Xenboox account and start AI-native accounting.",
};

export default function RegisterPage() {
  return (
    <div>
      {/* Mobile-only logo (hidden on lg+ since the left panel shows it) */}
      <div className="mb-8 text-center lg:hidden">
        <Link href="/" className="inline-flex items-center gap-2.5 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-extrabold tracking-tight shadow-sm transition-transform duration-200 group-hover:scale-105">
            xbx
          </div>
          <span className="text-2xl font-bold tracking-tight">Xenboox</span>
        </Link>
      </div>

      <RegisterForm />

      <p className="mt-4 text-center text-xs text-muted-foreground/70">
        We'll send you a verification email to activate your account.
      </p>

      <div className="mt-4 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
