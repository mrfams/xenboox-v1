import { describe, it, expect } from "vitest";

import { generateConversationTitle } from "@/lib/chat/conversation-title";

describe("generateConversationTitle", () => {
  it("strips conversational filler and capitalizes the result", () => {
    expect(
      generateConversationTitle("can you explain my cash flow for last month?"),
    ).toBe("Explain my cash flow for last month");
  });

  it("keeps short direct messages intact", () => {
    expect(generateConversationTitle("Where is my money")).toBe(
      "Where is my money",
    );
  });

  it("drops a leading article left behind by filler stripping", () => {
    expect(generateConversationTitle("tell me about the cash position")).toBe(
      "Cash position",
    );
  });

  it("caps long titles at a word boundary with an ellipsis", () => {
    const title = generateConversationTitle(
      "Can you give me a breakdown of all the transactions in the first quarter of this financial year",
    );
    expect(title.length).toBeLessThanOrEqual(62); // 60 chars + ellipsis
    expect(title.endsWith("…")).toBe(true);
    expect(title).not.toContain(" …"); // no dangling space before the ellipsis
  });

  it("returns a fallback for empty or whitespace-only input", () => {
    expect(generateConversationTitle("")).toBe("New conversation");
    expect(generateConversationTitle("   ")).toBe("New conversation");
  });

  it("turns a bare greeting into a short clean title", () => {
    // A lone "hello" has no trailing-space filler to strip, so it stays as a
    // short capitalized title rather than an awkward fallback.
    expect(generateConversationTitle("hello")).toBe("Hello");
  });
});
