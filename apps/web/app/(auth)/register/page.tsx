import Link from "next/link";

import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md px-4 py-8">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-bold shadow-sm transition-transform duration-200 group-hover:scale-105">
              X
            </div>
            <span className="text-2xl font-bold tracking-tight">Xenboox</span>
          </Link>
          <p className="mt-2 text-sm text-muted-foreground">
            AI-native accounting for Africa
          </p>
        </div>

        <RegisterForm />

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
