import { describe, it, expect } from "vitest";

import { generateConversationSummary } from "@/lib/chat/conversation-summary";

describe("generateConversationSummary", () => {
  it("strips conversational filler and capitalizes the result", () => {
    expect(
      generateConversationSummary(
        "can you explain my cash flow for last month?",
      ),
    ).toBe("Explain my cash flow for last month");
  });

  it("strips markdown formatting for a clean one-line snippet", () => {
    expect(
      generateConversationSummary("**Can you show me** the `cash balance`?"),
    ).toBe("Show me the cash balance");
  });

  it("collapses code fences and bullet lists into plain text", () => {
    expect(
      generateConversationSummary(
        "```\nselect * from accounts\n```\n- reconcile the bank\n- check the floats",
      ),
    ).toBe("Reconcile the bank check the floats");
  });

  it("turns links into their label and bare URLs into 'link'", () => {
    expect(
      generateConversationSummary(
        "See [the report](https://example.com/report) and https://example.com/data",
      ),
    ).toBe("See the report and link");
  });

  it("keeps short direct messages intact", () => {
    expect(generateConversationSummary("Where is my money")).toBe(
      "Where is my money",
    );
  });

  it("returns null for empty or whitespace-only input", () => {
    expect(generateConversationSummary("")).toBeNull();
    expect(generateConversationSummary("   ")).toBeNull();
  });

  it("returns null for bare greetings and acknowledgements", () => {
    expect(generateConversationSummary("hello")).toBeNull();
    expect(generateConversationSummary("hi there")).toBeNull();
    expect(generateConversationSummary("ok thanks")).toBeNull();
    expect(generateConversationSummary("thanks!")).toBeNull();
    expect(generateConversationSummary("got it")).toBeNull();
  });

  it("returns null for markdown-formatted acknowledgements too", () => {
    expect(generateConversationSummary("**thanks!**")).toBeNull();
    expect(generateConversationSummary("*perfect*")).toBeNull();
  });

  it("caps long summaries at a word boundary with an ellipsis", () => {
    const summary = generateConversationSummary(
      "Can you give me a detailed breakdown of all the transactions that happened in the first quarter of this financial year including the opening and closing balances for each account",
    );
    expect(summary).not.toBeNull();
    expect(summary!.length).toBeLessThanOrEqual(121); // 120 chars + ellipsis
    expect(summary!.endsWith("…")).toBe(true);
    expect(summary!).not.toContain(" …"); // no dangling space before the ellipsis
  });
});
