"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { Home, Search, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="mx-auto text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <Search className="h-10 w-10 text-primary" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          Page not found
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          We couldn&apos;t find the page you&apos;re looking for. It might have
          been moved or deleted.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg">
            <Link href="/dashboard">
              <Home className="mr-2 h-4 w-4" />
              Go to Dashboard
            </Link>
          </Button>
          <Button variant="outline" size="lg" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}
