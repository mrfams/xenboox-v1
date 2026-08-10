/**
 * Page-context builder for the module-page AI copilot.
 *
 * When a user asks the AI a question from a data page (transactions, payroll,
 * …), the page sends a compact snapshot of what is in view. The stream route
 * weaves it into the pipeline input (same seam as fileContext) so the CFO
 * agent answers about the *page the user is actually looking at* — never
 * fabricating context the user can't see.
 *
 * Security posture: this block is appended to the LLM prompt, so every value
 * is sanitized (control chars stripped, whitespace collapsed) to prevent a
 * page value from smuggling fake instructions, and the whole block is bounded
 * so a pathological page can never bloat the token budget.
 */

export type PageContextPayload = {
  /** Human-readable page name, e.g. "Transactions". */
  page: string;
  /** Machine module key, e.g. "transactions". */
  module?: string;
  /** Current view/tab label, e.g. "Uncategorized". */
  view?: string;
  /** Active filters, e.g. ["search widget", "account Main"]. */
  filters?: string[];
  /** Key metrics visible on the page. */
  summary?: Array<{ label: string; value: string }>;
  /** Visible record count, when known. */
  count?: number;
  /** Optional page-specific extra context. */
  notes?: string;
  /**
   * A single targeted record the user has "picked up" (a row action) — the
   * AI answers about THIS record, so the user can ask "why is the tax 5%?"
   * without naming the employee. Like @-mentioning a file in Cursor.
   */
  focus?: PageFocus;
};

/** A targeted record from a table row — the "something" the user is asking about. */
export type PageFocus = {
  /** What kind of thing it is, e.g. "Employee", "Invoice", "Transaction". */
  kind: string;
  /** Human label, e.g. "Dylan Cooper". */
  name: string;
  /** DB id, when available (enables precise lookups by the agent). */
  id?: string;
  /** Key facts about the record, e.g. [{ label: "Tax rate", value: "5%" }]. */
  fields?: Array<{ label: string; value: string }>;
};

export const MAX_PAGE_CONTEXT_CHARS = 1200;
const MAX_FILTERS = 8;
const MAX_SUMMARY = 8;
const MAX_FOCUS_FIELDS = 8;

/**
 * Strip control chars AND collapse all whitespace runs to single spaces.
 *
 * Every field in the block becomes a single line, so a page-supplied value
 * can never smuggle a fake instruction (or fake page context) into the LLM
 * prompt via embedded newlines.
 */
function sanitize(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Build the `[CURRENT PAGE CONTEXT]` block from a page snapshot.
 * Returns an empty string when there is nothing meaningful to attach.
 */
export function buildPageContextBlock(
  payload?: Partial<PageContextPayload> | null,
): string {
  if (!payload || !payload.page) return "";

  const lines: string[] = ["[CURRENT PAGE CONTEXT]"];
  lines.push(`Page: ${sanitize(payload.page)}`);

  if (payload.module) lines.push(`Module: ${sanitize(payload.module)}`);
  if (payload.view) lines.push(`View: ${sanitize(payload.view)}`);

  const filters = (payload.filters ?? [])
    .slice(0, MAX_FILTERS)
    .map(sanitize)
    .filter(Boolean);
  if (filters.length > 0) lines.push(`Filters: ${filters.join(" | ")}`);

  const summary = (payload.summary ?? [])
    .slice(0, MAX_SUMMARY)
    .map((s) => `${sanitize(s.label)}: ${sanitize(s.value)}`)
    .filter((s) => s.length > 0);
  if (summary.length > 0) lines.push(`Summary: ${summary.join(" · ")}`);

  if (typeof payload.count === "number" && payload.count >= 0) {
    lines.push(`Records: ${payload.count}`);
  }

  if (payload.notes) lines.push(`Notes: ${sanitize(payload.notes)}`);

  // Focused record — the row the user picked up. Rendered last so it sits
  // closest to the instruction; the AI treats it as the subject of the ask.
  if (payload.focus) {
    const f = payload.focus;
    lines.push(
      `Focused: ${sanitize(f.kind)} ${sanitize(f.name)}${f.id ? ` (${sanitize(f.id)})` : ""}`,
    );
    const fieldLines = (f.fields ?? [])
      .slice(0, MAX_FOCUS_FIELDS)
      .map((field) => `${sanitize(field.label)}: ${sanitize(field.value)}`)
      .filter((line) => line.length > 0);
    if (fieldLines.length > 0) {
      lines.push(`  ${fieldLines.join(" | ")}`);
    }
  }

  let block = lines.join("\n");
  if (block.length > MAX_PAGE_CONTEXT_CHARS) {
    block = `${block.slice(0, MAX_PAGE_CONTEXT_CHARS)}…`;
  }
  return block;
}
