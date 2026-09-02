"use client";

import { Component, type ReactNode, useCallback, useState } from "react";
import {
  AlertTriangle,
  RefreshCw,
  Home,
  ChevronDown,
  ChevronUp,
  Copy,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import * as Sentry from "@sentry/nextjs";

// ─── Error Context ─────────────────────────────────────────────────────────
//
// Enhanced error boundary with:
// - Retry with exponential backoff (3 attempts)
// - Error context (surface, user action, timestamp)
// - Per-surface error boundaries
// - Better error display (user-friendly messages)
// - Copy error details for support

type Props = {
  children: ReactNode;
  fallback?: ReactNode;
  /** Surface name for error context (e.g., "command-center", "ledger") */
  surface?: string;
  /** User action that triggered the error */
  action?: string;
  /** Custom retry handler */
  onRetry?: () => void;
  /** Show technical details toggle */
  showDetails?: boolean;
};

type State = {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
  retryCount: number;
  isRetrying: boolean;
};

// User-friendly error messages by error type
const ERROR_MESSAGES: Record<string, string> = {
  ChunkLoadError:
    "The page failed to load. This usually happens after a deployment.",
  TypeError: "Something went wrong while rendering this page.",
  NetworkError:
    "Could not connect to the server. Please check your internet connection.",
  AbortError: "The request was cancelled.",
  TRPCClientError: "Failed to load data from the server. Please try again.",
  Default: "An unexpected error occurred. Please try again.",
};

function getErrorMessage(error: Error): string {
  const name = error.name || "Default";
  return ERROR_MESSAGES[name] || ERROR_MESSAGES.Default;
}

function getErrorCategory(
  error: Error,
): "network" | "render" | "data" | "unknown" {
  const name = error.name || "";
  const message = error.message || "";

  if (
    name === "NetworkError" ||
    message.includes("fetch") ||
    message.includes("network")
  ) {
    return "network";
  }
  if (
    name === "ChunkLoadError" ||
    name === "TypeError" ||
    name === "ReferenceError"
  ) {
    return "render";
  }
  if (
    name === "TRPCClientError" ||
    message.includes("tRPC") ||
    message.includes("query")
  ) {
    return "data";
  }
  return "unknown";
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ errorInfo });

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.error(
        `[ErrorBoundary${this.props.surface ? ` (${this.props.surface})` : ""}]:`,
        error,
        errorInfo,
      );
    }

    // §4.7 — Report to Sentry with full context for debugging.
    // Uses withScope to attach surface, action, error category, and retry
    // count without polluting the global scope.
    if (typeof window !== "undefined") {
      try {
        // Add breadcrumb so Sentry shows what happened before the error
        Sentry.addBreadcrumb({
          category: "ui",
          message: `Error in ${this.props.surface || "unknown"}${this.props.action ? ` during ${this.props.action}` : ""}`,
          level: "error",
        });

        Sentry.withScope((scope) => {
          scope.setTag("surface", this.props.surface || "unknown");
          scope.setTag("errorCategory", getErrorCategory(error));
          scope.setTag("retryCount", String(this.state.retryCount));
          scope.setExtra("componentStack", errorInfo.componentStack);
          scope.setExtra("action", this.props.action);
          scope.setExtra("userAgent", navigator.userAgent);
          Sentry.captureException(error);
        });
      } catch {
        // Sentry not available — continue without error tracking
      }
    }
  }

  handleRetry = () => {
    this.setState({ isRetrying: true });

    // Exponential backoff: 500ms, 1000ms, 2000ms
    const delay = Math.min(500 * Math.pow(2, this.state.retryCount), 2000);

    setTimeout(() => {
      this.setState((prev) => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prev.retryCount + 1,
        isRetrying: false,
      }));
    }, delay);
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
    });
  };

  handleCopyError = async () => {
    if (!this.state.error) return;
    const text = [
      `Error: ${this.state.error.message}`,
      `Surface: ${this.props.surface || "unknown"}`,
      `Action: ${this.props.action || "unknown"}`,
      `Time: ${new Date().toISOString()}`,
      "",
      "Stack:",
      this.state.error.stack || "No stack trace",
      "",
      "Component Stack:",
      this.state.errorInfo?.componentStack || "No component stack",
    ].join("\n");

    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard API not available
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const error = this.state.error;
      const category = error ? getErrorCategory(error) : "unknown";
      const userMessage = error
        ? getErrorMessage(error)
        : "An unexpected error occurred.";
      const canRetry = this.state.retryCount < 3;

      return (
        <div
          className="flex flex-col items-center justify-center min-h-[300px] p-6 text-center"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 mb-4">
            <AlertTriangle
              className="h-7 w-7 text-red-500"
              aria-hidden="true"
            />
          </div>

          <h2 className="text-base font-semibold text-foreground mb-1">
            {userMessage}
          </h2>

          {error && (
            <p className="text-xs text-muted-foreground max-w-md mb-4">
              {category === "network" &&
                "Check your internet connection and try again."}
              {category === "render" &&
                "This may be temporary — try refreshing the page."}
              {category === "data" &&
                "Failed to load data. The server may be temporarily unavailable."}
              {category === "unknown" &&
                "If this keeps happening, please contact support."}
            </p>
          )}

          <div className="flex items-center gap-2 mb-4">
            {canRetry && (
              <button
                type="button"
                onClick={this.props.onRetry || this.handleRetry}
                disabled={this.state.isRetrying}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                  "bg-primary text-primary-foreground hover:bg-primary/90",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                )}
              >
                <RefreshCw
                  className={cn(
                    "h-4 w-4",
                    this.state.isRetrying && "animate-spin",
                  )}
                />
                {this.state.isRetrying ? "Retrying..." : "Try again"}
              </button>
            )}

            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <Home className="h-4 w-4" />
              Go to Dashboard
            </Link>
          </div>

          {!canRetry && (
            <p className="text-xs text-muted-foreground mb-4">
              Multiple retry attempts failed. Please refresh the page or contact
              support.
            </p>
          )}

          {/* Technical Details Toggle */}
          {error && (
            <ErrorDetails
              error={error}
              errorInfo={this.state.errorInfo}
              surface={this.props.surface}
              action={this.props.action}
              onCopy={this.handleCopyError}
            />
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

// ─── Error Details (expandable) ────────────────────────────────────────────

function ErrorDetails({
  error,
  errorInfo,
  surface,
  action,
  onCopy,
}: {
  error: Error;
  errorInfo: React.ErrorInfo | null;
  surface?: string;
  action?: string;
  onCopy: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [onCopy]);

  return (
    <div className="w-full max-w-lg">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
        aria-expanded={isExpanded}
        aria-controls="error-details"
      >
        {isExpanded ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
        Technical details
      </button>

      {isExpanded && (
        <div
          id="error-details"
          className="rounded-lg border border-border bg-muted/30 p-3 text-left"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {surface && (
                <span className="inline-flex items-center rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                  {surface}
                </span>
              )}
              {action && (
                <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  {action}
                </span>
              )}
              <span>{new Date().toLocaleTimeString()}</span>
            </div>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  Copy
                </>
              )}
            </button>
          </div>

          <pre className="text-[11px] text-muted-foreground whitespace-pre-wrap font-mono overflow-auto max-h-40">
            <strong>Error:</strong> {error.message}
            {"\n"}
            {error.stack && (
              <>
                <strong>Stack:</strong>
                {"\n"}
                {error.stack}
              </>
            )}
            {errorInfo?.componentStack && (
              <>
                {"\n"}
                <strong>Component Stack:</strong>
                {"\n"}
                {errorInfo.componentStack}
              </>
            )}
          </pre>
        </div>
      )}
    </div>
  );
}

// ─── Surface Error Boundary (wraps individual surfaces) ────────────────────

export function SurfaceErrorBoundary({
  surface,
  children,
}: {
  surface: string;
  children: ReactNode;
}) {
  return (
    <ErrorBoundary
      surface={surface}
      fallback={
        <div className="flex flex-col items-center justify-center min-h-[200px] p-6 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10 mb-3">
            <AlertTriangle
              className="h-5 w-5 text-red-500"
              aria-hidden="true"
            />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">
            Failed to load {surface.replace(/-/g, " ")}
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            Something went wrong while loading this section.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <Home className="h-3.5 w-3.5" />
            Back to Dashboard
          </Link>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}
