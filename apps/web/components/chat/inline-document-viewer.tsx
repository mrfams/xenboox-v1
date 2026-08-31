/**
 * Inline Document Viewer — ChatGPT/Claude-style artifact panels.
 *
 * Features:
 * - Render HTML reports in sandboxed iframe
 * - Expand/collapse viewer
 * - Download as PDF/Excel/Word
 * - Full-screen mode
 * - Loading states
 */

"use client";

import { useState, useCallback, useRef } from "react";
import { Card, CardContent } from "@xenboox/ui";
import { Button } from "@xenboox/ui";
import { Badge } from "@xenboox/ui";
import {
  FileText,
  Download,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { cn } from "@xenboox/ui";
import { formatFileSize } from "@/lib/chat/artifact-types";
import { DocumentDownloadButtons } from "@/components/documents/document-download-buttons";

// ─── Types ────────────────────────────────────────────────────────────────

export interface InlineDocumentViewerProps {
  /** Artifact ID to fetch and display */
  artifactId: string;
  /** Document name */
  name: string;
  /** Document type label */
  docType: string;
  /** MIME type */
  mimeType?: string;
  /** File size in bytes */
  sizeBytes?: number;
  /** Pre-fetched HTML content (optional) */
  htmlContent?: string;
  /** Whether to show by default */
  defaultExpanded?: boolean;
  /** Entity currency code (e.g., "USD", "GMD") */
  entityCurrency?: string;
  /** Entity name */
  entityName?: string;
}

// ─── Component ────────────────────────────────────────────────────────────

export function InlineDocumentViewer({
  artifactId,
  name,
  docType,
  mimeType,
  sizeBytes,
  htmlContent,
  entityCurrency,
  entityName,
  defaultExpanded = false,
}: InlineDocumentViewerProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [content, setContent] = useState<string | null>(htmlContent ?? null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Fetch artifact content if not provided
  const fetchContent = useCallback(async () => {
    if (content) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/artifacts/${artifactId}`);
      if (response.ok) {
        const data = await response.json();
        setContent(data.content);
      }
    } catch (error) {
      console.error("Failed to fetch artifact:", error);
    } finally {
      setIsLoading(false);
    }
  }, [artifactId, content]);

  // Handle expand/collapse
  const toggleExpand = useCallback(async () => {
    if (!isExpanded && !content) {
      await fetchContent();
    }
    setIsExpanded((prev) => !prev);
  }, [isExpanded, content, fetchContent]);

  // Handle fullscreen
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  // Download as HTML file
  const handleDownloadHtml = useCallback(() => {
    if (!content) return;

    const blob = new Blob([content], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name.replace(/[^a-z0-9]/gi, "_")}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [content, name]);

  // Get file type icon color
  const getTypeColor = () => {
    if (mimeType?.includes("pdf")) return "text-red-500";
    if (
      mimeType?.includes("spreadsheet") ||
      name.toLowerCase().includes("excel")
    )
      return "text-green-500";
    if (mimeType?.includes("word") || name.toLowerCase().includes("word"))
      return "text-blue-500";
    return "text-primary";
  };

  return (
    <>
      {/* Collapsed Header */}
      <div
        className={cn(
          "rounded-xl border transition-all duration-200",
          isExpanded
            ? "border-primary/30 bg-primary/5"
            : "border-border/50 bg-card hover:border-primary/20 hover:bg-primary/5",
        )}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between gap-3 p-3 cursor-pointer"
          onClick={toggleExpand}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              toggleExpand();
            }
          }}
          aria-expanded={isExpanded}
          aria-label={`View ${name}`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn("p-2 rounded-lg bg-muted", getTypeColor())}>
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{name}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {docType}
                </Badge>
                {sizeBytes && <span>{formatFileSize(sizeBytes)}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="border-t border-border/30 p-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 text-primary animate-spin" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Loading document...
                </span>
              </div>
            ) : content ? (
              <div className="space-y-3">
                {/* iframe Preview */}
                <div className="relative rounded-lg border border-border/50 overflow-hidden bg-white">
                  <iframe
                    ref={iframeRef}
                    srcDoc={content}
                    className="w-full h-[300px] md:h-[400px]"
                    sandbox="allow-same-origin"
                    title={name}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleFullscreen}
                    >
                      {isFullscreen ? (
                        <Minimize2 className="h-3.5 w-3.5 mr-1" />
                      ) : (
                        <Maximize2 className="h-3.5 w-3.5 mr-1" />
                      )}
                      {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadHtml}
                    >
                      <Download className="h-3.5 w-3.5 mr-1" />
                      Download HTML
                    </Button>
                  </div>
                  <DocumentDownloadButtons
                    data={{
                      title: name,
                      entityName: entityName ?? "Your Business",
                      currency: entityCurrency ?? "USD",
                      generatedAt: new Date(),
                      sections: [],
                    }}
                    formats={["pdf", "excel", "word"]}
                    size="xs"
                  />
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">Unable to load document preview</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchContent}
                  className="mt-3"
                >
                  Try Again
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fullscreen Modal */}
      {isFullscreen && content && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm">
          <div className="flex flex-col h-full">
            {/* Fullscreen Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-3">
                <FileText className={cn("h-5 w-5", getTypeColor())} />
                <div>
                  <p className="font-medium">{name}</p>
                  <p className="text-xs text-muted-foreground">{docType}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadHtml}
                >
                  <Download className="h-3.5 w-3.5 mr-1" />
                  Download
                </Button>
                <Button variant="ghost" size="sm" onClick={toggleFullscreen}>
                  <Minimize2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Fullscreen Content */}
            <div className="flex-1 overflow-auto p-4">
              <iframe
                srcDoc={content}
                className="w-full h-full border rounded-lg"
                sandbox="allow-same-origin"
                title={name}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
