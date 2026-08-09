// ─── Chat Artifact Edit Helpers (client-safe) ─────────────────────────────
//
// Pure, testable helpers for the in-viewer "highlight a passage → ask AI to
// change/redo it" flow (ChatGPT/Claude-artifact style). Kept free of
// server-only imports so it can ship to the client bundle.

export type ArtifactEditMode = "selection" | "whole";

/** Strip markdown code fences a model occasionally wraps its output in. */
export function stripCodeFences(text: string): string {
  return text
    .replace(/^```(?:html|htm|xml|csv|text)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
}

/**
 * Defense-in-depth: strip executable content from model-written HTML.
 * The viewer also sandboxes the iframe, but we never trust model output.
 */
export function sanitizeEditedHtml(html: string): string {
  let out = html;
  // Scripts and embedded objects
  out = out.replace(/<script[\s\S]*?<\/script>/gi, "");
  out = out.replace(/<iframe[\s\S]*?<\/iframe>/gi, "");
  out = out.replace(/<object[\s\S]*?<\/object>/gi, "");
  out = out.replace(/<embed[\s\S]*?>/gi, "");
  // Remote stylesheets and base URL overrides (style blocks are kept — they
  // carry report styling, but @import / url() fetches and <base> are not)
  out = out.replace(/<link[^>]*rel\s*=\s*["']stylesheet["'][^>]*>/gi, "");
  out = out.replace(/<base[^>]*>/gi, "");
  out = out.replace(/@import\s+[^;]+;/gi, "");
  // Inline event handlers
  out = out.replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  // javascript: URLs
  out = out.replace(/(href|src)\s*=\s*(?:"|')?\s*javascript:[^"'>]*/gi, "");
  return out;
}

/** Loose sanity check that a model response looks like an HTML document. */
export function looksLikeHtmlDocument(text: string): boolean {
  return /<(?:html|body|table|div|h1|h2|p|section)\b/i.test(text);
}

/**
 * Extract a context window around the selection for large documents, so the
 * model sees the selected passage plus surrounding structure without the
 * full payload. Returns the full content when the selection isn't found.
 */
export function extractSelectionContext(
  content: string,
  selection: string,
  windowSize = 2500,
): string {
  if (!selection) return content;
  const idx = content.indexOf(selection);
  if (idx === -1) return content;
  const start = Math.max(0, idx - windowSize);
  const end = Math.min(content.length, idx + selection.length + windowSize);
  return content.slice(start, end);
}

/**
 * Replace the first occurrence of `selection` in `content` with `replacement`.
 * Returns null when the selection can't be located (caller falls back).
 */
export function applySpliceEdit(
  content: string,
  selection: string,
  replacement: string,
): string | null {
  const needle = selection.trim();
  if (!needle) return null;
  const idx = content.indexOf(needle);
  if (idx === -1) return null;
  return (
    content.slice(0, idx) + replacement + content.slice(idx + needle.length)
  );
}

/**
 * Fallback locator: find the first line containing the selection and splice
 * only the selection within that line. Used when a plain indexOf misses
 * because of surrounding whitespace or normalization.
 */
export function applySpliceEditByLine(
  content: string,
  selection: string,
  replacement: string,
): string | null {
  const needle = selection.trim();
  if (!needle) return null;
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const idx = lines[i].indexOf(needle);
    if (idx !== -1) {
      lines[i] =
        lines[i].slice(0, idx) +
        replacement +
        lines[i].slice(idx + needle.length);
      return lines.join("\n");
    }
  }
  return null;
}
