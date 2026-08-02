import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { Button } from "@xenboox/ui";

export default function DocsNotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
        <FileQuestion className="h-8 w-8 text-muted-foreground" />
      </div>
      <h1 className="mt-6 text-2xl font-bold tracking-tight">Page Not Found</h1>
      <p className="mt-2 max-w-md text-muted-foreground">
        The documentation page you&apos;re looking for doesn&apos;t exist or has
        been moved.
      </p>
      <div className="mt-8 flex gap-3">
        <Link href="/docs">
          <Button>Browse Documentation</Button>
        </Link>
        <Link href="/">
          <Button variant="outline">Go Home</Button>
        </Link>
      </div>
    </div>
  );
}
