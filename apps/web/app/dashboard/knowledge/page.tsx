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

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useEntity } from "@/lib/entity-context";
import { Card, CardContent, CardHeader, CardTitle } from "@xenboox/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@xenboox/ui";
import { Badge } from "@xenboox/ui";
import { KnowledgeSearch } from "@/components/knowledge/knowledge-search";
import { DocumentProcessor } from "@/components/knowledge/document-processor";
import {
  Search,
  Upload,
  BarChart3,
  FileText,
  Clock,
  Database,
} from "lucide-react";

// ─── Component ────────────────────────────────────────────────────────────

export default function KnowledgeBasePage() {
  const { entityId } = useEntity();
  const [activeTab, setActiveTab] = useState("search");

  // Fetch knowledge base stats
  const { data: stats, isLoading: statsLoading } =
    trpc.knowledgeRag.getStats.useQuery(undefined, {
      enabled: !!entityId,
    });

  return (
    <div className="space-y-6 p-3 pb-20">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Knowledge Base</h1>
        <p className="text-muted-foreground">
          AI-native knowledge management with semantic search and intelligent
          document processing.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
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
              <div className="p-2 bg-green-100 rounded-lg">
                <Database className="h-5 w-5 text-green-600" />
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
              <div className="p-2 bg-purple-100 rounded-lg">
                <BarChart3 className="h-5 w-5 text-purple-600" />
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
              <div className="p-2 bg-amber-100 rounded-lg">
                <Clock className="h-5 w-5 text-amber-600" />
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
                  <p>No searches performed yet.</p>
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
                          {citation.createdAt ? new Date(citation.createdAt).toLocaleDateString() : "—"}
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
    </div>
  );
}
