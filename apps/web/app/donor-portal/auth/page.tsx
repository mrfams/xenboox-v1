"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

// ─── Donor Portal Auth Callback ─────────────────────────────────────────────
//
// Intermediate page that takes the token from the URL and redirects
// to the verify API endpoint. This keeps the token out of the browser
// history for the actual dashboard page.

export default function DonorPortalAuthPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  useEffect(() => {
    if (token) {
      // Redirect to the verify endpoint which will validate and redirect
      window.location.href = `/api/donor-portal/verify?token=${token}`;
    }
  }, [token]);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">No token provided.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          Verifying your access...
        </p>
      </div>
    </div>
  );
}
