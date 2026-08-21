/**
 * Knowledge Citations — Display RAG search results in chat messages.
 *
 * Features:
 * - Expandable citation cards
 * - Source type badges
 * - Relevance scores
 * - Content preview
 */

"use client";

import { useState } from "react";
import { Card, CardContent } from "@xenboox/ui";
import { Badge } from "@xenboox/ui";
import { Button } from "@xenboox/ui";
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileText,
} from "lucide-react";
import { cn } from "@xenboox/ui";

// ─── Types ────────────────────────────────────────────────────────────────

export interface Citation {
  index: number;
  content: string;
  sourceType: string;
  documentId?: string;
  score: number;
  method: string;
}

export interface KnowledgeCitationsProps {
  /** Array of citations from RAG search */
  citations: Citation[];
  /** Whether to show by default */
  defaultExpanded?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────

export function KnowledgeCitations({
  citations,
  defaultExpanded = false,
}: KnowledgeCitationsProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (!citations || citations.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 border-t border-border/30 pt-3">
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors w-full"
      >
        <BookOpen className="h-3.5 w-3.5" />
        <span className="font-medium">
          {citations.length} source{citations.length !== 1 ? "s" : ""} from
          knowledge base
        </span>
        {isExpanded ? (
          <ChevronUp className="h-3.5 w-3.5 ml-auto" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 ml-auto" />
        )}
      </button>

      {/* Citations List */}
      {isExpanded && (
        <div className="mt-2 space-y-2">
          {citations.map((citation) => (
            <CitationCard key={citation.index} citation={citation} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Citation Card ────────────────────────────────────────────────────────

function CitationCard({ citation }: { citation: Citation }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get source type label and color
  const getSourceInfo = (sourceType: string) => {
    switch (sourceType) {
      case "knowledge_document":
        return { label: "Knowledge Base", color: "bg-blue-100 text-blue-800" };
      case "uploaded_document":
        return { label: "Document", color: "bg-green-100 text-green-800" };
      case "journal_entry":
        return {
          label: "Journal Entry",
          color: "bg-purple-100 text-purple-800",
        };
      default:
        return { label: sourceType, color: "bg-gray-100 text-gray-800" };
    }
  };

  // Get method label
  const getMethodLabel = (method: string) => {
    switch (method) {
      case "vector":
        return "Semantic";
      case "keyword":
        return "Keyword";
      case "hybrid":
        return "Hybrid";
      default:
        return method;
    }
  };

  const sourceInfo = getSourceInfo(citation.sourceType);

  return (
    <div className="rounded-lg border border-border/50 bg-muted/30 p-2.5 text-xs">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          <Badge
            variant="secondary"
            className={cn("text-[10px] px-1.5 py-0", sourceInfo.color)}
          >
            {sourceInfo.label}
          </Badge>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {getMethodLabel(citation.method)}
          </Badge>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground">
            {Math.round(citation.score * 100)}% match
          </span>
          {citation.documentId && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0"
              onClick={() => {
                // Could open document in new tab
                window.open(
                  `/dashboard/documents/${citation.documentId}`,
                  "_blank",
                );
              }}
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="relative">
        <p
          className={cn(
            "text-foreground/80 leading-relaxed",
            !isExpanded && "line-clamp-2",
          )}
        >
          {citation.content}
        </p>
        {citation.content.length > 150 && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-primary hover:underline mt-1"
          >
            {isExpanded ? "Show less" : "Show more"}
          </button>
        )}
      </div>
    </div>
  );
}
