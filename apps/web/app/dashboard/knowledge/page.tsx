/**
 * Knowledge Base Page — AI-native knowledge management.
 *
 * Features:
 * - Semantic search across all knowledge
 * - Document processing with chunking & embedding
 * - Knowledge base statistics
 * - Citation audit trail
 */

"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc/client";
import { useEntity } from "@/lib/entity-context";
import { useActivationStatus } from "@/lib/hooks/use-activation-status";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui";
import { Badge } from "@/components/ui";
import { KnowledgeSearch } from "@/components/knowledge/knowledge-search";
import { DocumentProcessor } from "@/components/knowledge/document-processor";
import { ModulePageShell } from "@/components/module/module-page-shell";
import {
  Search,
  Upload,
  BarChart3,
  FileText,
  Clock,
  Database,
  Sparkles,
  FileUp,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const KB_ONBOARDING_KEY = "xenboox_kb_onboarding_dismissed";

// ─── Component ────────────────────────────────────────────────────────────

export default function KnowledgeBasePage() {
  const { entityId } = useEntity();
  const [activeTab, setActiveTab] = useState("search");

  // Fetch knowledge base stats
  const {
    data: stats,
    isLoading: statsLoading,
    isError,
    refetch,
  } = trpc.knowledgeRag.getStats.useQuery(undefined, {
    enabled: !!entityId,
  });

  return (
    <ModulePageShell
      title="Knowledge Base"
      description="Search and process your business documents with AI."
      icon={Database}
      aiSuggestions={[
        {
          label: "Search my documents",
          prompt:
            "Search my knowledge base for information about vendors, invoices, or accounts",
        },
        {
          label: "What documents do I have?",
          prompt:
            "Show me what documents are in my knowledge base and their status",
        },
      ]}
    >
      {/* Onboarding Banner — shown when no documents exist */}
      {!statsLoading && !isError && (stats?.documentCount ?? 0) === 0 && (
        <KnowledgeBaseOnboarding
          onUploadClick={() => setActiveTab("process")}
        />
      )}

      {/* Error State */}
      {isError && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-center">
          <X
            className="h-5 w-5 text-destructive mx-auto mb-2"
            aria-hidden="true"
          />
          <p className="text-sm font-medium text-foreground">
            Unable to load knowledge base stats
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Check your connection and try again.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 dark:bg-primary/20 rounded-lg">
                <FileText className="h-5 w-5 text-primary dark:text-primary" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {statsLoading ? "..." : (stats?.documentCount ?? 0)}
                </div>
                <div className="text-xs text-muted-foreground">Documents</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-balanced-green/10 dark:bg-balanced-green/20 rounded-lg">
                <Database className="h-5 w-5 text-balanced-green dark:text-balanced-green" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {statsLoading ? "..." : (stats?.chunkCount ?? 0)}
                </div>
                <div className="text-xs text-muted-foreground">Chunks</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-signal-indigo/10 dark:bg-signal-indigo/20 rounded-lg">
                <BarChart3 className="h-5 w-5 text-signal-indigo dark:text-signal-indigo" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {statsLoading
                    ? "..."
                    : ((stats?.totalTokens ?? 0) / 1000).toFixed(1) + "K"}
                </div>
                <div className="text-xs text-muted-foreground">Tokens</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-attention-amber/10 dark:bg-attention-amber/20 rounded-lg">
                <Clock className="h-5 w-5 text-attention-amber dark:text-attention-amber" />
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {statsLoading ? "..." : (stats?.recentCitations.length ?? 0)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Recent Searches
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="search" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Search
          </TabsTrigger>
          <TabsTrigger value="process" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Process Document
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Audit Trail
          </TabsTrigger>
        </TabsList>

        {/* Search Tab */}
        <TabsContent value="search" className="mt-6">
          <KnowledgeSearch />
        </TabsContent>

        {/* Process Tab */}
        <TabsContent value="process" className="mt-6">
          <DocumentProcessor onComplete={() => setActiveTab("search")} />
        </TabsContent>

        {/* Audit Trail Tab */}
        <TabsContent value="audit" className="mt-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Citation Audit Trail
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.recentCitations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>
                    No searches yet. Try searching for a vendor name, invoice
                    number, or account to see citation history.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {stats?.recentCitations.map((citation) => (
                    <div
                      key={citation.id}
                      className="p-3 border rounded-lg hover:bg-muted/50"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-sm">
                            "{citation.query}"
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {citation.method}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {citation.chunkCount} chunks
                            </span>
                            {citation.durationMs && (
                              <span className="text-xs text-muted-foreground">
                                {citation.durationMs}ms
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {citation.createdAt
                            ? new Date(citation.createdAt).toLocaleDateString()
                            : "—"}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </ModulePageShell>
  );
}

// ─── Knowledge Base Onboarding ────────────────────────────────────────────
//
// Welcome banner for first-time users with 0 documents.
// Explains what the Knowledge Base does and guides to first upload.

function KnowledgeBaseOnboarding({
  onUploadClick,
}: {
  onUploadClick: () => void;
}) {
  const { events, trackEvent } = useActivationStatus();
  // Server-side: check if KB onboarding was dismissed
  const dismissed = events?.some((e: { event: string }) => e.event === "kb_onboarding_dismissed") ?? false;

  const handleDismiss = () => {
    // Track server-side (cross-device persistence)
    trackEvent("kb_onboarding_dismissed");
  };

  if (dismissed) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:p-6">
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute right-3 top-3 rounded-lg p-1.5 text-muted-foreground/50 hover:text-foreground hover:bg-muted/50 transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-foreground">
            Build your knowledge base
          </h2>
          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
            Upload invoices, receipts, contracts, and reports. The AI will
            process, chunk, and index them so you can search across all your
            business data in plain language.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onUploadClick}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <FileUp className="h-4 w-4" />
              Upload your first document
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
            >
              I'll do this later
            </button>
          </div>

          <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground/60">
            <span className="flex items-center gap-1.5">
              <FileText className="h-3 w-3" />
              PDF, DOCX, CSV, XLSX
            </span>
            <span className="flex items-center gap-1.5">
              <Database className="h-3 w-3" />
              Auto-chunked & indexed
            </span>
            <span className="flex items-center gap-1.5">
              <Search className="h-3 w-3" />
              Semantic search
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
