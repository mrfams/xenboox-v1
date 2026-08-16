// @vitest-environment node
// ─── @-mention context anchoring guards ────────────────────────────────────
//
// The '@'-mention picker pins entity-scoped records (documents, transactions,
// invoices, bills, accounts, customers, suppliers) into a chat message. These
// guards keep the feature honest:
//
//   1. The composer must render a mention picker and support pinning.
//   2. The chat stream route must resolve `pinned` entity-scoped — every pin
//      kind from the shared type must be handled in the switch so a new kind
//      can never silently pass through unresolved (and unprompted).
//   3. The stream request body must carry the `pinned` field.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, it, expect } from "vitest";

import { MENTION_KIND_LABELS } from "@/lib/chat/mention-types";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const read = (p: string) =>
  fs.readFileSync(path.join(__dirname, "..", p), "utf8");

describe("at-mention context anchoring", () => {
  const composer = read("components/workspace/ai-composer.tsx");
  const streamRoute = read("app/api/chat/stream/route.ts");
  const hook = read("lib/hooks/use-streaming-chat.ts");

  it("renders a mention picker and pins chips in the composer", () => {
    // Picker UI
    expect(composer).toContain("mentionActive");
    expect(composer).toContain("MentionPicker");
    expect(composer).toContain("Pin context");
    // Pinned chips render with an inline '@' marker
    expect(composer).toContain("pinned.map");
    expect(composer).toContain("AtSign");
    expect(composer).toContain("removePinned");
    // The hint row advertises the trigger
    expect(composer).toContain("@");
    expect(composer).toContain("pin context");
  });

  it("passes pinned context through onSend", () => {
    expect(composer).toContain("pinned?: PinnedContext[]");
    expect(composer).toContain("pinned.length > 0 ? pinned : undefined");
  });

  it("sends pinned context to the stream route", () => {
    expect(hook).toContain("pinned?: PinnedContext[]");
    expect(hook).toContain("pinned,");
    expect(streamRoute).toContain("pinned?: PinnedContext[]");
    expect(streamRoute).toContain(
      "const { message, conversationId, entityId, files, pageContext, pinned }",
    );
  });

  it("resolves every mention kind entity-scoped in the stream route", () => {
    // Every kind declared in the shared type must have a resolution branch.
    for (const kind of Object.keys(MENTION_KIND_LABELS)) {
      expect(
        streamRoute,
        `stream route must resolve pinned kind "${kind}"`,
      ).toMatch(new RegExp(`case "${kind}":`));
    }
    // Entity scoping is non-negotiable — each branch filters by entityId.
    const entityScoped = (
      streamRoute.match(/eq\([a-zA-Z]+\.entityId, entityId\)/g) ?? []
    ).length;
    expect(entityScoped).toBeGreaterThanOrEqual(7);
  });

  it("never trusts client labels — pins are re-resolved server-side", () => {
    // The client label must never be spliced into the prompt; only resolved
    // record fields (description, invoice number, name…) are.
    expect(streamRoute).toContain("resolvedPins");
    // Resolved labels come from DB records (r.name, r.invoiceNumber…), never
    // from the client-supplied pin label (p.label).
    expect(streamRoute).not.toMatch(/\bp\.label/);
  });
});
