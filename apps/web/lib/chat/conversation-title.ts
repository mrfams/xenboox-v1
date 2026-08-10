// ─── Conversation Title Generation ────────────────────────────────────────
//
// Deterministic, zero-cost title generation for conversations. Turns the
// user's first message into a short, human-readable name for the /chat
// conversation panel and the dashboard sidebar — instead of storing the raw
// message fragment verbatim.

const MAX_TITLE_LENGTH = 60;

// Conversational filler prefixes to strip. Ordered longest-first so "tell me
// about " wins over "tell me ". Exported so the conversation summary
// generator can reuse the same cleanup.
export const LEADING_FILLERS = [
  "i have a question about ",
  "quick question about ",
  "i would like to ",
  "i'd like to ",
  "i want to ",
  "i need to ",
  "please can you ",
  "please help me ",
  "show me all ",
  "tell me about ",
  "explain to me ",
  "can you ",
  "could you ",
  "would you ",
  "show me ",
  "tell me ",
  "explain ",
  "help me ",
  "please ",
  "good morning ",
  "good afternoon ",
  "good evening ",
  "hey ",
  "hello ",
  "hi ",
].sort((a, b) => b.length - a.length);

/** Trailing sentence punctuation to trim from the title. */
const TRAILING_PUNCTUATION = /[.!?;:,]+$/;

export function generateConversationTitle(message: string): string {
  let text = (message ?? "").trim();
  if (!text) return "New conversation";

  // Collapse newlines and duplicate whitespace into single spaces.
  text = text.replace(/\s+/g, " ");

  // Strip exactly one leading filler phrase (longest match wins).
  const lower = text.toLowerCase();
  const filler = LEADING_FILLERS.find((f) => lower.startsWith(f));
  if (filler) {
    text = text.slice(filler.length).trim();
  }

  // Drop a leading article left behind by filler stripping ("tell me about
  // the cash position" → "Cash position").
  text = text.replace(/^(a|an|the)\s+/i, "");

  text = text.replace(TRAILING_PUNCTUATION, "").trim();

  if (!text) return "New conversation";

  // Capitalize the first letter.
  text = text.charAt(0).toUpperCase() + text.slice(1);

  // Cap at a word boundary with an ellipsis.
  if (text.length > MAX_TITLE_LENGTH) {
    const truncated = text.slice(0, MAX_TITLE_LENGTH);
    const lastSpace = truncated.lastIndexOf(" ");
    const cut =
      lastSpace > 20 ? truncated.slice(0, lastSpace).trim() : truncated;
    return `${cut.replace(TRAILING_PUNCTUATION, "")}…`;
  }

  return text;
}
