/**
 * @-mention context anchoring — shared types between the composer picker,
 * the chat router (searchMentions), the stream route (resolution), and the
 * message-history renderer.
 *
 * The picker shows entity-scoped records the user can pin into a chat with
 * '@'. The label is a display string; the server re-resolves each pinned id
 * against the entity on send — client labels are never trusted.
 */

export type MentionKind =
  | "document"
  | "transaction"
  | "invoice"
  | "bill"
  | "account"
  | "customer"
  | "supplier";

export interface MentionItem {
  kind: MentionKind;
  id: string;
  /** Display label, e.g. "INV-2024-0142". */
  label: string;
  /** One-line detail, e.g. "Acme Corp · GMD 12,500 · pending". */
  subtitle: string;
}

/** What the composer passes to onSend / the stream route. */
export interface PinnedContext {
  kind: MentionKind;
  id: string;
  label: string;
}

/** Serde keys persisted on the chat message metadata (human-readable). */
export const MENTION_KIND_LABELS: Record<MentionKind, string> = {
  document: "Document",
  transaction: "Transaction",
  invoice: "Invoice",
  bill: "Bill",
  account: "Account",
  customer: "Customer",
  supplier: "Supplier",
};
