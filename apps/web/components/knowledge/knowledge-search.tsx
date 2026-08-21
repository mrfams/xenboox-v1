/**
 * Knowledge Search — Semantic search across the knowledge base.
 *
 * Features:
 * - Real-time search with debounce
 * - Hybrid search (vector + keyword)
 * - Chunk preview with scores
 * - Citation links to source documents
 * - Search method selector
 */

"use client";

import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc/client";
import { useEntity } from "@/lib/entity-context";
import { Card, CardContent, CardHeader, CardTitle } from "@xenboox/ui";
import { Button } from "@xenboox/ui";
import { Input } from "@xenboox/ui";
import { Badge } from "@xenboox/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@xenboox/ui";
import {
  Search,
  FileText,
  Clock,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────

type SearchMethod = "vector" | "keyword" | "hybrid";

interface ChunkResult {
  id: string;
  content: string;
  documentId: string;
  sourceType: string;
  chunkIndex: number;
  score: number;
  method: "vector" | "keyword";
  metadata?: Record<string, unknown>;
}

// ─── Component ────────────────────────────────────────────────────────────

export function KnowledgeSearch() {
  const { entityId } = useEntity();
  const [query, setQuery] = useState("");
  const [method, setMethod] = useState<SearchMethod>("hybrid");
  const [expandedChunk, setExpandedChunk] = useState<string | null>(null);

  // Search query
  const {
    data: searchResults,
    isLoading,
    refetch,
  } = trpc.knowledgeRag.search.useQuery(
    {
      query,
      method,
      topK: 10,
      minScore: 0.3,
    },
    {
      enabled: !!entityId && query.length >= 3,
      keepPreviousData: true,
    },
  );

  // Copy chunk content to clipboard
  const copyToClipboard = useCallback((content: string) => {
    navigator.clipboard.writeText(content);
  }, []);

  // Toggle chunk expansion
  const toggleExpand = useCallback((chunkId: string) => {
    setExpandedChunk((prev) => (prev === chunkId ? null : chunkId));
  }, []);

  // Get source type label
  const getSourceLabel = (sourceType: string) => {
    switch (sourceType) {
      case "knowledge_document":
        return "Knowledge Base";
      case "uploaded_document":
        return "Document";
      case "journal_entry":
        return "Journal Entry";
      default:
        return sourceType;
    }
  };

  // Get method color
  const getMethodColor = (method: string) => {
    switch (method) {
      case "vector":
        return "bg-blue-100 text-blue-800";
      case "keyword":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Header */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Search className="h-5 w-5" />
            Knowledge Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Search Input */}
          <div className="flex gap-2">
            <Input
              placeholder="Search across documents, journal entries, and knowledge base..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={() => refetch()}
              disabled={query.length < 3}
              variant="secondary"
            >
              Search
            </Button>
          </div>

          {/* Method Selector */}
          <div className="mt-3 flex gap-2">
            <Tabs
              value={method}
              onValueChange={(value) => setMethod(value as SearchMethod)}
            >
              <TabsList>
                <TabsTrigger value="hybrid">Hybrid</TabsTrigger>
                <TabsTrigger value="vector">Semantic</TabsTrigger>
                <TabsTrigger value="keyword">Keyword</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Search Results */}
      {query.length >= 3 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {isLoading
                ? "Searching..."
                : `${searchResults?.chunks.length ?? 0} results found (${searchResults?.durationMs ?? 0}ms)`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : searchResults?.chunks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No results found. Try a different query or method.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {searchResults?.chunks.map((chunk) => (
                  <ChunkCard
                    key={chunk.id}
                    chunk={chunk}
                    isExpanded={expandedChunk === chunk.id}
                    onToggle={() => toggleExpand(chunk.id)}
                    onCopy={() => copyToClipboard(chunk.content)}
                    getSourceLabel={getSourceLabel}
                    getMethodColor={getMethodColor}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      {searchResults && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">
                  {searchResults.totalChunks}
                </div>
                <div className="text-xs text-muted-foreground">
                  Total Chunks
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {searchResults.chunks.length}
                </div>
                <div className="text-xs text-muted-foreground">Results</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{searchResults.method}</div>
                <div className="text-xs text-muted-foreground">Method</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {searchResults.durationMs}ms
                </div>
                <div className="text-xs text-muted-foreground">Duration</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Chunk Card Component ─────────────────────────────────────────────────

function ChunkCard({
  chunk,
  isExpanded,
  onToggle,
  onCopy,
  getSourceLabel,
  getMethodColor,
}: {
  chunk: ChunkResult;
  isExpanded: boolean;
  onToggle: () => void;
  onCopy: () => void;
  getSourceLabel: (sourceType: string) => string;
  getMethodColor: (method: string) => string;
}) {
  return (
    <div className="border rounded-lg p-3 hover:bg-muted/50 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs">
              {getSourceLabel(chunk.sourceType)}
            </Badge>
            <Badge
              variant="secondary"
              className={`text-xs ${getMethodColor(chunk.method)}`}
            >
              {chunk.method}
            </Badge>
            <span className="text-xs text-muted-foreground">
              Score: {(chunk.score * 100).toFixed(1)}%
            </span>
          </div>
          <p className="text-sm line-clamp-2">{chunk.content}</p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onCopy}
            className="h-8 w-8 p-0"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="h-8 w-8 p-0"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>Chunk {chunk.chunkIndex + 1}</span>
              {chunk.metadata?.section && (
                <span>• Section: {chunk.metadata.section as string}</span>
              )}
            </div>
            <pre className="text-sm whitespace-pre-wrap font-mono bg-muted p-3 rounded-md">
              {chunk.content}
            </pre>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <a
                  href={`/dashboard/documents/${chunk.documentId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  View Document
                </a>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
