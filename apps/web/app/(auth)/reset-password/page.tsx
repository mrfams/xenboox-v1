import type { Metadata } from "next";
import Link from "next/link";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Reset Password — Xenboox",
  description: "Set your new Xenboox account password.",
};

export default function ResetPasswordPage() {
  return (
    <div>
      {/* Mobile-only logo */}
      <div className="mb-8 text-center lg:hidden">
        <Link href="/" className="inline-flex items-center gap-2.5 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-extrabold tracking-tight shadow-sm transition-transform duration-200 group-hover:scale-105">
            xbx
          </div>
          <span className="text-2xl font-bold tracking-tight">Xenboox</span>
        </Link>
      </div>

      <ResetPasswordForm />

      <div className="mt-6 text-center text-sm text-muted-foreground">
        <Link
          href="/login"
          className="font-medium text-primary hover:text-primary/80 transition-colors"
        >
          Back to sign in
        </Link>
      </div>
    </div>
  );
}
