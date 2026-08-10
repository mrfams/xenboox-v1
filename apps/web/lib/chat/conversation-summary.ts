// ─── Conversation Summary Generation ─────────────────────────────────────
//
// Deterministic, zero-cost one-line summary for the /chat conversation panel
// and the dashboard/inbox recent-conversation lists. Unlike the title (which
// captures where the thread started), the summary tracks where the thread is
// NOW: it is regenerated from the user's latest message on every exchange and
// shown as a snippet under each conversation's title.
//
// Returns null when the message has no useful content to summarize (bare
// greetings, acknowledgements, whitespace) so callers can skip the write and
// keep a previously generated summary.

import { LEADING_FILLERS } from "./conversation-title";

const MAX_SUMMARY_LENGTH = 120;

/** Trailing sentence punctuation to trim from the summary. */
const TRAILING_PUNCTUATION = /[.!?;:,]+$/;

/** Bare greetings and acknowledgements that carry no content worth
 * summarizing — returning null lets callers keep a previous summary. */
const ACKNOWLEDGEMENTS = new Set([
  "hello",
  "hi",
  "hey",
  "hi there",
  "good morning",
  "good afternoon",
  "good evening",
  "good day",
  "how are you",
  "how's it going",
  "what's up",
  "ok",
  "okay",
  "ok thanks",
  "thanks",
  "thank you",
  "ty",
  "yes",
  "yeah",
  "yep",
  "no",
  "nope",
  "got it",
  "sure",
  "perfect",
  "great",
  "cool",
  "done",
  "works",
  "sounds good",
  "awesome",
  "nice",
  "thanks a lot",
  "thank you very much",
]);

export function generateConversationSummary(message: string): string | null {
  let text = (message ?? "").trim();
  if (!text) return null;

  // Strip markdown formatting that would look noisy in a one-line snippet.
  text = text.replace(/```[\s\S]*?```/g, " "); // code fences
  text = text.replace(/`([^`]*)`/g, "$1"); // inline code
  text = text.replace(/\*\*([^*]+)\*\*/g, "$1"); // bold
  text = text.replace(/__([^_]+)__/g, "$1"); // bold (alt syntax)
  text = text.replace(/\*([^*]+)\*/g, "$1"); // italic
  text = text.replace(/^#{1,6}\s+/gm, ""); // ATX headers
  text = text.replace(/^\s*[-*+]\s+/gm, ""); // bullet markers
  text = text.replace(/^\s*\d+\.\s+/gm, ""); // numbered-list markers
  text = text.replace(/^>\s?/gm, ""); // blockquotes
  text = text.replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1"); // links/images → label
  text = text.replace(/https?:\/\/\S+/g, "link"); // bare URLs

  // Collapse newlines and duplicate whitespace into single spaces.
  text = text.replace(/\s+/g, " ").trim();
  if (!text) return null;

  // Strip exactly one leading filler phrase (longest match wins), the same
  // list the title generator uses.
  const lower = text.toLowerCase();
  const filler = LEADING_FILLERS.find((f) => lower.startsWith(f));
  if (filler) {
    text = text.slice(filler.length).trim();
  }

  // Drop a leading article left behind by filler stripping.
  text = text.replace(/^(a|an|the)\s+/i, "");

  text = text.replace(TRAILING_PUNCTUATION, "").trim();

  // Skip content-free acknowledgements so a "thanks" doesn't overwrite a
  // genuinely useful summary. Check both the original message (catches bare
  // greetings like "hi there" that filler-stripping would reduce to
  // "there") and the cleaned text (catches markdown-formatted
  // acknowledgements like "**thanks!**").
  const ackCheck = (s: string) =>
    ACKNOWLEDGEMENTS.has(s.trim().replace(TRAILING_PUNCTUATION, ""));
  if (!text || ackCheck(lower) || ackCheck(text.toLowerCase())) {
    return null;
  }

  // Capitalize the first letter.
  text = text.charAt(0).toUpperCase() + text.slice(1);

  // Cap at a word boundary with an ellipsis.
  if (text.length > MAX_SUMMARY_LENGTH) {
    const truncated = text.slice(0, MAX_SUMMARY_LENGTH);
    const lastSpace = truncated.lastIndexOf(" ");
    const cut =
      lastSpace > 30 ? truncated.slice(0, lastSpace).trim() : truncated;
    return `${cut.replace(TRAILING_PUNCTUATION, "")}…`;
  }

  return text;
}
