"use client";

import { DocumentLiveness } from "@/components/agents/document-liveness";
import { AICommandBar } from "@/components/shared/ai-command-bar";
import {
  ArrowLeft,
  Fingerprint,
  ShieldQuestion,
  ScanLine,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

export default function DocumentAgentLivenessPage() {
  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
          <Link
            href="/dashboard/agents"
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to AI Team
          </Link>
          <span className="text-muted-foreground/30">/</span>
          <span className="text-foreground/80">Document Agent Liveness</span>
        </div>

        {/* Page Hero */}
        <div className="space-y-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <Fingerprint className="h-5 w-5 text-signal-indigo" />
              Document Agent Liveness
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              The single entry point for nearly all data into the system across
              every surface — the PRD&apos;s best liveness example, generalized
              from the Desktop Doc Inbox to web, mobile, desktop, and email.
            </p>
          </div>

          {/* Key Principles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-signal-indigo mb-1">
                <Fingerprint className="h-3 w-3" />
                Universal Inbox
              </div>
              <p className="text-[10px] text-muted-foreground">
                Every file&apos;s pipeline status (Detected → Classifying →
                Extracting → Linked → Routed → Done) visible on all surfaces —
                click any transaction to reach its originating document.
              </p>
            </div>
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-attention-amber mb-1">
                <ShieldQuestion className="h-3 w-3" />
                No Silent Default
              </div>
              <p className="text-[10px] text-muted-foreground">
                Classification below threshold is flagged for human confirmation
                — never silently defaulted to &quot;probably an invoice.&quot;
              </p>
            </div>
            <div className="rounded-lg border bg-card p-2.5">
              <div className="flex items-center gap-1.5 text-xs font-medium text-balanced-green mb-1">
                <ScanLine className="h-3 w-3" />
                Per-Field Transparency
              </div>
              <p className="text-[10px] text-muted-foreground">
                Classification confidence and per-field extraction confidence
                are shown explicitly — each extracted field carries its own
                score against the source image.
              </p>
            </div>
          </div>

          {/* AI Command Bar */}
          <AICommandBar
            compact
            placeholder="Ask the Document Agent about a file..."
            suggestions={[
              "What is the classification confidence on invoice-1042.pdf?",
              "Show the extraction confidence per field",
              "Which downstream agent received this document?",
              "Show the audit trail for the last ingestion",
            ]}
          />
        </div>

        {/* Liveness Card */}
        <DocumentLiveness />

        {/* Liveness Controls - Interactive Demo Toggle */}
        <div className="rounded-lg border bg-accent/20 p-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium flex items-center gap-1.5">
                <ExternalLink className="h-3.5 w-3.5 text-signal-indigo" />
                Liveness Controls
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                These controls are part of the Document Liveness Spec — they let
                you simulate different agent states to verify transparency at
                every stage of the state machine.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-signal-indigo/10">
                <span className="h-2 w-2 rounded-full bg-signal-indigo" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Classifying</p>
                <p className="text-[8px] text-muted-foreground">
                  CLASSIFYING active — 94% confidence
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-attention-amber/10">
                <span className="h-2 w-2 rounded-full bg-attention-amber" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Low Confidence</p>
                <p className="text-[8px] text-muted-foreground">
                  Critical rule — human confirmation
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-attention-amber/10">
                <span className="h-2 w-2 rounded-full bg-attention-amber" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Extraction Failure</p>
                <p className="text-[8px] text-muted-foreground">
                  Critical field unreadable
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-error-clay/10">
                <span className="h-2 w-2 rounded-full bg-error-clay" />
              </div>
              <div>
                <p className="text-[10px] font-medium">
                  Corrupt / Unrecognized
                </p>
                <p className="text-[8px] text-muted-foreground">
                  Never silently dropped
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-attention-amber/10">
                <span className="h-2 w-2 rounded-full bg-attention-amber" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Duplicate</p>
                <p className="text-[8px] text-muted-foreground">
                  Flagged, not processed twice
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 opacity-60">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-balanced-green/10">
                <span className="h-2 w-2 rounded-full bg-balanced-green" />
              </div>
              <div>
                <p className="text-[10px] font-medium">Done</p>
                <p className="text-[8px] text-muted-foreground">
                  Terminal — link established
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
