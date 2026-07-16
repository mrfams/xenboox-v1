import { LoginForm } from "@/components/auth/login-form"
import Link from "next/link"

export default function LoginPage() {
  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight">Xenboox</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          AI-native accounting for Africa
        </p>
      </div>
      <LoginForm />
      <div className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-medium text-foreground underline underline-offset-4 hover:text-primary">
          Sign up free
        </Link>
      </div>
    </>
  )
}