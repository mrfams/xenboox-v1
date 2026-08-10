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
};

export const MAX_PAGE_CONTEXT_CHARS = 1200;
const MAX_FILTERS = 8;
const MAX_SUMMARY = 8;

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

  let block = lines.join("\n");
  if (block.length > MAX_PAGE_CONTEXT_CHARS) {
    block = `${block.slice(0, MAX_PAGE_CONTEXT_CHARS)}…`;
  }
  return block;
}
