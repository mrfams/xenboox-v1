import { redirect } from "next/navigation";

// ─── Legacy route ───────────────────────────────────────────────────────────
//
// Activity Hub is now Tasks (/dashboard/tasks): one queue for things that
// need a human (Needs you) plus every job (All tasks). This redirect keeps
// old bookmarks, sidebar badges, and ?prompt handoffs working.

export default function ActivityHubLegacyPage() {
  redirect("/dashboard/tasks");
}
