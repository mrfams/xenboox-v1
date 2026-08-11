"use client";

import { Bot, ThumbsUp, ThumbsDown, Copy } from "lucide-react";

import type { ToolTrace } from "@/lib/hooks/use-streaming-chat";

import { RichMessageRenderer } from "./rich-message-renderer";
import { AgentActivityBlock } from "./agent-activity-block";
import { DocumentCard, type ArtifactCardItem } from "./document-card";
import { ApprovalPrompt } from "./approval-prompt";

interface StreamingMessageProps {
  content: string;
  isStreaming: boolean;
  agentActivities?: Array<{
    agent: string;
    status: "started" | "completed" | "failed";
    action: string;
    confidence?: number;
    durationMs?: number;
  }>;
  delegations?: Array<{ from: string; to: string; reason: string }>;
  documents?: Array<{
    artifactId?: string;
    documentId?: string;
    name: string;
    docType: string;
    mimeType?: string;
    sizeBytes?: number;
    url?: string;
  }>;
  approvals?: Array<{ title: string; description: string; amount?: string }>;
  toolCalls?: ToolTrace[];
  confidence?: number;
  durationMs?: number;
  /** Opens a generated artifact in the inline document viewer. */
  onOpenDocument?: (doc: ArtifactCardItem) => void;
  onApprove?: (index: number) => void;
  onReject?: (index: number) => void;
}

export function StreamingMessage({
  content,
  isStreaming,
  agentActivities = [],
  delegations = [],
  documents = [],
  approvals = [],
  toolCalls = [],
  confidence,
  durationMs,
  onOpenDocument,
  onApprove,
  onReject,
}: StreamingMessageProps) {
  return (
    <div className="flex flex-col gap-2 items-start">
      {/* Agent header */}
      <div className="flex items-center gap-1.5 mb-1">
        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10">
          <Bot className="h-3 w-3 text-primary" />
        </div>
        <span className="text-[10px] text-muted-foreground">Xenboox AI</span>
        {isStreaming && (
          <span className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] text-primary">typing...</span>
          </span>
        )}
        {!isStreaming && confidence !== undefined && (
          <span className="text-[10px] text-muted-foreground">
            {confidence}% confidence
            {durationMs !== undefined &&
              ` · ${(durationMs / 1000).toFixed(1)}s`}
          </span>
        )}
      </div>

      {/* Agent thinking reveal */}
      {(agentActivities.length > 0 ||
        toolCalls.length > 0 ||
        delegations.length > 0 ||
        isStreaming) && (
        <AgentActivityBlock
          activities={agentActivities}
          delegations={delegations}
          toolCalls={toolCalls}
          isStreaming={isStreaming}
        />
      )}

      {/* Main response */}
      {content && (
        <div className="max-w-[80%] rounded-2xl rounded-bl-md px-4 py-2.5 text-xs leading-relaxed bg-accent text-foreground">
          <RichMessageRenderer content={content} />
          {isStreaming && (
            <span className="inline-block w-0.5 h-3 bg-primary ml-0.5 animate-pulse" />
          )}
        </div>
      )}

      {/* Typing indicator when streaming starts but no content yet */}
      {isStreaming && !content && (
        <div className="max-w-[80%] rounded-2xl rounded-bl-md px-4 py-2.5 text-xs leading-relaxed bg-accent text-foreground">
          <div className="flex items-center gap-1">
            <span
              className="h-2 w-2 rounded-full bg-muted-foreground/30 animate-bounce"
              style={{ animationDelay: "0ms" }}
            />
            <span
              className="h-2 w-2 rounded-full bg-muted-foreground/30 animate-bounce"
              style={{ animationDelay: "150ms" }}
            />
            <span
              className="h-2 w-2 rounded-full bg-muted-foreground/30 animate-bounce"
              style={{ animationDelay: "300ms" }}
            />
          </div>
        </div>
      )}

      {/* Document cards */}
      {documents.length > 0 && (
        <div className="space-y-2 w-full max-w-[80%]">
          {documents.map((doc, i) => (
            <DocumentCard
              key={doc.artifactId ?? doc.documentId ?? i}
              name={doc.name}
              docType={doc.docType}
              documentId={doc.documentId}
              url={doc.url}
              artifactId={doc.artifactId}
              mimeType={doc.mimeType}
              sizeBytes={doc.sizeBytes}
              onOpen={
                onOpenDocument && doc.artifactId
                  ? (item) => onOpenDocument(item)
                  : undefined
              }
            />
          ))}
        </div>
      )}

      {/* Approval prompts */}
      {approvals.length > 0 && (
        <div className="space-y-2 w-full max-w-[80%]">
          {approvals.map((approval, i) => (
            <ApprovalPrompt
              key={i}
              title={approval.title}
              description={approval.description}
              amount={approval.amount}
              onApprove={() => onApprove?.(i)}
              onReject={() => onReject?.(i)}
            />
          ))}
        </div>
      )}

      {/* Action buttons */}
      {!isStreaming && content && (
        <div className="flex items-center gap-2 mt-1">
          <button
            type="button"
            className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
          >
            <ThumbsUp className="h-3 w-3" />
          </button>
          <button
            type="button"
            className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
          >
            <ThumbsDown className="h-3 w-3" />
          </button>
          <button
            type="button"
            className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
          >
            <Copy className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}
