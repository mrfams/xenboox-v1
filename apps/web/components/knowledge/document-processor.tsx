/**
 * Document Processor — Process documents for RAG.
 *
 * Features:
 * - Text chunking with preview
 * - Embedding generation
 * - Document categorization
 * - Processing status tracking
 */

"use client";

import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc/client";
import { useEntity } from "@/lib/entity-context";
import { Card, CardContent, CardHeader, CardTitle } from "@xenboox/ui";
import { Button } from "@xenboox/ui";
import { Input } from "@xenboox/ui";
import { Textarea } from "@xenboox/ui";
import { Badge } from "@xenboox/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@xenboox/ui";
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────

type ProcessingStatus =
  "idle" | "previewing" | "processing" | "success" | "error";

interface ChunkPreview {
  index: number;
  content: string;
  tokenCount: number;
  preview: string;
}

// ─── Component ────────────────────────────────────────────────────────────

export function DocumentProcessor({ onComplete }: { onComplete?: () => void }) {
  const { entityId } = useEntity();
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [sourceType, setSourceType] = useState<
    "knowledge_document" | "uploaded_document" | "journal_entry"
  >("knowledge_document");
  const [status, setStatus] = useState<ProcessingStatus>("idle");
  const [chunkPreview, setChunkPreview] = useState<ChunkPreview[] | null>(null);
  const [processingResult, setProcessingResult] = useState<{
    chunksCreated: number;
    embeddingsGenerated: number;
  } | null>(null);

  // Preview chunks
  const {
    data: previewData,
    isLoading: isPreviewing,
    refetch: previewChunks,
  } = trpc.knowledgeRag.previewChunks.useQuery(
    { text },
    {
      enabled: false, // Manual trigger only
    },
  );

  // Process document mutation
  const processDocument = trpc.knowledgeRag.processDocument.useMutation({
    onSuccess: (result) => {
      setStatus("success");
      setProcessingResult(result);
      onComplete?.();
    },
    onError: (error) => {
      setStatus("error");
      console.error("Document processing failed:", error);
    },
  });

  // Handle preview
  const handlePreview = useCallback(async () => {
    if (!text.trim()) return;

    setStatus("previewing");
    const result = await previewChunks();
    if (result.data) {
      setChunkPreview(result.data.chunks);
    }
    setStatus("idle");
  }, [text, previewChunks]);

  // Handle process
  const handleProcess = useCallback(() => {
    if (!text.trim() || !title.trim()) return;

    setStatus("processing");
    processDocument.mutate({
      documentId: crypto.randomUUID(), // Generate temporary ID
      text,
      title,
      category: category || undefined,
      sourceType,
    });
  }, [text, title, category, sourceType, processDocument]);

  // Reset form
  const handleReset = useCallback(() => {
    setText("");
    setTitle("");
    setCategory("");
    setSourceType("knowledge_document");
    setStatus("idle");
    setChunkPreview(null);
    setProcessingResult(null);
  }, []);

  return (
    <div className="space-y-4">
      {/* Input Form */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Process Document
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Document Title</label>
            <Input
              placeholder="e.g., Q1 2025 Financial Report"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Category & Source Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Input
                placeholder="e.g., financial, compliance, policy"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Source Type</label>
              <Select
                value={sourceType}
                onValueChange={(value) =>
                  setSourceType(value as typeof sourceType)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="knowledge_document">
                    Knowledge Document
                  </SelectItem>
                  <SelectItem value="uploaded_document">
                    Uploaded Document
                  </SelectItem>
                  <SelectItem value="journal_entry">Journal Entry</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Document Text */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Document Content</label>
            <Textarea
              placeholder="Paste or type the document content here..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-[200px] font-mono text-sm"
            />
            <div className="text-xs text-muted-foreground text-right">
              {text.length.toLocaleString()} characters
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={handlePreview}
              disabled={!text.trim() || isPreviewing}
              variant="outline"
            >
              {isPreviewing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Eye className="h-4 w-4 mr-2" />
              )}
              Preview Chunks
            </Button>
            <Button
              onClick={handleProcess}
              disabled={
                !text.trim() || !title.trim() || status === "processing"
              }
            >
              {status === "processing" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Process & Embed
            </Button>
            <Button onClick={handleReset} variant="ghost">
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Chunk Preview */}
      {chunkPreview && chunkPreview.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Chunk Preview ({chunkPreview.length} chunks,{" "}
              {chunkPreview
                .reduce((sum, c) => sum + c.tokenCount, 0)
                .toLocaleString()}{" "}
              tokens)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {chunkPreview.map((chunk) => (
                <div
                  key={chunk.index}
                  className="p-2 border rounded-md bg-muted/50"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      Chunk {chunk.index + 1}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {chunk.tokenCount} tokens
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {chunk.preview}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processing Result */}
      {processingResult && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-green-800">
                  Document processed successfully!
                </p>
                <p className="text-sm text-green-700">
                  Created {processingResult.chunksCreated} chunks with{" "}
                  {processingResult.embeddingsGenerated} embeddings.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {status === "error" && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="font-medium text-red-800">
                  Document processing failed
                </p>
                <p className="text-sm text-red-700">
                  Please check your document content and try again.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
