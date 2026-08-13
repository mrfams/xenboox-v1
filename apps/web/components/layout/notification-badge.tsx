import { cn } from "@/lib/utils";

/**
 * The two tones of the sidebar attention system:
 *   - "action" — the agent is blocked on you (destructive red, pulsing)
 *   - "new"    — fresh results to view (primary indigo, static)
 */
export type AttentionTone = "action" | "new";

/**
 * Collapsed-rail attention dot for the sidebar.
 *
 * The default desktop sidebar is a 4.25rem icon rail, where labels AND count
 * pills are hidden until hover. This dot sits on the icon corner so "something
 * needs you here" is visible at a glance without hovering. Two tones:
 *   - "action" (destructive, pulsing) — agent waiting on you / failed work
 *   - "new" (primary, static) — work finished but not yet viewed
 * The parent is responsible for positioning (absolute in the icon wrapper,
 * inline in the attention strip); this component is deliberately plain so it
 * works in both contexts. Keyed remount by the parent replays the pop-in.
 */
export function AttentionDot({
  tone,
  className,
}: {
  tone: AttentionTone;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "notification-badge-pop inline-flex h-2.5 w-2.5 rounded-full",
        tone === "action"
          ? "bg-destructive shadow-[0_0_0_3px_hsl(var(--destructive)/0.2)] animate-pulse"
          : "bg-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.2)]",
        className,
      )}
    />
  );
}

/**
 * Unread-count badge for the notification bell.
 *
 * Production behavior:
 *  - Renders NOTHING at 0 — no permanent red dot on the chrome.
 *  - Caps the label at 99+ so the pill never overflows the icon.
 *  - Pops in whenever the count changes (keyed remount replays the animation),
 *    so a newly arrived notification visibly announces itself.
 *  - Indigo (--primary), not destructive red: an unread-count indicator means
 *    "there is something new", not "something is broken". Red stays reserved
 *    for genuine errors (failed ingestion, rejected documents).
 *  - The count itself is announced by the bell button's aria-label; the badge
 *    is aria-hidden to avoid double screen-reader announcements.
 */
export function NotificationBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  const label = count > 99 ? "99+" : String(count);
  return (
    <span
      key={count}
      aria-hidden="true"
      className="notification-badge-pop absolute -right-1 -top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground shadow-sm"
    >
      {label}
    </span>
  );
}

/**
 * Inline count pill for nav items (sidebar attention map, etc.).
 *
 * Same rules as the bell badge — hidden at zero, capped at 99+ — but sized and
 * positioned for a nav row instead of an icon corner. The tone carries the
 * meaning: destructive red for *actionable workload* (pending approvals,
 * failed ingestion — an error queue), primary indigo for *fresh results*
 * (reports ready, work posted).
 */
export function CountPill({
  count,
  tone = "action",
  className,
}: {
  count: number;
  tone?: AttentionTone;
  className?: string;
}) {
  if (count <= 0) return null;
  const label = count > 99 ? "99+" : String(count);
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold leading-none",
        tone === "action"
          ? "bg-destructive text-destructive-foreground"
          : "bg-primary text-primary-foreground",
        className,
      )}
    >
      {label}
    </span>
  );
}
