import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui";

export default function AuthNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mx-auto">
        <h1 className="text-4xl font-bold tracking-tight">Page not found</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          This authentication page doesn&apos;t exist.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Button asChild size="lg">
            <Link href="/login">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Login
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
