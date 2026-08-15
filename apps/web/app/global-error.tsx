"use client";

// §3.4 — Root error boundary. `app/error.tsx` renders INSIDE the root layout,
// so it cannot catch a crash in the layout itself — `global-error.tsx` is the
// only boundary that can (it replaces the whole tree, including <html>).
// Sentry reports the crash so root-layout failures surface in the APM.
// See: https://nextjs.org/docs/app/building-your-application/routing/error-handling

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: "1rem",
            padding: "1rem",
            fontFamily:
              "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif",
            backgroundColor: "#f8fafc",
          }}
        >
          <div
            style={{
              maxWidth: "28rem",
              width: "100%",
              padding: "2rem",
              borderRadius: "0.75rem",
              border: "1px solid #e2e8f0",
              background: "#ffffff",
              textAlign: "center",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            }}
          >
            <h2
              style={{
                fontSize: "1.125rem",
                fontWeight: 600,
                margin: "0 0 0.5rem",
                color: "#0f172a",
              }}
            >
              Something went wrong
            </h2>
            <p
              style={{
                fontSize: "0.875rem",
                margin: "0 0 0.5rem",
                color: "#64748b",
              }}
            >
              An unexpected error occurred. Please try again.
            </p>
            {error.digest && (
              <p
                style={{
                  fontSize: "0.75rem",
                  margin: "0 0 1rem",
                  color: "#94a3b8",
                  fontFamily: "ui-monospace, monospace",
                }}
              >
                Error ID: {error.digest}
              </p>
            )}
            <button
              onClick={() => reset()}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "0.5rem",
                border: "none",
                background: "#2563eb",
                color: "#ffffff",
                fontSize: "0.875rem",
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
