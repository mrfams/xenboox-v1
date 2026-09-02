import type { Metadata } from "next";

import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = {
  title: "Create Account — Xenboox",
  description:
    "Create your free Xenboox account and start AI-native accounting.",
};

export default function RegisterPage() {
  return (
    <div>
      <RegisterForm />
    </div>
  );
}
