// ─── Chat Artifact Types (client-safe) ─────────────────────────────────────
//
// Shared between the server-side artifact service and the client chat UI.
// Kept free of server-only imports so it can be imported from client
// components ("use client") without pulling DB/agent code into the bundle.

/** A document generated during a chat turn and surfaced in the conversation. */
export interface ChatArtifactRef {
  artifactId: string;
  name: string;
  /** Display label for the file kind, e.g. "Report", "Export". */
  docType: string;
  mimeType?: string;
  sizeBytes?: number;
  url?: string;
}

/**
 * Tolerantly extract artifact refs from a chat message's metadata jsonb.
 *
 * The stream route historically wrote metadata as a JSON *string* inside the
 * jsonb column (double-encoded), so both shapes are handled here.
 */
export function parseChatArtifacts(metadata: unknown): ChatArtifactRef[] {
  if (!metadata) return [];

  let parsed: unknown = metadata;
  if (typeof metadata === "string") {
    try {
      parsed = JSON.parse(metadata);
    } catch {
      return [];
    }
  }
  if (typeof parsed !== "object" || parsed === null) return [];

  const artifacts = (parsed as Record<string, unknown>).artifacts;
  if (!Array.isArray(artifacts)) return [];

  return artifacts.filter(
    (a): a is ChatArtifactRef =>
      !!a &&
      typeof a === "object" &&
      typeof (a as ChatArtifactRef).artifactId === "string" &&
      typeof (a as ChatArtifactRef).name === "string" &&
      typeof (a as ChatArtifactRef).docType === "string",
  );
}

/** Human-readable size, e.g. "12.4 KB". */
export function formatFileSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
