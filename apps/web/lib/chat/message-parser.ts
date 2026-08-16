/**
 * Message Parser for Rich Content Blocks
 *
 * Parses special rich content blocks from AI responses and converts them
 * to structured data that can be rendered as rich UI components.
 *
 * Supported formats:
 *
 * 1. Rich blocks with JSON:
 *    ```rich:approval
 *    {"title": "...", "items": [...]}
 *    ```
 *
 * 2. Markdown tables:
 *    | Header 1 | Header 2 |
 *    |----------|----------|
 *    | Cell 1   | Cell 2   |
 */

export type RichBlockType =
  "approval" | "document" | "table" | "alert" | "summary" | "timeline";

export interface RichBlock {
  type: RichBlockType;
  data: Record<string, unknown>;
}

export interface ParsedMessage {
  segments: Array<
    | { type: "text"; content: string }
    | { type: "rich"; block: RichBlock }
    | { type: "table"; headers: string[]; rows: string[][] }
  >;
}

// Regex for rich blocks: ```rich:type\n{json}\n```
const RICH_BLOCK_REGEX =
  /```rich:(approval|document|table|alert|summary|timeline)\n([\s\S]*?)\n```/g;

// Regex for markdown tables
const TABLE_REGEX = /(?:^|\n)((?:\|[^\n]+\|\n)+)/g;

// Regex for table row parsing (handles empty cells)
const TABLE_ROW_REGEX = /\|([^|]*)/g;

/**
 * Parse a message string into segments containing rich content
 */
export function parseMessage(content: string): ParsedMessage {
  const segments: ParsedMessage["segments"] = [];
  const ____remainingText = content;

  // First, extract rich blocks
  let match;
  const richBlocks: Array<{ index: number; length: number; block: RichBlock }> =
    [];

  // Reset regex
  RICH_BLOCK_REGEX.lastIndex = 0;

  while ((match = RICH_BLOCK_REGEX.exec(content)) !== null) {
    const [fullMatch, type, jsonStr] = match;
    try {
      const data = JSON.parse(jsonStr);
      richBlocks.push({
        index: match.index,
        length: fullMatch.length,
        block: { type: type as RichBlockType, data },
      });
    } catch {
      // Invalid JSON, treat as plain text
    }
  }

  // Sort by position
  richBlocks.sort((a, b) => a.index - b.index);

  // Build segments from rich blocks and text
  let lastIndex = 0;

  for (const { index, length, block } of richBlocks) {
    // Add text before this block
    if (index > lastIndex) {
      const textBefore = content.slice(lastIndex, index);
      const textSegments = extractTextWithTables(textBefore);
      segments.push(...textSegments);
    }

    // Add the rich block
    segments.push({ type: "rich", block });

    lastIndex = index + length;
  }

  // Add remaining text
  if (lastIndex < content.length) {
    const textAfter = content.slice(lastIndex);
    const textSegments = extractTextWithTables(textAfter);
    segments.push(...textSegments);
  }

  // If no rich blocks found, parse the entire content
  if (segments.length === 0) {
    const textSegments = extractTextWithTables(content);
    segments.push(...textSegments);
  }

  return { segments };
}

/**
 * Extract text segments and markdown tables from a text block
 */
function extractTextWithTables(text: string): ParsedMessage["segments"] {
  const segments: ParsedMessage["segments"] = [];

  // Find markdown tables
  const tables: Array<{
    index: number;
    length: number;
    headers: string[];
    rows: string[][];
  }> = [];
  let tableMatch;

  TABLE_REGEX.lastIndex = 0;
  while ((tableMatch = TABLE_REGEX.exec(text)) !== null) {
    const [fullMatch, tableContent] = tableMatch;
    const parsed = parseMarkdownTable(tableContent);
    if (parsed && parsed.headers.length > 0) {
      tables.push({
        index: tableMatch.index,
        length: fullMatch.length,
        headers: parsed.headers,
        rows: parsed.rows,
      });
    }
  }

  if (tables.length === 0) {
    // No tables, return as text
    if (text.trim()) {
      segments.push({ type: "text", content: text });
    }
    return segments;
  }

  // Build segments with tables
  let lastIdx = 0;

  for (const { index, length, headers, rows } of tables) {
    // Add text before table
    if (index > lastIdx) {
      const textBefore = text.slice(lastIdx, index);
      if (textBefore.trim()) {
        segments.push({ type: "text", content: textBefore });
      }
    }

    // Add table
    segments.push({ type: "table", headers, rows });

    lastIdx = index + length;
  }

  // Add remaining text
  if (lastIdx < text.length) {
    const textAfter = text.slice(lastIdx);
    if (textAfter.trim()) {
      segments.push({ type: "text", content: textAfter });
    }
  }

  return segments;
}

/**
 * Parse a markdown table string into headers and rows
 */
function parseMarkdownTable(
  tableStr: string,
): { headers: string[]; rows: string[][] } | null {
  const lines = tableStr
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l);

  if (lines.length < 2) return null;

  // Parse headers
  const headers = parseTableRow(lines[0]);

  // Skip separator line (---|---)
  const dataLines = lines.slice(1).filter((l) => !l.match(/^[\s|:-]+$/));

  // Parse rows
  const rows = dataLines.map((line) => parseTableRow(line));

  return { headers, rows };
}

/**
 * Parse a single table row (| cell | cell |)
 */
function parseTableRow(row: string): string[] {
  const cells: string[] = [];
  let match;

  TABLE_ROW_REGEX.lastIndex = 0;
  while ((match = TABLE_ROW_REGEX.exec(row)) !== null) {
    const cell = match[1]?.trim();
    if (cell !== undefined) {
      cells.push(cell);
    }
  }

  return cells;
}

/**
 * Simple markdown renderer for basic formatting
 */
/** Escape raw HTML so agent/user content can never inject markup. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderMarkdownSimple(text: string): string {
  // §5.5 OWASP A03 — this output is injected via dangerouslySetInnerHTML, so
  // the input (LLM/user chat content) MUST be escaped before the markdown
  // regexes run. Escaping first keeps any raw HTML inert; the regexes below
  // only emit hardcoded safe tags around already-escaped captures.
  const escaped = escapeHtml(text);
  return (
    escaped
      // Bold
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      // Italic
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      // Code
      .replace(
        /`(.*?)`/g,
        '<code class="px-1 py-0.5 bg-accent rounded text-[11px]">$1</code>',
      )
      // Line breaks
      .replace(/\n/g, "<br />")
  );
}

/**
 * Extract plain text from a parsed message (for previews, etc.)
 */
export function extractPlainText(message: ParsedMessage): string {
  return message.segments
    .map((seg) => {
      if (seg.type === "text") return seg.content;
      if (seg.type === "rich") {
        const data = seg.block.data;
        if (data.title) return String(data.title);
        if (data.message) return String(data.message);
        return "";
      }
      if (seg.type === "table") {
        return `[Table: ${seg.headers.join(", ")}]`;
      }
      return "";
    })
    .join(" ")
    .trim();
}
