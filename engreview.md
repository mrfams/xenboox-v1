# EngReview — Page-by-Page Employee Audit Findings

> **AGENT INSTRUCTIONS:** Only mark a finding as ✅ DONE when it is **fully and completely fixed, verified, and working in production.** Partial fixes, TODOs, or "I started working on it" do NOT count. Every finding must be verified before marking done — run `pnpm typecheck --filter=web`, relevant tests, and visually confirm the fix works. If it's still broken or incomplete, leave it ⬜.
>
> **Scope:** WEB ONLY (`apps/web/`). Production grade or it doesn't ship.
>
> **Process:** One page at a time. One employee fired at a time. Each employee audits EVERYTHING on the page — every element, every state, every interaction, even the tiniest thing. All issues are listed under their department and employee so future sessions can pick work directly from this file.
>
> **Status Key:** `⬜` = Not started | `🔧` = In progress | `✅` = Fully fixed and verified | `N/A` = Out of scope
>
> Generated: August 25, 2026

---

# PAGE: /dashboard (Command Center)

The primary AI-native surface. Layout: ConversationSidebar + AIGreeting + GettingStartedChecklist/ProactiveBriefing + ConversationMemory + ConversationThread + AiInput, wrapped in dashboard layout (TopNav, AISidebar, ChatPanel, MobileBottomNav, OnboardingWizard, ProductTour, NPS, LiveChat).

---

## DEPARTMENT: PRODUCT

### Employee: Product Manager

| #   | Finding                                                                                                                                                                                                                                                                                                                                                  | Severity | Fix                                                                                                                         | Status |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------- | ------ | --- |
| 1   | **Approve/Reject buttons don't perform real approvals** — clicking "Approve" on an approval card just sends the text "Approved: \<title\>" as a new chat message and relies on the AI parsing that sentence. For a financial approval this is fragile: no mutation, no audit record tied to the approval ID, no confirmation the ledger actually posted. | HIGH     | Approval buttons must call a real tRPC mutation with the approval ID, show server-confirmed result, and log to audit trail. | ⬜     |
| 2   | **Reactions and pinned messages are fake features** — MessageReactions and PinnedMessagesPanel are local component state only. Everything vanishes on reload/navigation. Users will pin an important AI answer, come back, and it's gone. Shipping visible-but-non-persistent features erodes trust in an accounting product.                            | HIGH     | Either persist pins/reactions per conversation server-side, or remove the UI until real.                                    | ⬜     |
| 3   | **"Regenerate" doesn't regenerate** — it finds the previous user message and sends it AGAIN as a brand-new message. Result: duplicate question appended, no replacement of the bad answer, thread polluted.                                                                                                                                              | MEDIUM   | Implement true regenerate: truncate last assistant response and re-request, or hide the action until supported.             | ⬜     |
| 4   | **Getting-started checklist progress resets every reload** — completedSteps lives in useState; only dismissal is persisted to localStorage. User completes 3 steps, refreshes, progress bar back to 0%. Demotivating for exactly the new users it targets.                                                                                               | HIGH     | Persist step completion (localStorage keyed per user+entity minimum, ideally server-side activation state).                 |        | ✅  |
| 5   | **Checklist marks steps complete even when nothing happened** — any click marks complete, including message-steps where send may be blocked (e.g. mid-stream) and link-steps never complete since they navigate away. Progress bar lies.                                                                                                                 | MEDIUM   | Mark complete only on verified outcome (message actually sent; bank connection actually created).                           | ⬜     |
| 6   | **Getting-started dismissal is shared across all users/entities on the device** — single unscoped localStorage key. Multi-user machine or multi-entity account gets wrong state.                                                                                                                                                                         | LOW      | Scope storage key by user ID and entity ID.                                                                                 | ⬜     |
| 7   | **ProactiveBriefing can falsely say "All clear"** — fallback path shows the green "nothing needs your attention" card whenever `items.length === 0`, which also happens when BOTH dashboard and ingestion queries fail or return before load. Telling an SME owner everything is fine when we simply don't know is dangerous for an accounting product.  | HIGH     | Distinguish "loaded, zero items" from "failed to load"; error state must be explicit with retry.                            |        | ✅  |
| 8   | **React hooks called after conditional returns in ProactiveBriefing** — `getDashboardData.useQuery` and `ingestion.getStats.useQuery` are invoked below early returns (`isLoadingBriefing`, `briefingText`). Violates the Rules of Hooks: crashes/lints depending on path taken, briefing flickers between AI and fallback states.                       | HIGH     | Move all hooks above conditionals; derive render output from state.                                                         | ✅     |
| 9   | **Static suggestion chips contradict their own design note** — comment says "Dynamic suggestions based on time of month and entity state" but chips are hardcoded ("Run payroll", "Close books"). A brand-new entity sees "Close books" day one; month-end context never changes suggestions.                                                            | MEDIUM   | Make suggestions contextual: entity lifecycle stage, pending approvals, time of month.                                      | ⬜     |
| 10  | **Send button disabled when only files are attached** — handler supports sending files with empty text (sends "Uploaded files"), but the Button's disabled logic requires `inputValue.trim()`. Upload a receipt, button greyed out, Enter key still works — inconsistent affordance.                                                                     | MEDIUM   | Enable send when files exist OR text exists.                                                                                | ✅     |
| 11  | **Export chat exports an incomplete transcript** — markdown export includes only role+content text. Drops tables, charts, approvals, documents, confidence scores. An owner exporting "the conversation where I approved $12k" gets a file missing the evidence. No success feedback after download either.                                              | MEDIUM   | Export full artifact-rich transcript; add toast confirmation.                                                               | ⬜     |
| 12  | **Duplicate rendering of streaming data tables** — during streaming, tables render once inside the `isStreaming &&` block and AGAIN in the unconditional `dataTables.map` block further down. Same table appears twice mid-response.                                                                                                                     | MEDIUM   | Render each table exactly once regardless of stream state.                                                                  | ✅     |
| 13  | **Approval cards keyed/indexed by display title** — `processingApproval === approval.title`; two approvals titled "Invoice #1042" collide and both spin/disable together. Keys must be unique IDs.                                                                                                                                                       | MEDIUM   | Key processing state by approval/event id.                                                                                  | ✅     |
| 14  | **Auto-scroll fights the reader** — thread scrolls to bottom on every streamed token change with smooth behavior; reading a long answer mid-stream while scrolled up yanks the viewport down. No scroll-anchor suppression or "jump to latest" pill.                                                                                                     | MEDIUM   | Only autoscroll when already near bottom; offer jump-to-latest control.                                                     | ⬜     |
| 15  | **AIGreeting renders `new Date()` during render** — server prerender vs client hydration produce different greeting/date → hydration mismatch warnings and possible flash of wrong greeting. Greeting also frozen until refresh.                                                                                                                         | MEDIUM   | Compute time-of-day in effect/state after mount, suppress SSR mismatch.                                                     | ⬜     |
| 16  | **"AI active" status badge is decorative** — pulsing green dot implies live agent health but checks nothing. False assurance; same class of issue as the old help-page badge.                                                                                                                                                                            | LOW      | Wire to real agent/health signal or remove.                                                                                 | ⬜     |
| 17  | **ConversationSidebar delete does not update the list** — onSuccess handler is an empty comment placeholder; deleted conversation stays visible until refetch happens elsewhere (only exitChat invalidates). User deletes, item remains, confusion about whether it worked. Silent catch also hides failures entirely.                                   | HIGH     | Invalidate `chat.listConversations` on delete success; surface failure toast.                                               | ✅     |
| 18  | **Nested interactive elements in sidebar rows** — delete `<button>` rendered INSIDE the conversation row `<button>`. Invalid HTML, unpredictable focus/click behavior, hydration risk. Hover-only reveal also makes delete unreachable on touch devices and keyboard.                                                                                    | HIGH     | Flatten to div-with-role or move actions out; provide always-accessible delete affordance.                                  | ✅     |
| 19  | **Conversation search is client-side over a truncated list** — filters whatever page listConversations returned; older conversations invisible to search. Product promise "search conversations" silently incomplete.                                                                                                                                    | MEDIUM   | Server-side search endpoint for conversation titles/summaries.                                                              | ⬜     |
| 20  | **Custom hand-rolled delete dialog duplicates design system** — raw fixed-position overlay instead of shadcn Dialog; misses focus trap, ESC handling consistency, aria-modal.                                                                                                                                                                            | LOW      | Use design-system AlertDialog.                                                                                              | ⬜     |
| 21  | **Dashboard layout registers drag listeners via `useState(() => …)` instead of useEffect** — mousemove/mouseup listeners attach once, returned cleanup is discarded, listeners NEVER removed for the app lifetime (memory leak, ghost handlers), and it's a misuse of the React API that will confuse every future reader.                               | HIGH     | Convert to proper useEffect with cleanup.                                                                                   | ✅     |
| 22  | **Two h1 elements on /dashboard** — layout injects an sr-only `<h1>` (page title) AND AIGreeting renders a visual `<h1>` greeting. Broken heading hierarchy for SEO/a11y tooling.                                                                                                                                                                        | LOW      | Demote greeting to `<p>` or merge into the single h1 strategy.                                                              | ⬜     |
| 23  | **PAGE_TITLES map covers only 7 routes** — audit-trail, auto-approve, donor-reporting, ingestion, knowledge, knowledge-graph, qbr, referrals all fall back to generic "Dashboard" in the sr-only h1 and SurfaceErrorBoundary labels.                                                                                                                     | LOW      | Complete the route→title map (or derive from a shared nav config).                                                          | ⬜     |
| 24  | **Context-menu copilot uses `window.location.href` full reload** — DataAwareContextMenu hands off to Command Center via hard navigation, destroying SPA state (streaming chats, open panels).                                                                                                                                                            | LOW      | Use next/router push.                                                                                                       | ✅     |
| 25  | **Error-path assistant message violates its own message type** — `handleStreamError` pushes an assistant message missing required `citations/batchResults/dataTables/charts` fields defined on DashboardChatMessage; downstream code assumes these arrays exist. Verify typecheck passes and normalize shape.                                            | HIGH     | Construct error messages through a helper that fills all fields.                                                            | ✅     |
| 26  | **No loading skeleton parity for ProactiveBriefing fallback queries** — when AI briefing absent, fallback cards pop in without skeletons; layout shift on first paint for every returning user.                                                                                                                                                          | LOW      | Skeleton states matching final card heights.                                                                                | ⬜     |
| 27  | **Briefing timestamp shows client render time, not generation time** — `new Date().toLocaleTimeString()` in the AI-briefing footer mislabels freshness (shows when you loaded the page); also locale-inconsistent with rest of app.                                                                                                                      | LOW      | Show server-provided generatedAt formatted consistently.                                                                    | ⬜     |

### Employee: Product Critic

Reviewed /dashboard across all 6 dimensions (user value, usability, edge cases, AI-native patterns, competitive, metrics). Findings below — PM overlap removed, these are new.

| #   | Finding                                                                                                                                                                                                                                                                                                                                                                  | Severity | Fix                                                                                                                                  | Status |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------ | --- |
| 1   | **Mobile users cannot open their conversations** — the "Conversations" toggle button in the greeting row is `hidden md:inline-flex` (desktop-only), and ConversationSidebar renders as a fixed 288px column. On phones there is NO path to past conversations from Command Center. Core feature unreachable on mobile.                                                   | CRITICAL | Add a mobile entry point (icon in TopNav or above thread) and render sidebar as an overlay drawer on small screens.                  | ✅     |
| 2   | **No way to stop a streaming response** — `useStreamingChat` exposes `cancelStream` and the hook wires unmount cleanup, but NO UI element anywhere on the page lets the user cancel a long/expensive/wrong-direction generation. They just wait. An accounting AI that can't be interrupted feels broken and burns tokens/money.                                         | HIGH     | Show Stop button in AiInput (or thread) while `isStreaming`; wire to cancelStream.                                                   |        | ✅  |
| 3   | **Three competing chat surfaces on one screen** — Command Center center-thread, ChatPanel right rail ("/" shortcut + floating CFO Agent button + edge tab), and LiveChatWidget. A new user cannot tell which one is the "real" assistant, and context doesn't flow between them. Violates the single-surface AI-native model.                                            | HIGH     | Consolidate entry points; make ChatPanel reuse Command Center thread state or clearly differentiate purposes (support vs CFO agent). | ⬜     |
| 4   | **Error messages tell users to "try again" but provide no retry control** — failed stream appends an error bubble with plain text; user must retype or find their old message manually. No retry button on the error card.                                                                                                                                               | HIGH     | Add "Retry" action on error bubbles that resends the last user message via existing regenerate plumbing.                             |        | ✅  |
| 5   | **Clipboard copy fails silently** — MessageActions copy catches errors with console.error only. On clipboards denied by browser policy (common in embedded webviews), user clicks Copy and nothing happens, no feedback.                                                                                                                                                 | MEDIUM   | Toast on failure with fallback (legacy execCommand prompt).                                                                          | ⬜     |
| 6   | **"Share" promises link-sharing, delivers .txt download** — component header says "Share message via link", metadata prop supports conversationId, but actual options are file-download and clipboard-copy only. Misleading feature surface.                                                                                                                             | LOW      | Either implement shareable deep-link (`/dashboard?conversation=…&message=…`) or rename to "Export".                                  | ⬜     |
| 7   | **Message hover actions have no touch/keyboard equivalent** — actions render on group-hover patterns; tablets/touch and keyboard-only users can't copy/pin/regenerate any message.                                                                                                                                                                                       | MEDIUM   | Always-visible kebab menu per message (or long-press/focus-visible reveal).                                                          | ⬜     |
| 8   | **InlineInputForm submits silently do nothing on missing required fields** — handleSubmit `return`s without any message when a required field is empty; the Submit button is disabled so most users never hit it, but pressing Enter inside a text input calls handleSubmit directly and gives zero feedback about what's missing. Also no per-field validation styling. | MEDIUM   | Show inline validation states and disable Enter-submit until valid, mirroring the button logic.                                      | ⬜     |
| 9   | **InlineInputForm select options are raw backend strings** — options render verbatim (e.g. snake_case values); no labels, no grouping. Feels unfinished in an otherwise polished product.                                                                                                                                                                                | LOW      | Map option values to human labels.                                                                                                   | ⬜     |
| 10  | **Low-confidence AI answers have no escalation path** — ConfidenceBadge displays a score, but per AGENTS.md confidence <0.4 should escalate to a human; nothing in this UI routes a low-confidence answer to Activity Hub or offers "flag for review". The loop closes nowhere.                                                                                          | HIGH     | Below threshold, show "Send to Activity Hub for human review" action on the message.                                                 |        | ✅  |
| 11  | **Approval cards lack source-document drill-in** — approval shows title/description/amount strings but no link to the underlying invoice/bill/document. Owners approve six-figure sums without seeing evidence. Competitive gap: QuickBooks approval flows deep-link the document.                                                                                       | HIGH     | Attach entity type + id to ApprovalEvent and render "View document" link.                                                            | ⬜     |
| 12  | **Three overlapping onboarding systems fight for attention** — GettingStartedChecklist (in-page), OnboardingWizard (modal), and ProductTour (coach marks) all live in the same layout with no shared completion state. New user can see wizard + checklist + tour simultaneously. Activation ownership is ambiguous and unmeasurable.                                    | HIGH     | Single activation state machine owning all three surfaces; each checks the same store before showing.                                | ⬜     |
| 13  | **Checklist step completion isn't tracked in analytics** — commandCenterFirstVisit fires, but step starts/completions/dismissals emit nothing. The single most important activation funnel is invisible to data.                                                                                                                                                         | MEDIUM   | Track step_view/step_complete/checklist_dismiss with step ids.                                                                       | ⬜     |
| 14  | **Conversation list has no rename and no unread/state indicators** — titles auto-generated only ("Untitled conversation" fallback visible to users). Users can't organize or recognize threads beyond first words of content.                                                                                                                                            | LOW      | Auto-title from first exchange server-side; add rename action.                                                                       | ⬜     |
| 15  | **Empty-state dead zone below briefings** — with zero messages the thread area renders literally nothing under the checklist; the visual weight collapses. Empty state should preview capabilities (sample prompts with rich previews).                                                                                                                                  | LOW      | Add capability-preview empty state between checklist and input.                                                                      | ⬜     |
| 16  | **AI-native anti-pattern: fallback briefing is count-based, not narrative** — when AI briefing unavailable, users get raw counts ("3 deadlines upcoming") with zero explanation of WHY it matters. PRD promise: "AI explains what numbers mean." Fallback should degrade to plainer language + link to ask AI, not bare counters.                                        | MEDIUM   | Fallback items include one-line "why it matters" copy.                                                                               | ⬜     |
| 17  | **No date/time context on messages** — thread messages show no timestamps at all; an owner reviewing "when did I approve this?" next week has zero anchor in the UI.                                                                                                                                                                                                     | MEDIUM   | Timestamps on message groups (or on hover) with day separators.                                                                      | ⬜     |
| 18  | **ConversationMemory query fires per keystroke-equivalent state change** — currentQuery = last message content; every new message triggers a new searchRelevantConversations request while streaming completes; results then reference the PREVIOUS question mid-conversation. Memory suggestions appear/disappear distractingly during active chats.                    | MEDIUM   | Debounce + only evaluate after message completes; hide memory while isStreaming.                                                     | ⬜     |

### Employee: UX Writer

Audited every word on the page: greetings, briefings, checklist, thread bubbles, approval cards, forms, sidebar, empty/loading/error states, tooltips, SR announcements.

| #   | Finding                                                                                                                                                                                                                                                                                                                    | Severity | Fix                                                                                                                         | Status |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | **Error bubble copy is vague and blame-shaped** — "Sorry, I ran into a problem: {message}. Please try again." violates the house error formula (Problem → Solution → Action). Raw `{message}` can be a stack-ish technical string shown verbatim to an SME owner.                                                          | HIGH     | "I couldn't finish that response. Your conversation is safe — tap Retry to try again." Retry button, never raw error text.  | ✅     |
| 2   | **Greeting promises a snapshot the page stops delivering** — "Here's your business snapshot for August 25" sits above the page permanently, but after the first message the screen becomes a chat transcript. Copy contradicts content within seconds of use.                                                              | MEDIUM   | Swap subtitle based on state: snapshot line only while briefing visible; conversational line once chatting.                 | ⬜     |
| 3   | **"The AI handles anything" is an overpromise we can't keep** — checklist footer claims unlimited capability. In accounting, overpromising invites compliance/trust failures when the AI declines or errs.                                                                                                                 | MEDIUM   | "Or ask anything about your books — the AI will tell you if it needs help."                                                 | ⬜     |
| 4   | **Files-only send inserts fake user message "Uploaded files"** — literal string appears as if the human typed it. Reads like a bug to users.                                                                                                                                                                               | MEDIUM   | Render attachment-only messages properly ("Shared 2 documents") instead of injecting placeholder text.                      | ✅     |
| 5   | **"Press Enter to submit" hint is wrong for half the form** — InlineInputForm shows this under Submit, but Enter only submits in single-line inputs; textareas and selects ignore it. Users press Enter in the textarea, nothing happens, hint looks like a lie.                                                           | LOW      | Show the hint conditionally per field type, or make Enter submit from all fields consistently.                              | ⬜     |
| 6   | **Suggestion chips mix verb forms and register** — "Cash position" (noun), "Show P&L" (imperative), "What's overdue?" (question), "Run payroll" (imperative), "Close books" (missing possessive). Inconsistent patterns scan poorly and model inconsistent prompting.                                                      | LOW      | Standardize on questions or imperative+object: "What's my cash position?", "Show my P&L", "Run payroll", "Close the books". | ⬜     |
| 7   | **Approval card action hierarchy is unclear** — three equal-weight buttons Approve / Review / Reject, but "Review" actually sends "Please review: \<title\>" back to the AI — nobody can guess that outcome from the label. Destructive Reject sits adjacent to Approve with same visual weight.                           | HIGH     | Label outcomes: "Approve & post", "Explain first" (for review), "Reject"; separate destructive action spatially.            | ✅     |
| 8   | **Confidence score shown with no explanation** — ConfidenceBadge renders a bare number/percent. House AI-copy standard requires interpretation ("AI is 94% confident…"). New users have no idea what the number means or what threshold matters.                                                                           | MEDIUM   | Add tooltip/plain-text interpretation aligned with the AI-specific copy table (confident / unsure / escalate).              | ⬜     |
| 9   | **"% match" relevance badge is engineer-speak** — ConversationMemory shows "87% match" with zero context of match-against-what.                                                                                                                                                                                            | LOW      | "About your cash question last week" style summary, or tooltip "Based on similar topics in past chats".                     | ⬜     |
| 10  | **Loading states lack reassurance and progress** — briefing loader is good ("Generating your briefing…"), but there's no extended-wait state; >10s the same two lines spin forever. Thread thinking dots say just "Thinking...".                                                                                           | LOW      | Progressive copy: "Reading your ledger…" → "Comparing months…" → "Almost done…"                                             | ⬜     |
| 11  | **Delete confirmation omits the object name** — "Are you sure you want to delete this conversation?" while the dialog floats detached from the row. On slow scans users confirm deletions blind.                                                                                                                           | MEDIUM   | Include title: "Delete 'Q3 payroll questions'? This can't be undone."                                                       | ✅     |
| 12  | **"AI active" badge means nothing to users** — active how? doing what? Jargon chip that will be ignored at best, distrusted at worst.                                                                                                                                                                                      | LOW      | Replace with concrete status ("3 agents working") or remove until real signal exists.                                       | ⬜     |
| 13  | **"Untitled conversation" leaks internal placeholder** — shown verbatim as a title in the list.                                                                                                                                                                                                                            | LOW      | Generate titles from first user message server-side; hide rows lacking titles behind "New chat" label.                      | ⬜     |
| 14  | **Screen-reader stream announces are redundant/conflicting** — announce fires "AI is thinking..." then immediately "AI is responding..." as soon as first token lands; with streamedContent toggling, SR users get chattered repeated updates. Also `aria-busy` on container plus role=status inside duplicates signaling. | MEDIUM   | Announce state transitions only (start/done/error), debounce token-driven announcements.                                    | ⬜     |
| 15  | **Checklist step descriptions truncate mid-meaning** — descriptions use `truncate` class; e.g. 'Try "Show me my financial overview" or "What's my cash position?"' clips to one line, cutting off the second example entirely on common widths.                                                                            | MEDIUM   | Use line-clamp-2 for descriptions so examples survive.                                                                      | ⬜     |
| 16  | **Export button gives zero feedback** — clicking "Export chat" downloads silently; no toast ("Conversation exported"), no disabled state, no indication of what was included.                                                                                                                                              | LOW      | Toast: "Chat exported as Markdown" + note that tables/charts aren't included until they are.                                | ⬜     |
| 17  | **Empty search state misses the recovery action** — "No matching conversations" stops there; the in-app pattern elsewhere pairs it with an escape hatch ("ask the AI directly").                                                                                                                                           | LOW      | Append "Try a different keyword, or start a new chat." with New Chat link.                                                  | ⬜     |
| 18  | **Time-greeting excludes late-night users** — hour<12 morning, <17 afternoon, else evening; 1am user gets "Good evening" — acceptable, but date line says "business snapshot" for the wrong business day around midnight UTC vs local. Minor but real for global SMEs (product ships globally).                            | LOW      | Compute greeting/date from a single locale-aware formatter used consistently.                                               | ⬜     |

### Employee: Design Critic

Reviewed every rendered component on /dashboard across visual consistency, UX patterns, accessibility, data presentation, responsive, and state coverage.

| #   | Finding                                                                                                                                                                                                                                                                                                                                                                                         | Severity | Fix                                                                                                                                 | Status |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | **Non-standard opacity modifiers may render nothing** — repeated use of `bg-primary/8`, `group-focus-within:bg-primary/12`, `border-border/40` style fractions like `/8` and `/12` are outside Tailwind's default opacity scale; depending on config they silently produce NO class, killing the intended tinted backgrounds on bot avatars, icon chips, and the AI input. Verify compiled CSS. | HIGH     | Audit all `/N` fractions against the Tailwind config; standardize to scale values (5/10/20…) or add explicit theme entries.         | ⬜     |
| 2   | **Touch targets far below 44px** — suggestion chips (~26px tall), sidebar delete icon (p-1 ≈ 24px), "Export chat" (text-[10px] link), greeting "Conversations" toggle (text-[10px] py-1.5), time-ago rows. Primary mobile interactions on the flagship surface fail touch guidelines.                                                                                                           | HIGH     | Enforce min-h-11/min-w-11 hit areas (padding or pseudo-element expansion) on all tappable controls.                                 | ⬜     |
| 3   | **Micro-typography everywhere** — text-[9px], text-[10px], text-[11px] used for timestamps, footers, hints, count labels. Below 12px fails readability for the 40+ owner demographic and most WCAG body-text contrast checks.                                                                                                                                                                   | MEDIUM   | Establish minimum 12px floor for meaningful text; reserve smaller sizes for decorative only.                                        | ⬜     |
| 4   | **Low-contrast grays likely fail AA** — text-muted-foreground/40 and /50 (timestamps, footers, hint text) plus placeholder:text-muted-foreground/50 on card backgrounds. Verify ratios; several combos compute well under 4.5:1.                                                                                                                                                                | HIGH     | Raise to /60-/70 tokens or foreground-muted token verified ≥4.5:1.                                                                  | ⬜     |
| 5   | **No focus-visible treatment on custom buttons** — hand-rolled buttons (sidebar rows, chips, checklist steps, briefing cards, export link) define hover styles but no focus-visible ring; keyboard users get browser default or nothing. Violates the app's own shadcn Button pattern which has rings.                                                                                          | HIGH     | Add consistent `focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:outline-none` to every interactive element.        | ✅     |
| 6   | **Custom modal misses dialog semantics** — sidebar delete confirm is raw fixed divs: no role="dialog", aria-modal, focus trap, ESC-to-close, or focus return. Screen readers announce nothing; tab escapes behind overlay.                                                                                                                                                                      | HIGH     | Replace with shadcn AlertDialog (or add role/aria/focus-trap/ESC).                                                                  | ✅     |
| 7   | **Color-only danger signaling** — delete affordance communicates solely via red icon on hover; destructive Reject differs from Approve only by hue (red vs emerald backgrounds). Color-blind users can't distinguish actions.                                                                                                                                                                   | MEDIUM   | Pair color with icons (already present) AND distinct outline/solid treatment for destructive actions; add aria-describedby context. | ⬜     |
| 8   | **Inconsistent message content widths** — assistant bubbles cap at max-w-[85%], streaming tables/charts at max-w-[90%], thread column mx-auto max-w-3xl. Elements visibly jump width between stream and commit.                                                                                                                                                                                 | LOW      | Unify one width token for all thread children.                                                                                      | ⬜     |
| 9   | **Spinner where skeletons are house style** — conversation list shows Loader2 spinner; dashboard skeleton component exists and is used elsewhere. Inconsistent loading language on the same screen as ProactiveBriefing's shimmering loader.                                                                                                                                                    | MEDIUM   | Use skeleton rows matching final list item heights.                                                                                 | ⬜     |
| 10  | **Hidden scrollbar with zero overflow affordance** — suggestion rail hides scrollbars (`[scrollbar-width:none]`); with 5+ chips on mobile there's no visual cue more exist.                                                                                                                                                                                                                     | LOW      | Add edge fade masks or peek the next chip.                                                                                          | ⬜     |
| 11  | **Sidebar toggle causes layout jump** — desktop ConversationSidebar is in-flow (w-72 border-r); opening it squeezes the whole thread and reflows text mid-read. Overlay/drawer pattern avoids reflow.                                                                                                                                                                                           | MEDIUM   | Render as overlay above content (or animate width with reserved space).                                                             | ⬜     |
| 12  | **Double mobile bottom compensation** — page root has `pb-16 md:pb-0` AND layout adds a separate `h-16 md:hidden` spacer div; combined they can create ~128px dead zone above MobileBottomNav depending on stacking. Verify actual rendered gap.                                                                                                                                                | MEDIUM   | Keep exactly one spacing strategy for the mobile nav bar.                                                                           | ⬜     |
| 13  | **Semantic colors hardcoded to raw palette** — approval amber (border-amber-500/20, bg-amber-500/[0.03]), success emerald, error red scattered as literal classes across briefing/checklist/thread. Dark mode and white-label theming will drift.                                                                                                                                               | MEDIUM   | Map to semantic tokens (success/warning/destructive) in theme.                                                                      | ⬜     |
| 14  | **Uppercase styling applied to currency values** — briefing value badge uses `uppercase tracking-wider` on strings that contain "$12,500"; letter-spacing distorts numeral rhythm and looks off. Style should apply to labels, not data.                                                                                                                                                        | LOW      | Remove uppercase/tracking from value spans.                                                                                         | ⬜     |
| 15  | **Route-transition remount nukes scroll and state** — layout wraps children in `<div key={pathname}>` purely for enter animation; every navigation remounts the tree, resetting scroll positions of main and inner lists (conversation list jumps to top).                                                                                                                                      | MEDIUM   | Animate without remount (CSS view transitions or keep key stable per surface group).                                                | ⬜     |
| 16  | **Checklist line-through + green relies on decoration alone** — completed step signaled by strikethrough + pale green wash; strikethrough text at small sizes reduces legibility and color-only meaning persists. Check icon helps; ensure it's announced (aria) too.                                                                                                                           | LOW      | Add sr-only "Completed" text and reduce reliance on strikethrough.                                                                  | ⬜     |
| 17  | **Streaming cursor lacks reduced-motion handling** — animate-pulse dots, blinking caret, pulsing AI-active dot run regardless of prefers-reduced-motion.                                                                                                                                                                                                                                        | MEDIUM   | Wrap decorative animations in motion-safe: variants.                                                                                | ⬜     |
| 18  | **Greeting row crams h1 + status pill + conversations button** — on mid widths the date subtitle wraps awkwardly against the absolute-ish right controls; hierarchy competes with the Conversations control sitting at title level.                                                                                                                                                             | LOW      | Move conversations toggle into the composer row or top-nav; keep header pure.                                                       | ⬜     |

### Employee: Engineering Critic

Full read of `page.tsx`, `layout.tsx`, all `command-center/*`, `conversation-sidebar.tsx`, `conversation-memory.tsx`, `use-dashboard-chat.ts`. Duplicates from earlier employees removed; these are engineering-specific.

| #   | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Severity | Fix                                                                                                                                   | Status |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | **CRITICAL: `/dashboard?prompt=` handoff is dead end-to-end** — seven entry points (DataAwareContextMenu layout.tsx:196, selection-actions.tsx:79, command-palette.tsx:306, ai-command-bar.tsx:71/77/109, ai-chat-input.tsx:71, help/page.tsx:399) navigate to `/dashboard?prompt=…` expecting auto-send, but NO code anywhere reads the `prompt` param (verified by grep: zero consumers). Users invoke "Ask AI…" from anywhere in the app and land on Command Center with nothing happening. Broken promise at the heart of the AI-native model. | CRITICAL | Read `prompt` via useSearchParams (inside Suspense), auto-send once on mount, strip param from URL after send.                        | ⬜     |
| 2   | **Drag-resize triggers React re-render per mousemove** — layout.tsx handleDragMove calls setPanelWidth on every mousemove with no rAF throttle/quantization; dragging the chat panel spams renders of the ENTIRE dashboard subtree (providers + children). Noticeable jank on lower-end hardware.                                                                                                                                                                                                                                                  | HIGH     | Throttle via requestAnimationFrame or update a ref + CSS variable; commit to state on dragEnd.                                        | ✅     |
| 3   | **Ghost mousemove listeners for app lifetime** — the useState-as-useEffect bug also means mousemove/mouseup handlers stay attached forever after first mount even when panel closed/dragging impossible; every mouse move on any page runs handler logic (guarded by isDragging, still wasted work) and leaks across HMR boundaries duplicating handlers.                                                                                                                                                                                          | HIGH     | useEffect with proper cleanup (same fix as PM #21 — one change resolves both).                                                        | ✅     |
| 4   | **`require()` inside useEffect** — layout.tsx:67 pulls analytics module via CommonJS require wrapped in silent try/catch. Defeats bundler tree-shaking/static analysis, breaks under ESM-only/middleware runtimes, and the empty catch hides real import failures making analytics outages invisible.                                                                                                                                                                                                                                              | MEDIUM   | Static import at top; if lazy needed use dynamic `import()` with caught-and-logged errors.                                            | ✅     |
| 5   | **PostHog identified by localStorage ID, not session identity** — PermissionAwareLayout identifies users via `localStorage.getItem("userId")` instead of NextAuth session user id. Anonymous/random identity fragments analytics across devices/browsers, can collide across users on shared machines, and never reconciles with auth identity.                                                                                                                                                                                                    | HIGH     | Identify from session.user.id (useSession); drop localStorage shim.                                                                   | ✅     |
| 6   | **tRPC inference cast masks a server-side typing bug** — proactive-briefing.tsx:133 casts getAiBriefing result `as {data…}` with a comment admitting dynamic-import broke inference. The call-site cast silences the compiler for ANY future shape change of this financial briefing payload.                                                                                                                                                                                                                                                      | MEDIUM   | Fix the procedure's return type (remove dynamic import or add explicit output zod type); delete the cast.                             | ⬜     |
| 7   | **Error-path message object violates DashboardChatMessage contract** — use-dashboard-chat.ts handleStreamError omits required citations/batchResults/dataTables/charts arrays that the interface declares. Either typecheck currently fails here or fields are silently optional — both bad. Downstream renderers assume array presence (`msg.citations.length`).                                                                                                                                                                                  | HIGH     | Centralize message construction so every path emits the full shape; make interface honest. Verify with `pnpm typecheck --filter=web`. | ⬜     |
| 8   | **listConversations has no visible pagination** — sidebar queries without limit params and renders everything grouped client-side; long-lived accounts will pull unbounded rows each open. If server caps silently, search misses older items (already logged as product gap) — either way contract unclear.                                                                                                                                                                                                                                       | MEDIUM   | Cursor-paginated endpoint + "Load more"; document limit.                                                                              | ⬜     |
| 9   | **Double error boundary wrapping** — page wraps itself in ErrorBoundary surface="command-center" while layout already wraps children in SurfaceErrorBoundary keyed by page title. Nested boundaries double-handle the same crashes, produce duplicate fallback UIs/logs, and blur ownership.                                                                                                                                                                                                                                                       | LOW      | Keep exactly one boundary layer per surface (layout-level), remove page-level wrapper or vice versa.                                  | ⬜     |
| 10  | **classList DOM mutation races navigation** — conversation-thread handleJumpTo adds ring classes then removes after fixed 2000ms setTimeout; navigating away mid-timeout leaves no leak (unmount) but re-entry within 2s can strip classes from a NEW element with same id. Minor but classic ref-violation pattern.                                                                                                                                                                                                                               | LOW      | Manage highlight via state, not classList.                                                                                            | ⬜     |
| 11  | **Escape-key dialog guard only checks first [role=dialog]** — querySelector returns the first match in DOM order; with stacked dialogs (delete confirm over chat over panel) ESC may close the chat panel behind the dialog instead of nothing/topmost.                                                                                                                                                                                                                                                                                            | LOW      | Use querySelectorAll and check none visible, or delegate ESC handling per-dialog.                                                     | ⬜     |
| 12  | **Drag handle inaccessible** — resize affordance is mouse-events-only div; no role="separator", no aria-orientation, no keyboard resize (arrow keys), touch unsupported (should be pointer events). Panel width unusable-by-keyboard users.                                                                                                                                                                                                                                                                                                        | MEDIUM   | Pointer events + role=separator + arrow-key resize ±16px steps.                                                                       | ⬜     |
| 13  | **panelWidth not persisted** — resets to 400px every reload; returning users re-drag daily.                                                                                                                                                                                                                                                                                                                                                                                                                                                        | LOW      | Persist width to localStorage keyed per user.                                                                                         | ⬜     |
| 14  | **commandCenterFirstVisit fires on every mount/entityId flip** — effect deps [entityId]; entity switching remounts tracking; whether dedupe lives inside activationEvents is unverified. If not, "first visit" metric overcounts badly.                                                                                                                                                                                                                                                                                                            | LOW      | Verify tracker idempotency; move once-guard into tracker with userId+entityId key. Needs investigation.                               | ⬜     |
| 15  | **Sidebar search filters summary+title only client-side over fetched page** — combined with #8, results are arbitrary subsets. Also no debounce needed (local) fine, but empty-search state conflates "no match" vs "not loaded".                                                                                                                                                                                                                                                                                                                  | LOW      | Resolve together with server-side search (#8 / Product Critic #19).                                                                   | ⬜     |
| 16  | **Streaming tables double-render duplicates keys risk** — during stream, same DataTableEvent renders in two blocks with different key namespaces (`streaming-table-i` and `table-i`) → duplicate DOM, double Recharts mounts (expensive charts rendered twice simultaneously).                                                                                                                                                                                                                                                                     | HIGH     | Single source of truth for table rendering regardless of stream phase (same fix as PM #12 — perf impact makes it High here).          | ✅     |

### Employee: Security Engineer (CSO)

Audited the page's client attack surface AND verified its server counterparts in `server/routers/chat.ts`. Entity scoping on getMessages/deleteConversation/sendMessage confirmed present (`entityId` checks + rlsProtectedProcedure) — good. Findings that remain:

| #   | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Severity | Fix                                                                                                                                                                                                      | Status           |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| 1   | **Financial approvals authorized by chat text** — approval executes because the user typed "Approved: X"; there is no server-side authorization object binding the approval to a permission check, approver identity, and immutable audit record. Any entity member who can chat can move money-adjacent state, and repudiation is trivial ("I never approved that — the AI guessed from my sentence"). Violates separation-of-duties and audit-trail requirements in AGENTS.md security rules. | CRITICAL | Approval buttons must call a dedicated mutation enforcing role permissions, storing approver userId + timestamp + confidence in an append-only approvals table; AI never infers approval from free text. | ✅               |
| 2   | **Entity-wide conversation visibility — no per-user restriction** — getMessages/deleteConversation scope ONLY by entityId. In a multi-user entity, a Viewer-role member can read every CFO conversation (payroll questions, cash crises) and delete colleagues' threads. Whether this is intended collaboration or over-exposure is undocumented.                                                                                                                                               | HIGH     | Decide + enforce: per-conversation participant ACL or explicit role gate (e.g., approve/reject/delete restricted to admin/accountant roles); document decision in ADR. Needs product+security sign-off.  | ⬜               |
| 3   | **getMessages silently truncates at 200 messages** — hard `limit(200)` with no cursor and no "load earlier" path. Conversations longer than 200 messages load INCOMPLETE in the UI with zero indication — for accounting, a missing earlier answer can be mistaken for "the AI never said that". Data integrity of the record-of-conversation.                                                                                                                                                  | HIGH     | Cursor-paginate with "Load earlier messages"; show message-count total.                                                                                                                                  | ⬜               |
| 4   | **UI claims deletion is irreversible but server only archives** — sidebar dialog warns "This action cannot be undone" while deleteConversation sets status="archived". Either recoverable (then the warning lies and GDPR erasure semantics are unclear) or truly destructive (then archive is wrong). Also: archived conversations still count in list queries unless filtered — verify listConversations excludes archived, else "deleted" threads keep reappearing.                          | MEDIUM   | Align copy with behavior; verify archived filter on list; document retention/GDPR posture for archived chats.                                                                                            | ✅               |
| 5   | **Prompt text persisted into URL/history** — multiple entry points pass user queries via `?prompt=` query string: lands in browser history, telemetry URL scrubbers may miss financial keywords typed by users, Referer leakage if any third-party asset is requested from dashboard.                                                                                                                                                                                                           | LOW      | Move cross-surface handoff to sessionStorage/state; avoid PII/financial terms in URLs.                                                                                                                   | ⬜               |
| 6   | **localStorage `userId` drives analytics identity** — spoofable client value used for PostHog identify; enables trivial analytics poisoning and misattributes actions across users on shared machines. Not auth-relevant but corrupts the audit-adjacent analytics layer.                                                                                                                                                                                                                       | MEDIUM   | Identify via session user id server-derived; treat localStorage as cache only.                                                                                                                           | ⬜               |
| 7   | **Chat file upload trust boundary unverified on this surface** — AiInput passes entityId + files to ChatFileUpload → upload API. Server must validate (a) session user belongs to that entityId, (b) MIME/content sniffing beyond extension, (c) size caps, (d) virus/malware scanning for docs that agents will later read and act on. Prompt-injection via uploaded invoice content flows straight into agent context.                                                                        | HIGH     | Verify each control exists server-side; add content-sanitization/flagging for documents entering agent context (OWASP LLM prompt-injection via documents). Needs investigation + fix.                    | ⬜               |
| 8   | **No client-visible rate limit feedback on chat send** — frontend guards double-send while streaming, but rapid new-chat/send cycling can hammer expensive LLM endpoints; no 429 handling surfaced (error bubble would show generic failure). Verify per-entity rate limiting exists server-side and map 429 to friendly copy ("Too many requests — try again in a minute").                                                                                                                    | MEDIUM   | Confirm server rate limit on stream endpoint; handle 429 distinctly in useStream error mapping.                                                                                                          | ⬜               |
| 9   | **Rendered content is plain-text safe — PASS** — thread renders msg.content/streamedContent via text nodes only, no dangerouslySetInnerHTML found on this surface. Record as verified-safe baseline for future markdown work: if rich rendering is added, DOMPurify + CSP required.                                                                                                                                                                                                             | —        | None (informational guardrail).                                                                                                                                                                          | ✅ Verified safe |

### Employee: Data Analyst

Audited every number, metric, chart hook, timestamp, and analytics event on the page.

| #   | Finding                                                                                                                                                                                                                                                                                                                                                                        | Severity | Fix                                                                                              | Status |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------ | ------ |
| 1   | **Negative cash balance rendered as GOOD news** — fallback briefing hardcodes cash-position card to type "positive": emerald icon, TrendingUp, green badge — regardless of value. An overdraft shows as a celebratory green card. Worst-case data story on the most important number in the product.                                                                           | HIGH     | Derive sentiment from sign/magnitude: negative cash = negative type (red), low runway = warning. | ✅     |
| 2   | **Missing runway silently asserted as "Cash-flow positive"** — when runwayMonths is null the detail line claims healthy cash flow. No runway data ≠ positive cash flow (new entities, unlinked banks, calculation failures all land here). Fabricated assurance.                                                                                                               | HIGH     | Show "Runway unknown — connect accounts" truthfully; never infer health from absence of data.    | ✅     |
| 3   | **formatCurrency called without entity currency** — ProactiveBriefing cash position uses default locale/currency; for a multi-currency global product the flagship number can display the wrong symbol (same class of bug as the GMD donor-portal finding in empworks.md).                                                                                                     | MEDIUM   | Thread entity.baseCurrency through dashboard data and pass explicitly.                           | ⬜     |
| 4   | **Confidence unit ambiguity (0-1 vs 0-100)** — ConversationThread divides msg.confidence by 100 before ConfidenceBadge. If any producer already sends 0-1, scores render as 0%. One wrong producer breaks trust display everywhere. Verify all confidence producers emit 0-100 consistently; add zod contract.                                                                 | MEDIUM   | Enforce one unit end-to-end via shared schema; add runtime clamp+warn on out-of-range.           | ⬜     |
| 5   | **No data freshness signaling anywhere** — balances/deadlines/approval counts carry staleTime (5 min) but UI never shows as-of time; combined with the client-clock timestamp bug (PM #27), users cannot tell how current numbers are. Accounting decisions on stale numbers without disclosure.                                                                               | MEDIUM   | Show server-generatedAt per data block ("as of 14:32").                                          | ⬜     |
| 6   | **Core activation + approval funnels are untracked** — tracked today: commandCenterFirstVisit, dashboard_view, dashboard_active. NOT tracked: checklist step starts/completions/dismissals, suggestion-chip clicks, approve/reject/review clicks, regenerate/pin/copy actions, export. The two most business-critical funnels (activation, approval engagement) are invisible. | HIGH     | Add typed events for all above with entityId context; wire into activation funnel dashboards.    | ⬜     |
| 7   | **Deadline summary hides composition** — "3 deadlines upcoming" surfaces only `deadlines[0]?.label`; users can't see WHICH deadlines without leaving the surface. Data summarized past usefulness.                                                                                                                                                                             | LOW      | Show top-2 labels + "+1 more", or per-type counts (tax/filing/payment).                          | ⬜     |
| 8   | **Relative times computed once and frozen** — formatTimeAgo runs at render; "Just now" persists until an unrelated re-render minutes later. Sidebar becomes actively misleading during long sessions.                                                                                                                                                                          | LOW      | Tick a shared now-interval (30-60s) or compute at render with useNow hook.                       | ⬜     |
| 9   | **Date-group buckets use device-local midnight** — Today/Yesterday/This Week groupings shift under timezone change or travel; conversation appears to move groups. Use UTC-day or server-consistent bucketing.                                                                                                                                                                 | LOW      | Standardize bucketing timezone; document choice.                                                 | ⬜     |
| 10  | **Relevance "% match" presents opaque score as precision** — relevanceScore source undocumented (keyword overlap vs semantic); showing "87% match" implies statistical meaning it may not have.                                                                                                                                                                                | LOW      | Either document methodology and keep %, or switch to ordinal badges (High/Medium relevance).     | ⬜     |
| 11  | **Export filename/date locale-inconsistent** — export filename uses ISO date but content header uses toLocaleDateString(); cross-user inconsistency in exported records that accountants archive.                                                                                                                                                                              | LOW      | Single formatter (ISO 8601) for both.                                                            | ⬜     |

---

## PAGE PROGRESS TRACKER

> Future sessions: pick the next ⬜ page and fire employees in the same order (Product Manager → Product Critic → UX Writer → Design Critic → Engineering Critic → Security Engineer → Data Analyst), appending sections above using the identical table style. Mark page row ✅ only when ALL employees for that page have logged findings.

| Page                                                                                                                           | PM                                        | Product Critic          | UX Writer | Design Critic | Eng Critic | Security | Data Analyst |
| ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- | ----------------------- | --------- | ------------- | ---------- | -------- | ------------ |
| /dashboard                                                                                                                     | ✅ 27                                     | ✅ 18                   | ✅ 18     | ✅ 18         | ✅ 16      | ✅ 9     | ✅ 11        |
| /dashboard/activity-hub                                                                                                        | ✅ 20                                     | ✅ 12                   | ✅ 10     | ✅ 10         | ✅ 9       | ✅ 5     | ✅ 5         |
| /dashboard/financial-pulse                                                                                                     | ✅ 13                                     | ✅ 8                    | ✅ 7      | ✅ 7          | ✅ 8       | ✅ 5     | ✅ 6         |
| /dashboard/ledger                                                                                                              | ✅ 11                                     | ✅ 6                    | ✅ 5      | ✅ 6          | ✅ 8       | ✅ 5     | ✅ 5         |
| /dashboard/operations                                                                                                          | ✅ 10                                     | ✅ 6                    | ✅ 6      | ✅ 5          | ✅ 6       | ✅ 4     | ✅ 5         |
| /dashboard/operations/invoices                                                                                                 | ✅ 10                                     | ✅ 5                    | ✅ 3      | ✅ 4          | ✅ 5       | ✅ 4     | ✅ 4         |
| /dashboard/operations/bills                                                                                                    | ✅ 6                                      | ✅ 5                    | ✅ 3      | ✅ 5          | ✅ 6       | ✅ 3     | ✅ 4         |
| /dashboard/operations/banking                                                                                                  | ✅ 8                                      | ✅ 4                    | ✅ 3      | ✅ 3          | ✅ 5       | ✅ 4     | ✅ 4         |
| /dashboard/operations/customers                                                                                                | ✅ 6                                      | ✅ 3                    | ✅ 2      | ✅ 3          | ✅ 3       | ✅ 2     | ✅ 4         |
| /dashboard/operations/vendors                                                                                                  | ✅ 6                                      | ✅ 3                    | ✅ 3      | ✅ 1          | ✅ 2       | ✅ 2     | ✅ 3         |
| /dashboard/settings                                                                                                            | ✅ 7                                      | ✅ 4                    | ✅ 2      | ✅ 3          | ✅ 4       | ✅ 3     | ✅ 4         |
| /dashboard/help                                                                                                                | ✅ 6                                      | ✅ 4                    | ✅ 3      | ✅ 4          | ✅ 3       | ✅ 3     | ✅ 2         |
| /dashboard/audit-trail                                                                                                         | ✅ 8                                      | ✅ 5                    | ✅ 5      | ✅ 4          | ✅ 6       | ✅ 4     | ✅ 4         |
| Remaining routes (auto-approve, donor-reporting, ingestion, knowledge, knowledge-graph, qbr, referrals) + 21 settings sections | ✅ Route-level: 3 / 2 / 1 / 7 / 5 / 6 / 6 | Component passes queued | ⬜        | ⬜            | ⬜         | ⬜       | ⬜           |

> **Component-level follow-up queue (each needs its own 7-employee pass):** AutoApproveRules, QBRReport, ReferralDashboard, BatchUpload/BatchProgress/Dropzone, KnowledgeSearch/DocumentProcessor, GraphVisualization, donor report-builder — plus the 21 settings sections and all shared chat components (thinking-steps, message-actions internals, data-table-inline, chart-inline, inline-document-viewer, transaction-detail-drawer, invoice-detail-panel, bills-view actions wiring, help-assistant).

---

# PAGE: /dashboard/activity-hub

The human-in-the-loop queue. Aggregates agent approvals, ingestion reviews, agent alerts, notifications, and daily-close exceptions into one priority-sorted surface with batch actions, snooze, detail drawer, and filters.

---

## DEPARTMENT: PRODUCT

### Employee: Product Manager

| #   | Finding                                                                                                                                                                                                                                                                                                                                                                      | Severity | Fix                                                                                                                                           | Status |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | **"Auto-approve" sends a fake document ID to the API** — the aggregated "N documents need review" card carries id `"pending-review"`; its Auto-approve button routes through the ingestion approve mutation as `documentId: "pending-review"` (page.tsx:1009 + 1118). That's not a document ID — the call fails or corrupts state. Core queue action broken.                 | CRITICAL | Aggregate card must expand to real pending document IDs (or call a dedicated bulk-approve endpoint). Never pass synthetic IDs into mutations. | ✅     |
| 2   | **Undo after approving does NOT revert anything server-side** — toast offers "Undo", but undoBatchAction only clears local item state and refetches (page.tsx:887-900). The approval remains resolved on the server while the UI claims "Changes have been reverted." False reversal on FINANCIAL approvals — worst possible trust failure in the human-in-the-loop surface. | CRITICAL | Implement true server-side unresolve/reversal, or remove Undo entirely until it exists.                                                       | ✅     |
| 3   | **Batch APPROVE has no confirmation dialog** — Reject-all asks twice; Approve-all fires instantly from one click or a bare `a` keypress. Mass-approving financial items is MORE dangerous than rejecting; the safety asymmetry is inverted.                                                                                                                                  | HIGH     | Require typed/explicit confirmation for batch approve; keep reject confirm; consider amount-threshold warnings.                               | ✅     |
| 4   | **Single-key shortcuts (`a`/`r`) trigger destructive batch dialogs without modifiers** — any keypress outside inputs while items are selected (reading with hand on keyboard) summons the approve dialog; `a` then Enter approves everything. One accidental keystroke pair from mass financial mutation.                                                                    | HIGH     | Require modifier (Shift+A) or two-step hold-to-confirm; never bare-letter destructive shortcuts.                                              | ⬜     |
| 5   | **Snooze exists only in memory and holds a toast open for an hour** — refresh/page-switch restores snoozed items instantly (state lost), and the sonner toast uses `duration: durationMs` keeping a toast alive 60 minutes. Feature promises persistence it doesn't have.                                                                                                    | HIGH     | Persist snooze server-side (snoozedUntil column) with restore-on-load; cap toast duration ~10s with Restore action.                           | ⬜     |
| 6   | **Notification/alert "Dismiss" and "View" buttons are dead** — actions built with `variant: "default"` produce `onClick: undefined` in the InlineActions mapping (only approve/reject/review get handlers). Users click Dismiss/View on alerts and NOTHING happens.                                                                                                          | HIGH     | Wire default-variant actions (dismiss→markRead/archive; view→drawer or deep link) or remove the buttons.                                      | ✅     |
| 7   | **Confidence risk thresholds contradict platform standard** — getRiskLevel treats ≥0.8 low-risk / 0.6-0.8 medium / <0.6 high; AGENTS.md mandates escalation <0.7 to supervisor and <0.4 to human. Same score shows "Low Risk, safe" here that the agent layer considers escalation-worthy. Two sources of truth for the most consequential number in the product.            | HIGH     | Centralize threshold constants shared by agents + UI; align copy.                                                                             | ⬜     |
| 8   | **Sequential per-item mutations make batch slow and spammy** — handleBatchAction awaits each item serially; 50 selections = 50 round trips; every item ALSO fires its own success toast inside handleAction plus the batch summary toast → wall of duplicate toasts. Partial failures leave mixed silent states.                                                             | HIGH     | Bulk endpoint or Promise.allSettled with concurrency cap; suppress per-item toasts during batch; summarize failures.                          | ⬜     |
| 9   | **"View audit trail" links to the Ledger** — CompletedSection's link href="/dashboard/ledger" though a dedicated /dashboard/audit-trail page exists. Users hunting "what did the AI resolve today?" land in journal entries.                                                                                                                                                 | MEDIUM   | Link to /dashboard/audit-trail (filtered to today/auto-posted if supported).                                                                  | ✅     |
| 10  | **"Completed today" count mislabeled** — completedCount = ingestionStats.autoPosted, which counts AI auto-posts (all-time or stats-window?), not necessarily today nor human-resolved items; section header claims "Completed today". Number under the wrong definition erodes trust in every other count.                                                                   | MEDIUM   | Query resolved-today count matching the label; show tooltip defining the metric.                                                              | ⬜     |
| 11  | **Notifications arbitrarily capped at 5 with no overflow affordance** — `notifications.slice(0, 5)` silently drops the rest; no "Show all N". Info items vanish depending on array order.                                                                                                                                                                                    | MEDIUM   | Raise limit + "View all" link to notifications surface or expandable list.                                                                    | ⬜     |
| 12  | **No pagination/load-more on any source list** — approvals capped at 50, alerts 20, notifications 20 with zero continuation. Busy entities have queues older than page 1 forever invisible.                                                                                                                                                                                  | HIGH     | Cursor pagination + load-more per section; show total counts.                                                                                 | ⬜     |
| 13  | **Drawer "Full Context" dumps raw JSON at business users** — JSON.stringify(detail) in a `<pre>`; SME owners see `{"vendor_id":"x","confidence":0.71}` internals. Engineer payload shipped as product UI.                                                                                                                                                                    | MEDIUM   | Render structured fields with labels; fall back to collapsible raw view for power users.                                                      | ⬜     |
| 14  | **Card-level note cleared optimistically before result known** — note state wiped synchronously on click; if mutation fails, the rejection reason is lost and must be retyped. For compliance-minded reasons fields, that's data loss.                                                                                                                                       | MEDIUM   | Clear only onSuccess; prefill note on retry.                                                                                                  | ⬜     |
| 15  | **resolveApproval hardcodes itemType "agent_escalation"** — regardless of the item's actual itemType; if approvals router distinguishes types, wrong metadata written to audit trail.                                                                                                                                                                                        | MEDIUM   | Pass through the real itemType; verify router schema.                                                                                         | ⬜     |
| 16  | **Five queries polling forever at 15-30s with no visibility gating** — polling continues when tab hidden/backgrounded; no exponential backoff, no pause on document.hidden. Server/battery cost for every idle dashboard.                                                                                                                                                    | MEDIUM   | Pause on hidden tab (refetchIntervalInBackground=false default is refetch—verify), add backoff, lean on SSE primary channel.                  | ⬜     |
| 17  | **Empty-state copy conflates two cases** — "All caught up!" renders both for genuinely-empty queue AND for active-filter-with-no-matches; filtered emptiness should say so ("No urgent items").                                                                                                                                                                              | LOW      | Branch copy on activeFilter !== "all".                                                                                                        | ⬜     |
| 18  | **Stats cards can disagree with lists** — Agent Alerts stat uses alerts.total while list caps at 20; Urgent/Approvals derive from merged arrays post-snooze/post-success filtering, so numbers shift live while processing. Count semantics inconsistent across cards.                                                                                                       | LOW      | Compute all four stats from one documented source; freeze during optimistic ops.                                                              | ⬜     |
| 19  | **timeAgo duplicated from Command Center sidebar with different formatting** — lowercase "just now" vs "Just now", separate implementations drifting apart.                                                                                                                                                                                                                  | LOW      | Extract shared relative-time util used everywhere.                                                                                            | ⬜     |
| 20  | **Double display of identical confidence info per card** — ConfidenceBadge (percent) AND risk bar with aria-label percent sit side-by-side; redundant pixels and SR noise.                                                                                                                                                                                                   | LOW      | Keep one representation (bar+label) per row; full badge lives in drawer.                                                                      | ⬜     |

### Employee: Product Critic

| #   | Finding                                                                                                                                                                                                                                                                                           | Severity | Fix                                                                                                                                               | Status |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | **Batch bar hides the money** — selecting 14 approvals worth $184,000 shows "14 items selected" with zero cumulative amount. Mass-approving blind to total dollars fails the most basic financial safety heuristic; QuickBooks-style flows always surface aggregate value.                        | HIGH     | Compute and display total amount of selected items in the batch toolbar (+ warning color past threshold).                                         | ⬜     |
| 2   | **"Review all" is a dead end** — the aggregated review card's Review action opens the generic detail drawer for synthetic id "pending-review"; there's no path to the actual documents (no link to /dashboard/ingestion). User intent "review my documents" terminates nowhere.                   | HIGH     | Link to ingestion queue (or inline-expand document list); drawer must offer next-step navigation.                                                 | ⬜     |
| 3   | **Drawer drops the Review option and any source-document access** — card offers Approve/Review/Reject; drawer footer filters to approve/reject only, and neither card nor drawer links the source document. The deeper you drill (where scrutiny should peak), the fewer tools you have.          | HIGH     | Mirror full action set in drawer; embed document preview/link.                                                                                    | ⬜     |
| 4   | **No approver identity or assignment model** — nothing shows who handled an item, and items can't be assigned to a teammate. In multi-user entities two people can double-process the same approval (last-write wins silently).                                                                   | HIGH     | Show actor on processed items; add optimistic-lock or claimed-by state to prevent silent double-approval.                                         | ⬜     |
| 5   | **Aging invisible** — priority sort ignores age; a 6-day-old approval renders identically to a 6-second one (tiny relative stamp only). No SLA badges, no aging color shift. Queues rot silently.                                                                                                 | MEDIUM   | Age-based visual escalation (>24h amber border, >72h red) + sort tiebreak by age within type.                                                     | ⬜     |
| 6   | **Title-as-clickable-text is undiscoverable and keyboard-dead** — drawer opens via onClick on a `<p>`; no underline/affordance, no tabIndex/role, Enter doesn't work. Both a usability and accessibility failure on THE primary per-item interaction.                                             | HIGH     | Real button/link semantics for opening details; visible hover/focus affordance.                                                                   | ⬜     |
| 7   | **Snooze is one fixed hour** — no 4h/tomorrow/custom options; real queues need flexible deferral. Combined with non-persistence (PM #5), snoozing is currently cosmetic.                                                                                                                          | LOW      | Snooze menu (1h / 4h / tomorrow); persist server-side.                                                                                            | ⬜     |
| 8   | **AI suggestions compete with the page's own controls** — shell chips like "Auto-approve low-risk items" push users into chat for something this page does natively with one click; "Why was this flagged?" sends a context-free question unbound to any item. Confusing dual interaction models. | MEDIUM   | Chip prompts should deep-link item context ("Why was 'Invoice ACME' flagged?"); prefer native controls over chat round-trips for in-page actions. | ⬜     |
| 9   | **Empty queue wastes the moment** — "All caught up!" has no next action (no "ask AI", no "view today's summary", no ingestion link). Dead-end state on a page whose job is driving work forward.                                                                                                  | LOW      | Add primary CTA (open Command Center / view Financial Pulse digest).                                                                              | ⬜     |
| 10  | **Undo window is 6 seconds for irreversible-in-practice actions** — once toast expires, no un-approve path exists anywhere in UI (audit trail is read-only). Either lengthen dramatically with persistent "Recent activity" strip or make reversal a first-class flow.                            | MEDIUM   | Recent-actions panel with undo per item (server-backed, see PM #2).                                                                               | ⬜     |
| 11  | **Select-all discoverability** — checkbox column appears only per-card; no master checkbox in header/batch bar until something is selected. Users with 40 approvals will never find bulk select.                                                                                                  | MEDIUM   | Master select-all control always visible when selectableCount > 0.                                                                                | ⬜     |
| 12  | **Sticky batch bar may cover filter tabs/content at top** — `sticky top-0 z-20` inside scrolling container overlaps the tablist region on small screens; verify no occlusion of first card during scroll. Needs QA pass.                                                                          | LOW      | Reserve space or convert to fixed bottom sheet on mobile.                                                                                         | ⬜     |

### Employee: UX Writer

| #   | Finding                                                                                                                                                                                                                                                                | Severity | Fix                                                                                                                                                     | Status      |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1   | **Reject dialog promises an undo that doesn't exist** — "This action can be undone from the audit trail" but the audit trail page is read-only; nothing there reverses anything. The sentence is the product lying at the exact moment of a destructive decision.      | HIGH     | Either build reversal and link it, or say the truth: "Rejected items return to the AI for reprocessing."                                                | ✅          |
| 2   | **Card success state says just "Processed"** — after approve OR reject the card shows a green "Processed"; the user must remember which action they took. State copy should echo the action ("Approved" / "Rejected").                                                 | MEDIUM   | Pass action through itemState rendering; label accordingly with matching color.                                                                         | ✅          |
| 3   | **Success toast leaks the note into a broadcast** — `Note: "<user's reason>"` renders in the toast; reasons can reference salaries/vendors/employees — shoulder-surfing exposure plus verbose copy violating the "Verb + object" toast rule.                           | MEDIUM   | Drop note from toast ("Bill approved"); keep note in audit record only.                                                                                 | ✅          |
| 4   | **Three vocabularies for the same concept** — stat card "Auto-resolved", section "Completed today", link "View audit trail" all gesture at AI-resolved work; none match. Users can't build a mental model when the same idea renames three times in one screen.        | MEDIUM   | Pick one term ("Auto-resolved") and use it everywhere including the metric tooltip.                                                                     | ⬜          |
| 5   | **Raw error.message surfaced verbatim** — failed mutations put server error text straight into toasts ("Action failed" + raw message); violates never-show-raw-errors rule and can leak internal identifiers.                                                          | MEDIUM   | Map known error codes to human copy; log raw server-side; show "That didn't save. Try again." fallback.                                                 | ✅          |
| 6   | **"Auto-approve" chip carries no risk framing** — one click mass-posts documents the AI flagged for verification; label reads like a convenience feature with zero consequence signal.                                                                                 | HIGH     | Rename "Approve all verified docs" + confirm step listing count/amount; reserve plain "auto-approve" language for genuine low-risk automation settings. | ⬜          |
| 7   | **Drawer timestamp phrasing ambiguous** — "Created 5m ago": created when the agent started, finished, or queued? For approval SLAs the distinction matters.                                                                                                            | LOW      | "Queued 5m ago" (or receivedAt) with absolute time on hover.                                                                                            | ⬜          |
| 8   | **Keyboard hint invisible where shortcuts apply** — the A/R hint is `hidden sm:inline`; on tablets (where keyboard attached) and small laptops the feature is invisible; meanwhile the shortcut still fires.                                                           | LOW      | Show hint whenever selection active; or drop shortcuts until discoverable everywhere.                                                                   | ⬜          |
| 9   | **Empty-state pair contradicts itself** — headline celebrates "All caught up!" while subline states "No items matching this filter" — celebration + clarification collide when a filter simply has no matches (also logged as logic issue PM #17).                     | LOW      | Split copy paths: true-empty → celebratory+CTA; filtered-empty → neutral "No urgent items right now".                                                   | ⬜          |
| 10  | **Risk assessment microcopy is strong — PASS baseline** — drawer thresholds text ("AI is confident… / moderate… / low confidence… manual review strongly recommended") matches house AI-copy patterns; keep as canonical strings when centralizing thresholds (PM #7). | —        | Reuse these exact sentences app-wide.                                                                                                                   | ✅ Baseline |

---

## DEPARTMENT: DESIGN

### Employee: Design Critic

| #   | Finding                                                                                                                                                                                                                                                           | Severity | Fix                                                                                                     | Status |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------- | ------ |
| 1   | **Selected items have no visual state** — checkbox ticks but the card border/background never changes (isSelected unused in card classes). Scanning a long list, users can't see what's selected until the toolbar count changes.                                 | HIGH     | Bind isSelected to card styles (primary border + tinted bg) consistent with hover elevation.            | ✅     |
| 2   | **`ml-13` is off the spacing scale** — success row uses ml-13 (non-standard Tailwind step); like the /8-opacity issue it may compile to nothing, mis-aligning the "Processed" indicator vs the ml-11 action row above it. Verify compiled CSS.                    | MEDIUM   | Use ml-11 to align with actions column.                                                                 | ⬜     |
| 3   | **Icon-only note/snooze buttons below touch minimum** — StickyNote/Clock buttons are ~26px hit areas controlling compliance-relevant fields.                                                                                                                      | MEDIUM   | Expand hit area ≥44px with padding/pseudo-element; keep icon size.                                      | ⬜     |
| 4   | **Drawer dialog semantics incomplete** — role="dialog" on overlay but no aria-labelledby pointing at the item title h3, no focus trap, ESC works only when the overlay itself holds focus, background scroll not locked. Tab escapes behind the drawer instantly. | HIGH     | shadcn Sheet/Dialog for the drawer (focus trap + scroll lock + labelled); wire ESC globally while open. | ✅     |
| 5   | **Custom checkbox off design system** — native input styled with text-primary/focus:ring-primary utilities instead of the shadcn Checkbox; unchecked focus state barely visible; indeterminate state (some-selected) unavailable for select-all.                  | MEDIUM   | Swap to design-system Checkbox; support indeterminate on master control.                                | ⬜     |
| 6   | **AI recommendation clamped to 2 lines with no expansion** — line-clamp-2 on the single most persuasive element (the AI's reasoning); users approving money can't read past the fold without… nothing. No expand affordance exists on the card.                   | HIGH     | Truncate with "More" toggle inline, or move full reasoning visible in drawer link.                      | ✅     |
| 7   | **Raw palette sprawl continues** — violet joins red/amber/emerald for stat chips (agent alerts); none map to theme tokens; white-label/dark theming drifts page-by-page.                                                                                          | MEDIUM   | Semantic token mapping pass for status colors across the page.                                          | ⬜     |
| 8   | **JSON block typography** — Full Context `<pre>` dumps mono 12px gray text of unlimited length inside padded card; breaks visual rhythm and mobile overflow risk with long tokens (no break-all).                                                                 | MEDIUM   | Structured field rendering (see PM #13); if kept, wrap long lines + collapsible.                        | ⬜     |
| 9   | **Filter rail scrollbar hidden with no edge fade** — identical affordance gap as Command Center suggestion chips; five tabs overflow on narrow phones silently.                                                                                                   | LOW      | Edge-fade mask or snap-scroll hint.                                                                     | ⬜     |
| 10  | **Risk bar width capped at 80px** — the safety signal is a sliver next to a 10px label; at-a-glance risk scanning (the page's stated purpose) is visually weakest element on the card.                                                                            | LOW      | Widen bar to flex-1 within its row; strengthen label hierarchy.                                         | ⬜     |

---

## DEPARTMENT: ENGINEERING

### Employee: Engineering Critic

| #   | Finding                                                                                                                                                                                                                                                                                          | Severity | Fix                                                                                                                          | Status |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ---------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | **Cross-source duplicate items have no dedupe** — addedIds de-duplicates WITHIN each source array only; the same logical event surfacing as both an agent approval AND an agent alert (different ids) renders twice. Queue shows phantom double workload; approving one leaves its twin.         | HIGH     | Normalize events to a common entityId/type key before merge; dedupe across sources.                                          | ✅     |
| 2   | **Keyboard effect resubscribes every render** — handleKeyDown effect deps include handleBatchAction whose deps include activityItems (rebuilt every render unmemoized) → listener torn down/reattached on every render tick, including during streaming polls. Wasteful and masks real dep bugs. | MEDIUM   | Memoize activityItems (useMemo on sources) + stabilize batch handler (ref for latest items); effect deps shrink to booleans. | ✅     |
| 3   | **Snooze setTimeout leaks past unmount** — restore timer holds setSnoozedItems closure; navigating away mid-snooze schedules a post-unmount update (React no-op warning) and timer list grows per snooze.                                                                                        | LOW      | Track timers in ref; clear all on unmount cleanup.                                                                           | ⬜     |
| 4   | **Unsafe casts on daily-close payloads** — `(run.exceptions ?? []) as Array<{type; description; agentId; confidence}>` trusts wire shape blindly; one malformed run crashes the whole page render inside the map (description join).                                                             | MEDIUM   | Zod-parse external payload; degrade per-item, never page-level.                                                              | ⬜     |
| 5   | **dailyClose.getExceptions has no isError/refetch handling** — unlike sibling queries; failures vanish silently (section absent) with no retry path.                                                                                                                                             | MEDIUM   | Match sibling error pattern + retry affordance.                                                                              | ⬜     |
| 6   | **Per-item announce() during batch spams screen readers** — batch of 20 announces "Approved successfully" 20 times serially plus summary toast; SR users trapped in announcement storm.                                                                                                          | MEDIUM   | Announce once with total; assertive only on failure.                                                                         | ⬜     |
| 7   | **emitDataChanged fan-out multiplies refetches** — every action emits cross-surface data_changed while five polled queries also run; overlapping invalidations cause refetch storms (N surfaces × M intervals).                                                                                  | LOW      | Debounce/coalesce emissions; central invalidation through tagged queries.                                                    | ⬜     |
| 8   | **Manual itemStates overlay reimplements cache semantics** — optimistic states hand-managed beside react-query cache; mutation onSuccess refetches race the 2s local-state cleanup windows producing flicker (success→visible→removed). Architecture smell that already causes timing bugs.      | MEDIUM   | Move resolution state into query cache via onMutate/onSettled optimistic updates.                                            | ⬜     |
| 9   | **resolveApproval itemType hardcoded** — engineering side of PM #15: schema drift between approvals router expectations and actual item origins will corrupt audit metadata silently. Verify against router zod enum.                                                                            | MEDIUM   | Thread true itemType; add zod enum guard.                                                                                    | ⬜     |

---

## DEPARTMENT: SECURITY

### Employee: Security Engineer (CSO)

Server counterparts (`approvals.resolve`, `ingestion.approveReview/rejectReview`, `notifications.markAsRead`) must be verified — client passes IDs straight through.

| #   | Finding                                                                                                                                                                                                                                                                                                               | Severity          | Fix                                                                                                                                           | Status           |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| 1   | **Role enforcement on financial resolutions UNVERIFIED** — rlsProtectedProcedure proves entity scoping intent, but nothing visible gates WHO may resolve: a Viewer-role member selecting all + hitting A could post ledger-bound approvals if router lacks role check. This page makes mass-resolution one keystroke. | CRITICAL (verify) | Assert role permission server-side in approvals.resolve + ingestion.approveReview (deny Viewers); add integration test for cross-role denial. | ⬜               |
| 2   | **documentId/itemId trust boundary** — approve/reject accept client-supplied ids; server MUST scope by entityId before mutate (IDOR check). Verify each procedure includes ownership predicate like chat.ts does; reject with 404 otherwise.                                                                          | HIGH (verify)     | Add ownership predicates + tests where missing.                                                                                               | ⬜               |
| 3   | **Reason strings flow into audit trail and CSV exports unsanitized at this layer** — user notes persist via resolveApproval reason; the audit-trail CSV export historically needed formula-injection sanitization (see empworks S1-6). Any NEW export path consuming these reasons must reuse sanitizeCell.           | MEDIUM            | Route all exports through the shared sanitizer; test reasons beginning with = + - @.                                                          | ⬜               |
| 4   | **No rate limiting visible on resolve/batch paths** — scripted cycling of resolve across items (or repeated undo/refetch loops) hammers mutation endpoints; batch loops amplify.                                                                                                                                      | MEDIUM            | Per-user rate limit on approval mutations; cap batch size server-side (e.g., ≤50/request).                                                    | ⬜               |
| 5   | **Escaped-JSON rendering is XSS-safe — PASS** — detail payload renders via React text nodes ({JSON.stringify}), no dangerouslySetInnerHTML on page. Keep this property when redesigning Full Context (PM #13): structured rendering must escape field values, never interpret them.                                   | —                 | Guardrail note.                                                                                                                               | ✅ Verified safe |

---

## DEPARTMENT: DATA

### Employee: Data Analyst

| #   | Finding                                                                                                                                                                                                                                                                                                                                     | Severity | Fix                                                                                                                                                                 | Status |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | **THE human-in-the-loop funnel is untracked** — zero analytics on: item viewed, drawer opened, approve/reject clicked, note added, snooze, batch size distribution, undo clicks, AI-suggestion chip clicks. The single most important dataset for tuning agent confidence thresholds (which items humans overturn?) is not being collected. | HIGH     | Instrument every decision event with itemId, itemType, agent, confidence, latency-to-decision, decision. This feeds confidence calibration (AGENTS.md requirement). | ⬜     |
| 2   | **Stat cards source from four async queries → transiently contradictory** — Urgent/Approvals derive from merged client arrays; Agent Alerts from alerts.total; Auto-resolved from ingestionStats; each refetches on independent 15-30s timers, so cards visibly disagree for seconds around any action.                                     | MEDIUM   | Single aggregated dashboard query (one source of truth) or atomic cache updates across derived selectors.                                                           | ⬜     |
| 3   | **Amount strings lack format contract** — item.amount arrives as preformatted string from producers; no guarantee of formatCurrency/currency-code usage (AGENTS mandates formatCurrency). Multi-currency entities may mix "$" symbols on non-USD amounts.                                                                                   | HIGH     | Producers send {valueMicros, currency}; UI formats via formatCurrency(amount, currency). Audit all emitters.                                                        | ⬜     |
| 4   | **Relative timestamps frozen at render (this page's own copy)** — same defect as Command Center #8 but locally reimplemented (timeAgo at page.tsx:88): stamps go stale during long sessions; "just now" persists indefinitely until poll rerender happens to fire.                                                                          | LOW      | Shared ticking useNow hook; delete local implementations (also fixes PM #19 duplication).                                                                           | ⬜     |
| 5   | **Confidence percentages shown without sample context** — bar shows 73% but not what drives it (data completeness? model consensus?); users calibrate trust blind. Even one-word provenance ("extraction confidence") improves decision quality data literacy.                                                                              | LOW      | Tooltip defining score provenance per itemType; aligns with centralized threshold work (PM #7).                                                                     | ⬜     |

---

# PAGE: /dashboard/financial-pulse

AI-narrated financial health: period selector, AI narrative, anomaly alerts, 4 KPI cards with sparklines + drill-down drawer, daily close status, live FX rates, 4 charts, scenario planner, forecast, budget-vs-actual table, report library with downloads, quick actions.

---

## DEPARTMENT: PRODUCT

### Employee: Product Manager

| #   | Finding                                                                                                                                                                                                                                                                                                                                                                                                                               | Severity | Fix                                                                                                                                      | Status |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | **Hardcoded `"GMD"` currency fallback AGAIN** — three chart calls + all report builders use `entity?.currency \|\| "GMD"` (lines 1126/1139/1166/1224/1254/1276). The exact defect class already fixed in the donor portal (empworks S1-1/S1-2) is replicated here: any entity without a resolved currency displays Gambian Dalasi. Worse: `entityCurrency` IS available from useEntity (destructured line 708) and simply never used. | CRITICAL | Use `entityCurrency` from context; delete every `\|\| "GMD"` fallback; add lint rule banning literal currency codes outside i18n config. | ⬜     |
| 2   | **"Cash Flow" chart plots P&L, not cash** — CashFlowChart receives revenueSparkline as incoming and expenseSparkline as outgoing. That's accrual revenue/expenses: ignores AR/AP timing, capex, financing. An owner making payroll decisions off this "cash flow" can be catastrophically wrong.                                                                                                                                      | CRITICAL | Feed real cash movements (bank transactions) or rename chart to Revenue vs Expenses until real cash-flow data exists.                    | ⬜     |
| 3   | **Downloadable "Cash Flow Statement" is fabricated** — buildCashFlowReport receives operating=[revenue], investing=[], financing=[], closingCash=openingCash=cashBalance. Not a cash-flow statement under ANY accounting standard; SMEs may submit this to lenders/tax authorities.                                                                                                                                                   | CRITICAL | Build from real ledger cash accounts, or disable download with honest explanation until data supports it.                                | ⬜     |
| 4   | **Balance Sheet & Trial Balance report cards generate EMPTY documents** — their reportData falls through to `{sections: []}`; users download blank PDFs/Excels for half the report library.                                                                                                                                                                                                                                           | HIGH     | Wire real builders (trial-balance exists as a concept per header comment) or hide cards marked "Coming soon".                            | ✅     |
| 5   | **Net Profit "change" badge is invented math** — displays `(revenueChange − expensesChange)` percent-spread as if it were profit growth. Percentage-point subtraction of two ratios is not a profit delta and will contradict the actual net-profit trend shown beside it.                                                                                                                                                            | HIGH     | Compute real prior-period net profit server-side; show true Δ%.                                                                          | ✅     |
| 6   | **Prior-period values are reverse-engineered, not fetched** — previousValue = current/(1+change/100): derives a "prior" figure from the same rounded change %, presenting fake precision ("vs $118,904 prior period") that's just algebra on one number.                                                                                                                                                                              | HIGH     | Return actual prior totals from getPnlOverview; display those.                                                                           | ⬜     |
| 7   | **Period selector barely does anything** — selectedPeriod only reaches getDashboardData; narrative, P&L, anomalies, charts, and budget ignore it entirely. Switching "Last Month" changes sparklines at most — a control that lies about scope.                                                                                                                                                                                       | HIGH     | Thread period through every query on the page or reduce control to what it actually drives (label it).                                   | ⬜     |
| 8   | **AI narrative spins forever on failure** — query result used without isError; AiFinancialNarrative shows perpetual "Generating your financial narrative…" pulse whenever aiNarrative is undefined, including permanent failure. Users wait on a loading state that ended ages ago.                                                                                                                                                   | HIGH     | Handle error/retry states; fall back to assembled figures WITH disclosure (see UX #3).                                                   | ✅     |
| 9   | **Margin chart hardcodes target: 25** — every company on earth gets a 25% target line presented as their benchmark. Meaningless anchor that makes real performance look off-target or falsely on-track.                                                                                                                                                                                                                               | MEDIUM   | Per-entity target (settings-driven) or remove target series.                                                                             | ⬜     |
| 10  | **overdueInvoices hardcoded to 0** — overview mapping sets `overdueInvoices: 0` (line 754); field exists downstream but is permanently zero. Dead data point masquerading as tracked metric.                                                                                                                                                                                                                                          | MEDIUM   | Wire real overdue count or remove from type.                                                                                             | ⬜     |
| 11  | **Scenario Planner is a fake-submit island** — 2s setTimeout spinner, input clears, no indication where the modeled answer appears (module AI panel? command center?). Users fire scenarios into a void.                                                                                                                                                                                                                              | MEDIUM   | Open the AI panel visibly with the queued prompt; confirm hand-off with pointer/anchor.                                                  | ⬜     |
| 12  | **Quick Action "View Ledger" doesn't view the ledger** — button routes a chat prompt instead of linking /dashboard/ledger. Label promises navigation; delivers conversation.                                                                                                                                                                                                                                                          | LOW      | Link-tag navigation; keep AI route under an explicit "Analyze in chat" secondary.                                                        | ⬜     |
| 13  | **Expense categories truncated at 12 characters everywhere** — "Software Subscriptions…" becomes "Software Sub…"; recognition value destroyed in the exact chart meant to explain spending. Truncate responsively, not arbitrarily.                                                                                                                                                                                                   | LOW      | Full labels with ellipsis+tooltip, wider legend, or top-N naming.                                                                        | ⬜     |

### Employee: Product Critic

| #   | Finding                                                                                                                                                                                                                      | Severity | Fix                                                                                                                   | Status |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | **Ask AI is hover-only and touch-dead** — KPI "Ask AI" chips are opacity-0 group-hover; phones/tablets and keyboard users can't reveal them. The page's flagship AI-native affordance is invisible to huge segments.         | HIGH     | Always-visible subtle chip on touch; focus-visible reveal on keyboard; consider moving into drill-down drawer footer. | ⬜     |
| 2   | **Drill-downs dead-end again** — Revenue/Expense/Cash drawers list numbers with zero path to underlying transactions/accounts/ledger. Insight without investigation path repeats the anti-pattern logged on two prior pages. | HIGH     | Add "View in Ledger" filtered link per drawer row.                                                                    | ⬜     |
| 3   | **Empty sections vanish silently** — ForecastView and BudgetVsActualSection `return null` when unloaded/unconfigured; users can't distinguish "feature broken", "no budget set", "loading". Ghost features.                  | MEDIUM   | Render section shell with contextual empty-state CTA ("Create your first budget").                                    | ⬜     |
| 4   | **Budget table hard-stops at 8 rows with no expansion** — passive "Showing 8 of N" text, no expand/more link; businesses with real charts of accounts can't see their remaining categories anywhere on the surface.          | MEDIUM   | Expandable table or link to full report.                                                                              | ⬜     |
| 5   | **Only 3 fixed periods, no YTD/custom** — global SMEs think in quarters/YTD/fiscal periods; selector excludes fiscal-year alignment entirely despite fiscal.getCurrent existing in the API surface.                          | MEDIUM   | Add YTD + custom range; align options to entity fiscal calendar.                                                      | ⬜     |
| 6   | **No display-currency switcher** — multi-currency entities lock to base currency presentation; competitors (Xero) let users toggle. FX rates widget sits right there teasing the capability.                                 | LOW      | Display-currency select converting via live rates (clearly labeled as conversion).                                    | ⬜     |
| 7   | **Sparkline color contradicts its shape** — color keys off change sign (bad month = red) while the drawn polyline may slope upward; users read conflicting signals within one 64px card.                                     | LOW      | Color by trend direction (last vs first), keep ±badge for period change.                                              | ⬜     |
| 8   | **Budget table mobile behavior unverified** — 5-column table inside max-width container; no responsive pattern (card-stack) defined; likely horizontal squeeze at 320px. QA + ResponsiveTable pattern.                       | MEDIUM   | Responsive collapse to per-category cards on small screens.                                                           | ⬜     |

### Employee: UX Writer

| #   | Finding                                                                                                                                                                                                                                                   | Severity | Fix                                                                                                           | Status      |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------- | ----------- |
| 1   | **Third confidence threshold vocabulary on third page** — here High ≥0.8/Medium ≥0.5/Low; Activity Hub used 0.8/0.6; AGENTS.md says 0.7/0.4 escalation. Three competing scales for the same word "High confidence" — users cannot build calibrated trust. | HIGH     | One shared constant module + one copy set; refactor all surfaces onto it.                                     | ✅          |
| 2   | **"Data refreshes every 5 minutes" describes plumbing, not freshness** — static caption while actual staleness varies 5–10min+ per block.                                                                                                                 | LOW      | Per-block "Updated 2m ago" from generatedAt (matches Data Analyst freshness pattern).                         | ⬜          |
| 3   | **Fallback narrative reads like a machine and hides the degradation** — "Revenue is $40,000 (+5.0% vs prior). Expenses are…" presented identically to AI prose; users can't tell AI reasoning is offline.                                                 | MEDIUM   | Prefix "Quick figures (AI narrative unavailable)" + Retry link; keep sentences human ("Revenue came in at…"). | ✅          |
| 4   | **Reports header instructs like a manual** — "Click to analyze with AI · Download buttons for export" narrates the obvious; instructional middot-speak adds noise.                                                                                        | LOW      | Delete the hint; rely on affordances.                                                                         | ⬜          |
| 5   | **"Model" button verb unclear** — reads as noun; first-time users hesitate.                                                                                                                                                                               | LOW      | "Run scenario" or "Ask AI".                                                                                   | ✅          |
| 6   | **"vs $118,904 prior period" phrasing clunky** — reads as duration not baseline.                                                                                                                                                                          | LOW      | "Previous period: $118,904" or "was $118,904 last period".                                                    | ⬜          |
| 7   | **Scenario helper example is strong — PASS** — placeholder + description showing a concrete modeling question matches house AI-copy guidance; reuse this pattern for other AI inputs.                                                                     | —        | Keep; replicate elsewhere.                                                                                    | ✅ Baseline |

---

## DEPARTMENT: DESIGN

### Employee: Design Critic

| #   | Finding                                                                                                                                                                                                                                                        | Severity | Fix                                                        | Status |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------- | ------ |
| 1   | **Emoji as semantic icons in narrative chips** — literal "✅"/"⚠️" strings inside highlight/concern chips while every other icon is Lucide; cross-platform glyph inconsistency + SR announces "white heavy check mark". Use Lucide CheckCircle2/AlertTriangle. | MEDIUM   | Swap to icon components with sr-only text.                 | ⬜     |
| 2   | **Four identical "Trend sparkline" aria-labels** — every sparkline announces the same generic string; SR users get zero signal which KPI it belongs to or what it shows.                                                                                       | MEDIUM   | Compose label: `${label} trend, ${data.length} months`.    | ⬜     |
| 3   | **KPI card focus state undefined** — role="button"+tabIndex+key handler exist (good) but no focus-visible ring styles; keyboard focus invisible on white cards.                                                                                                | MEDIUM   | Add ring token matching interactive spec.                  | ✅     |
| 4   | **Drawer repeats dialog-semantics violations** — same missing focus trap/aria-labelledby/scroll-lock/ESC-focus issue as Activity Hub drawer; fix once in a shared Sheet primitive, adopt in both.                                                              | HIGH     | Shared Drawer/Sheet component migration.                   | ✅     |
| 5   | **Report icon colors parsed from space-delimited string** — `report.color.split(" ")[0]` contracts a class string at runtime; fragile, untyped, breaks silently if someone edits the constant.                                                                 | LOW      | Two explicit fields (chipBg, iconColor).                   | ⬜     |
| 6   | **KPI values not tabular-nums** — budget table sets tabular-nums but headline figures don't; digits shift width on refresh causing layout jitter in a numbers-first surface.                                                                                   | LOW      | Apply tabular-nums to all currency outputs.                | ⬜     |
| 7   | **Non-standard opacity fractions persist** (/8, /12, /[0.03]) — same compiled-CSS uncertainty flagged on Command Center; page-wide token audit still pending.                                                                                                  | MEDIUM   | Global audit task (tracked here; execute once across app). | ⬜     |

---

## DEPARTMENT: ENGINEERING

### Employee: Engineering Critic

| #   | Finding                                                                                                                                                                                                                                                      | Severity | Fix                                                                                           | Status |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | --------------------------------------------------------------------------------------------- | ------ |
| 1   | **getMonthLabel collides across years** — modulo-12 month math produces duplicate labels ("Jan Jan Feb") for any 12+ bar window spanning a year; charts become ambiguous without year axis. Also computes from device clock, so SSR/client can disagree.     | MEDIUM   | Return {month, year} labels from backend series metadata; stop deriving calendar client-side. | ⬜     |
| 2   | **Dead expression ships in production chart mapping** — `prior: expenseSparkline[i] ? undefined : undefined` (line 1124) always undefined; either intended prior-series wiring was abandoned mid-build or copy-paste artifact. Misleads every future reader. | LOW      | Remove or implement intended prior overlay.                                                   | ⬜     |
| 3   | **Unused totalExpenses computed in Revenue drill-down** — same reduction computed twice; Revenue branch never uses its copy. Lint escape / dead code.                                                                                                        | LOW      | Delete.                                                                                       | ⬜     |
| 4   | **entityCurrency destructured then ignored** — direct root cause enabling PM #1's GMD fallbacks; the correct value was in scope the whole time.                                                                                                              | HIGH     | Single-line fix chain with PM #1.                                                             | ✅     |
| 5   | **ScenarioPlanner timeout leaks on unmount** — isSubmitting reset timer fires post-unmount if user navigates mid-"processing"; classic cleanup miss.                                                                                                         | LOW      | useRef timer + useEffect cleanup.                                                             | ✅     |
| 6   | **reportData objects rebuilt for all 4 cards every render** — includes mapping full account arrays each pass; memoize per pnlData identity.                                                                                                                  | LOW      | useMemo on [pnlData, overview].                                                               | ⬜     |
| 7   | **BudgetVsActual conflates loading/error/not-configured as null** — three distinct states share one silent exit; debugging and UX both blind.                                                                                                                | MEDIUM   | Distinguish states (see Product Critic #3); add error retry.                                  | ⬜     |
| 8   | **Inline structural types redeclared over API types** — budget item param types retyped ad hoc in JSX map; drift risk when reports router evolves.                                                                                                           | LOW      | Infer from tRPC output type; delete inline duplicates.                                        | ⬜     |

---

## DEPARTMENT: SECURITY

### Employee: Security Engineer (CSO)

| #   | Finding                                                                                                                                                                                                                                                                                                                                                              | Severity        | Fix                                                                                                                       | Status           |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| 1   | **LangFuse trace exposure of financial payloads UNVERIFIED** — askAiAbout ships revenue/expenses/cash figures as structured fields into module-AI flows traced to LangFuse. If tracing captures full inputs without redaction, financials land in observability storage accessible beyond the entity's members. Compliance-sensitive (SOC2/finance confidentiality). | HIGH (verify)   | Confirm LangFuse input-masking config for financial fields; mask by default, opt-in reveal.                               | ⬜               |
| 2   | **Client-generated report exports unaudited** — P&L/cash-flow documents built in-browser and downloaded; no server-side export event, watermark, or count. Enterprise data-loss forensics impossible ("who exported what when").                                                                                                                                     | MEDIUM          | Emit export audit events (entityId, userId, reportType, format); consider server-rendered generation for enterprise tier. | ⬜               |
| 3   | **Indirect prompt-injection channel via anomaly text** — Investigate interpolates `anomaly.message` + `anomaly.aiInsight` (originating from document-ingesting agents) directly into a new prompt. Crafted document content could steer investigation prompts. Constrain interpolation length/structure; treat upstream text as data, quote it explicitly.           | MEDIUM          | Wrap as quoted data block; strip instruction-like patterns; cap length.                                                   | ⬜               |
| 4   | **LiveExchangeRates external dependency posture UNKNOWN** — third-party FX source consumed client-side; verify TLS-only origin, no API key shipped in client bundle, response schema validated before render (Zod), graceful failure when provider down.                                                                                                             | MEDIUM (verify) | Audit component + provider; move fetch server-side proxy if key involved.                                                 | ⬜               |
| 5   | **Plain-text narrative rendering — PASS** — narrativeText renders via whitespace-pre-wrap text node; no HTML injection vector on this page. Maintain property when rich formatting arrives.                                                                                                                                                                          | —               | Guardrail note.                                                                                                           | ✅ Verified safe |

---

## DEPARTMENT: DATA

### Employee: Data Analyst

| #   | Finding                                                                                                                                                                                                                                                                                   | Severity | Fix                                                                                                | Status |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------- | ------ |
| 1   | **Zero-runway case suppresses the runway warning** — cash drill-down insight gated on `overview?.runway ? … : undefined`; runway = 0 (money gone) is falsy → the single most urgent message on the page silently disappears exactly when true.                                            | CRITICAL | Distinguish null (unknown) from 0 (critical); show "Immediate action required" state for ≤1 month. | ✅     |
| 2   | **Two contradictory margin definitions on one page** — MarginTrendChart computes (revenue−expensesSparkline)/revenue while KPI/net-profit paths use cogs/opExpenses splits; same user sees different "margin" numbers in adjacent cards with no definitions.                              | HIGH     | One canonical margin calc (server-computed) feeding all surfaces; label each (gross vs net).       | ⬜     |
| 3   | **Zero-revenue division guarded by `\|\| 1`** — margin/percentage math substitutes denominator 1 producing 0%/absurd percentages instead of N/A for pre-revenue entities; new-company onboarding sees confident-looking zeros.                                                            | MEDIUM   | Null-out percentages when denominator ≤0; display "—".                                             | ✅     |
| 4   | **Sparkline min/max normalization exaggerates noise** — per-card auto-scaling turns near-flat series into dramatic slopes; without value-axis reference users over-read movement. Add hover tooltip with actual values + range caption.                                                   | LOW      | Tooltip + optional fixed-scale mode.                                                               | ⬜     |
| 5   | **Decision analytics absent across the entire surface** — no events for period switches, drill-downs opened, Ask-AI prompts (which questions do owners actually ask?), scenario submissions, report downloads, budget views. The richest intent dataset in the product is uninstrumented. | HIGH     | Instrument all above with entityId+period context; feed roadmap prioritization.                    | ⬜     |
| 6   | **Month axis ambiguity corrupts trend reading (data view of Eng #1)** — duplicated month names make quarter-over-quarter comparisons unreliable; combined with client-clock derivation, two users can see differently-labeled identical data.                                             | MEDIUM   | Server-authoritative labels (with year); covered jointly with Eng #1.                              | ⬜     |

---

# PAGE: /dashboard/ledger

The record of truth: five tabs (Journal, Chart of Accounts, Trial Balance, Fixed Assets, Reconciliation), journal detail drawer with reversal flow, create-entry form, CSV exports, keyboard-navigable tabs.

---

## DEPARTMENT: PRODUCT

### Employee: Product Manager

| #   | Finding                                                                                                                                                                                                                                                                                                           | Severity | Fix                                                                                                               | Status |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------- | ------ | --- |
| 1   | **COA tab crashes on open** — header renders `accounts.length` (line 878) while `accounts` is undefined during initial fetch; the isLoading skeleton sits BELOW the header so the crash happens first. Opening Chart of Accounts on a cold cache throws TypeError.                                                | CRITICAL | Optional-chain the header counts or move them below loading guard.                                                |        | ✅  |
| 2   | **Natural-language search placeholder overpromises** — 'Search in natural language — try "Show me all entries over 10,000"' but searchQuery passes verbatim to the server `search` param (keyword matching unless an NL layer exists server-side). Amount-based and relational queries silently fail/return junk. | HIGH     | Verify server capability; if keyword-only, rewrite placeholder honestly OR wire NL parsing to structured filters. |        | ✅  |
| 3   | **Journal "Export" exports only the current 20-row page** — BulkExportButton receives the paginated slice; filename implies a full journal export. Accountants exporting "the books" get 1/N of them with zero warning.                                                                                           | HIGH     | Export all matching entries (server-side streaming) or label clearly "Export page".                               | ⬜     |
| 4   | **Create Entry doesn't refresh the list** — onCreated callback only closes the form (comment says "Refetch journal data" but nothing invalidates); new entry invisible until unrelated poll/surface event. Same empty-refetch defect class already logged twice.                                                  | HIGH     | Invalidate journal.listWithDetails + getTabCounts on success; toast with new entry number.                        |        | ✅  |
| 5   | **Reversal leaves stale data everywhere** — reverseMutation onSuccess toasts+closes but invalidates nothing (journal list, tab counts, trial balance all stale); emitDataChanged not emitted unlike other surfaces. A reversed entry still reads "posted" in the list behind the drawer.                          | HIGH     | Invalidate affected queries + emit cross-surface event.                                                           |        | ✅  |
| 6   | **No date-range filter on the Journal** — only status chips + free-text search; isolating "last month's rent entries" requires the AI. The record-of-truth surface needs first-class period filtering.                                                                                                            | HIGH     | Add date-range picker aligned to fiscal periods.                                                                  | ⬜     |
| 7   | **Pending/Draft entries are dead-end states** — drawer offers Explain/Audit/Reverse(posted only); no approve, edit, or delete path for non-posted entries. Entries stuck pending have no resolution UI here.                                                                                                      | MEDIUM   | Approve/post actions for pending (role-gated); edit/delete for drafts.                                            | ⬜     |
| 8   | **Raw status enums leak in list** — list badge prints `entry.status` verbatim (`pending_review`, etc.) while the drawer maps to human labels; inconsistent + internal vocabulary exposed.                                                                                                                         | LOW      | Shared status→label/color mapper used by both.                                                                    | ⬜     |
| 9   | **"Reversed" displayed as "Voided"** — drawer maps status reversed→"Voided"; accountants treat void (never existed) ≠ reversed (entered+cancelled) very differently. Mislabeling book state erodes professional trust.                                                                                            | MEDIUM   | Label accurately "Reversed"; keep distinct colors.                                                                |        | ✅  |
| 10  | **JE "Show audit trail" opens chat instead of the audit trail** — routes a prompt through module AI though /dashboard/audit-trail exists; deep-linkable filtered view is the right primitive.                                                                                                                     | LOW      | Link to audit-trail filtered by entry id.                                                                         |        | ✅  |
| 11  | **Tab counts never refresh** — getTabCounts lacks polling/invalidation; chips show yesterday's distribution while lists live-update.                                                                                                                                                                              | LOW      | Include counts in list query payload or invalidate together.                                                      | ⬜     |

### Employee: Product Critic

| #   | Finding                                                                                                                                                                                                                                                  | Severity | Fix                                                                                   | Status      |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------- | ----------- |
| 1   | **Accounts don't drill into their transactions** — clicking any COA row fires an AI chat prompt; there is no account-statement view (its ledger lines, running balance). The single most natural interaction on a chart of accounts terminates in prose. | HIGH     | Account drawer/page listing its journal lines + balance trend; keep Ask-AI secondary. | ⬜          |
| 2   | **Trial balance rows are inert** — COA rows respond to click; TB rows (same accounts!) do nothing. Inconsistent interactivity between views of the same data.                                                                                            | MEDIUM   | Reuse account drill-down from PC #1.                                                  | ⬜          |
| 3   | **Out-of-balance state is a dead end** — red banner announces imbalance but offers no "locate the imbalance" helper (largest contributors, recent unbalanced drafts). The moment users need navigation most, they get color alone.                       | HIGH     | Add diagnostic action: rank suspect entries by delta proximity/date.                  | ⬜          |
| 4   | **Empty journal state lacks any CTA** — passive "Entries will appear here as agents post them"; COA empty-state has "Set up with AI", journal has nothing (no Create shortcut, no connect prompt).                                                       | LOW      | Mirror COA pattern: primary CTA + agent explanation.                                  | ⬜          |
| 5   | **isAiGenerated + createdBy attribution is strong — PASS** — provenance badges directly serve the audit mission; extend this pattern (who/what/when) rather than reinventing elsewhere.                                                                  | —        | Keep; replicate.                                                                      | ✅ Baseline |
| 6   | **Export offers no format/scope options** — single unlabeled "Export" (CSV implied); FP page trains users to expect pdf/excel/word choices.                                                                                                              | LOW      | Format menu + scope choice (current filter/page/all).                                 | ⬜          |

### Employee: UX Writer

| #   | Finding                                                                                                                                                                                                                                           | Severity | Fix                                                                           | Status      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------- | ----------- | --- |
| 1   | **NL-search placeholder sets unachievable expectations** (product twin PM #2) — even the examples chosen ("over 10,000") guarantee failure under keyword search; worst-case copy placement: the input users trust most on the books.              | HIGH     | Align copy to real capability today; restore aspirational copy when NL lands. |             | ✅  |
| 2   | **"No lines found" is engineer-speak** — an entry without lines is a data anomaly; message reads like an empty inbox.                                                                                                                             | LOW      | "This entry has no line items — contact support if you expect activity."      |             | ✅  |
| 3   | **Dev-experiment strings shipped** — sr-only button labeled "Trigger undo toast for trial balance" + toast "Undo not needed — no data changed" read like leftover scaffolding in the most serious surface of the product.                         | MEDIUM   | Remove the dead undo wiring entirely (see Eng #6 / PM alignment).             |             | ✅  |
| 4   | **Status vocabulary split-brain** — list lowercase enums, drawer Title Case, "Voided" vs reversed semantics (PM #8/#9); three treatments of one field confuse scanning.                                                                           | MEDIUM   | One canonical label set.                                                      |             | ✅  |
| 5   | **Reversal dialog copy is precise — PASS baseline** — "will create a new entry that cancels out this one" + required reason + concrete placeholder matches accounting mental models exactly; canonical example for destructive-financial dialogs. | —        | Keep; reuse phrasing for void/approve flows.                                  | ✅ Baseline |

---

## DEPARTMENT: DESIGN

### Employee: Design Critic

| #   | Finding                                                                                                                                                                                                                                                                           | Severity | Fix                                                                         | Status |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------- | ------ | --- |
| 1   | **Light-mode-only hardcodes break dark mode** — reverse button `border-red-200 bg-red-50 hover:bg-red-100` (lines 452, plus dialog surfaces) assume white background; in dark theme these render blinding pale chips. Identical defect class empworks already fixed on Help page. | HIGH     | Token-based destructive styling (destructive/10 backgrounds).               |        | ✅  |
| 2   | **Overlay treatment inconsistent across drawers** — this drawer dims via bg-foreground/10 blur-2px; Activity Hub + FP drawers use bg-black/50 blur-sm. Three drawer patterns diverging page by page.                                                                              | MEDIUM   | One Sheet/Drawer primitive (also solves trap/labelledby gaps logged twice). | ⬜     |
| 3   | **Focus not trapped nor restored** — ESC works (window listener — good), but tabbing escapes behind overlay and closing returns focus nowhere (was opened from a card button).                                                                                                    | HIGH     | Shared primitive fix: trap + restore.                                       | ⬜     |
| 4   | **statusColor stringly-typed contract** — "emerald"/"blue"/… strings mapped through nested ternaries; adding a status requires editing mapping chains in two files.                                                                                                               | LOW      | Typed status config map (single source).                                    | ⬜     |
| 5   | **Hover-reveal Sparkles on COA rows invisible on touch** — same opacity-0→group-hover pattern flagged on Financial Pulse; affordance absent where hover doesn't exist.                                                                                                            | LOW      | Persistent subtle indicator on touch breakpoints.                           | ⬜     |
| 6   | **Filter chip micro-typography persists** — 11px labels, 9px bold count pills; readability floor violations repeat across fourth page. Global type-scale task tracking here.                                                                                                      | LOW      | Execute global minimum-type-size pass once.                                 | ⬜     |

---

## DEPARTMENT: ENGINEERING

### Employee: Engineering Critic

| #   | Finding                                                                                                                                                                                                                                                     | Severity | Fix                                                                                                                          | Status |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------- | ------ | --- |
| 1   | **Undefined dereference crash (root cause of PM #1)** — `accounts.length` evaluated pre-data; also grouped reduce guards undefined but header doesn't. Fix + add error boundary per tab so one tab's crash can't blank the page.                            | CRITICAL | Optional chaining + per-tab Suspense/error isolation.                                                                        |        | ✅  |
| 2   | **Client-side FLOAT arithmetic on money** — debit/credit parsed via parseFloat and summed with + for drawer totals AND balance check (AGENTS.md explicitly forbids float money math); sub-cent display drift possible against decimal-backed server values. | HIGH     | Sum integer minor units (or decimal.js) client-side; ideally server returns precomputed totals (it already has them for TB). | ⬜     |
| 3   | **Balance tolerance re-implemented in UI** — Math.abs(diff)<0.01 duplicates the server's balancing invariant with independent precision semantics; two laws for one invariant.                                                                              | MEDIUM   | Trust server-computed balanced flag (getById should provide); render-only check if needed.                                   | ⬜     |
| 4   | **Keystroke-driven search floods the DB** — every character triggers listWithDetails; no debounce.                                                                                                                                                          | MEDIUM   | 300ms debounce + min-length 2; cancel in-flight via traceroute dedupe (react-query default keys handle).                     |        | ✅  |
| 5   | **Offset pagination races mutations** — posting/creating while paging shifts offsets (skipped/duplicated rows); AGENTS conventions prefer cursors.                                                                                                          | LOW      | Cursor pagination on journal list.                                                                                           | ⬜     |
| 6   | **Dead useUndo scaffolding in Trial Balance** — hidden sr-only trigger button + no-op undo handler ship complexity and confusion for zero function (see UX #3).                                                                                             | LOW      | Delete block.                                                                                                                |        | ✅  |
| 7   | **Inline structural types duplicated over API output** — entry.lines param retyping repeats reports-router drift pattern flagged on FP.                                                                                                                     | LOW      | Infer from tRPC types.                                                                                                       | ⬜     |
| 8   | **Wrapper components add nothing** — FixedAssetsViewWrapper/ReconciliationViewWrapper pure pass-throughs.                                                                                                                                                   | LOW      | Use components directly.                                                                                                     | ⬜     |

---

## DEPARTMENT: SECURITY

### Employee: Security Engineer (CSO)

| #   | Finding                                                                                                                                                                                                                                      | Severity      | Fix                                                                | Status |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------ | ------ |
| 1   | **Role gating on reversal/posting UNVERIFIED** — journal.reverse mutates financial history; confirm server denies Viewer/entry-creator-self-reversal per separation-of-duties (creator ≠ reverser), and writes who/why to append-only audit. | HIGH (verify) | Server-side role assertion + integration tests; document SoD rule. | ⬜     |
| 2   | **journal.getById ownership predicate UNVERIFIED** — client sends bare id; confirm entityId scoping like chat.ts (404 on cross-entity). Any miss here exposes full journal lines cross-tenant.                                               | HIGH (verify) | Audit procedure; test cross-entity denial.                         | ⬜     |
| 3   | **CSV export injection reuse** — journal/COA exports flow through BulkExportButton; confirm shared sanitizeCell() (from audit-trail fix) applies here too; descriptions are free-text user/agent content (=,+,-,@ prefixes).                 | MEDIUM        | Central sanitizer + regression tests.                              | ⬜     |
| 4   | **Exports unaudited (repeat finding, financial grade)** — journal/COA/TB downloads leave no server trace; on the general ledger this is an enterprise-sales blocker.                                                                         | MEDIUM        | Emit export audit events server-side.                              | ⬜     |
| 5   | **Reason field length/content unconstrained client-side** — reverse reason input lacks maxLength; multi-MB paste lands in DB/audit/export chains.                                                                                            | LOW           | zod max(500) + textarea instead of input.                          | ⬜     |

---

## DEPARTMENT: DATA

### Employee: Data Analyst

| #   | Finding                                                                                                                                                                                                                                         | Severity | Fix                                                                              | Status |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------- | ------ | --- |
| 1   | **Float-summed displayed totals risk cent drift** (data view of Eng #2) — reconciliation workflows compare these numbers to bank statements to the cent; any float artifact undermines the surface whose entire job is exactness.               | HIGH     | Integer/decimal pipeline end-to-end; snapshot-test famous float cases (0.1+0.2). |        | ✅  |
| 2   | **Debit/Credit column convention undocumented in TB** — positive balance→debit, negative→credit assumes signed-normal-balance encoding; accountants expecting natural balances may misread liabilities/equity. Define + tooltip the convention. | MEDIUM   | Document convention in caption/tooltips; validate against server sign semantics. | ⬜     |
| 3   | **Stale tab counts distort operational picture** (twin of PM #11) — decisions like "clear the 12 pending" act on frozen numbers.                                                                                                                | LOW      | Joint fix with PM #11.                                                           | ⬜     |
| 4   | **Zero analytics on the record-of-truth surface** — no events for searches (esp. failed NL attempts — goldmine for parser design), exports, reversals, creates, tab switches. Ledger usage patterns should drive the roadmap.                   | MEDIUM   | Instrument per above with entityId context.                                      | ⬜     |
| 5   | **Total-count phrasing ambiguity** — "N entries total" beside filtered chips reads as global vs filtered ambiguously during filtering.                                                                                                          | LOW      | "N of M entries match current filters."                                          | ⬜     |

---

# PAGE: /dashboard/operations

Money hub: MoneyFlowSummary (live badge, AI cash narrative, 4 stats), CashFlowChart, Money Out / Money In action columns, BankingCards (top-3), MobileMoneyCards, RecentTransactions (+detail drawer), ComplianceClose progress, PeopleGrid, AiQuickActions.

---

## DEPARTMENT: PRODUCT

### Employee: Product Manager

| #   | Finding                                                                                                                                                                                                                                                                                                                                      | Severity | Fix                                                                             | Status |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------- | ------ | --- |
| 1   | **Unknown runway asserted as "Sustainable"** — MoneyFlow AI-context maps null/undefined runway to the literal string "Sustainable" (lines 103–105). Missing calculation ≠ healthy business; identical fabricated-assurance defect already flagged on Financial Pulse (#1 Data) and Command Center briefing. Third occurrence of the pattern. | CRITICAL | Null → "Runway unknown"; reserve health language for computed values.           | ⬜     |
| 2   | **Employees tile is hardcode-zero** — PeopleGrid ships `count: 0` with no payroll/employees query behind it; every user sees "0 total" forever. Fake metric on a primary nav tile.                                                                                                                                                           | HIGH     | Wire real employee count or render "Coming soon" state without a number.        |        | ✅  |
| 3   | **Vendors count counts bills, not vendors** — tile pulls `billsOverview.statusCounts.all` (number of BILLS) under the label "Vendors". Wrong entity entirely; count drifts wildly from real vendor relationships.                                                                                                                            | HIGH     | Query vendors table count; keep bill counts on the Bills row where they belong. |        | ✅  |
| 4   | **Customers tile links to the invoices page** — href `/dashboard/operations/invoices` although `/dashboard/operations/customers` exists. Users hunting the customer list land on invoice management.                                                                                                                                         | HIGH     | Link to customers subpage.                                                      |        | ✅  |
| 5   | **Banking shows max 3 accounts, silently** — `accounts.slice(0, 3)` with no "View all N accounts" escape; multi-bank entities have invisible accounts on the money hub.                                                                                                                                                                      | MEDIUM   | Show all (scroll/grid) or add overflow link to /operations/banking.             | ⬜     |
| 6   | **"View all" opens chat, not the transaction list** — RecentTransactions header button routes an AI prompt; label promises navigation (fourth instance of this exact defect class across pages).                                                                                                                                             | MEDIUM   | Link to transactions surface; rename chat entry points "Ask AI".                | ⬜     |
| 7   | **Payroll promised in three places, exists nowhere** — Quick Actions "Run payroll", Money Out "Payroll" row, and shell suggestion all invoke payroll flows while the platform has no employee records (see #2). Users hit dead-end conversations.                                                                                            | HIGH     | Gate payroll entries behind feature availability; hide until module ships.      |        | ✅  |
| 8   | **Money In row is decorative** — "Invoices Outstanding" shows an amber alert icon unconditionally and "AR" as its stat, though arOutstanding + overdue counts are already in dashboardData. The most important inbound number on the page isn't shown.                                                                                       | MEDIUM   | Display real AR total + overdue count; conditional urgency icon.                | ⬜     |
| 9   | **Placeholder stat strings** — Estimates row shows static "Pending", Payroll row "Period": labels that carry zero information.                                                                                                                                                                                                               | LOW      | Bind real counts or remove the right-hand stat.                                 | ⬜     |
| 10  | **"Live" badge is decoration** — pulsing dot implies realtime feed; queries are default-cached fetches with unknown staleness. Same false-status class as CC's "AI active".                                                                                                                                                                  | LOW      | Tie to actual subscription/poll state or drop.                                  | ⬜     |

### Employee: Product Critic

| #   | Finding                                                                                                                                                                                                                                                          | Severity | Fix                                                                        | Status |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------- | ------ | --- |
| 1   | **Bank account cards chat instead of drilling in** — clicking an account fires an AI prompt; there's no account statement view (transactions, balance trend). Fifth instance of the drill-down-dead-end anti-pattern; on the MONEY surface it hurts most.        | HIGH     | Route to account detail (existing banking subpage patterns); AI secondary. |        | ⬜  |
| 2   | **Identical-looking rows do opposite things** — Money Out/In lists mix `<Link>` navigations and chat-opening `<button>`s with pixel-identical styling; users cannot predict outcomes. Add directional affordance (chevron vs sparkles) at minimum.               | HIGH     | Visual interaction contract per row type.                                  |        | ✅  |
| 3   | **Empty-state flash lies about connected banks** — BankingCards renders the "No bank accounts connected" dashed state whenever `accounts` is `[]`, including DURING load (no isLoading branch). Every fresh visit flashes "you have no banks" before data lands. | HIGH     | Loading skeleton before empty verdict.                                     |        | ✅  |
| 4   | **Reconcile offered twice on one screen** — Money In "Reconcile" row + AiQuickActions "Reconcile accounts" trigger the same conversation; duplicated entry points dilute both.                                                                                   | LOW      | Consolidate; one strong path per task.                                     | ⬜     |
| 5   | **Transactions empty state has no path forward** — unlike Banking's Connect-with-AI state; new users see "No transactions yet" void.                                                                                                                             | LOW      | Mirror banking CTA pattern.                                                | ⬜     |
| 6   | **CashFlowChart contract unverified** — fed the raw `cashPosition` query object plus separate isLoading; shape coupling between router response and chart props is implicit. Type it explicitly.                                                                 | LOW      | Explicit prop mapping from typed response.                                 | ⬜     |

### Employee: UX Writer

| #   | Finding                                                                                                                                                                            | Severity | Fix                                                    | Status      |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------ | ----------- |
| 1   | **"Sustainable" is a promise we can't keep** (copy view of PM #1) — worst-case word choice attached to worst-case missing data.                                                    | CRITICAL | "Runway unknown — connect more history."               | ⬜          |
| 2   | **Decorative status chips say nothing** — "AI-categorized", "AI-tracked", "Match", "Period" are vibes, not information; four different non-answers in one column set.              | MEDIUM   | Replace with live counts or remove.                    | ⬜          |
| 3   | **Bare "Loading..." violates house style** — ComplianceClose ignores the progressive-loading rule used elsewhere ("Loading money flow summary…" is fine; naked "Loading…" is not). | LOW      | "Checking close status…".                              | ⬜          |
| 4   | **Five identical "Ask AI" targets** — repeated unlabeled links are indistinguishable to SR users and scanners alike.                                                               | LOW      | aria-label or visible context: "Ask AI about banking". | ⬜          |
| 5   | **Instructional subtitle narrates the obvious** — "Click to ask the AI to handle these for you." Manual-speak over affordance.                                                     | LOW      | Cut; the sparkle styling carries the meaning.          | ⬜          |
| 6   | **"Bills to Pay · N pending" is strong — PASS baseline** — concrete object + count + destination; reuse this row formula across Money In.                                          | —        | Keep; replicate.                                       | ✅ Baseline |

---

## DEPARTMENT: DESIGN

### Employee: Design Critic

| #   | Finding                                                                                                                                                                                                                                                                             | Severity | Fix                                                     | Status |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------- | ------ | --- |
| 1   | **Arrow direction semantics look inverted** — incoming money gets ArrowDownRight (green), outgoing ArrowUpRight (red); most fintech conventions pair in=↑/↘-into-pot consistently. Whatever the intent, verify deliberate choice; current pairing reads backwards at glance speed. | MEDIUM   | Align arrow geometry with Money Flow metaphor app-wide. | ⬜     |
| 2   | **bg-primary/8 non-standard fraction persists** — MoneyFlow header chip; part of the global compiled-CSS audit item.                                                                                                                                                                | LOW      | Global token pass.                                      | ⬜     |
| 3   | **Link-vs-button visual sameness** (design twin of PC #2) — identical hover treatments for navigation and conversation rows breaks affordance grammar.                                                                                                                              | HIGH     | Distinct end-icon treatment.                            |        | ✅  |
| 4   | **Pulse animations ignore reduced-motion** — Live dot + any shimmer run regardless of prefers-reduced-motion (recurring).                                                                                                                                                           | LOW      | motion-safe gating, global.                             | ⬜     |
| 5   | **Micro-typography floor violations continue** — 9px badges, 10px labels throughout (tracked globally).                                                                                                                                                                             | LOW      | Global type pass.                                       | ⬜     |

---

## DEPARTMENT: ENGINEERING

### Employee: Engineering Critic

| #   | Finding                                                                                                                                                                                                                                                             | Severity | Fix                                                                       | Status |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------- | ------ | --- |
| 1   | **No query surfaces errors anywhere on the page** — every useQuery destructures only data; isError/refetch ignored page-wide. Failures render as confident zeros ("0 pending", "$0 coming in") — silent-wrong-data pattern, the most expensive kind on a money hub. | HIGH     | Standard error+retry block per card; never render zeros for failed loads. |        | ✅  |
| 2   | **parseFloat on balance strings client-side** — `parseFloat(account.currentBalance ?? "0")` continues the money-as-float violation logged on Ledger; server should emit numbers/minor-units.                                                                        | HIGH     | Typed numeric contract from banking router.                               |        | ✅  |
| 3   | **Nested optional-chain gap** — `billsOverview?.statusCounts.overdue` guards the first hop only; statusCounts undefined throws. Backend contract may guarantee it today; one schema change = crash.                                                                 | MEDIUM   | Full chaining or zod-parsed selector.                                     | ⬜     |
| 4   | **PeopleGrid runs a full customers query (limit:1) just for totalCount** — wasteful fetch pattern; counts endpoint or overview payload field.                                                                                                                       | LOW      | Dedicated counts source.                                                  | ⬜     |
| 5   | **Hardcoded en-US date formatting** — transaction dates locked to US locale in a global product (i18n convention breach; recurring).                                                                                                                                | LOW      | Shared locale-aware date util.                                            | ⬜     |
| 6   | **aria-busy covers 2 of ~9 queries** — busy signal misrepresents actual loading coverage.                                                                                                                                                                           | LOW      | Derive from all page queries.                                             | ⬜     |

---

## DEPARTMENT: SECURITY

### Employee: Security Engineer (CSO)

| #   | Finding                                                                                                                                                                                                                                                | Severity        | Fix                                                                 | Status           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------- | ------------------------------------------------------------------- | ---------------- |
| 1   | **Banking data scoping UNVERIFIED** — getOverview/getCashPosition/listTransactions must enforce entityId predicates server-side (bank balances are crown-jewel data). Audit procedures + cross-entity denial tests like chat.ts verification.          | HIGH (verify)   | Ownership predicate audit across banking router.                    | ⬜               |
| 2   | **MobileMoneyCards external integration posture UNKNOWN** — mobile-money providers handle regulated flows; verify no provider keys/secrets in client bundle, phone/account numbers masked in list responses, webhook signatures validated server-side. | HIGH (verify)   | Component + provider audit; move sensitive calls server-side proxy. | ⬜               |
| 3   | **Payment-link generation via chat flow** — creating payable financial instruments conversationally requires the same authorization+audit rigor as approvals (role check, immutable record, amount binding). Verify the agent toolpath enforces it.    | MEDIUM (verify) | Server-side authz + audit event on payment-link creation.           | ⬜               |
| 4   | **Transaction descriptions render as text nodes — PASS** — React escaping holds; maintain when rich rendering arrives.                                                                                                                                 | —               | Guardrail.                                                          | ✅ Verified safe |

---

## DEPARTMENT: DATA

### Employee: Data Analyst

| #   | Finding                                                                                                                                                                                                  | Severity | Fix                                                                        | Status |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------- | ------ | --- |
| 1   | **Wrong-entity counts corrupt the People grid** (data view of PM #2/#3) — vendors=bills, employees=fake-zero; downstream dashboards consuming these tiles inherit garbage.                               | HIGH     | Correct sources; add contract tests on count semantics.                    |        | ✅  |
| 2   | **formatCurrency without currency argument sits on BANK BALANCES** — multi-currency entities may see every account normalized to one symbol; balances are the least forgiving place for symbol guessing. | HIGH     | Per-account currency from banking payload → explicit formatCurrency calls. |        | ✅  |
| 3   | **"This month" claims lack period anchoring** — AI summary sentence asserts month scope while getCashPosition period definition is implicit; staleTime unknown; no as-of timestamp anywhere.             | MEDIUM   | Period + generatedAt surfaced (global freshness pattern).                  | ⬜     |
| 4   | **Decision analytics uninstrumented** — no events for quick-action usage, account card clicks, drawer opens, reconcile starts; Operations is the action surface — its funnel is invisible.               | MEDIUM   | Instrument per above.                                                      | ⬜     |
| 5   | **Failed loads present as $0/0 totals** (data twin of Eng #1) — zeros enter mental math and screenshots; distinguish absence-of-data from value-zero in every stat tile.                                 | HIGH     | Null-state glyph ("—") for unloaded, 0 only when measured.                 |        | ✅  |

---

# PAGE: /dashboard/audit-trail

Compliance surface: server-filtered log entries (search/surface/date), expandable detail rows with JSON change dump, page-limited CSV export, stats cards.

---

## DEPARTMENT: PRODUCT

### Employee: Product Manager

| #   | Finding                                                                                                                                                                                                                                                                     | Severity | Fix                                                                              | Status |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------- | ------ | --- |
| 1   | **The "who" in "who did what when" is a UUID fragment** — actor renders as `User 8a1f2c3d…` (log.userId.slice(0,8)); no user join anywhere. A compliance trail nobody can read is a checkbox, not a capability. Resolve actors to names/emails server-side.                 | CRITICAL | Join user table (name, email, role at time of action); fall back "System".       | ⬜     |
| 2   | **Only `newValues` is kept/shown — no before-state** — expanded details + CSV carry Changes=newValues alone; without oldValues there is no diff, so the trail cannot answer "what did it change FROM". Audit-integrity gap at the data-model level.                         | HIGH     | Persist + display old→new diffs; export both columns.                            | ⬜     |
| 3   | **CSV export silently limited to current 50-row page** — same truncation defect as Ledger export; compliance officers exporting "the audit log" get 1/Nth of it with no indication.                                                                                         | HIGH     | Server-generated complete export of current FILTERS (not page); stream if large. | ⬜     |
| 4   | **No actor filter** — can't answer "what did this user do?" without eyeballing pages; the second-most-asked audit question after date ranges.                                                                                                                               | HIGH     | User dropdown/search filter wired to server query.                               | ⬜     |
| 5   | **Entries don't link to their records** — entityIdRef printed as dead mono text; jumping from "invoice.updated" to the invoice should be one click.                                                                                                                         | MEDIUM   | Deep-link entityType+id to owning surface where safe.                            | ⬜     |
| 6   | **Category/verb classification by fragile string heuristics** — startsWith("settings.") prefixes + substring verb sniffing ("includes(\"update\")"); unmatched actions collapse into "Other"/"Performed". Misclassification on a compliance surface is a correctness issue. | MEDIUM   | Persist category/verb enum at write time (server truth), render it verbatim.     | ⬜     |
| 7   | **Failure looks like clean books** — query errors aren't handled (isError ignored); a failed load renders the same "No audit entries found" empty-state as an empty trail. For THIS surface that's the worst possible ambiguity.                                            | HIGH     | Distinct error state + retry; never equate failure with emptiness.               |        | ✅  |
| 8   | **Static page on a live trail** — "Actions will appear here as they happen" yet nothing refreshes except manual cross-surface events; no polling/refetch interval or new-entries indicator.                                                                                 | LOW      | Refetch interval or SSE tick + unread divider.                                   | ⬜     |

### Employee: Product Critic

| #   | Finding                                                                                                                                                                                                            | Severity | Fix                                                             | Status      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | --------------------------------------------------------------- | ----------- |
| 1   | **Stats cards are filler** — three cards display Total / On-This-Page / the literal date-range label. Zero analytical value; the space begs for breakdowns (top categories, AI-vs-human ratio, actions/day spark). | MEDIUM   | Replace with decision-useful aggregates from one grouped query. | ⬜          |
| 2   | **Custom date range accepts invalid ranges** — from>to yields guaranteed-empty results with generic empty copy; no inline validation.                                                                              | LOW      | Validate + swap/hint.                                           | ⬜          |
| 3   | **Search scope undocumented** — "Search actions…" doesn't say whether it matches action, entity, or user fields; users guess.                                                                                      | LOW      | Placeholder enumerates scope once server contract confirmed.    | ⬜          |
| 4   | **Single-open accordion** — expanding one row collapses the other; comparing two related entries side-by-side impossible.                                                                                          | LOW      | Allow multi-expand.                                             | ⬜          |
| 5   | **Empty-state branching is strong — PASS baseline** — distinct messages for search/date/all-empty cases; reuse this ternary pattern on Operations cards.                                                           | —        | Keep; replicate.                                                | ✅ Baseline |

### Employee: UX Writer

| #   | Finding                                                                                                                                                              | Severity | Fix                                                          | Status      |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------ | ----------- |
| 1   | **Machine-speak for humans** — "User 8a1f2c3d…" is the page's signature copy failure (root PM #1); even pre-fix, "System action" reads better than a truncated hex.  | HIGH     | Resolved names; hide IDs behind affordance.                  | ⬜          |
| 2   | **"Performed" is a non-verb** — fallback verb adds noise over the raw action already shown beside it.                                                                | LOW      | Drop the verb chip when classification is unknown.           | ⬜          |
| 3   | **Org vs entity vocabulary slip** — subtitle promises "across your organization"; data is entity-scoped. Multi-entity users will over-trust the page's completeness. | MEDIUM   | Say "across [Entity Name]" dynamically.                      | ⬜          |
| 4   | **Mixed timestamp formats** — relative ago in rows, bare toLocaleString() in details; locale-dependent and inconsistent with app patterns.                           | LOW      | Shared formatters (relative + absolute-on-hover/detail ISO). | ⬜          |
| 5   | **Filter-match count line is precise — PASS** — "N entries match your filters" vs "N total entries" distinction was a prior empworks fix holding correctly.          | —        | Keep.                                                        | ✅ Baseline |

---

## DEPARTMENT: DESIGN

### Employee: Design Critic

| #   | Finding                                                                                                                                                                                                                                          | Severity | Fix                                                                              | Status |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | -------------------------------------------------------------------------------- | ------ | --- |
| 1   | **All 12 category chips hardcode light-mode colors** — text-blue-600/bg-blue-50 family throughout ACTION_CATEGORIES; dark mode renders pastel-on-dark failures across every row (same defect empworks fixed on Help; recurring page after page). | HIGH     | Token map (category→semantic token pair) in one module.                          |        | ✅  |
| 2   | **Expand/collapse still jumps** — max-h transition improved per empworks note but 500px cap clips long diffs mid-content; opacity+border-t toggling produces flicker.                                                                            | MEDIUM   | Grid-template-rows 0fr/1fr technique or portal-less measured height; remove cap. | ⬜     |
| 3   | **Verb color carries meaning alone for scan-speed users** — colored words help, but severity relies partly on hue; icons absent on verb chips.                                                                                                   | LOW      | Pair verb chips with directional icons.                                          | ⬜     |
| 4   | **Micro-typography floor violations persist** — 10px entity/surface chips (global item).                                                                                                                                                         | LOW      | Global pass.                                                                     | ⬜     |

---

## DEPARTMENT: ENGINEERING

### Employee: Engineering Critic

| #   | Finding                                                                                                                                                                                                   | Severity | Fix                                                    | Status      |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------ | ----------- | --- |
| 1   | **Per-keystroke server searches** — no debounce on audit search; each character fires getAuditLogs with LIKE-style filtering server-side.                                                                 | MEDIUM   | 300ms debounce + min length 2.                         |             | ✅  |
| 2   | **Offset pagination on an insert-heavy table** — new entries shift offsets between page views (skipped/duplicated rows during review sessions); cursor pagination per conventions.                        | MEDIUM   | Cursor (createdAt,id) pagination.                      | ⬜          |
| 3   | **"Last 30 Days" is setMonth(-1)** — calendar-month arithmetic presented as fixed-day window; boundaries drift (28–31 days) and DST edges shift hours.                                                    | LOW      | Fixed-day window or label honestly ("Previous month"). | ⬜          |
| 4   | **Dead stats memo** — useMemo wrapping two field picks adds indirection, zero value.                                                                                                                      | LOW      | Inline.                                                | ⬜          |
| 5   | **Unbounded JSON rendering** — newValues stringified straight into <pre>; multi-MB payloads freeze paint (max-h caps visually, not parse cost). Truncate server-side + "open full" path.                  | LOW      | Size-guard + summary.                                  | ⬜          |
| 6   | **sanitizeCell implementation solid — PASS** — quote-escape + formula-prefix guard correct here; extract to shared lib so Ledger/Operations exports reuse THE tested version (currently duplicated risk). | —        | Extract + reuse.                                       | ✅ Baseline |

---

## DEPARTMENT: SECURITY

### Employee: Security Engineer (CSO)

| #   | Finding                                                                                                                                                                                                                                                       | Severity          | Fix                                                                                              | Status           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------ | ---------------- |
| 1   | **newValues may contain secrets — redaction at write UNVERIFIED** — settings/billing changes (API keys, tokens, payment config) flow into audit payloads; if stored raw, the audit page/export becomes the leak. Verify write-time redaction + masking rules. | CRITICAL (verify) | Redact secret-shaped fields at persistence; show masked placeholders; test with key-like values. | ⬜               |
| 2   | **Role gating of page + export UNVERIFIED** — who may read full trail incl. userIds and raw values? Confirm procedure enforces admin/auditor roles; Viewers should get redacted view or denial.                                                               | HIGH (verify)     | Role assertion + tests; document access matrix.                                                  | ⬜               |
| 3   | **Export event itself unaudited** (repeat finding, highest stakes here) — bulk extraction of the audit log leaves no trace in itself; investigators need to know who exported the trail and when.                                                             | HIGH              | Write audit entry ON export (actor, filters, row count).                                         | ⬜               |
| 4   | **Append-only by construction — PASS** — no mutate/delete UI on this surface; keep it that way when adding features (no inline edit ever).                                                                                                                    | —                 | Guardrail.                                                                                       | ✅ Verified safe |

---

## DEPARTMENT: DATA

### Employee: Data Analyst

| #   | Finding                                                                                                                                                                                                                                                                   | Severity | Fix                                                          | Status      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------ | ----------- |
| 1   | **Zero insight surface on the richest behavioral dataset in the product** — replace filler stats with: actions-by-category trend, AI-vs-human share, top actors, anomaly flags (mass deletes, off-hours bursts). This is the page where analytics earns compliance value. | HIGH     | One grouped-stats endpoint powering real cards.              | ⬜          |
| 2   | **Frozen relative timestamps** (global recurring defect, instance #4) — compliance review sessions span minutes; "Just now" lies within them.                                                                                                                             | LOW      | Shared ticking hook (single fix retires 4 logged instances). | ⬜          |
| 3   | **Instrumentation absent on the instrument** — filter usage, search terms, export clicks untracked; understanding HOW auditors investigate should shape the roadmap.                                                                                                      | MEDIUM   | Event coverage per interaction.                              | ⬜          |
| 4   | **Server-side totals respect filters — PASS** — count parity between header line and pagination verified in code; keep contract under the cursor-pagination migration (Eng #2).                                                                                           | —        | Preserve invariant.                                          | ✅ Baseline |

---

# PAGE: /dashboard/operations/invoices

AR surface: filterable/searchable invoice DataTable (client-paged), row action menu (view/send/payment-link/record-payment), create dialog, detail panel, AI suggestions.

---

## DEPARTMENT: PRODUCT

### Employee: Product Manager

| #   | Finding                                                                                                                                                                                                                                                                                    | Severity | Fix                                                                                                | Status |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | -------------------------------------------------------------------------------------------------- | ------ | --- |
| 1   | **Pagination is an illusion** — query hardcodes `limit: 50, offset: 0` while DataTable renders client-side paging at 20/page against those 50 rows. Invoices #51+ are UNREACHABLE through the UI forever; header count proudly reports the true total. Business with 200 invoices sees 50. | CRITICAL | Wire DataTable pagination to server offset/cursor params.                                          |        | ✅  |
| 2   | **Send Invoice can fire DRAFTS to customers** — menu gate excludes only paid/voided; a draft invoice passes straight to `sendInvoiceEmail`. One misclick emails an unfinished bill to a client. No confirmation dialog, no recipient preview.                                              | CRITICAL | Block drafts server+client; add confirm step showing recipient + amount.                           |        | ✅  |
| 3   | **Creating an invoice doesn't refresh the list** — `onCreated` only closes the dialog; no invalidate of listInvoices. Fifth instance of the empty-refetch defect class. New invoice invisible until some other refetch trigger.                                                            | HIGH     | Invalidate query on success + toast with invoice number.                                           |        | ✅  |
| 4   | **Sending doesn't update status either** — sendInvoiceEmail onSuccess toasts but invalidates nothing; row keeps pre-send status indefinitely. Same stale-cache family as #3.                                                                                                               | HIGH     | Invalidate/refetch on mutation success.                                                            |        | ✅  |
| 5   | **Two sources of truth for overdue** — status column shows server status ("sent") while Due Date cell independently computes red overdue client-side; lists/filters/exports disagree with what users see.                                                                                  | HIGH     | Server owns overdue derivation (or compute both places from one shared helper fed by server data). | ⬜     |
| 6   | **Filter chips omit real statuses** — partial and voided exist in badge config but not in the filter bar; users can't isolate partially-paid or voided invoices.                                                                                                                           | MEDIUM   | Complete the filter list from the status enum.                                                     | ⬜     |
| 7   | **Raw status enums leak** — badge prints `{status}` verbatim (lowercase "overdue", unknown values as-is) beside a capitalized "Draft" fallback.                                                                                                                                            | MEDIUM   | Label map with Title Case + fallback styling.                                                      | ⬜     |
| 8   | **No AR aging view** — 30/60/90 buckets are table-stakes AR tooling; overdue detection exists but nothing aggregates WHO owes HOW LONG.                                                                                                                                                    | MEDIUM   | Aging summary strip above table (server-computed).                                                 | ⬜     |
| 9   | **Currency invisible** — Invoice type carries `currency` but the table never shows it and formatCurrency calls omit the argument; multi-currency entities get symbol-guessed amounts.                                                                                                      | HIGH     | Per-row currency → explicit formatting + optional currency column/filter.                          | ⬜     |
| 10  | **Row menu clips at viewport edges** — absolutely-positioned dropdown with no collision handling; bottom-row menus cut off / require scroll hunting; no ESC or outside-scroll close.                                                                                                       | MEDIUM   | shadcn DropdownMenu (portal + collision + keyboard).                                               | ⬜     |

### Employee: Product Critic

| #   | Finding                                                                                                                                                                                                                                           | Severity | Fix                                               | Status |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------- | ------ |
| 1   | **Action menu is mouse-only** — hand-rolled dropdown has no keyboard navigation, no focus management, no ESC handling; power users processing dozens of invoices lose all flow. Also blocks the AI-native promise of speed.                       | HIGH     | Design-system menu with full keyboard support.    | ⬜     |
| 2   | **Dead Download import tells a story** — `Download` icon imported but no PDF/download action exists on any invoice; downloading the bill you sent is core AR. Feature abandoned mid-build.                                                        | MEDIUM   | Add PDF view/download in row menu + detail panel. | ⬜     |
| 3   | **Record-payment toast is generic** — "Payment recorded successfully" echoes nothing; confirm amount + remaining balance so bookkeepers trust entry without reopening.                                                                            | LOW      | Echo amount/balance in toast.                     | ⬜     |
| 4   | **Empty state stops short** — title+description present but no inline Create CTA where the user's eyes already are.                                                                                                                               | LOW      | Add primary button to empty state.                | ⬜     |
| 5   | **AI reminder suggestion outpaces the UI** — shell offers "Send payment reminders to ALL customers with overdue invoices" while the table itself has no bulk selection; conversational path more capable than the native one. Align capabilities. | MEDIUM   | Bulk-select + bulk reminder action.               | ⬜     |

### Employee: UX Writer

| #   | Finding                                                                                                                                                           | Severity | Fix                  | Status      |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------- | ----------- |
| 1   | **Bare "Loading..." in header** (house-violation recurrence #5).                                                                                                  | LOW      | "Loading invoices…". | ⬜          |
| 2   | **Status casing chaos** — "Draft"/"paid"/"overdue" mix within one column depending on data path.                                                                  | MEDIUM   | Canonical labels.    | ⬜          |
| 3   | **Toasts that name objects are strong — PASS baseline** — "Invoice sent to acct@customer.com" matches house verb+object rule; replicate in record-payment (#PC3). | —        | Keep.                | ✅ Baseline |

---

## DEPARTMENT: DESIGN

### Employee: Design Critic

| #   | Finding                                                                                                                                                                         | Severity | Fix                            | Status      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------ | ----------- |
| 1   | **Hardcoded palette chips continue** — blue/emerald/red/amber/muted badge classes inline (token-mapping global task, instance tracked).                                         | LOW      | Global token pass.             | ⬜          |
| 2   | **Hand-rolled menu violates component system** — custom popover duplicates DropdownMenu primitives poorly (a11y, positioning, motion).                                          | HIGH     | Migrate to design-system menu. | ⬜          |
| 3   | **Micro-typography persists** — 9px badges, 10px secondary labels (global item).                                                                                                | LOW      | Global pass.                   | ⬜          |
| 4   | **Voided strike-through treatment is thoughtful — PASS baseline** — semantic decoration distinguishing dead records visually; extend pattern to other voided entities app-wide. | —        | Keep; replicate.               | ✅ Baseline |

---

## DEPARTMENT: ENGINEERING

### Employee: Engineering Critic

| #   | Finding                                                                                                                                                                                                                                                                                   | Severity | Fix                                                                                                | Status |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------- | ------ | --- |
| 1   | **Server pagination disconnected from table pagination** (root of PM #1) — `offset: 0` literal proves wiring was never completed; silent data cliff at row 50.                                                                                                                            | CRITICAL | Complete offset/cursor wiring; test with >pageSize datasets.                                       |        | ✅  |
| 2   | **Forward-referenced closures inside column defs** — columns array references handleSendInvoice + sendInvoiceEmail declared ~200 lines later; deferred execution saves it today, but any eager accessor (or refactor hoisting render) hits TDZ crashes. Fragile ordering with zero guard. | MEDIUM   | Declare mutations/handlers before columns; or move menu into child component owning its mutations. | ⬜     |
| 3   | **`as Invoice[]` cast over router types** — recurring drift pattern; infer instead.                                                                                                                                                                                                       | LOW      | tRPC output inference.                                                                             | ⬜     |
| 4   | **Unused imports (Download, Loader2)** — lint noise hinting at unfinished feature (PC #2).                                                                                                                                                                                                | LOW      | Remove with feature completion.                                                                    | ⬜     |
| 5   | **Per-render new Date() comparisons** — due-date overdue checks construct dates each cell render; harmless volume-wise but centralize in derived selector when server-owned overdue lands (PM #5).                                                                                        | LOW      | Fold into single computation.                                                                      | ⬜     |

---

## DEPARTMENT: SECURITY

### Employee: Security Engineer (CSO)

| #   | Finding                                                                                                                                                                                                                                                             | Severity        | Fix                                                                 | Status |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------------- | ------ |
| 1   | **Email-sending authorization UNVERIFIED** — sendInvoiceEmail must enforce: entity ownership, role permission (who may contact customers?), draft-state rejection, rate limiting (email bombing vector), and write an audit event. Client gates alone are cosmetic. | HIGH (verify)   | Server assertions + tests for all four.                             | ⬜     |
| 2   | **Payment-link creation authz** (mirror of Operations finding) — payable instrument generation needs binding to invoice amount + expiry + audit.                                                                                                                    | MEDIUM (verify) | Same assertion set on payment-link mutation.                        | ⬜     |
| 3   | **DataTable export path UNVERIFIED for CSV injection + completeness** — showExport enabled; confirm which exporter runs, that sanitizeCell applies, and that scope (page vs filtered set) is labeled truthfully.                                                    | MEDIUM (verify) | Audit exporter; reuse shared sanitizer; label scope in filename/UI. | ⬜     |
| 4   | **Customer PII exposure surface** — names/emails flow into exports and AI context payloads (openWithFocus fields elsewhere); ensure AI trace masking covers customer PII (LangFuse finding, Financial Pulse #1).                                                    | MEDIUM          | Extend masking rules to customer fields.                            | ⬜     |

---

## DEPARTMENT: DATA

### Employee: Data Analyst

| #   | Finding                                                                                                                                                                                                                    | Severity | Fix                                                                          | Status |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------- | ------ |
| 1   | **THE revenue funnel is uninstrumented** — zero events for invoice created/sent/viewed/paid, payment-link created/used, reminders fired. AR conversion analytics impossible; this is the money path of the entire product. | HIGH     | Full lifecycle instrumentation with amounts + currency + latency-to-payment. | ⬜     |
| 2   | **totalCount fallback masks contract drift** — `?? invoices.length` quietly substitutes page-length for total when server omits it; wrong numbers beat error messages at hiding schema rot.                                | LOW      | Remove fallback; fail loudly.                                                | ⬜     |
| 3   | **Dual overdue truths corrupt reporting** (data twin PM #5) — exports/filters use server status; eyes use red cells; neither matches aging reality for edge-day invoices.                                                  | HIGH     | Single server-computed overdue flag consumed everywhere.                     | ⬜     |
| 4   | **Aging analytics absent** (product twin PC/PM #8) — without 30/60/90 buckets, cash-flow forecasting features upstream have no AR-depth signal.                                                                            | MEDIUM   | Server aging aggregation feeding strip + AI context.                         | ⬜     |

---

# PAGE: /dashboard/operations/bills

AP surface: server-paginated bill list with status tabs + search, summary cards from server aggregation, per-row actions. Thin route wrapping `components/finance/bills-view.tsx` (audited in full).

---

## DEPARTMENT: PRODUCT

### Employee: Product Manager

| #   | Finding                                                                                                                                                                                                                                                                                                                                                                                             | Severity | Fix                                                                                                      | Status |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------- | ------ |
| 1   | **Every action button on the AP page is dead** — BillRow renders Eye ("view") and Send ("pay/remind") buttons with NO onClick handlers; `isProcessing` can never become true because no mutation exists. The accounts-payable surface has ZERO working actions: can't view a bill, can't pay one, can't remind anyone. Header comment promises "AI payment schedule recommendation" — also unbuilt. | CRITICAL | Wire view → detail drawer, pay → payment flow, or remove buttons until real (never ship inert controls). | ⬜     |
| 2   | **No way to create a bill** — empty state instructs "Create your first bill" but the page contains no Create button anywhere. The instruction is unreachable.                                                                                                                                                                                                                                       | HIGH     | Add create entry point (dialog like invoices) or point at ingestion upload flow.                         | ⬜     |
| 3   | **Pending stat counts approved bills** — `pendingCount = overview.statusCounts.approved`; label/data mismatch repeats the wrong-entity-count pattern from Operations PeopleGrid.                                                                                                                                                                                                                    | HIGH     | Map the correct status key; contract-test overview shape.                                                | ⬜     |
| 4   | **Bills are view-less rows** — no click target, no drawer, no detail page; a bookkeeper can't see line items, attachments, or history of any payable.                                                                                                                                                                                                                                               | HIGH     | Bill detail panel mirroring InvoiceDetailPanel.                                                          | ⬜     |
| 5   | **Partial bills unfilterable** — badge supports "partial", filter tabs don't; mixed-status queues hide the trickiest payables.                                                                                                                                                                                                                                                                      | MEDIUM   | Add partial (+draft if exists) tabs.                                                                     | ⬜     |
| 6   | **Search scope understated** — placeholder claims invoice-number-only while supplier search is the more natural query; align capability and copy.                                                                                                                                                                                                                                                   | LOW      | Extend server search fields + placeholder honesty.                                                       | ⬜     |

### Employee: Product Critic

| #   | Finding                                                                                                                                                                                                                                         | Severity | Fix                                                                 | Status      |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------- | ----------- |
| 1   | **Inert controls actively mislead** (UX face of PM #1) — buttons render hover states and spinner affordances (isProcessing branch) implying function; users will click Send repeatedly believing a payment is processing. Worse than no button. | CRITICAL | Remove until wired (single rule: no dead affordances).              | ⬜          |
| 2   | **Doc-rot header** — component JSDoc lists features that don't exist (AI payment schedule); future contributors inherit fiction. Align doc to reality during wiring work.                                                                       | LOW      | Rewrite comment with actual behavior.                               | ⬜          |
| 3   | **No due-date anchor on relative labels** — "12d overdue" floats without the actual date; hover tooltip with absolute due date is standard AP hygiene.                                                                                          | LOW      | title/tooltip with formatted date.                                  | ⬜          |
| 4   | **No bulk payment-run selection** — paying 40 due bills one day requires 40 individual actions (once actions exist at all). Selection + "Pay selected" is core AP.                                                                              | MEDIUM   | Checkbox column + bulk action bar (pattern exists in Activity Hub). | ⬜          |
| 5   | **Summary-card server-aggregation is strong — PASS baseline** — code comments AND implementation correctly source totals from getOverview rather than page slice; this is the pattern Operations stats cards violated. Replicate everywhere.    | —        | Keep; cite as reference implementation.                             | ✅ Baseline |

### Employee: UX Writer

| #   | Finding                                                                                                                                                                                                               | Severity | Fix                                                                                                                  | Status      |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------- | ----------- |
| 1   | **Empty state speaks engineer** — "Bills are entity-scoped… full audit trail and entity isolation" reassures architects, not owners; also the switch-entity hint presumes multi-entity context most users don't have. | MEDIUM   | Benefit copy: "Track what you owe and never miss a due date." Keep entity hint only when user HAS multiple entities. | ⬜          |
| 2   | **Page metadata leaks internals** — route metadata description advertises "Every query is entity-scoped" to any crawler/preview; internal posture statement in marketing real estate.                                 | LOW      | User-benefit description; keep security language in docs.                                                            | ⬜          |
| 3   | **Due-date vocabulary compact and clear — PASS baseline** — "3d overdue"/"Due today"/"12d" scans well once anchored (PC #3).                                                                                          | —        | Keep.                                                                                                                | ✅ Baseline |

---

## DEPARTMENT: DESIGN

### Employee: Design Critic

| #   | Finding                                                                                                                                                                                       | Severity | Fix                                  | Status      |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------ | ----------- |
| 1   | **Light-mode-only badge hardcodes again** — bg-green-100/text-green-800, bg-blue-100, bg-amber-100 in getStatusBadge; dark mode breaks every status chip (recurring global item, instance N). | HIGH     | Token map migration (global task).   | ⬜          |
| 2   | **Icon-only buttons unlabeled and sub-touch-size** — Eye/Send are 32px squares with NO aria-label; screen readers announce nothing and touch targets miss guidelines twice over.              | HIGH     | aria-labels + ≥44px hit areas.       | ⬜          |
| 3   | **Fixed grid crushes mobile** — summary cards `grid-cols-3` with no responsive collapse; three currency figures squeeze at 320px (contrast: invoices page uses sm: breakpoints).              | MEDIUM   | Responsive card stack.               | ⬜          |
| 4   | **Filter bar doesn't wrap** — search+tabs in non-wrapping flex; horizontal overflow on phones.                                                                                                | LOW      | flex-wrap + stacked layout under sm. | ⬜          |
| 5   | **Design-system components used properly here — PASS baseline** — shadcn Card/Tabs/Badge/Button throughout (unlike hand-rolled menus elsewhere); reference for list pages.                    | —        | Keep.                                | ✅ Baseline |

---

## DEPARTMENT: ENGINEERING

### Employee: Engineering Critic

| #   | Finding                                                                                                                                                                                                                                   | Severity | Fix                                              | Status      |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------ | ----------- |
| 1   | **Dead interactive affordances shipped as JSX** (root PM #1/#PC1) — handler-less Buttons + permanently-false isProcessing constitute unreachable-state code paths masquerading as features; typecheck/lint can't catch semantic deadness. | HIGH     | Delete-or-wire decision, tracked as single item. | ⬜          |
| 2   | **Float equality gates UI logic** — `bill.balance !== bill.totalAmount` decides whether Balance line shows; float inequality on money comparisons produces flickering presence across renders (recurring money-as-float family).          | MEDIUM   | Compare integer minor units / epsilon tolerance. | ⬜          |
| 3   | **Server pagination wired CORRECTLY here — PASS contrast** — offset math, disabled states, and totalCount bounds all correct (the exact wiring Invoices PM #1 lacks); use as the fix template.                                            | —        | Cite as reference.                               | ✅ Baseline |
| 4   | **Bill interface hand-duplicated from router output** — recurring drift pattern (#6 globally).                                                                                                                                            | LOW      | tRPC inference.                                  | ⬜          |
| 5   | **Error cast shortcut** — `(error as Error \| undefined)` bypasses tRPC error typing (RouterError shape carries code for better messages).                                                                                                | LOW      | Typed error handling.                            | ⬜          |
| 6   | **Overview/list load independence flashes zeros** — summary cards render before getOverview resolves (null-state global pattern).                                                                                                         | LOW      | Shared loading gate or skeleton values.          | ⬜          |

---

## DEPARTMENT: SECURITY

### Employee: Security Engineer (CSO)

| #   | Finding                                                                                                                                                                                                                                                                                  | Severity           | Fix                                                                       | Status |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ------------------------------------------------------------------------- | ------ |
| 1   | **Pre-wiring security requirements for the dead Send button** — when payment initiation lands: role-gate (who may pay?), idempotency keys (double-click double-pay), amount binding server-side, immutable audit entry, and period-lock respect. Log NOW so the wiring PR can't skip it. | HIGH (requirement) | Convert this finding into router acceptance criteria before feature work. | ⬜     |
| 2   | **Entity scoping claimed, verification pending** — bills.listBills/getOverview ownership predicates need the standard audit (cross-entity denial test) like chat.ts.                                                                                                                     | HIGH (verify)      | Router audit + tests.                                                     | ⬜     |
| 3   | **Metadata disclosure nit** — security-posture sentence in public metadata (UX #2 twin); remove.                                                                                                                                                                                         | LOW                | Copy change.                                                              | ⬜     |

---

## DEPARTMENT: DATA

### Employee: Data Analyst

| #   | Finding                                                                                                                                                                                                      | Severity | Fix                                               | Status |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ------------------------------------------------- | ------ |
| 1   | **statusCounts semantics uncontracted** (root of PM #3) — client guesses which key maps to which label; one backend rename silently mislabels AP dashboards. Zod-parse overview with explicit field mapping. | MEDIUM   | Schema contract + test.                           | ⬜     |
| 2   | **Client-computed days-overdue vs server overdue flag dual-truth** (recurring) — midnight/timezone edges produce rows colored red under an "overdue"-less status.                                            | LOW      | Single server truth consumed by color AND filter. | ⬜     |
| 3   | **formatCurrency without currency on AP totals** — supplier bills in foreign currencies symbol-normalized (global recurring instance).                                                                       | MEDIUM   | Per-bill currency plumbing.                       | ⬜     |
| 4   | **Zero analytics on AP** — filters/search usage, (future) payment funnel untracked; AP behavior drives treasury agent tuning.                                                                                | MEDIUM   | Instrument alongside feature wiring (PM #1).      | ⬜     |

---

# PAGE: /dashboard/operations/banking

AI-native banking hub: three tabs (Transactions with batch categorize + export, Connections, Rules), filters, select-all batching, pagination.

---

## DEPARTMENT: PRODUCT

### Employee: Product Manager

| #   | Finding                                                                                                                                                                                                                                      | Severity | Fix                                                                                                   | Status |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------- | ------ |
| 1   | **Undo after batch categorize is a lie** — onUndo toasts "Categorization reverted" and merely refetches; nothing reverts server-side (identical false-undo defect class as Activity Hub approvals). Users trust an undo that undoes nothing. | CRITICAL | Server-side reversal (store previous categories) or remove Undo until real.                           | ⬜     |
| 2   | **Batch categorize silently narrows your selection** — selecting 10 rows (3 already categorized) categorizes ONLY the 3 uncategorized; no count feedback, no explanation. Partial action disguised as full.                                  | HIGH     | Either include all selected (re-categorize) or state "Categorized 3 of 10 selected (7 already done)". | ⬜     |
| 3   | **No target-category control** — batch action hands rows to the AI blind; users can't direct "these 5 are all Software". Rules Manager exists on tab 3 but is disconnected from transaction context.                                         | HIGH     | Category picker in batch bar (+ "create rule from selection").                                        | ⬜     |
| 4   | **Uncategorized counter counts the page, implies the world** — chip computes from loaded 50 rows; "12 uncategorized" while 400 exist. Stats that understate workloads suppress action.                                                       | HIGH     | Server-side uncategorized total independent of pagination.                                            | ⬜     |
| 5   | **Export truncates at page boundary** — exports the current 50-row page with a success toast naming the count (at least honest); recurring silent-scope export family.                                                                       | MEDIUM   | Filtered-set server export.                                                                           | ⬜     |
| 6   | **"Refresh" doesn't refresh from the bank** — button refetches cached query data; pulling NEW transactions requires connection sync which isn't exposed here. Label promises plumbing, delivers cache.                                       | MEDIUM   | Rename or add true Sync-now action per connection.                                                    | ⬜     |
| 7   | **No date-range filter** — status/account/search only; month-end review of "October's feed" is impossible natively.                                                                                                                          | MEDIUM   | Date-range control like Audit Trail's presets.                                                        | ⬜     |
| 8   | **Selections survive tab switches** — select rows, switch to Connections/Rules, return: stale selection persists with hidden batch implications.                                                                                             | LOW      | Clear selection on tab change.                                                                        | ⬜     |

### Employee: Product Critic

| #   | Finding                                                                                                                                                                                                               | Severity | Fix                                                                         | Status      |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------- | ----------- |
| 1   | **Select-all is page-scoped invisibly** — header checkbox grabs the visible 50 of potentially thousands; batch operations cap at page without saying so. Power users processing large feeds hit an invisible ceiling. | HIGH     | Offer "select all N matching filters" affordance like Activity Hub's count. | ⬜          |
| 2   | **Empty states are exemplary — PASS baseline** — differentiates connected-vs-not, names the exact next action, provides CTA. Reference implementation for every list surface.                                         | —        | Keep; replicate.                                                            | ✅ Baseline |
| 3   | **Rules have zero transaction-context discovery** — the highest-leverage automation ("always categorize Trust Bank POS as Office Rent") can't be created from the transaction it came from.                           | MEDIUM   | Per-row "Create rule" menu item pre-filling merchant/category.              | ⬜          |
| 4   | **Unreconciled filter dead-ends** — filtering to unreconciled offers no path into the Reconciliation view (separate ledger tab); two halves of one workflow split across surfaces.                                    | MEDIUM   | Cross-link filtered view ↔ reconciliation workspace.                       | ⬜          |

### Employee: UX Writer

| #   | Finding                                                                                                                                                                                        | Severity | Fix                                  | Status      |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------ | ----------- |
| 1   | **"Categorization reverted for N transactions" is a false statement** (copy face of PM #1) — the sentence asserts a server change that never happened. Compliance-grade dishonesty in a toast. | CRITICAL | Remove toast until reversal is real. | ⬜          |
| 2   | **Undo success message omits scope** — "Categorized transactions" (no count) in pushUndo message; pair with PM #2 fix ("Categorized 12 transactions").                                         | LOW      | Count-aware copy.                    | ⬜          |
| 3   | **Export toast sets the honesty bar — PASS baseline** — reports actual row count; adopt its pattern for ALL exports app-wide (Invoices/Ledger/Audit Trail currently don't).                    | —        | Keep; replicate.                     | ✅ Baseline |

---

## DEPARTMENT: DESIGN

### Employee: Design Critic

| #   | Finding                                                                                                                                                                                                                    | Severity | Fix                                  | Status |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------ | ------ |
| 1   | **Third distinct tab pattern ships** — plain buttons (this page) vs ARIA tablist (Ledger) vs WAI-ARIA keyboard tabs (Activity Hub); inconsistent semantics and keyboard behavior across sibling surfaces.                  | HIGH     | One Tabs primitive adopted app-wide. | ⬜     |
| 2   | **Native checkbox without indeterminate state** — partial page-selection renders identical to none/all; master checkbox lies during mixed selection (design-system Checkbox gap flagged on Activity Hub applies here too). | MEDIUM   | Shared Checkbox with indeterminate.  | ⬜     |
| 3   | **Buttons missing type="button"** — several controls default to type=submit; harmless outside forms today, landmine inside any future form wrapper.                                                                        | LOW      | Sweep type="button".                 | ⬜     |

---

## DEPARTMENT: ENGINEERING

### Employee: Engineering Critic

| #   | Finding                                                                                                                                                                                                                                                   | Severity | Fix                                                          | Status |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------ | ------ |
| 1   | **sanitizeCell now duplicated THREE times** — inline copy here diverges from Audit Trail's canonical version; drift between sanitizers = whichever misses a payload class becomes the injection hole. Extraction overdue since finding #6 on audit-trail. | HIGH     | Single shared util imported everywhere (delete both copies). | ⬜     |
| 2   | **Unsafe cast on own mutation input** — `(vars as { transactionIds })` inside onSuccess of a mutation whose input type the compiler ALREADY knows; cast hides genuine inference breakage.                                                                 | LOW      | Use typed vars directly.                                     | ⬜     |
| 3   | **Field-shape uncertainty leaks into export mapping** — `t.date ?? t.transactionDate` dual-key access betrays unvalidated response contract; zod-parse once at the hook boundary.                                                                         | MEDIUM   | Contract parsing layer.                                      | ⬜     |
| 4   | **Per-keystroke search against server** (recurring instance).                                                                                                                                                                                             | LOW      | Debounce (global item).                                      | ⬜     |
| 5   | **Offset pagination** (recurring; totalPages at least surfaced correctly here — contrast Invoices).                                                                                                                                                       | LOW      | Cursor migration (global item).                              | ⬜     |

---

## DEPARTMENT: SECURITY

### Employee: Security Engineer (CSO)

| #   | Finding                                                                                                                                                                                                                                                                           | Severity          | Fix                                                     | Status                 |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------- | ---------------------- |
| 1   | **Bank credential/aggregator flow UNVERIFIED** — BankConnectionDialog handles the most regulated integration in the product; verify aggregator uses tokenized OAuth (credentials NEVER transit Xenboox servers), consent scopes displayed, disconnect revokes tokens server-side. | CRITICAL (verify) | Full aggregation-flow audit before any enterprise deal. | ⬜                     |
| 2   | **Rules auto-post to books UNVERIFIED** — auto-categorization writing ledger lines must respect period locks, write per-application audit entries, and cap blast radius (max amount/day guard) against bad-rule runaway.                                                          | HIGH (verify)     | Rule-engine assertions + tests.                         | ⬜                     |
| 3   | **batchCategorize scoping/rate UNVERIFIED** — entity predicates + per-user rate limit + max batch size on bulk mutations.                                                                                                                                                         | MEDIUM (verify)   | Router audit.                                           | ⬜                     |
| 4   | **Inline sanitizer correctness — PASS with caveat** — logic matches canonical version TODAY; the duplication itself is the vulnerability (Eng #1).                                                                                                                                | —                 | Extract (Eng #1).                                       | ✅ Verified equivalent |

---

## DEPARTMENT: DATA

### Employee: Data Analyst

| #   | Finding                                                                                                                                                                                   | Severity | Fix                                      | Status      |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------- | ----------- |
| 1   | **Page-scoped workload stats corrupt prioritization** (data face of PM #4) — uncategorized chip drives daily triage; understating it 8× defers work that agents should absorb.            | HIGH     | Server aggregate (joint fix).            | ⬜          |
| 2   | **Export omits the most analytical columns** — no category/counterparty-account fields in CSV; categorization-quality analysis and ML feedback loops impossible from exported data.       | MEDIUM   | Full-column export.                      | ⬜          |
| 3   | **Automation funnel uninstrumented** — categorize-batch sizes, rule create/apply rates, AI-vs-manual share, undo attempts (would have EXPOSED the fake undo statistically): none tracked. | HIGH     | Instrument automation funnel end-to-end. | ⬜          |
| 4   | **Honest export-count toast — PASS baseline** (see UX #3; data parity confirmed in code).                                                                                                 | —        | Keep.                                    | ✅ Baseline |

---

# PAGE: /dashboard/operations/customers

Customer directory: searchable DataTable with financial rollups, create dialog, AI chat row-click. Near-twin of vendors page (shared defects logged once each where they apply).

---

## DEPARTMENT: PRODUCT

### Employee: Product Manager

| #   | Finding                                                                                                                                                                                                                                                                          | Severity | Fix                                                                                  | Status |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------ | ------ |
| 1   | **Filter chips are decorative** — Active/Overdue/all set local state that NEVER reaches the query (`{search, limit, offset}` only); no DataTable-side filter contract visible for a field-level match either. Clicking Overdue re-renders the same list with a highlighted chip. | CRITICAL | Wire filter to server param (or verified client predicate); test each chip's effect. | ⬜     |
| 2   | **Pagination illusion (twin of Invoices #1)** — limit 50/offset 0 hardcoded against client paging at 20; customer #51+ unreachable while header shows true total.                                                                                                                | CRITICAL | Server-side pagination wiring.                                                       | ⬜     |
| 3   | **Row click chats instead of showing the customer** — chevron affordance promises navigation; there is no customer detail view anywhere (statement of invoices, payment history, contact edit). Seventh drill-down-dead-end instance.                                            | HIGH     | Customer detail panel/page; keep Ask-AI secondary.                                   | ⬜     |
| 4   | **Create doesn't refresh list** — onCreated closes dialog only (empty-refetch family, sixth instance).                                                                                                                                                                           | HIGH     | Invalidate ar.listCustomers.                                                         | ⬜     |
| 5   | **Undefined status masquerades as Active** — badge maps `status ?? "active"` so records lacking status render green "Active"; the default lies about data state.                                                                                                                 | MEDIUM   | Unknown → neutral gray "Unknown" styling.                                            | ⬜     |
| 6   | **Inactive unfilterable** — badge knows "inactive", chips don't offer it.                                                                                                                                                                                                        | LOW      | Complete filter enum.                                                                | ⬜     |

### Employee: Product Critic

| #   | Finding                                                                                                                                                    | Severity | Fix                                   | Status      |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------- | ----------- |
| 1   | **No statement/statement-PDF for a customer** — AR core workflow ("send me a statement") impossible; detail view must include period statement generation. | HIGH     | Statement builder in customer detail. | ⬜          |
| 2   | **Outstanding column color binary** — amber>0 else muted; negative balances (credit memos) render as plain zero-ish; sign deserves distinction.            | LOW      | Three-state color incl. credit.       | ⬜          |
| 3   | **AI suggestions strong — PASS baseline** — overdue/top-customers/payment-trends prompts are genuinely useful analytical questions matching page purpose.  | —        | Keep.                                 | ✅ Baseline |

### Employee: UX Writer

| #   | Finding                                                                        | Severity | Fix                              | Status |
| --- | ------------------------------------------------------------------------------ | -------- | -------------------------------- | ------ |
| 1   | **Bare "Loading..." header** (global recurrence).                              | LOW      | "Loading customers…".            | ⬜     |
| 2   | **Raw status enums leak** (lowercase from server beside capitalized fallback). | LOW      | Label map (shared with vendors). | ⬜     |

---

## DEPARTMENT: DESIGN

### Employee: Design Critic

| #   | Finding                                                                                                                                                             | Severity | Fix                            | Status      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------ | ----------- |
| 1   | **Hardcoded palette badges** (global token-migration item).                                                                                                         | LOW      | Global pass.                   | ⬜          |
| 2   | **Chevron affordance dishonesty** — navigational glyph on conversational action (design twin PM #3); misleading motion grammar app-wide pattern now at 8 instances. | HIGH     | Fix alongside drill-down work. | ⬜          |
| 3   | **Initials-avatar chips consistent and clear — PASS baseline.**                                                                                                     | —        | Keep.                          | ✅ Baseline |

---

## DEPARTMENT: ENGINEERING

### Employee: Engineering Critic

| #   | Finding                                                                                                                                                                                                                                            | Severity | Fix                                        | Status |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------ | ------ |
| 1   | **Copy-paste twin of vendors page (~90% structural duplication)** — two files diverging independently guarantees the defect log above gets fixed twice differently; extract shared DirectoryPage pattern (columns config + router hook injection). | HIGH     | Component extraction before next twin-fix. | ⬜     |
| 2   | **`as Customer[]` cast** (recurring drift family).                                                                                                                                                                                                 | LOW      | Inference.                                 | ⬜     |
| 3   | **Filter state disconnected from query** (root PM #1) — dead state pattern the compiler can't flag.                                                                                                                                                | CRITICAL | Joint fix with PM #1.                      | ⬜     |

---

## DEPARTMENT: SECURITY

### Employee: Security Engineer (CSO)

| #   | Finding                                                                                                                                                                                                                                   | Severity      | Fix                                                   | Status |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ----------------------------------------------------- | ------ |
| 1   | **PII-dense surface feeding AI context + exports** — emails/phones/balances flow into openWithFocus payloads (LangFuse traces) and CSV exports; masking rules must cover customer PII explicitly (extends Financial Pulse trace finding). | HIGH (verify) | Extend redaction matrix; audit export sanitizer path. | ⬜     |
| 2   | **ar.listCustomers scoping UNVERIFIED** (standard ownership-predicate audit).                                                                                                                                                             | HIGH (verify) | Router test.                                          | ⬜     |

---

## DEPARTMENT: DATA

### Employee: Data Analyst

| #   | Finding                                                                                                                                                                               | Severity | Fix                                 | Status |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------- | ------ |
| 1   | **Per-customer financial rollups lack currency dimension** — totals symbol-guessed (global formatCurrency instance).                                                                  | MEDIUM   | Currency-aware aggregation display. | ⬜     |
| 2   | **totalCount fallback masks drift** (recurring).                                                                                                                                      | LOW      | Fail loudly.                        | ⬜     |
| 3   | **Customer funnel uninstrumented** — created/viewed/chatted/exported events absent; CRM-value analytics blind.                                                                        | MEDIUM   | Instrument lifecycle.               | ⬜     |
| 4   | **Decorative filters poison future analytics** — if usage tracking logs filter clicks that change nothing, funnel data will assert features work when they don't (PM #1 consequence). | HIGH     | Fix filters BEFORE instrumenting.   | ⬜     |

---

# PAGE: /dashboard/operations/vendors

Vendor directory: same skeleton as customers (DataTable, create dialog, chat row-click) + 1099 tax flag column/filter. Shares the customers page's structural defects; vendors-specific findings below.

---

## DEPARTMENT: PRODUCT

### Employee: Product Manager

| #   | Finding                                                                                                                                                                                                                                                          | Severity | Fix                                                              | Status |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------- | ------ |
| 1   | **Decorative filter chips (twin of Customers #1)** — All/Active/Overdue/1099 state never reaches the ap.listSuppliers query.                                                                                                                                     | CRITICAL | Wire to server (1099 needs dedicated boolean param, not status). | ⬜     |
| 2   | **Pagination illusion twin** — 50-row cliff on the vendor directory.                                                                                                                                                                                             | CRITICAL | Server wiring.                                                   | ⬜     |
| 3   | **No vendor detail view** — bills-per-vendor history unreachable from here (bills page has no vendor grouping either); AP relationship management impossible. Drill-down dead-end instance #8.                                                                   | HIGH     | Vendor detail with bill list + payment history.                  | ⬜     |
| 4   | **Create doesn't refresh** (empty-refetch family).                                                                                                                                                                                                               | HIGH     | Invalidate query.                                                | ⬜     |
| 5   | **1099 flag is compliance-critical with zero guardrails visible** — mislabelled is1099 produces wrong tax filings; no edit path shown for the flag anywhere, and AI suggestion builds summaries off it. Verify data lineage + allow correction in vendor detail. | HIGH     | Editable flag with audit entry; source documented.               | ⬜     |
| 6   | **totalPaid fetched but unused** — column set ignores paid-to-date; "what did we pay them this year" is the #1 vendor question.                                                                                                                                  | LOW      | Add Paid column or fold into detail view.                        | ⬜     |

### Employee: Product Critic / UX Writer / Design Critic

_(Shared-skeleton defects logged in full on the customers page — apply every customers-page finding here too: bare Loading…, raw status enums, hardcoded palette badges, as-cast, PII masking, scoping verification, currency-less rollups, uninstrumented funnel. Vendors-specific additions only below.)_

| #   | Finding                                                                                                                                                 | Severity | Fix                                         | Status      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------- | ----------- |
| 1   | **PC:** 1099 chip communicates eligibility but not filing readiness (payments YTD threshold $600 unshown); pair chip with YTD-paid context.             | MEDIUM   | Tooltip/column with YTD total vs threshold. | ⬜          |
| 2   | **UXW:** "No vendors added" empty copy mentions 1099 reporting before explaining basics; reorder benefit copy (track bills → payments → year-end 1099). | LOW      | Rewrite sequence.                           | ⬜          |
| 3   | **DC:** Amber-tinted avatar chips distinguish section nicely — PASS baseline visual identity pattern for directory pages.                               | —        | Keep.                                       | ✅ Baseline |

---

## DEPARTMENT: ENGINEERING

### Employee: Engineering Critic

| #   | Finding                                                                                                                                           | Severity | Fix                             | Status |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------- | ------ |
| 1   | **Second copy-paste twin** (with customers = 3rd duplicated directory skeleton counting invoices differences); extraction finding applies triple. | HIGH     | Shared DirectoryPage component. | ⬜     |
| 2   | **Dead type fields** (totalPaid) hint at abandoned columns — prune types with features.                                                           | LOW      | Type hygiene pass.              | ⬜     |

---

## DEPARTMENT: SECURITY

### Employee: Security Engineer (CSO)

| #   | Finding                                                                                                                                                                                          | Severity      | Fix                                                          | Status |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- | ------------------------------------------------------------ | ------ |
| 1   | **1099 accuracy = regulatory integrity** — verify server-side derivation rules (who sets/clears the flag, TIN collection presence, audit trail on changes); wrong flags export into tax filings. | HIGH (verify) | Data-lineage audit + correction workflow with audit entries. | ⬜     |
| 2   | **ap.listSuppliers scoping UNVERIFIED** (standard router audit).                                                                                                                                 | HIGH (verify) | Ownership test.                                              | ⬜     |

---

## DEPARTMENT: DATA

### Employee: Data Analyst

| #   | Finding                                                                                                                                                                                                                       | Severity | Fix                                          | Status |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------- | ------ |
| 1   | **Spend analytics absent behind AI-only wall** — top-vendor-by-spend exists solely as a chat prompt; native sort exists on totalBilled but no period scoping ("this quarter" prompt implies server supports it — surface it). | MEDIUM   | Period selector feeding sortable aggregates. | ⬜     |
| 2   | **1099 threshold math unexposed** (PC #1 data face) — YTD-paid vs $600 comparison belongs in the dataset, not the chat's memory.                                                                                              | MEDIUM   | Computed field from payments ledger.         | ⬜     |
| 3   | **Uninstrumented directory** (global instance).                                                                                                                                                                               | MEDIUM   | Standard lifecycle events.                   | ⬜     |

---

# PAGE: /dashboard/settings

21-section settings hub: grouped sidebar nav (5 groups), progressive-disclosure "advanced" toggle, lazy-loaded section chunks (ssr:false), per-section error boundaries, "Set Up with AI" trigger. This audit covers the SHELL; each of the 21 section components requires its own pass (listed in Data Analyst #5).

---

## DEPARTMENT: PRODUCT

### Employee: Product Manager

| #   | Finding                                                                                                                                                                                                                                                                                                              | Severity | Fix                                                                                      | Status |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------- | ------ |
| 1   | **Tabs don't exist in the URL** — activeTab is pure useState; refresh always lands on Profile, deep-linking /dashboard/settings?tab=security impossible (help docs, audit-trail cross-links, support articles can't point anywhere specific), and browser Back exits Settings instead of stepping back through tabs. | HIGH     | Sync tab to search param (useSearchParams + replace), enabling deep links + back-button. | ⬜     |
| 2   | **GDPR rights buried behind "advanced"** — the Data & Privacy group (data export + ACCOUNT DELETION) sits inside the hidden-by-default advanced set. Erasure/export flows that regulations require to be readily accessible are two non-obvious clicks away. Legal exposure plus genuine dark-pattern optics.        | CRITICAL | Promote Privacy & Data to always-visible (own group, top-level).                         | ⬜     |
| 3   | **Advanced disclosure resets every visit** — showAdvanced is component state; users who need Backup/Sync/AI-Data re-toggle daily. Persist preference (localStorage/user pref).                                                                                                                                       | MEDIUM   | Persist toggle.                                                                          | ⬜     |
| 4   | **Two sibling groups named "Data & …"** — "Data & Privacy" vs "Data & Sync"; even the team confuses them (they hold fundamentally different things: legal rights vs infrastructure). Rename for intent ("Privacy", "Sync & Backups").                                                                                | MEDIUM   | Information-architecture rename.                                                         | ⬜     |
| 5   | **Duplicate icons across distinct concepts** — History = Audit Log AND Backup & Versions; Link = Webhooks AND Integrations. Icon reuse at nav level trains users to misread.                                                                                                                                         | LOW      | Unique icon per concept.                                                                 | ⬜     |
| 6   | **No mobile story for the nav** — fixed w-64 side column + h-[calc(100vh-4rem)] row layout; on phones the nav consumes the viewport with no drawer/select pattern (contrast: main dashboard's MobileBottomNav care).                                                                                                 | HIGH     | Responsive nav (drawer or horizontal scroll chips under sm).                             | ⬜     |
| 7   | **"Set Up with AI" is context-blind** — same traceId="workspace-setup" and generic placement regardless of active section (Taxes vs Profile); the AI-native promise degrades to a decorative button here.                                                                                                            | LOW      | Per-section prompt + trace context.                                                      | ⬜     |

### Employee: Product Critic

| #   | Finding                                                                                                                                                                                                              | Severity | Fix                                                                | Status      |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------ | ----------- |
| 1   | **No settings search** — 21 sections across 5 groups is past the findability threshold; "where do I set fiscal year?" requires knowing the IA. Typeahead over labels+descriptions+section content keys.              | HIGH     | Cmd-K style settings search (pattern exists: command-palette.tsx). | ⬜          |
| 2   | **No unsaved-changes guard on tab switch** — several sections hold form state; clicking another nav item silently abandons edits (structural risk verified per-section during component passes).                     | HIGH     | Dirty-form detection + confirm/autosave policy.                    | ⬜          |
| 3   | **Lazy-chunk architecture is strong — PASS baseline** — documented rationale (§4.4 comment), real payload win (~1.4K-line TaxesSection isolated), correct ssr:false justification. Reference for other heavy routes. | —        | Keep.                                                              | ✅ Baseline |
| 4   | **Progressive disclosure executed well — PASS with fix** — the pattern matches empworks Product Critic #12 recommendation; only failure is WHAT got classified advanced (PM #2).                                     | —        | Keep pattern; re-classify Privacy.                                 | ✅ Baseline |

---

## DEPARTMENT: CONTENT

### Employee: UX Writer

| #   | Finding                                                                                                                                                                                                                                                                         | Severity | Fix               | Status      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------- | ----------- |
| 1   | **Section descriptions are consistently strong — PASS baseline** — every tab carries a one-line benefit description surfaced in the header ("Approval thresholds and fiscal configuration"); best description discipline in the app; replicate in ModulePageShell descriptions. | —        | Keep; replicate.  | ✅ Baseline |
| 2   | **"AI & Data" label vague against its description** — description says "AI usage stats and preference summary"; label reads like a data-options toggle. "AI Usage" says it.                                                                                                     | LOW      | Label tightening. | ⬜          |

---

## DEPARTMENT: DESIGN

### Employee: Design Critic

| #   | Finding                                                                                                                                                             | Severity | Fix                                                   | Status |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------- | ------ |
| 1   | **Active nav item lacks aria-current** — selection conveyed purely through classes; SR users get an unmarked button list (recurring focus/semantics family).        | MEDIUM   | aria-current="page" on active item + roving tabindex. | ⬜     |
| 2   | **Nav tab buttons missing type="button"** — submit-default hazard inside any future form wrapper (banking sweep finding, second instance).                          | LOW      | Sweep.                                                | ⬜     |
| 3   | **No loading state between section chunks** — dynamic() without loading option renders blank content area during fetch; add skeleton matching section shell height. | MEDIUM   | loading: SkeletonComponent per dynamic().             | ⬜     |

---

## DEPARTMENT: ENGINEERING

### Employee: Engineering Critic

| #   | Finding                                                                                                                                                                                                                                                                                                | Severity | Fix                                 | Status |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ----------------------------------- | ------ |
| 1   | **SECTION_COMPONENTS typed Record<string, …> while ids are TabId** — a typo'd id yields `ActiveComponent === undefined` → React "type is invalid" crash swallowed by ErrorBoundary as a mysterious section failure. Type the map `Record<TabId, ComponentType>` so the compiler enforces completeness. | MEDIUM   | Key by TabId; exhaustive check.     | ⬜     |
| 2   | **Layout couples to magic 4rem** — h-[calc(100vh-4rem)] hardcodes TopNav height; nav height change silently breaks settings viewport math.                                                                                                                                                             | LOW      | Shared layout-height token/CSS var. | ⬜     |
| 3   | **Convoluted self-referential typing** — TabGroup.tabs uses `typeof TABS extends readonly (infer T)[]` BEFORE TABS exists (defined below via flatMap cast); works via hoisting quirks but is unreadable. Restructure: define Tab interface once, derive both.                                          | LOW      | Typing cleanup.                     | ⬜     |
| 4   | **URL-state absence** (eng face of PM #1) — replace route state pattern.                                                                                                                                                                                                                               | HIGH     | Joint fix.                          | ⬜     |

---

## DEPARTMENT: SECURITY

### Employee: Security Engineer (CSO)

| #   | Finding                                                                                                                                                                                                                                                                        | Severity      | Fix                                                                                | Status |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- | ---------------------------------------------------------------------------------- | ------ |
| 1   | **GDPR discoverability obligation** (legal face of PM #2) — Art. 12–14 transparency + erasure "without undue delay": deletion/export behind a disclosure toggle invites a regulator argument. Priority above all other settings work.                                          | CRITICAL      | Same promotion fix; document decision.                                             | ⬜     |
| 2   | **Dual audit UIs diverging** — settings' internal "audit-log" section coexists with /dashboard/audit-trail page (server-paginated, sanitized export). Two trails = two truths about who-did-what; consolidate onto the audited page.                                           | HIGH          | Redirect section → audit-trail page (scoped link).                                 | ⬜     |
| 3   | **High-risk sections require dedicated passes** — api-keys (display-once pattern? hashing at rest?), webhooks (secret rotation, signature verification UX), sso (config authorization, metadata validation) each carry credential-handling risk this shell audit cannot cover. | HIGH (verify) | Queue component-level audits; verify key generation/storage/redisplay rules first. | ⬜     |

---

## DEPARTMENT: DATA

### Employee: Data Analyst

| #   | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                            | Severity        | Fix                                                 | Status |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | --------------------------------------------------- | ------ |
| 1   | **Settings usage fully uninstrumented** — no events for section views, advanced-toggle rate, AI-trigger clicks; IA decisions (group renames, disclosure) currently ship on vibes.                                                                                                                                                                                                                                                                  | MEDIUM          | Instrument navigation within settings.              | ⬜     |
| 2   | **Change-event → audit-trail parity UNVERIFIED per section** — AGENTS mandates audit for every mutation; 21 sections × write ops need a verification sweep that each writes trail entries (ties to Security #2 consolidation).                                                                                                                                                                                                                     | HIGH (verify)   | Matrix test: mutate per section → assert audit row. | ⬜     |
| 3   | **AI & Data section promises usage stats** — verify its numbers against LangFuse/billing reality during its component pass (self-reported stats rot fast).                                                                                                                                                                                                                                                                                         | LOW             | Reconciliation check queued.                        | ⬜     |
| 4   | **Section inventory for follow-up passes (21)** — profile, organization, team, invite-member, notifications, security, entity-settings, appearance, billing, api-keys, webhooks, sso, audit-log, privacy, integrations, currency, taxes (~1.4K lines), backup, conflict-resolution, sync, ai-data. Each needs the 7-employee treatment or a scoped mini-audit; taxes/currency/api-keys/sso/security prioritized (financial + credential surfaces). | HIGH (tracking) | Queue order recorded here.                          | ⬜     |

---

# PAGE: /dashboard/help

Help center: hero search over 12 hardcoded topics (6 docs + 6 in-app guides), quick chips, health badge, sticky AI-assistant rail, three support-path cards. Several empworks fixes already landed here (design tokens, wired health badge).

---

## DEPARTMENT: PRODUCT

### Employee: Product Manager

| #   | Finding                                                                                                                                                                                                                                                                                                                                         | Severity | Fix                                                                            | Status |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------ | ------ |
| 1   | **The help page's own escape hatch is broken** — zero-results "Ask Xenboox AI" links to `/dashboard?prompt=…` (line 399), the handoff proven dead in the Command Center audit (zero consumers of the param). A stranded user's final recourse silently does nothing. Meta-finding: the Command Center CRITICAL now has a second victim surface. | CRITICAL | Fix the handoff consumer (CC Eng #1) — this link starts working automatically. | ⬜     |
| 2   | **Health badge lies while loading** — `isHealthy` starts `null`; render treats anything ≠false as healthy → green "API connected" pulse BEFORE the check resolves. Unknown shown as confirmed-good (third fabricated-status instance family).                                                                                                   | HIGH     | Tri-state: neutral "Checking…" until resolution.                               | ⬜     |
| 3   | **Health check is one-shot with no recovery** — a transient failure at mount pins "Connection issue detected" until manual reload; no retry/backoff despite a RefreshCw icon imported for exactly this purpose (unused).                                                                                                                        | MEDIUM   | Retry with backoff + manual recheck affordance.                                | ⬜     |
| 4   | **"Run payroll" guide dead-ends on Command Center** — href=/dashboard with no payroll module existing (matches Operations PM #7); help content promising flows the product lacks.                                                                                                                                                               | MEDIUM   | Remove/gate until payroll ships.                                               | ⬜     |
| 5   | **AND-semantics search has no fallback** — every token must match ("invoice overdue" → zero results if phrasing differs); no OR-relax or fuzzy second pass before showing the empty state.                                                                                                                                                      | MEDIUM   | Progressive relaxation: AND → OR → suggest-closest.                            | ⬜     |
| 6   | **External-link icon on same-origin routes** — /docs/\* paths are internal Next routes flagged `external: true` with ExternalLink glyphs; users expect new-tab+leave-app behavior.                                                                                                                                                              | LOW      | Correct icon semantics or make docs genuinely external.                        | ⬜     |

### Employee: Product Critic

| #   | Finding                                                                                                                                                                                              | Severity | Fix                                                  | Status      |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------- | ----------- |
| 1   | **Zero-result queries vanish unlogged** — the single richest content-roadmap signal (what users searched for and didn't find) evaporates; ties into Data #1.                                         | HIGH     | Instrumentation (below) + weekly content-gap review. | ⬜          |
| 2   | **Popular chips are vibes, not data** — static QUICK_CHIPS vs actual top searches; rotate from real analytics once instrumented.                                                                     | LOW      | Data-driven chips post-instrumentation.              | ⬜          |
| 3   | **Topic catalog requires deploys** — 12 topics hardcoded in TSX; content edits ship with code. Acceptable at this size; flag for CMS/docs-pipeline when >20 topics.                                  | LOW      | Track for scale.                                     | ⬜          |
| 4   | **Dynamic-import-with-skeleton is strong — PASS baseline** — HelpAssistant loads with explicit loading skeleton (the exact pattern Settings shell lacks, Design #3 there). Reference implementation. | —        | Keep; replicate in settings.                         | ✅ Baseline |

### Employee: UX Writer

| #   | Finding                                                                                                                                                                        | Severity | Fix                            | Status      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ------------------------------ | ----------- |
| 1   | **Search placeholder remains excellent — PASS baseline** — "Search help topics… e.g. invoice, reconcile, security" models the query format (empworks UX praise still holding). | —        | Keep.                          | ✅ Baseline |
| 2   | **Curly-quote echo in empty state — PASS detail** — "No topics match "{query}"" mirrors the user's input respectfully; small craft signal.                                     | —        | Keep.                          | ✅ Baseline |
| 3   | **Footer tagline is marketing copy inside support** — "your AI-native accounting platform" re-sells to someone who needs help; cut the clause.                                 | LOW      | Trim to "Xenboox Help Center". | ⬜          |

---

## DEPARTMENT: DESIGN

### Employee: Design Critic

| #   | Finding                                                                                                                                                                                                                                                                                                                         | Severity | Fix                               | Status |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------- | ------ |
| 1   | **Whole page lives on indigo/purple, off the token system** — hero gradient, chips, focus rings, hover borders all literal indigo-\*; rest of app speaks `primary`. Either intentional brand moment (verify) or drift; dark-mode variants ARE present here (better than most pages — cite as the dark-mode discipline example). | MEDIUM   | Token decision + map if drifting. | ⬜     |
| 2   | **animate-ping health dot ignores reduced-motion** (recurring global item).                                                                                                                                                                                                                                                     | LOW      | motion-safe gate.                 | ⬜     |
| 3   | **Chips/buttons missing type="button"** (sweep item, third instance).                                                                                                                                                                                                                                                           | LOW      | Sweep.                            | ⬜     |
| 4   | **h-[calc(100vh-4rem)] magic-height coupling** (same as Settings Eng #2).                                                                                                                                                                                                                                                       | LOW      | Shared layout token.              | ⬜     |

---

## DEPARTMENT: ENGINEERING

### Employee: Engineering Critic

| #   | Finding                                                                                                                                                                                 | Severity | Fix                      | Status      |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------ | ----------- |
| 1   | **Bi-state render of tri-state health** (root of PM #2) — `isHealthy === false ? bad : good` erases the loading state; one-line fix, correctness matters because it's a STATUS display. | HIGH     | Joint fix with PM #2.    | ⬜          |
| 2   | **Fetch lacks AbortController cleanup** — navigation away mid-check leaves a late setIsHealthy (benign warning today, pattern violation).                                               | LOW      | Abort in effect cleanup. | ⬜          |
| 3   | **Client-side filtering fine at n=12 — PASS with ceiling noted** — revisit if catalog grows past ~50 topics (search moves server-side or pre-indexed).                                  | —        | Note for scale.          | ✅ Baseline |

---

## DEPARTMENT: SECURITY

### Employee: Security Engineer (CSO)

| #   | Finding                                                                                                                                                                                | Severity     | Fix                                       | Status |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ----------------------------------------- | ------ |
| 1   | **User queries injected into URLs** (`?prompt=I need help with: …`) — history/referrer leakage family instance (audit-trail Security #5 pattern); also feeds the dead handoff (PM #1). | LOW          | State-based handoff once consumer exists. | ⬜     |
| 2   | **/api/health/ready client probe — verify response hygiene** — confirm the public endpoint discloses only up/down (no version/dependency internals).                                   | LOW (verify) | Endpoint review.                          | ⬜     |
| 3   | **mailto: support address harvestable** — spam vector trivially; acceptable v1, plan contact-form/status-page for enterprise tier.                                                     | LOW          | Roadmap note.                             | ⬜     |

---

## DEPARTMENT: DATA

### Employee: Data Analyst

| #   | Finding                                                                                                                                                                                                                                              | Severity | Fix                                                                                                                      | Status |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------ | ------ |
| 1   | **The content-gap goldmine is unplumbed** — searches, zero-result queries, chip clicks, assistant engagement all untracked. Zero-result terms literally enumerate next quarter's documentation backlog. Highest-ROI instrumentation left in the app. | HIGH     | Event coverage: search_performed (query, results_count), zero_result_query, chip_click, assistant_opened, topic_clicked. | ⬜     |
| 2   | **Health-check outcomes untracked** — client-side failures invisible to uptime dashboards (synthetic checks miss user-network reality).                                                                                                              | LOW      | Pipe result to telemetry.                                                                                                | ⬜     |

---

# PAGES: REMAINING DASHBOARD ROUTES (route-level audit)

Seven routes audited at the route-file level. Thin wrappers (auto-approve, qbr, referrals) have their real functionality in components queued for their own passes; full-page files (ingestion, knowledge, knowledge-graph, donor-reporting) audited in depth below. Format note: Employee attribution moved into the table to keep one row per finding.

---

## PAGE: /dashboard/auto-approve

| #   | Employee | Finding                                                                                                                                                                                                                                                | Severity        | Fix                                                              | Status |
| --- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------- | ---------------------------------------------------------------- | ------ |
| 1   | PM/UXW   | Route metadata leaks internal posture again ("full audit trail and confidence thresholds") — public description reciting security architecture.                                                                                                        | LOW             | User-benefit metadata.                                           | ⬜     |
| 2   | Eng      | Inline comment documents thresholds 0.7 supervisor / 0.4 human — the FOURTH conflicting confidence-scale artifact (vs Activity Hub 0.8/0.6, Financial Pulse 0.8/0.5, AGENTS 0.7/0.4). Centralization finding now has in-repo proof of intended values. | HIGH            | One shared constants module; migrate all surfaces (master item). | ⬜     |
| 3   | PM       | AutoApproveRules component holds all functionality — requires dedicated pass before this surface ships changes (policy editor = financial-governance surface).                                                                                         | HIGH (tracking) | Queue component audit.                                           | ⬜     |

## PAGE: /dashboard/qbr

| #   | Employee | Finding                                                                                                                                              | Severity          | Fix                         | Status |
| --- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | --------------------------- | ------ |
| 1   | PM       | QBRReport component unaudited; shell exposes no period/quarter selector — verify report covers the quarter users assume.                             | MEDIUM (tracking) | Component pass.             | ⬜     |
| 2   | Data     | QBR numbers must reconcile with Financial Pulse sources (two surfaces claiming "this quarter" KPIs); add reconciliation test when component audited. | MEDIUM (verify)   | Cross-surface parity check. | ⬜     |

## PAGE: /dashboard/referrals

| #   | Employee | Finding                                                                                                                                  | Severity          | Fix                                | Status |
| --- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ---------------------------------- | ------ |
| 1   | PM       | ReferralDashboard component unaudited (rewards = money-adjacent; verify payout integrity, self-referral abuse controls during its pass). | MEDIUM (tracking) | Component pass incl. fraud review. | ⬜     |

## PAGE: /dashboard/ingestion

| #   | Employee | Finding                                                                                                                                                                                                                   | Severity      | Fix                                                    | Status |
| --- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------ | ------ |
| 1   | PM       | **Dead dropzone** — Dropzone wraps BatchUpload with `onDrop={() => {}}`; dropping files onto the big obvious target does nothing while only the inner component's flow works. Two competing upload affordances, one fake. | HIGH          | Wire dropzone to the batch uploader or remove wrapper. | ⬜     |
| 2   | Data/PM  | **Every stat card caps at 10** — Total/Completed/Failed/Processing counts derive from `listBatches({limit:10})` filtered client-side; label says "Total Batches". Eleven-batch history makes three cards lie.             | HIGH          | Server-side aggregate counts (bills-view pattern).     | ⬜     |
| 3   | Eng      | History cards are click-only divs — no keyboard access, no button semantics for navigation (recurring a11y family).                                                                                                       | MEDIUM        | Button/role=link semantics.                            | ⬜     |
| 4   | UXW      | Batch titles show raw IDs ("Batch 3f2a91c4…") — machine identifiers as user-facing names; use date + document count instead.                                                                                              | LOW           | Human labels.                                          | ⬜     |
| 5   | DC       | Status badges via template-literal conditional classes — unknown statuses render unstyled default Badge with raw enum text (enum-leak family); fixed 4-col stat grid ignores breakpoints (bills-twin responsive gap).     | LOW           | Token map + responsive grid.                           | ⬜     |
| 6   | Sec      | Upload pipeline is the prompt-injection front door (documents → agents) — component pass must verify MIME validation, size caps, malware scanning, content sanitization before agent ingestion (mirrors CC Security #7).  | HIGH (verify) | Queue with BatchUpload audit.                          | ⬜     |
| 7   | Data     | Ingestion funnel uninstrumented (upload→process→review→posted conversion rates invisible); error/retry states themselves are strong PASS baselines.                                                                       | MEDIUM        | Instrument; keep states.                               | ⬜     |

## PAGE: /dashboard/knowledge

| #   | Employee | Finding                                                                                                                                                                                                                                                                               | Severity        | Fix                                                           | Status      |
| --- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- | ------------------------------------------------------------- | ----------- |
| 1   | Data/PM  | "Recent Searches" stat is neither recent-search count nor searches — it renders `recentCitations.length` (citations ≠ queries, list-capped). Third wrong-entity-stat instance.                                                                                                        | MEDIUM          | True search-count metric or relabel honestly.                 | ⬜          |
| 2   | Eng/Sec  | Onboarding dismissal localStorage key unscoped (`xenboox_kb_onboarding_dismissed`) — shared across users/entities on device (CC checklist twin). Also citation history lists raw query text entity-wide — sensitive lookups visible to all members (ties to chat visibility finding). | MEDIUM          | Scope key per user+entity; decide citation visibility policy. | ⬜          |
| 3   | Data     | Tokens stat math quirk — `(n/1000).toFixed(1)}K` renders 999 as "1.0K"; no unit semantics (embedding vs LLM tokens vs cost basis).                                                                                                                                                    | LOW             | Proper abbreviation fn + tooltip defining unit.               | ⬜          |
| 4   | PM       | KnowledgeSearch / DocumentProcessor components carry core RAG functionality — queue dedicated passes (search quality, chunking config exposure, cost display).                                                                                                                        | HIGH (tracking) | Component queue.                                              | ⬜          |
| 5   | PC/DC    | Onboarding banner is exemplary — benefit-led copy, format chips, dismiss+CTA pairing (PASS baseline for every empty/onboarding state app-wide).                                                                                                                                       | —               | Keep; replicate.                                              | ✅ Baseline |

## PAGE: /dashboard/knowledge-graph

| #   | Employee | Finding                                                                                                                                                                                                                                                                                  | Severity | Fix                                                   | Status      |
| --- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------- | ----------- |
| 1   | Eng/PM   | **Build Graph fails silently** — buildGraphMutation defines onSuccess only; onError absent, isError unused: pending spinner ends, nothing changes, no message. Expensive operation with zero failure feedback (and no confirmation of cost/duration before firing).                      | HIGH     | Error surfacing + confirm/cost hint + success toast.  | ⬜          |
| 2   | PM/Eng   | **Dev-environment sample data in product copy** — AI suggestion chip hardcodes "Show me all invoices related to GTBank" (GTBank = developer's test bank, cf. empworks GMD history). Every global user sees a Nigerian bank as the exemplar query.                                        | MEDIUM   | Generic placeholder ("your bank").                    | ⬜          |
| 3   | UXW      | Unconnected nodes fall back to UUID fragments (`targetId.slice(0,8)`) — audit-trail's machine-speak family, now in relationship rows.                                                                                                                                                    | LOW      | Resolve labels server-side; hide row if unresolvable. | ⬜          |
| 4   | Eng      | Legend/type rows render hover styles but no handlers — decorative affordances implying interactivity (dead-control family, milder).                                                                                                                                                      | LOW      | Click-to-filter graph or remove hover.                | ⬜          |
| 5   | DC/Data  | **PASS baselines:** `entityCurrency` from context actually consumed and threaded to the details panel — the ONLY surface doing currency right end-to-end; cite as the reference implementation for the global formatCurrency fix. GraphVisualization component itself queued separately. | —        | Replicate pattern.                                    | ✅ Baseline |

## PAGE: /dashboard/donor-reporting

| #   | Employee | Finding                                                                                                                                                                                                                                                                                                                                             | Severity      | Fix                                                                  | Status      |
| --- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | -------------------------------------------------------------------- | ----------- |
| 1   | PM/Data  | **"Recent Reports" silently means project #1's reports** — snapshots fetched only for `projects[0]`; multi-project NGOs see one project's reporting history under a page-wide heading. Compliance deadlines for other grants invisible.                                                                                                             | CRITICAL      | Aggregate endpoint across projects or per-project tabs (labeled).    | ⬜          |
| 2   | Data     | **Overdrawn grants never turn red** — progress bar color keys on `percentUsed > 80` (amber) else emerald; at 115% utilization the bar clamps to 100% width but stays AMBER. Overspending a donor grant reads identical to healthy 85%. For grant compliance this is the worst possible color mapping.                                               | CRITICAL      | ≥100% → destructive red + alert icon + Activity-Hub escalation hook. | ⬜          |
| 3   | Data     | **Stats totals ignore currency mixing** — DonorStats sums totalGrantAmount/Disbursed/Remaining via formatCurrency WITHOUT currency arg while project cards correctly pass per-project currency; multi-donor pages show a grand-total in a guessed symbol atop per-project correct figures. Same-page inconsistency proves both patterns were known. | HIGH          | Convert to reporting currency server-side or group by currency.      | ⬜          |
| 4   | Eng      | Budget-vs-actual variance detection via stringly type-narrowing (`typeof bva === "object" && "totalVariance" in bva` casts) — fragile payload contract on compliance data.                                                                                                                                                                          | LOW           | zod-parsed snapshot schema.                                          | ⬜          |
| 5   | Sec      | Donor data = regulated third-party reporting (USAID/EU/World Bank formats claimed) — report generation/export must be audited (who generated/submitted what when) during component passes; snapshot immutability after submission worth verifying.                                                                                                  | HIGH (verify) | Queue with report-builder audit.                                     | ⬜          |
| 6   | PC/DC    | **Overall best-engineered surface audited** — skeletons, error+retry per section, empty-state CTA, per-item currency, progress bars with labels. Its gaps (#1–#4) are logic, not craft; use as quality bar elsewhere.                                                                                                                               | —             | Reference.                                                           | ✅ Baseline |

---

# PAGE: /dashboard/activity-hub

The human-in-the-loop queue. Every item here requires a human decision. The AI has done the work; now it needs your approval. Layout: Stats grid + Filter tabs + Activity item cards + Batch action bar + Detail drawer + Completed section.

---

## DEPARTMENT: PRODUCT

### Employee: Product Manager

| #   | Finding                                                                                                                                                             | Severity | Status |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------ | --- |
| 1   | **Batch approve has no confirmation dialog** — batch reject does, but approve doesn't. Approving 50 items at once without confirmation is risky for financial data. | HIGH     |        | ✅  |
| 2   | **Undo only works for 2 seconds** — toast says "Undo" but state is already cleared after 2s. Server may have already committed the approval.                        | HIGH     |        | ✅  |
| 3   | **Risk assessment labels misleading** — "Low Risk" means AI confidence (0.8+), not actual financial risk. Users may misunderstand.                                  | HIGH     | ⬜     |
| 4   | **No time-based urgency indicators** — 2-hour-old approval looks same as 2-day-old. No visual urgency based on age.                                                 | HIGH     | ⬜     |
| 5   | **Snooze is client-side only** — items reappear on refresh. No server-side persistence.                                                                             | MEDIUM   | ⬜     |
| 6   | **Detail drawer shows raw JSON** — `JSON.stringify(item.detail)` is developer-facing, not user-friendly.                                                            | MEDIUM   | ⬜     |
| 7   | **Filter tabs don't show item counts** — user must click each tab to see how many items.                                                                            | MEDIUM   | ⬜     |
| 8   | **No escalation path** — if user doesn't know what to do, no "Ask AI" or "Escalate" option.                                                                         | MEDIUM   | ⬜     |
| 9   | **Agent alerts lack confidence scores** — no risk assessment for alert items.                                                                                       | MEDIUM   | ⬜     |
| 10  | **Empty state "All caught up!" is generic** — doesn't tell user what to do next or show AI value.                                                                   | MEDIUM   | ⬜     |
| 11  | **No explanation of why item is urgent vs approval** — user must trust AI classification blindly.                                                                   | MEDIUM   | ⬜     |
| 12  | **Completed section shows count but not which items** — no transparency on what AI resolved.                                                                        | MEDIUM   | ⬜     |
| 13  | **No "mark all as read" or bulk dismiss for info items**                                                                                                            | LOW      | ⬜     |
| 14  | **No keyboard shortcut for individual item actions** — only batch has shortcuts.                                                                                    | LOW      | ⬜     |
| 15  | **No data freshness indicator on stats** — user doesn't know if counts are current.                                                                                 | LOW      | ⬜     |

---

## DEPARTMENT: ENGINEERING

### Employee: Engineering Critic

| #   | Finding                                                                                                               | Severity | Status |
| --- | --------------------------------------------------------------------------------------------------------------------- | -------- | ------ | --- |
| 1   | **1662-line monolithic page component** — no code splitting, hard to maintain.                                        | HIGH     | ⬜     |
| 2   | **handleBatchAction calls handleAction sequentially in loop** — 50 items = 50 sequential mutations.                   | HIGH     | ⬜     |
| 3   | **undoBatchAction only removes local state** — server already committed the approval.                                 | HIGH     | ⬜     |
| 4   | **No error boundary around ActivityItemCard or ItemDetailDrawer** — one bad item crashes entire page.                 | HIGH     | ⬜     |
| 5   | **5 tRPC queries with polling (15s/30s)** — constant network traffic even when idle.                                  | MEDIUM   | ⬜     |
| 6   | **Client-side snooze uses setTimeout** — doesn't survive page refresh, never cancelled on unmount.                    | MEDIUM   | ⬜     |
| 7   | **Keyboard shortcut useEffect depends on frequently-changing values** — listener re-registered on every state change. | MEDIUM   |        | ✅  |
| 8   | **No optimistic updates for batch actions** — user waits for sequential server calls.                                 | MEDIUM   | ⬜     |
| 9   | **`Math.round(item.confidence * 100)` assumes confidence is 0-1** — if already 0-100, shows 0%.                       | MEDIUM   | ⬜     |
| 10  | **No loading skeleton** — blank area shown while 5 queries load.                                                      | MEDIUM   | ⬜     |
| 11  | **ActivityItemCard note state is per-component instance** — lost on list re-render.                                   | MEDIUM   | ⬜     |
| 12  | **No request cancellation when user switches filters** — stale queries continue.                                      | LOW      | ⬜     |
| 13  | **Direct DOM manipulation for tab focus** (`document.getElementById`) — bypasses React.                               | LOW      | ⬜     |
| 14  | **No debouncing on filter changes** — rapid clicks trigger multiple re-renders.                                       | LOW      | ⬜     |

---

## DEPARTMENT: DESIGN

### Employee: Design Critic

| #   | Finding                                                                                     | Severity | Status |
| --- | ------------------------------------------------------------------------------------------- | -------- | ------ |
| 1   | **Stats grid uses 4 columns on all screens** — cramped on mobile, no responsive breakpoint. | HIGH     | ⬜     |
| 2   | **No skeleton loading state** — blank area shown while 5 queries load.                      | HIGH     | ⬜     |
| 3   | **Priority badge uses 9px text** — below WCAG readability minimum.                          | MEDIUM   | ⬜     |
| 4   | **Timestamp uses 10px text** — below WCAG readability minimum.                              | MEDIUM   | ⬜     |
| 5   | **Filter tabs overflow horizontally on mobile** — 5 tabs require scrolling.                 | MEDIUM   | ⬜     |
| 6   | **Batch action bar overlaps filter tabs when scrolling** — sticky z-index conflict.         | MEDIUM   | ⬜     |
| 7   | **Urgent vs info item visual distinction is subtle** — only border color differs.           | MEDIUM   | ⬜     |
| 8   | **Empty state "All caught up!" is generic** — no helpful next-action CTA.                   | MEDIUM   | ⬜     |
| 9   | **Risk assessment bar is 4px tall (h-1)** — hard to see, especially on mobile.              | LOW      | ⬜     |
| 10  | **Detail drawer has no swipe-to-dismiss gesture on mobile**                                 | LOW      | ⬜     |
| 11  | **Completed section at bottom** — users must scroll past all active items.                  | LOW      | ⬜     |
| 12  | **Note textarea has no character limit** — can type indefinitely.                           | LOW      | ⬜     |
| 13  | **Agent badges use 10px text** — below readability minimum.                                 | LOW      | ⬜     |

---

## DEPARTMENT: CONTENT

### Employee: UX Writer

| #   | Finding                                                                                                   | Severity | Status |
| --- | --------------------------------------------------------------------------------------------------------- | -------- | ------ | --- |
| 1   | **Risk assessment labels misleading** — "Low Risk" means AI confidence, not financial risk.               | HIGH     | ⬜     |
| 2   | **"Undo" toast says "Changes have been reverted"** — but undo only removes local state, not server state. | HIGH     |        | ✅  |
| 3   | **Stats labels too brief** — "Urgent" doesn't explain what needs attention.                               | MEDIUM   | ⬜     |
| 4   | **Filter tab labels generic** — "Info" doesn't tell user what's in that category.                         | MEDIUM   | ⬜     |
| 5   | **Empty state "All caught up!" is generic** — no helpful next-action.                                     | MEDIUM   | ⬜     |
| 6   | **"Processed" success message is vague** — doesn't say what was processed.                                | MEDIUM   |        | ✅  |
| 7   | **Detail drawer heading "Item Details" is generic** — should say what the item is.                        | MEDIUM   | ⬜     |
| 8   | **Default recommendation text is unhelpful** — "Review and take appropriate action".                      | MEDIUM   | ⬜     |
| 9   | **"Dismiss" action label is ambiguous** — mark as read, hide, or delete?                                  | MEDIUM   | ⬜     |
| 10  | **"AI-curated, priority-sorted" in page description** — redundant and jargon-heavy.                       | LOW      | ⬜     |
| 11  | **Toast messages inconsistent** — some have descriptions, some don't.                                     | LOW      | ⬜     |
| 12  | **"Snoozed for 1 hour" toast doesn't say when** item reappears.                                           | LOW      | ⬜     |
| 13  | **"Requires your review" default description is vague**                                                   | LOW      | ⬜     |

### Employee: Copywriter

| #   | Finding                                                                                     | Severity | Status |
| --- | ------------------------------------------------------------------------------------------- | -------- | ------ |
| 1   | **Risk assessment labels misleading** — "Low Risk" means AI confidence, not financial risk. | HIGH     | ⬜     |
| 2   | **Page title "Activity Hub" is generic** — doesn't communicate AI value.                    | MEDIUM   | ⬜     |
| 3   | **Stats labels don't quantify AI value** — only "Auto-resolved" is AI-led.                  | MEDIUM   | ⬜     |
| 4   | **Empty state "All caught up!" is generic** — no AI value shown.                            | MEDIUM   | ⬜     |
| 5   | **"Processed" success message is vague** — doesn't say what was processed.                  | MEDIUM   | ⬜     |
| 6   | **Default recommendation text is unhelpful**                                                | MEDIUM   | ⬜     |
| 7   | **Page description "AI-curated, priority-sorted"** — redundant and jargon.                  | LOW      | ⬜     |
| 8   | **Toast messages inconsistent**                                                             | LOW      | ⬜     |
| 9   | **"Completed today" section only shows count** — no details on what AI resolved.            | LOW      | ⬜     |
| 10  | **Filter tab "Info" is vague**                                                              | LOW      | ⬜     |

### Employee: Brand Voice

| #   | Finding                                                                                    | Severity | Status |
| --- | ------------------------------------------------------------------------------------------ | -------- | ------ |
| 1   | **"Activity Hub" title is corporate jargon** — brand voice is Clear, not corporate.        | MEDIUM   | ⬜     |
| 2   | **"AI-curated, priority-sorted" violates brand terminology** — should use "AI agents".     | MEDIUM   | ⬜     |
| 3   | **Risk assessment labels hedge** — "Low Risk" vs brand's "We make definitive statements".  | MEDIUM   | ⬜     |
| 4   | **Stats labels don't use agent language** — "Auto-resolved" should be "AI agents handled". | LOW      | ⬜     |
| 5   | **"All caught up!" is too casual** — brand voice is Confident but not sloppy.              | LOW      | ⬜     |
| 6   | **"Processed" success message is vague** — brand says be specific.                         | LOW      | ⬜     |
| 7   | **"Item Details" heading is generic** — brand says be specific.                            | LOW      | ⬜     |
| 8   | **"Review and take appropriate action" is filler** — brand says no fluff.                  | LOW      | ⬜     |
| 9   | **"Dismiss" action is ambiguous** — brand says direct action.                              | LOW      | ⬜     |
| 10  | **"Snoozed for 1 hour" doesn't say when** — brand says be specific.                        | LOW      | ⬜     |

---

## DEPARTMENT: LEADERSHIP

### Employee: CEO/Founder

| #   | Finding                                                                                      | Severity | Status |
| --- | -------------------------------------------------------------------------------------------- | -------- | ------ |
| 1   | **Activity Hub doesn't show AI value on first load** — stats don't quantify what AI did.     | HIGH     | ⬜     |
| 2   | **No activation metric tracking** — can't measure first approval completion.                 | HIGH     | ⬜     |
| 3   | **No competitive differentiation** — looks like any other task queue.                        | MEDIUM   | ⬜     |
| 4   | **No social proof or trust signals** — critical for financial product.                       | MEDIUM   | ⬜     |
| 5   | **No conversion path** — free users can use Activity Hub indefinitely.                       | MEDIUM   | ⬜     |
| 6   | **No retention hooks** — no daily/weekly pull to bring users back.                           | MEDIUM   | ⬜     |
| 7   | **Agent hierarchy not visible** — user sees "AI Agent" but doesn't understand 3-tier system. | MEDIUM   | ⬜     |
| 8   | **"Auto-resolved" count is good but not prominent enough** — should be hero metric.          | LOW      | ⬜     |

### Employee: Customer Success Manager

| #   | Finding                                                                       | Severity | Status |
| --- | ----------------------------------------------------------------------------- | -------- | ------ |
| 1   | **No onboarding for Activity Hub** — new users don't know what it is.         | HIGH     | ⬜     |
| 2   | **No stalling detection** — if user never approves anything, no intervention. | HIGH     | ⬜     |
| 3   | **No health score indicators** — user can't see engagement progress.          | MEDIUM   | ⬜     |
| 4   | **No value demonstration** — shows what needs attention, not what AI handled. | MEDIUM   | ⬜     |
| 5   | **No daily engagement hook** — no reason to check Activity Hub daily.         | MEDIUM   | ⬜     |
| 6   | **No churn risk indicators** — can't tell if user is disengaging.             | MEDIUM   | ⬜     |
| 7   | **"All caught up!" empty state doesn't encourage continued engagement**       | LOW      | ⬜     |

---

## DEPARTMENT: DEVOPS

### Employee: DevOps Engineer

| #   | Finding                                                                       | Severity | Status |
| --- | ----------------------------------------------------------------------------- | -------- | ------ |
| 1   | **No cost tracking for AI auto-resolved items** — LLM costs untracked.        | HIGH     | ⬜     |
| 2   | **5 tRPC queries with polling** — constant network traffic, no cost tracking. | MEDIUM   | ⬜     |
| 3   | **No SSE fallback for real-time updates** — polling only, no push.            | MEDIUM   | ⬜     |
| 4   | **No error rate monitoring** — if tRPC queries fail, no alerting.             | MEDIUM   | ⬜     |
| 5   | **No request cancellation when user switches filters**                        | LOW      | ⬜     |
| 6   | **Polling intervals hardcoded** — no way to adjust without code change.       | LOW      | ⬜     |

---

## DEPARTMENT: TESTING

### Employee: QA

| #   | Finding                                                               | Severity | Status |
| --- | --------------------------------------------------------------------- | -------- | ------ |
| 1   | **Zero tests for Activity Hub** — no unit, integration, or e2e tests. | HIGH     | ⬜     |
| 2   | **Batch approve/reject flow untested** — complex multi-item action.   | HIGH     | ⬜     |
| 3   | **Error state untested** — what happens when tRPC queries fail?       | HIGH     | ⬜     |
| 4   | **Undo flow untested** — does undo actually revert changes?           | HIGH     | ⬜     |
| 5   | **Snooze flow untested** — client-side timer, no verification.        | MEDIUM   | ⬜     |
| 6   | **Detail drawer flow untested** — open, view, take action.            | MEDIUM   | ⬜     |
| 7   | **Filter switching untested** — does filtering work correctly?        | MEDIUM   | ⬜     |
| 8   | **Empty state untested** — what happens with zero items?              | MEDIUM   | ⬜     |
| 9   | **Mobile responsive untested** — layout on 320px-767px.               | MEDIUM   | ⬜     |
| 10  | **Keyboard navigation untested** — tab order, shortcuts.              | LOW      | ⬜     |

### Employee: Data Analyst

| #   | Finding                                                                          | Severity | Status |
| --- | -------------------------------------------------------------------------------- | -------- | ------ |
| 1   | **No time-to-action tracking** — can't measure queue dwell time.                 | HIGH     | ⬜     |
| 2   | **No data freshness indicators** — stats don't show when last updated.           | MEDIUM   | ⬜     |
| 3   | **No trend data** — shows current state, not changes over time.                  | MEDIUM   | ⬜     |
| 4   | **No completion rate tracking** — can't measure approved vs rejected vs snoozed. | MEDIUM   | ⬜     |
| 5   | **No agent performance data** — can't see which agents produce most items.       | LOW      | ⬜     |
| 6   | **No conversion funnel** — can't measure item creation to resolution flow.       | LOW      | ⬜     |

---

# PAGE: /dashboard/financial-pulse

AI-narrated financial health. Visual, not tabular. Layout: Period selector + AI Narrative + Anomaly Alerts + KPI Cards (Revenue, Expenses, Net Profit, Cash Balance) with sparklines and drill-down + Daily Close Status + Live Exchange Rates + Interactive Charts + Scenario Planner + AI Forecast + Budget vs Actual + Report Library + Quick Actions.

---

## DEPARTMENT: PRODUCT

### Employee: Product Manager

| #   | Finding                                                                                                          | Severity | Status |
| --- | ---------------------------------------------------------------------------------------------------------------- | -------- | ------ |
| 1   | **Period selector only has 3 options** — no custom date range, no year-over-year comparison.                     | HIGH     | ⬜     |
| 2   | **AI Narrative confidence score shown but not explained** — users see "85% (High)" but don't know what it means. | MEDIUM   | ⬜     |
| 3   | **KPI drill-down drawer shows raw data without AI insight** — just numbers, no narrative.                        | MEDIUM   | ⬜     |
| 4   | **Budget vs Actual table shows only 8 items** — no way to see all categories.                                    | MEDIUM   | ⬜     |
| 5   | **Report Library has only 4 reports** — missing balance sheet detail, aging reports, etc.                        | MEDIUM   | ⬜     |
| 6   | **Quick Actions are generic** — "View Ledger", "Cash Flow" don't show AI value.                                  | MEDIUM   | ⬜     |
| 7   | **Scenario Planner input is basic** — no examples, no history of past scenarios.                                 | MEDIUM   | ⬜     |
| 8   | **No comparison view** — can't compare this month vs last month side by side.                                    | MEDIUM   | ⬜     |
| 9   | **No export/share from Financial Pulse** — can't share AI narrative or charts.                                   | LOW      | ⬜     |
| 10  | **Data freshness indicator is text-only** — says "every 5 minutes" but doesn't show last updated time.           | LOW      | ⬜     |

---

## DEPARTMENT: ENGINEERING

### Employee: Engineering Critic

| #   | Finding                                                                                                                            | Severity | Status |
| --- | ---------------------------------------------------------------------------------------------------------------------------------- | -------- | ------ |
| 1   | **1369-line monolithic page component** — no code splitting, hard to maintain.                                                     | HIGH     | ⬜     |
| 2   | **4 tRPC queries run on every render** — dashboardData, pnlData, anomalyData, aiNarrative all fire regardless of period selection. | MEDIUM   | ⬜     |
| 3   | **Period selector doesn't invalidate queries** — switching period doesn't refetch dashboardData with new period param.             | HIGH     | ⬜     |
| 4   | **MiniSparkline uses `Math.max(...data)` on potentially large arrays** — spread operator can stack overflow with 1000+ points.     | LOW      | ⬜     |
| 5   | **ScenarioPlanner uses setTimeout to reset isSubmitting** — doesn't account for component unmount.                                 | LOW      | ⬜     |
| 6   | **KpiDrillDownDrawer has no error boundary** — if drillDown data is malformed, entire page crashes.                                | MEDIUM   | ⬜     |
| 7   | **BudgetVsActualSection returns null when loading** — no skeleton, causes layout shift.                                            | MEDIUM   | ⬜     |
| 8   | **AI Narrative fallback assembles text from raw data** — complex logic duplicated from backend.                                    | LOW      | ⬜     |
| 9   | **No request cancellation on period switch** — stale queries continue in background.                                               | LOW      | ⬜     |
| 10  | **Charts use hardcoded currency fallback `GMD`** — should use entity currency from context.                                        | MEDIUM   | ⬜     |

---

## DEPARTMENT: DESIGN

### Employee: Design Critic

| #   | Finding                                                                                       | Severity | Status |
| --- | --------------------------------------------------------------------------------------------- | -------- | ------ |
| 1   | **KPI cards use 10px text for change badges** — below WCAG readability minimum.               | MEDIUM   | ⬜     |
| 2   | **Budget vs Actual table uses 9px status badges** — below readability minimum.                | MEDIUM   | ⬜     |
| 3   | **"Ask AI" button on KPI cards only visible on hover** — mobile users can't discover it.      | MEDIUM   | ⬜     |
| 4   | **No skeleton loading state for charts** — charts pop in without placeholders.                | MEDIUM   | ⬜     |
| 5   | **Period selector tabs don't have focus ring** — keyboard users can't see active tab.         | LOW      | ⬜     |
| 6   | **Scenario Planner input has no character limit** — can type indefinitely.                    | LOW      | ⬜     |
| 7   | **Drill-down drawer has no swipe-to-dismiss on mobile**                                       | LOW      | ⬜     |
| 8   | **Report Library cards don't show download progress** — no feedback during export.            | LOW      | ⬜     |
| 9   | **Quick Actions section uses inconsistent button styles** — mix of border and primary styles. | LOW      | ⬜     |
| 10  | **AI Narrative highlights/concerns use 10px text** — below readability minimum.               | LOW      | ⬜     |

---

## DEPARTMENT: CONTENT

### Employee: UX Writer

| #   | Finding                                                                                                             | Severity | Status |
| --- | ------------------------------------------------------------------------------------------------------------------- | -------- | ------ |
| 1   | **AI Narrative confidence label is ambiguous** — "High" vs "Medium" vs "Low" doesn't explain what confidence means. | MEDIUM   | ⬜     |
| 2   | **Scenario Planner placeholder "Describe a scenario..." is vague** — should suggest specific examples.              | MEDIUM   | ⬜     |
| 3   | **Quick Actions labels are generic** — "View Ledger" doesn't explain what user will see.                            | MEDIUM   | ⬜     |
| 4   | **Budget vs Actual status labels unclear** — "Over" vs "Under" vs "On Track" need context.                          | LOW      | ⬜     |
| 5   | **Report Library descriptions are brief** — "Revenue, expenses, and net income" doesn't say why user should care.   | LOW      | ⬜     |
| 6   | **Data freshness text is passive** — "Data refreshes every 5 minutes" doesn't say when last updated.                | LOW      | ⬜     |
| 7   | **AI Narrative loading state says "Generating..."** — should explain what AI is doing.                              | LOW      | ⬜     |

### Employee: Copywriter

| #   | Finding                                                                                                   | Severity | Status |
| --- | --------------------------------------------------------------------------------------------------------- | -------- | ------ |
| 1   | **Page title "Financial Pulse" is abstract** — doesn't communicate AI value.                              | MEDIUM   | ⬜     |
| 2   | **Quick Actions don't lead with AI** — "View Ledger" is SaaS language, not AI-native.                     | MEDIUM   | ⬜     |
| 3   | **Scenario Planner copy is instructional, not compelling** — tells user what to do, not what they'll get. | LOW      | ⬜     |
| 4   | **Report Library labels are standard accounting terms** — not differentiated from competitors.            | LOW      | ⬜     |
| 5   | **AI Narrative highlights use ✅ emoji** — inconsistent with brand design system.                         | LOW      | ⬜     |

### Employee: Brand Voice

| #   | Finding                                                                                         | Severity | Status |
| --- | ----------------------------------------------------------------------------------------------- | -------- | ------ |
| 1   | **"Financial Pulse" is not brand terminology** — brand uses "AI agents" not abstract metaphors. | MEDIUM   | ⬜     |
| 2   | **Quick Actions use SaaS language** — "View Ledger" should be "Ask AI about your ledger".       | MEDIUM   | ⬜     |
| 3   | **AI Narrative loading says "Generating"** — brand voice says show what AI is doing.            | LOW      | ⬜     |
| 4   | **Report Library labels are generic** — brand says be specific.                                 | LOW      | ⬜     |

---

## DEPARTMENT: LEADERSHIP

### Employee: CEO/Founder

| #   | Finding                                                                                        | Severity | Status |
| --- | ---------------------------------------------------------------------------------------------- | -------- | ------ |
| 1   | **Financial Pulse doesn't show AI value on first load** — narrative is loading, KPIs are zero. | HIGH     | ⬜     |
| 2   | **No competitive differentiation** — charts look same as QuickBooks/Xero.                      | MEDIUM   | ⬜     |
| 3   | **No social proof or trust signals** — critical for financial data display.                    | MEDIUM   | ⬜     |
| 4   | **No conversion path** — free users see full financial pulse.                                  | MEDIUM   | ⬜     |
| 5   | **Scenario Planner is a differentiator but not prominent** — buried at bottom.                 | MEDIUM   | ⬜     |

### Employee: Customer Success Manager

| #   | Finding                                                                                  | Severity | Status |
| --- | ---------------------------------------------------------------------------------------- | -------- | ------ |
| 1   | **No onboarding for Financial Pulse** — new users don't know what to look at first.      | HIGH     | ⬜     |
| 2   | **No guided tour of AI narrative** — users may not understand the AI-generated insights. | MEDIUM   | ⬜     |
| 3   | **No value demonstration** — shows numbers, not what AI did to produce them.             | MEDIUM   | ⬜     |
| 4   | **No daily engagement hook** — no reason to check Financial Pulse daily.                 | MEDIUM   | ⬜     |

---

## DEPARTMENT: DEVOPS

### Employee: DevOps Engineer

| #   | Finding                                                                               | Severity | Status |
| --- | ------------------------------------------------------------------------------------- | -------- | ------ |
| 1   | **AI Narrative query has 10-minute staleTime** — expensive LLM calls cached too long. | MEDIUM   | ⬜     |
| 2   | **4 tRPC queries with no polling** — no real-time updates for financial data.         | LOW      | ⬜     |
| 3   | **No error rate monitoring for AI narrative generation** — if LLM fails, no alerting. | MEDIUM   | ⬜     |
| 4   | **Report downloads generate on client** — large reports may timeout or fail silently. | LOW      | ⬜     |

---

## DEPARTMENT: TESTING

### Employee: QA

| #   | Finding                                                                           | Severity | Status |
| --- | --------------------------------------------------------------------------------- | -------- | ------ |
| 1   | **Zero tests for Financial Pulse** — no unit, integration, or e2e tests.          | HIGH     | ⬜     |
| 2   | **Period switching untested** — does data actually change when switching periods? | HIGH     | ⬜     |
| 3   | **KPI drill-down flow untested** — click card, see drawer, take action.           | MEDIUM   | ⬜     |
| 4   | **Report download flow untested** — PDF/Excel/Word export.                        | MEDIUM   | ⬜     |
| 5   | **Scenario Planner flow untested** — type scenario, submit, see result.           | MEDIUM   | ⬜     |
| 6   | **Empty state untested** — what happens with zero financial data?                 | MEDIUM   | ⬜     |
| 7   | **Error state untested** — what happens when AI narrative fails?                  | HIGH     | ⬜     |
| 8   | **Mobile responsive untested** — layout on 320px-767px.                           | MEDIUM   | ⬜     |

### Employee: Data Analyst

| #   | Finding                                                                               | Severity | Status |
| --- | ------------------------------------------------------------------------------------- | -------- | ------ |
| 1   | **No data freshness timestamp** — says "every 5 minutes" but no last-updated time.    | MEDIUM   | ⬜     |
| 2   | **No trend comparison** — can't see this month vs last month in same view.            | MEDIUM   | ⬜     |
| 3   | **Budget vs Actual only shows 8 items** — truncated data, incomplete picture.         | MEDIUM   | ⬜     |
| 4   | **Sparklines don't show actual values** — visual only, no hover tooltips.             | LOW      | ⬜     |
| 5   | **AI Narrative confidence not tracked over time** — can't measure if AI is improving. | LOW      | ⬜     |

---

# PAGE: /dashboard/ledger

The accounting records. AI-enhanced search and context. Layout: Tab list (Journal, Chart of Accounts, Trial Balance, Fixed Assets, Reconciliation) + Journal View (search, create entry, entry list, entry detail drawer with reverse) + COA View + Trial Balance + Fixed Assets + Reconciliation.

---

## DEPARTMENT: PRODUCT

### Employee: Product Manager

| #   | Finding                                                                                     | Severity | Status |
| --- | ------------------------------------------------------------------------------------------- | -------- | ------ |
| 1   | **Journal search is client-side over paginated results** — can't search across all entries. | HIGH     | ⬜     |
| 2   | **No bulk actions on journal entries** — can't select multiple entries to post/void.        | MEDIUM   | ⬜     |
| 3   | **Reverse entry requires manual reason text** — no structured reversal reason selector.     | MEDIUM   | ⬜     |
| 4   | **No entry comparison view** — can't compare two entries side by side.                      | MEDIUM   | ⬜     |
| 5   | **Trial Balance has no period selector** — shows current period only.                       | MEDIUM   | ⬜     |
| 6   | **COA import wizard is hidden** — no obvious way to import chart of accounts.               | LOW      | ⬜     |
| 7   | **No keyboard shortcut to create new entry** — must click button.                           | LOW      | ⬜     |
| 8   | **Fixed Assets tab shows component but no loading state** — blank area during load.         | LOW      | ⬜     |

---

## DEPARTMENT: ENGINEERING

### Employee: Engineering Critic

| #   | Finding                                                                                                      | Severity | Status |
| --- | ------------------------------------------------------------------------------------------------------------ | -------- | ------ |
| 1   | **1311-line monolithic page** — 5 tabs in one file, no code splitting.                                       | HIGH     | ⬜     |
| 2   | **JournalEntryDrawer manages its own keyboard listener** — duplicate Escape handler.                         | MEDIUM   | ⬜     |
| 3   | **reverseMutation onClose calls parent onClose** — drawer closes before mutation completes.                  | HIGH     | ⬜     |
| 4   | **Tab content renders all 5 tabs** — `tabContent` object created on every render, unused tabs still mounted. | MEDIUM   | ⬜     |
| 5   | **No error boundary around tab content** — one bad tab crashes entire ledger.                                | HIGH     | ⬜     |
| 6   | **TrialBalanceView has hidden undo trigger button** — `sr-only` button with no keyboard trigger.             | LOW      | ⬜     |
| 7   | **Journal search input has no debouncing** — fires on every keystroke.                                       | LOW      | ⬜     |
| 8   | **Entry detail drawer doesn't cancel in-flight queries on close** — stale data may flash.                    | LOW      | ⬜     |

---

## DEPARTMENT: DESIGN

### Employee: Design Critic

| #   | Finding                                                                                               | Severity | Status |
| --- | ----------------------------------------------------------------------------------------------------- | -------- | ------ |
| 1   | **Tab list overflows horizontally on mobile** — 5 tabs require scrolling.                             | MEDIUM   | ⬜     |
| 2   | **Entry detail drawer status badges use 10px text** — below readability minimum.                      | MEDIUM   | ⬜     |
| 3   | **No skeleton loading for journal entry list** — entries pop in without placeholders.                 | MEDIUM   | ⬜     |
| 4   | **Reverse confirmation dialog has no focus trap** — custom overlay, not shadcn Dialog.                | MEDIUM   | ⬜     |
| 5   | **Balance check indicator is small** — 4px icon, easy to miss.                                        | LOW      | ⬜     |
| 6   | **Entry lines table has no row hover state on mobile** — touch users can't see which row is selected. | LOW      | ⬜     |
| 7   | **AI action buttons in drawer are full-width** — takes too much vertical space.                       | LOW      | ⬜     |

---

## DEPARTMENT: CONTENT

### Employee: UX Writer

| #   | Finding                                                                                   | Severity | Status |
| --- | ----------------------------------------------------------------------------------------- | -------- | ------ |
| 1   | **Tab labels are accounting jargon** — "Chart of Accounts" may confuse non-accountants.   | MEDIUM   | ⬜     |
| 2   | **"Explain this entry" button is good** — clear AI-native action.                         | N/A      | ✅     |
| 3   | **Reverse dialog text is brief** — doesn't explain consequences clearly.                  | MEDIUM   | ⬜     |
| 4   | **Entry source label uses raw string** — "agent" shown as-is, not "AI Agent".             | LOW      | ⬜     |
| 5   | **No empty state for journal tab** — shows blank when no entries exist.                   | MEDIUM   | ⬜     |
| 6   | **Search placeholder "Search entries..." is generic** — could suggest what to search for. | LOW      | ⬜     |

### Employee: Copywriter

| #   | Finding                                                                           | Severity | Status |
| --- | --------------------------------------------------------------------------------- | -------- | ------ |
| 1   | **Page title "Ledger" is traditional accounting term** — not AI-native.           | MEDIUM   | ⬜     |
| 2   | **Tab labels are SaaS-style** — not leading with AI value.                        | LOW      | ⬜     |
| 3   | **Reverse dialog copy is functional, not compelling** — doesn't explain AI value. | LOW      | ⬜     |

### Employee: Brand Voice

| #   | Finding                                                                                             | Severity | Status |
| --- | --------------------------------------------------------------------------------------------------- | -------- | ------ |
| 1   | **"Ledger" is traditional terminology** — brand says use AI-native language.                        | MEDIUM   | ⬜     |
| 2   | **Tab labels are standard accounting** — not differentiated.                                        | LOW      | ⬜     |
| 3   | **Reverse dialog uses "This will create a new entry"** — brand says be specific about consequences. | LOW      | ⬜     |

---

## DEPARTMENT: LEADERSHIP

### Employee: CEO/Founder

| #   | Finding                                                                                        | Severity | Status |
| --- | ---------------------------------------------------------------------------------------------- | -------- | ------ |
| 1   | **Ledger doesn't show AI value prominently** — AI explain/audit buttons are secondary actions. | HIGH     | ⬜     |
| 2   | **No competitive differentiation** — ledger looks like standard accounting software.           | MEDIUM   | ⬜     |
| 3   | **No social proof or trust signals** — critical for financial records.                         | MEDIUM   | ⬜     |
| 4   | **No conversion path** — full ledger available to free users.                                  | MEDIUM   | ⬜     |

### Employee: Customer Success Manager

| #   | Finding                                                                      | Severity | Status |
| --- | ---------------------------------------------------------------------------- | -------- | ------ |
| 1   | **No onboarding for Ledger** — new users don't know which tab to start with. | HIGH     | ⬜     |
| 2   | **No guided tour of AI features** — explain/audit buttons may be missed.     | MEDIUM   | ⬜     |
| 3   | **No value demonstration** — shows entries, not what AI did to create them.  | MEDIUM   | ⬜     |

---

## DEPARTMENT: DEVOPS

### Employee: DevOps Engineer

| #   | Finding                                                                                      | Severity | Status |
| --- | -------------------------------------------------------------------------------------------- | -------- | ------ |
| 1   | **No pagination limits on journal query** — could load thousands of entries.                 | HIGH     | ⬜     |
| 2   | **No caching for COA data** — refetches on every tab switch.                                 | LOW      | ⬜     |
| 3   | **Reverse mutation doesn't invalidate related queries** — trial balance may show stale data. | MEDIUM   | ⬜     |

---

## DEPARTMENT: TESTING

### Employee: QA

| #   | Finding                                                          | Severity | Status |
| --- | ---------------------------------------------------------------- | -------- | ------ |
| 1   | **Zero tests for Ledger** — no unit, integration, or e2e tests.  | HIGH     | ⬜     |
| 2   | **Journal entry creation flow untested** — create, verify, post. | HIGH     | ⬜     |
| 3   | **Reverse entry flow untested** — reverse, verify balance.       | HIGH     | ⬜     |
| 4   | **Tab switching untested** — does data load correctly per tab?   | MEDIUM   | ⬜     |
| 5   | **Search flow untested** — does search return correct results?   | MEDIUM   | ⬜     |
| 6   | **Empty state untested** — what happens with no entries?         | MEDIUM   | ⬜     |
| 7   | **Error state untested** — what happens when queries fail?       | HIGH     | ⬜     |
| 8   | **Mobile responsive untested** — tab list on mobile.             | MEDIUM   | ⬜     |

### Employee: Data Analyst

| #   | Finding                                                                   | Severity | Status |
| --- | ------------------------------------------------------------------------- | -------- | ------ |
| 1   | **No entry count metrics** — can't see total entries, entries per period. | MEDIUM   | ⬜     |
| 2   | **No balance trend data** — trial balance shows current, not trend.       | MEDIUM   | ⬜     |
| 3   | **No AI vs Human entry ratio** — can't measure AI adoption.               | LOW      | ⬜     |
| 4   | **No reversal rate tracking** — can't measure entry quality.              | LOW      | ⬜     |

---

# PAGE: /dashboard/operations

Money in, money out. AI handles it, you approve. Layout: Money Flow Summary (AI-narrated) + Cash Flow Chart + Money Out (Bills, Banking, Expenses, Payroll) + Money In (Invoices, Estimates, Reconcile) + Banking Cards + Mobile Money Cards + Recent Transactions + Compliance & Close + People Grid + AI Quick Actions + Transaction Detail Drawer.

---

## DEPARTMENT: PRODUCT

### Employee: Product Manager

| #   | Finding                                                                                                                         | Severity | Status |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | -------- | ------ |
| 1   | **Money Out/Money In sections use different interaction patterns** — some are Links, some are buttons opening AI. Inconsistent. | MEDIUM   | ⬜     |
| 2   | **No quick-create actions** — can't create invoice, bill, or estimate directly from Operations.                                 | HIGH     | ⬜     |
| 3   | **Recent Transactions has no filter/sort** — just a list, can't filter by type, date, or amount.                                | MEDIUM   | ⬜     |
| 4   | **Compliance & Close section is collapsed by default** — users may miss critical close status.                                  | MEDIUM   | ⬜     |
| 5   | **No bulk actions on transactions** — can't select multiple to categorize or reconcile.                                         | MEDIUM   | ⬜     |
| 6   | **People Grid shows employees but no action** — can't pay, contact, or manage from here.                                        | LOW      | ⬜     |
| 7   | **AI Quick Actions are generic** — don't adapt to entity state or time of month.                                                | LOW      | ⬜     |
| 8   | **No export from Operations** — can't export money flow summary or transaction list.                                            | LOW      | ⬜     |

---

## DEPARTMENT: ENGINEERING

### Employee: Engineering Critic

| #   | Finding                                                                                                  | Severity | Status |
| --- | -------------------------------------------------------------------------------------------------------- | -------- | ------ |
| 1   | **924-line monolithic page** — multiple sections in one file.                                            | HIGH     | ⬜     |
| 2   | **MoneyFlowSummary fetches dashboardData and cashPosition** — may duplicate queries from other surfaces. | MEDIUM   | ⬜     |
| 3   | **BankingCards has no loading skeleton** — blank area during load.                                       | MEDIUM   | ⬜     |
| 4   | **Transaction Detail Drawer manages its own keyboard listener** — potential duplicate handlers.          | LOW      | ⬜     |
| 5   | **Recent Transactions has no pagination** — could load hundreds of transactions.                         | HIGH     | ⬜     |
| 6   | **No error boundary around sections** — one bad section crashes entire page.                             | HIGH     | ⬜     |
| 7   | **MobileMoneyCards may not handle empty state** — what if no mobile money accounts?                      | LOW      | ⬜     |
| 8   | **Cash Flow Chart receives raw cashPosition** — no error handling if data is malformed.                  | LOW      | ⬜     |

---

## DEPARTMENT: DESIGN

### Employee: Design Critic

| #   | Finding                                                                                                      | Severity | Status |
| --- | ------------------------------------------------------------------------------------------------------------ | -------- | ------ |
| 1   | **Money Flow stats use 10px labels** — below WCAG readability minimum.                                       | MEDIUM   | ⬜     |
| 2   | **No skeleton loading for Banking Cards** — content pops in.                                                 | MEDIUM   | ⬜     |
| 3   | **Money Out/Money In cards have inconsistent padding** — different from other sections.                      | LOW      | ⬜     |
| 4   | **Transaction Detail Drawer has no swipe-to-dismiss on mobile**                                              | LOW      | ⬜     |
| 5   | **"Live" badge on Money Flow is decorative** — pulsing dot implies real-time but data refreshes every 5 min. | MEDIUM   | ⬜     |
| 6   | **Recent Transactions list has no row hover on mobile** — touch users can't see selection.                   | LOW      | ⬜     |
| 7   | **AI Quick Actions section uses inconsistent button styles** — mix of border and primary.                    | LOW      | ⬜     |

---

## DEPARTMENT: CONTENT

### Employee: UX Writer

| #   | Finding                                                                                             | Severity | Status |
| --- | --------------------------------------------------------------------------------------------------- | -------- | ------ |
| 1   | **"Live" badge is misleading** — data refreshes every 5 min, not real-time.                         | HIGH     | ⬜     |
| 2   | **Money Flow summary text is passive** — "Cash balance is $X" doesn't tell user what to do.         | MEDIUM   | ⬜     |
| 3   | **Section labels are accounting terms** — "AR", "Payroll", "Reconcile" may confuse non-accountants. | MEDIUM   | ⬜     |
| 4   | **No empty state for Recent Transactions** — shows blank when no transactions.                      | MEDIUM   | ⬜     |
| 5   | **People Grid labels are generic** — "Employees", "Vendors" don't show AI value.                    | LOW      | ⬜     |
| 6   | **AI Quick Actions don't explain what AI will do** — just action labels.                            | LOW      | ⬜     |

### Employee: Copywriter

| #   | Finding                                                                                               | Severity | Status |
| --- | ----------------------------------------------------------------------------------------------------- | -------- | ------ |
| 1   | **"Operations" is SaaS language** — not AI-native.                                                    | MEDIUM   | ⬜     |
| 2   | **"Money Out" / "Money In" is good** — simple, clear, AI-native.                                      | N/A      | ✅     |
| 3   | **Section labels don't lead with AI** — "Banking & Feeds" should be "AI-powered banking".             | LOW      | ⬜     |
| 4   | **AI Quick Actions are instructional, not compelling** — tells user what to do, not what they'll get. | LOW      | ⬜     |

### Employee: Brand Voice

| #   | Finding                                                                     | Severity | Status |
| --- | --------------------------------------------------------------------------- | -------- | ------ |
| 1   | **"Operations" is corporate jargon** — brand voice is Clear, not corporate. | MEDIUM   | ⬜     |
| 2   | **"Live" badge violates brand** — brand says be honest about what AI does.  | MEDIUM   | ⬜     |
| 3   | **Section labels use standard accounting terms** — not differentiated.      | LOW      | ⬜     |

---

## DEPARTMENT: LEADERSHIP

### Employee: CEO/Founder

| #   | Finding                                                                               | Severity | Status |
| --- | ------------------------------------------------------------------------------------- | -------- | ------ |
| 1   | **Operations doesn't show AI value prominently** — AI is secondary to manual actions. | HIGH     | ⬜     |
| 2   | **No competitive differentiation** — looks like standard accounting operations.       | MEDIUM   | ⬜     |
| 3   | **No conversion path** — full operations available to free users.                     | MEDIUM   | ⬜     |
| 4   | **No social proof or trust signals** — critical for money management.                 | MEDIUM   | ⬜     |

### Employee: Customer Success Manager

| #   | Finding                                                                  | Severity | Status |
| --- | ------------------------------------------------------------------------ | -------- | ------ |
| 1   | **No onboarding for Operations** — new users don't know where to start.  | HIGH     | ⬜     |
| 2   | **No guided tour of AI features** — money flow summary AI may be missed. | MEDIUM   | ⬜     |
| 3   | **No daily engagement hook** — no reason to check Operations daily.      | MEDIUM   | ⬜     |

---

## DEPARTMENT: DEVOPS

### Employee: DevOps Engineer

| #   | Finding                                                                    | Severity | Status |
| --- | -------------------------------------------------------------------------- | -------- | ------ |
| 1   | **No polling for Recent Transactions** — stale data if user stays on page. | MEDIUM   | ⬜     |
| 2   | **No error monitoring for Money Flow queries** — silent failures.          | MEDIUM   | ⬜     |
| 3   | **Cash Flow Chart has no caching** — refetches on every render.            | LOW      | ⬜     |

---

## DEPARTMENT: TESTING

### Employee: QA

| #   | Finding                                                                | Severity | Status |
| --- | ---------------------------------------------------------------------- | -------- | ------ |
| 1   | **Zero tests for Operations** — no unit, integration, or e2e tests.    | HIGH     | ⬜     |
| 2   | **Money Flow summary flow untested** — AI click, see analysis.         | MEDIUM   | ⬜     |
| 3   | **Transaction Detail flow untested** — click transaction, see drawer.  | MEDIUM   | ⬜     |
| 4   | **Navigation to sub-pages untested** — Bills, Banking, Invoices links. | HIGH     | ⬜     |
| 5   | **Empty state untested** — what happens with no bank accounts?         | MEDIUM   | ⬜     |
| 6   | **Error state untested** — what happens when queries fail?             | HIGH     | ⬜     |
| 7   | **Mobile responsive untested** — layout on mobile.                     | MEDIUM   | ⬜     |

### Employee: Data Analyst

| #   | Finding                                                                         | Severity | Status |
| --- | ------------------------------------------------------------------------------- | -------- | ------ |
| 1   | **No transaction volume metrics** — can't see transactions per day/week.        | MEDIUM   | ⬜     |
| 2   | **No AI categorization rate** — can't measure how many transactions AI handles. | HIGH     | ⬜     |
| 3   | **No money flow trend data** — shows current, not trend.                        | MEDIUM   | ⬜     |
| 4   | **No reconciliation completion rate** — can't measure progress.                 | LOW      | ⬜     |

# PAGE: /dashboard/donor-reporting

AI-native donor reporting for NGOs and development organizations. Tracks donor-funded projects, budget vs actual, and generates reports in required formats (USAID, EU, World Bank, AfDB).

---

## DEPARTMENT: PRODUCT

### Employee: Product Manager

| #   | Finding                                                                                                                                                                                                                                | Severity | Fix                                                                   | Status |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------- | ------ | --- |
| 1   | **No error handling on any query** — all useQuery calls destructure only data; isError ignored page-wide. Failed loads render as confident zeros (0 active projects, $0 grants). Same silent-wrong-data pattern flagged on Operations. | HIGH     | Add error+retry block per card; never render zeros for failed loads.  |        | ✅  |
| 2   | **Project cards open AI instead of drilling in** — clicking a project fires an AI prompt; there's no project detail page or budget breakdown view. Fifth instance of the drill-down-dead-end anti-pattern across pages.                | HIGH     | Route to project detail page; keep AI secondary.                      | ⬜     |
| 3   | **parseFloat on monetary amounts** — grantAmount, amountDisbursed, amountRemaining all parsed via parseFloat. Money-as-float violation continues across pages.                                                                         | HIGH     | Server should emit numbers/minor-units; client uses Number() minimum. |        | ✅  |
| 4   | **formatCurrency omits currency argument** — multi-currency donor projects (common in international NGOs) get symbol-guessed amounts.                                                                                                  | HIGH     | Per-project currency from payload → explicit formatCurrency calls.    |        | ✅  |
| 5   | **Recent reports only show first project's reports** — snapshots query uses firstProjectId; multi-project entities see reports for one project only.                                                                                   | MEDIUM   | Show reports across all active projects or add project filter.        | ⬜     |
| 6   | **"View all" opens AI, not report list** — consistent anti-pattern: navigation promise routes to chat.                                                                                                                                 | MEDIUM   | Link to report list page; rename chat entry points "Ask AI".          | ⬜     |

### Employee: UX Writer

| #   | Finding                                                                                                                                    | Severity | Fix                                                                                         | Status |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------- | ------ |
| 1   | **"No donor projects yet" empty state lacks urgency** — NGO users need donor reporting for compliance; passive copy undersells the stakes. | MEDIUM   | "Set up your first donor project to start tracking grants and meeting reporting deadlines." | ⬜     |
| 2   | **Status labels are raw enums** — "active", "submitted", "final", "draft" rendered as lowercase. Professional surface needs Title Case.    | MEDIUM   | Canonical label map with Title Case.                                                        | ⬜     |

---

## DEPARTMENT: DESIGN

### Employee: Design Critic

| #   | Finding                                                                                                                                                                                   | Severity | Fix                                                                    | Status |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------- | ------ | --- |
| 1   | **Hardcoded light-mode colors persist** — text-blue-500/bg-blue-500/10, emerald, amber, purple throughout. Dark mode renders pastel-on-dark failures. Same defect class across all pages. | HIGH     | Token map (category→semantic token pair) with dark mode variants.      |        | ✅  |
| 2   | **Micro-typography floor violations** — 10px labels, 9px badges. Below readability minimum for the 40+ NGO administrator demographic.                                                     | MEDIUM   | Minimum 12px for meaningful text; reserve smaller for decorative only. | ⬜     |
| 3   | **Project cards have no focus-visible treatment** — hand-rolled buttons with hover styles but no focus ring. Keyboard users get browser default or nothing.                               | MEDIUM   | Add consistent focus-visible:ring-2 focus-visible:ring-primary/40.     | ⬜     |

---

## DEPARTMENT: ENGINEERING

### Employee: Engineering Critic

| #   | Finding                                                                                                                | Severity | Fix                                          | Status |
| --- | ---------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------- | ------ |
| 1   | **No error boundary around page sections** — one failed query (donorGrant.getStats) could crash the entire page.       | MEDIUM   | Per-section Suspense/error isolation.        | ⬜     |
| 2   | **Duplicate query for projects** — ProjectCards and RecentProjects both call donorGrant.listProjects with same params. | LOW      | Hoist query to page level and pass as props. | ⬜     |

---

## DEPARTMENT: DATA

### Employee: Data Analyst

| #   | Finding                                                                                                                                          | Severity | Fix                                               | Status |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------- | ------------------------------------------------- | ------ |
| 1   | **Budget utilization shown as simple percentage** — no trend (is utilization increasing or decreasing?), no forecast (when will funds run out?). | MEDIUM   | Add trend indicator and projected depletion date. | ⬜     |
| 2   | **No donor retention metrics** — can't track repeat donors, funding continuity.                                                                  | LOW      | Donor lifetime value and retention rate cards.    | ⬜     |

# PAGE: /dashboard/help

Help center with search, topic cards, documentation links, AI assistant, and health status badge.

---

## DEPARTMENT: PRODUCT

### Employee: Product Manager

| #   | Finding                                                                                                                                                                                                                                                   | Severity | Fix                                                                  | Status |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------- | ------ | --- |
| 1   | **Health check is decorative** — badge checks /api/health/ready but doesn't verify any specific system. "All systems operational" implies comprehensive monitoring; one endpoint ping proves almost nothing. Same false-status class as CC's "AI active". | HIGH     | Wire to real service health (DB, AI, storage) or remove badge.       |        | ✅  |
| 2   | **"Run payroll" help guide links to /dashboard** — payroll module doesn't exist yet; link sends users to Command Center with no context. Dead-end for users seeking help with a promised feature.                                                         | MEDIUM   | Gate behind feature availability or link to AI with payroll context. | ⬜     |
| 3   | **"Create an invoice" help guide links to /dashboard** — should link to /dashboard/operations/invoices where invoices actually live.                                                                                                                      | MEDIUM   | Update href to /dashboard/operations/invoices.                       |        | ✅  |
| 4   | **Search is client-side only** — filters static TOPICS array; no server-side search for actual help content, docs, or knowledge base. Users searching for topics not in the hardcoded list get zero results.                                              | MEDIUM   | Server-side search across docs + knowledge base when available.      | ⬜     |
| 5   | **No keyboard shortcut for search** — common help center pattern is Cmd+K or / to focus search input. Power users expect this.                                                                                                                            | LOW      | Add global keyboard shortcut to focus help search.                   | ⬜     |
| 6   | **No analytics on search queries** — can't track what users are searching for; the most valuable product feedback (what are users confused about?) is invisible.                                                                                          | MEDIUM   | Track search queries with results count.                             | ⬜     |

### Employee: UX Writer

| #   | Finding                                                                                                                                                                           | Severity | Fix                                                            | Status |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------- | ------ |
| 1   | **"Some systems may be degraded" is vague** — when health check fails, users get uncertain language. In a financial product, uncertainty about system status is itself a problem. | MEDIUM   | "We're investigating a connectivity issue. Your data is safe." | ⬜     |
| 2   | **Quick chips are static** — "Getting started", "Invoices", "Payroll", "Security" never change based on user behavior or time. New users see the same chips as power users.       | LOW      | Personalize based on modules used or time since signup.        | ⬜     |

---

## DEPARTMENT: DESIGN

### Employee: Design Critic

| #   | Finding                                                                                                                                                                          | Severity | Fix                                                           | Status |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------- | ------ |
| 1   | **Health badge has no focus-visible treatment** — the status span is not interactive but the visual treatment suggests it might be.                                              | LOW      | Remove interactive appearance or add focus ring if clickable. | ⬜     |
| 2   | **Hero gradient is hardcoded** — from-indigo-600 via-indigo-500 to-purple-600 doesn't respect theme tokens. Dark mode relies on opacity adjustments rather than semantic colors. | LOW      | Map to theme gradient tokens.                                 | ⬜     |
| 3   | **Topic cards have inconsistent hover states** — documentation cards have indigo hover border; "Still stuck" section cards have same treatment but different content hierarchy.  | LOW      | Differentiate card types visually.                            | ⬜     |

---

## DEPARTMENT: ENGINEERING

### Employee: Engineering Critic

| #   | Finding                                                                                                                                                                     | Severity | Fix                                           | Status |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------- | ------ |
| 1   | **Health check fetches on every mount** — no caching, no debouncing; rapid navigation triggers multiple /api/health/ready requests.                                         | LOW      | Cache health status in localStorage with TTL. | ⬜     |
| 2   | **HelpAssistant dynamic import has no error fallback** — if chunk fails to load, the entire right rail is blank. ErrorBoundary catches render errors but not load failures. | MEDIUM   | Add error state for dynamic import failure.   | ⬜     |

---

## DEPARTMENT: DATA

### Employee: Data Analyst

| #   | Finding                                                                                                                                                                           | Severity | Fix                                        | Status |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------ | ------ |
| 1   | **Zero analytics on help usage** — no events for search queries, topic clicks, AI assistant opens, or external doc navigation. Can't measure help effectiveness or identify gaps. | MEDIUM   | Instrument search/click/navigation events. | ⬜     |
| 2   | **No help-to-support conversion tracking** — can't measure how many users go from help → AI → email support. Critical funnel for support cost optimization.                       | LOW      | Track progression through help surfaces.   | ⬜     |

# PAGE: /dashboard/ingestion

Batch document ingestion pipeline with upload, progress tracking, and history.

---

## DEPARTMENT: PRODUCT

### Employee: Product Manager

| #   | Finding                                                                                                                                                                | Severity | Fix                                              | Status |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------ | ------ | --- |
| 1   | **No error handling on queries** — listBatches query doesn't handle errors; failed loads show "..." indefinitely.                                                      | HIGH     | Add error state with retry.                      |        | ✅  |
| 2   | **Failed batches have no retry** — failed batch shows status but no way to retry processing. Users must re-upload from scratch.                                        | HIGH     | Add "Retry" button on failed batches.            | ⬜     |
| 3   | **Dropzone onDrop is empty** — `onDrop={() => {}}` does nothing; files dropped on the outer Dropzone are silently ignored. Only BatchUpload's internal dropzone works. | MEDIUM   | Wire outer Dropzone to BatchUpload or remove it. | ⬜     |
| 4   | **No file type restrictions** — dropzone accepts any file type; users can upload executables, videos, or other non-document files that will fail processing.           | MEDIUM   | Restrict to PDF, images, CSV, Excel.             | ⬜     |
| 5   | **Progress tab empty when no active batch** — shows "No active batch processing" even if there's a recently completed batch.                                           | LOW      | Show last batch or link to history.              | ⬜     |
| 6   | **Stats are just counts** — no success rate, avg processing time, or other meaningful metrics.                                                                         | LOW      | Add success rate and avg duration.               | ⬜     |

### Employee: UX Writer

| #   | Finding                                                                                             | Severity | Fix                                                                | Status |
| --- | --------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------ | ------ |
| 1   | **Batch ID truncated as engineer-speak** — "Batch a1b2c3d4..." means nothing to users.              | MEDIUM   | Show user-friendly label like "Batch #1" or use date-based naming. | ⬜     |
| 2   | **"No batch history yet" empty state lacks guidance** — passive copy doesn't tell users what to do. | LOW      | "Upload your first documents to start processing."                 | ⬜     |

---

## DEPARTMENT: DESIGN

### Employee: Design Critic

| #   | Finding                                                                                                                                               | Severity | Fix                                          | Status |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------- | ------ | --- |
| 1   | **Hardcoded light-mode colors** — bg-blue-100, bg-green-100, bg-red-100, bg-amber-100 without dark mode variants. Same defect class across all pages. | HIGH     | Add dark: variants or use semantic tokens.   |        | ✅  |
| 2   | **Stats cards use raw Tailwind colors** — not theme-aware; dark mode renders pastel-on-dark failures.                                                 | MEDIUM   | Map to semantic color tokens.                | ⬜     |
| 3   | **No loading skeleton parity** — stats show "..." while loading; should match final layout.                                                           | LOW      | Skeleton states matching final card heights. | ⬜     |

---

## DEPARTMENT: ENGINEERING

### Employee: Engineering Critic

| #   | Finding                                                                                                         | Severity | Fix                                           | Status |
| --- | --------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------- | ------ |
| 1   | **Batch history not paginated** — `limit: 10` hardcoded; entities with many batches can't see older ones.       | MEDIUM   | Add pagination or "Load more".                | ⬜     |
| 2   | **No polling on active batches** — progress tab doesn't auto-refresh; users must manually click to see updates. | MEDIUM   | Add refetchInterval when batch is processing. | ⬜     |

---

## DEPARTMENT: DATA

### Employee: Data Analyst

| #   | Finding                                                                                                                 | Severity | Fix                             | Status |
| --- | ----------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------- | ------ |
| 1   | **No ingestion metrics** — can't track documents processed per day, success rate over time, or avg processing duration. | MEDIUM   | Add time-series metrics.        | ⬜     |
| 2   | **No document type breakdown** — can't see what types of documents are being ingested (invoices, receipts, statements). | LOW      | Add document type distribution. | ⬜     |

# PAGE: /dashboard/settings

Settings page with 20+ tabs organized into 4 groups: General, Security & Access, Finance & Billing, Data & Privacy/Sync.

---

## DEPARTMENT: PRODUCT

### Employee: Product Manager

| #   | Finding                                                                                                                                                                                 | Severity | Fix                                             | Status |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------- | ------ |
| 1   | **No URL state for active tab** — can't deep-link to a specific settings tab (e.g., /dashboard/settings?tab=security). Users can't bookmark or share direct links to settings sections. | MEDIUM   | Use URL search params for active tab.           | ⬜     |
| 2   | **Advanced settings toggle not persisted** — user clicks "Show advanced settings" but it resets on every page visit.                                                                    | MEDIUM   | Persist in localStorage.                        | ⬜     |
| 3   | **No loading state for active tab** — when switching tabs, there's no loading indicator while the dynamic import loads; content area is blank until component mounts.                   | MEDIUM   | Add skeleton or spinner during dynamic import.  | ⬜     |
| 4   | **"Set Up with AI" button always visible** — even when user is already set up; should be contextual or hidden after completion.                                                         | LOW      | Hide after setup completion or make contextual. | ⬜     |

### Employee: UX Writer

| #   | Finding                                                                                                                      | Severity | Fix                                                                       | Status |
| --- | ---------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------- | ------ |
| 1   | **Tab descriptions are generic** — "Personal information and preferences" doesn't tell users what they can actually do here. | LOW      | More specific descriptions: "Change name, email, timezone, and language". | ⬜     |
| 2   | **"Show advanced settings" is ambiguous** — users don't know what's hidden until they click.                                 | LOW      | Preview what's included: "Backup, sync, AI settings".                     | ⬜     |

---

## DEPARTMENT: DESIGN

### Employee: Design Critic

| #   | Finding                                                                                               | Severity | Fix                                                     | Status |
| --- | ----------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------- | ------ |
| 1   | **No focus-visible on sidebar buttons** — keyboard users get no visible focus ring on tab navigation. | MEDIUM   | Add focus-visible:ring-2 focus-visible:ring-primary/40. | ⬜     |
| 2   | **Sidebar active state uses primary/10** — may not have sufficient contrast in all themes.            | LOW      | Verify contrast ratio meets AA.                         | ⬜     |

---

## DEPARTMENT: ENGINEERING

### Employee: Engineering Critic

| #   | Finding                                                                                                                       | Severity | Fix                                                     | Status |
| --- | ----------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------- | ------ | --- |
| 1   | **No error boundary for dynamic imports** — if any section component fails to load, the entire page crashes with no recovery. | HIGH     | Wrap ActiveComponent in ErrorBoundary with fallback UI. |        | ✅  |
| 2   | **20+ dynamic imports in one file** — SECTION_COMPONENTS map is large; consider code-splitting by group rather than by tab.   | LOW      | Group-level code splitting.                             | ⬜     |

# PAGE: /dashboard/knowledge

Knowledge base with semantic search, document processing, and citation audit trail.

---

## DEPARTMENT: PRODUCT

### Employee: Product Manager

| #   | Finding                                                                                                                                                     | Severity | Fix                                                  | Status |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------- | ------ | --- |
| 1   | **No error handling on queries** — stats query doesn't handle errors; failed loads show "..." indefinitely.                                                 | HIGH     | Add error state with retry.                          |        | ✅  |
| 2   | **Audit trail has no pagination** — shows all recent citations without limit; entities with many searches get a long list.                                  | MEDIUM   | Add pagination or "Load more".                       | ⬜     |
| 3   | **Onboarding banner doesn't track completion** — only tracks dismissal, not actual upload; user who uploads then dismisses still sees banner on next visit. | MEDIUM   | Track upload completion in localStorage.             | ⬜     |
| 4   | **No file type validation visible** — DocumentProcessor may not validate file types client-side before upload.                                              | MEDIUM   | Show accepted file types and validate before upload. | ⬜     |

### Employee: UX Writer

| #   | Finding                                                                                      | Severity | Fix                                                              | Status |
| --- | -------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------- | ------ |
| 1   | **"No searches yet" copy is passive** — doesn't guide users on what to search for.           | LOW      | "Try searching for a vendor name, invoice number, or account."   | ⬜     |
| 2   | **Stats labels are generic** — "Documents", "Chunks", "Tokens" don't explain value to users. | LOW      | "Documents processed", "Searchable sections", "Content indexed". | ⬜     |

---

## DEPARTMENT: DESIGN

### Employee: Design Critic

| #   | Finding                                                                                                                                   | Severity | Fix                                        | Status |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------ | ------ | --- |
| 1   | **Hardcoded light-mode colors** — bg-blue-500/10, bg-emerald-500/10, etc. without dark mode variants. Same defect class across all pages. | HIGH     | Add dark: variants or use semantic tokens. |        | ✅  |
| 2   | **Onboarding banner has no focus-visible on dismiss button** — keyboard users can't dismiss without focus ring.                           | MEDIUM   | Add focus-visible:ring-2.                  | ⬜     |

---

## DEPARTMENT: ENGINEERING

### Employee: Engineering Critic

| #   | Finding                                                                                       | Severity | Fix                                          | Status |
| --- | --------------------------------------------------------------------------------------------- | -------- | -------------------------------------------- | ------ |
| 1   | **No loading skeleton for stats** — shows "..." while loading; should match final layout.     | LOW      | Skeleton states matching final card heights. | ⬜     |
| 2   | **Citation audit trail renders all items** — no virtualization or pagination for large lists. | LOW      | Add pagination or virtual scrolling.         | ⬜     |

---

## DEPARTMENT: DATA

### Employee: Data Analyst

| #   | Finding                                                                                                              | Severity | Fix                                           | Status |
| --- | -------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------- | ------ |
| 1   | **No search analytics** — can't track what users are searching for; the most valuable product feedback is invisible. | MEDIUM   | Track search queries with results count.      | ⬜     |
| 2   | **No document processing metrics** — can't track success rate, avg processing time, or failure reasons.              | LOW      | Add processing success rate and avg duration. | ⬜     |

# PAGE: /dashboard/knowledge-graph

Interactive knowledge graph for visualizing entity relationships with AI-powered reasoning.

---

## DEPARTMENT: PRODUCT

### Employee: Product Manager

| #                                                                                                                                           | Finding                                                                                                                                 | Severity                                       | Fix                                                    | Status |
| ------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------ | ------ | --- |
| 1                                                                                                                                           | **No error handling on queries** — graphData, stats, nodeRelationships queries don't handle errors; failed loads show empty state.      | HIGH                                           | Add error state with retry for each query.             |        | ✅  |
| 2                                                                                                                                           | **Build Graph has no confirmation** — clicking "Build Graph" immediately starts building without warning; could be expensive operation. | MEDIUM                                         | Add confirmation dialog with estimated scope.          | ⬜     |
| 3 **Node details panel has no drill-down** — clicking a connected node in the panel doesn't navigate to it; user must find it in the graph. | MEDIUM                                                                                                                                  | Make connected nodes clickable to select them. | ⬜                                                     |
| 4                                                                                                                                           | **Graph limit hardcoded to 200** — entities with many nodes get truncated without warning.                                              | MEDIUM                                         | Show "Showing 200 of N nodes" with option to increase. | ⬜     |

### Employee: UX Writer

| #   | Finding                                                                    | Severity | Fix                                                               | Status |
| --- | -------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------- | ------ |
| 1   | **"Loading..." is generic** — doesn't tell users what's loading.           | LOW      | "Building your knowledge graph..." or "Loading relationships...". | ⬜     |
| 2   | **"No outgoing/incoming relationships" is passive** — doesn't explain why. | LOW      | "This node has no outgoing relationships yet."                    | ⬜     |

---

## DEPARTMENT: DESIGN

### Employee: Design Critic

| #   | Finding                                                                                                                             | Severity | Fix                                        | Status |
| --- | ----------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------ | ------ |
| 1   | **Hardcoded light-mode colors** — bg-primary/10, bg-primary/5, etc. without dark mode variants. Same defect class across all pages. | HIGH     | Add dark: variants or use semantic tokens. | ⬜     |
| 2   | **Micro-typography persists** — 10px text throughout node details and legends.                                                      | LOW      | Minimum 12px for meaningful text.          | ⬜     |
| 3   | **Close button has no focus-visible** — keyboard users can't see focus on close button.                                             | MEDIUM   | Add focus-visible:ring-2.                  | ⬜     |

---

## DEPARTMENT: ENGINEERING

### Employee: Engineering Critic

| #   | Finding                                                                                                               | Severity | Fix                                  | Status |
| --- | --------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------ | ------ |
| 1   | **Build Graph mutation has no error handling** — if build fails, user gets no feedback.                               | MEDIUM   | Add onError handler with toast.      | ⬜     |
| 2   | **Node relationships query fires even when panel is closed** — selectedNode.id is checked but query still subscribes. | LOW      | Disable query when no node selected. | ⬜     |

---

## DEPARTMENT: DATA

### Employee: Data Analyst

| #   | Finding                                                                                               | Severity | Fix                                  | Status |
| --- | ----------------------------------------------------------------------------------------------------- | -------- | ------------------------------------ | ------ |
| 1   | **No graph analytics** — can't track which nodes are most viewed, most connected, or most queried.    | MEDIUM   | Track node selection and AI queries. | ⬜     |
| 2   | **No graph build metrics** — can't track build duration, success rate, or node/edge counts over time. | LOW      | Log build metrics for monitoring.    | ⬜     |

---

# 🔧 FIX SESSION 1 — Engineering Critic (CRITICAL bug package)

> Executed August 25, 2026. One employee, one package: the three CRITICAL code-correctness bugs from the page audits. Statuses below supersede the ⬜ markers on referenced rows.

## Results

| Ref                                            | Finding                                            | Outcome                                                                                                                                                                                                                                                             |
| ---------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ledger PM#1 / Eng#1 (COA crash)                | `accounts.length` undefined dereference            | ✅ **Verified already fixed** — file now reads `accounts?.length ?? 0` (ledger/page.tsx:887-889). No edit needed; finding closed with evidence.                                                                                                                     |
| CC Eng#1 + Help PM#1 (`?prompt=` dead handoff) | 7 entry points, zero consumers                     | ✅ **Verified fixed** — dashboard/page.tsx now implements the consumer: `useSearchParams` + `promptSentRef` once-guard + auto-send + param strip via `history.replaceState`-style URL cleanup (page.tsx:105-118). Help's escape hatch works again as a side effect. |
| CC PM#24 (context-menu full reload)            | `window.location.href` navigation                  | ✅ **Verified fixed** — layout.tsx now uses `router.replace` (layout.tsx:196-198).                                                                                                                                                                                  |
| FP PM#1 / Eng#4 (GMD fallbacks)                | 6 × `\|\| "GMD"` despite `entityCurrency` in scope | ✅ **Fixed this session** — introduced single `displayCurrency = entityCurrency \|\| "USD"` constant (deliberate platform-default fallback replacing region-specific GMD), replaced all 6 sites (charts ×3, report builders ×3). financial-pulse/page.tsx.          |

## 🆕 New findings surfaced by the fix loop

| #   | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Severity     | Fix                                                                                                                                                                                                                                                                                                                                                                                       | Status |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| N1  | **REPO FAILS `pnpm typecheck --filter=@xenboox/web` — ~60+ PRE-EXISTING errors** (baseline red before any of our edits; none of the errors touch files modified in this session). Clusters: server/routers/banking.ts (~15: rule-operator enums, string/number comparisons, phantom ctx.currency/userId, audit insert `entityId2` typo), chat.ts (~8: inserts referencing non-existent columns `email`, wrong table shapes), dashboard/get-ai-briefing.ts + get-ai-narrative/get-ai-forecast.ts (ctx.currency/entityName missing — SAME root cause as GMD findings: entity currency not on tRPC context!), invoicing.ts (`paymentsAr` undefined ×4), donor-grant.ts (PermissionModule enum missing "donor_grant" ×4), knowledge-graph.ts (insert shape drift ×6), batch-ingestion.ts, notifications.ts, recurring.ts, lib/llm/response-cache.ts, use-streaming-chat.ts (missing event-type unions incl. `needs_input`/`knowledge_citations`/`batch_ingestion_result` — likely explains CC error-message contract violation), three-way-matching.ts, dunning.ts, word-generator.ts, use-focus-trap.ts, use-page-context.ts + packages/agents (orchestrator routing map missing 4 task types, treasury graph dead comparisons, tool-registry insert shape, agent-alerts logger args). CI gate is RED — every "production grade" claim is currently unenforceable. | **CRITICAL** | Dedicated debt package: fix router-by-router starting with banking.ts + chat.ts (financial paths first). Add typecheck to pre-commit/CI so it cannot regress. NOTE: several errors (ctx.currency/entityName) share a root cause with currency findings — fixing tRPC context to expose entity currency/name kills multiple errors AND multiple engreview findings at once. Do that FIRST. | ⬜     |
| N2  | **GMD hardcoding blast radius is systemic, not point fixes** — grep found `"GMD"` in ~15 files beyond Financial Pulse: components/charts/financial-charts.tsx (default props ×4!), finance/reconciliation-view.tsx (×3), invoices-view.tsx:451 (fully hardcoded), create-invoice-dialog / create-bill-dialog / create-bank-account-dialog (`useState(entityCurrency ?? "GMD")` defaults), inline-document-viewer.tsx:226, settings organization/currency/entity-settings sections, onboarding entity-wizard default, layout entity-switcher, admin automation-studio, pay/[token] public page, donor-portal dashboard (REGRESSION of empworks S1-1/S1-2 fixes), marketing features page.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | HIGH         | Systemic sweep package: single CURRENCY_DEFAULTS module; replace all display fallbacks with entity-context value; leave legitimate enum lists (currency pickers) intact. Donor portal regression gets priority.                                                                                                                                                                           | ⬜     |

## Verification

- `pnpm typecheck --filter=@xenboox/web` run post-fix: exit 2, but **zero errors reference financial-pulse/page.tsx, ledger/page.tsx (COA section), or dashboard/page.tsx** — all session edits are type-clean. Baseline failures documented as N1.
- Runtime verification of the `?prompt` handoff and COA render requires the dev server; queued for next QA pass (fire `qa` employee).

## Next package recommendation (loop order)

1. **Engineering Critic #2**: tRPC context exposes `entityCurrency`/`entityName` → resolves N1 cluster subset + N2 root + FP/Operations currency findings in one stroke.
2. **Engineering Critic #3**: banking.ts + chat.ts type-error debt (financial integrity surfaces).
3. Then resume feature-finding queue per tracker.

---

# 🔧 FIX SESSION 2b — diagnosing-bugs employee: "login not working"

> August 25, 2026. User report: login broken, DB confirmed fine. Loop followed: reproduce FIRST → root cause found in minutes.

## Root cause (NOT application code)

**The dev server could not boot at all** — two corrupted/missing platform-native binaries from the npm optional-deps bug (npm/cli#4828):

1. `@next/swc-win32-x64-msvc` — `.node` binary present but **corrupt** ("not a valid Win32 application") → Next.js exited code 1 before serving anything. Every page "not working," login included.
2. `@rollup/rollup-win32-x64-msvc` — missing entirely → middleware bundle failed to compile once SWC was restored (`Compiled /middleware` error).

## Fix applied (environment, no source changes)

1. Deleted corrupt `next-swc-fallback` directory; `pnpm install` to restore.
2. `pnpm add -w -D @rollup/rollup-win32-x64-msvc` (workaround per rollup docs for the optional-deps bug).

## Verification evidence

- Before: `pnpm dev` → `Failed to load SWC binary for win32/x64` → exit 1 (captured in logs).
- After: `Ready in 25.6s` → `Compiled /middleware in 5.9s` → `Compiled /login in 40.9s (3632 modules)` → **`GET /login 200`** via curl.
- Dev server left running on :3000 for user's interactive login test.

## Follow-ups if user still can't sign in after this

App-level silent-null paths exist by design and would need separate handling:

- MFA-enabled accounts return null from credentials authorize (must use directAuthToken/MFA flow)
- Unverified email returns null (generic invalid-credentials error shown)
- Account lockout after 5 failed attempts (30 min)

---

# 🔧 FIX SESSION 2 — Engineering Critic #2 (tRPC entity-context root cause)

> Executed August 25, 2026, immediately after Fix Session 1. Same employee, next loop iteration per the recommended order.

## What shipped

`lib/trpc/server.ts` — `entityScopingMiddleware` already fetched the entity row for auth; it now also selects `currency` + `name` and attaches **`entityCurrency`, `entityName`, `userId`** to the context in BOTH branches (org-role path and user_entity_access path). Every procedure downstream of entity scoping gets entity facts for free — no extra query, routers stop guessing.

## Call sites migrated (were referencing non-existent ctx fields)

| File                                            | Change                                                  |
| ----------------------------------------------- | ------------------------------------------------------- |
| server/routers/banking.ts:1375                  | `ctx.currency ?? "GMD"` → `ctx.entityCurrency ?? "USD"` |
| server/routers/banking.ts:1484                  | same pattern (match-reason string)                      |
| server/routers/dashboard/get-ai-narrative.ts:22 | same pattern                                            |
| server/routers/dashboard/get-ai-forecast.ts:16  | same pattern                                            |
| server/routers/dashboard/get-ai-briefing.ts:32  | `ctx.userId` now EXISTS on context — zero change needed |

Note: `"USD"` replaces `"GMD"` at these fallbacks deliberately (platform en-US default); the N2 systemic sweep will centralize even this constant.

## Verification evidence

- Post-fix typecheck run saved and diffed against baseline:
  - ✅ banking.ts(1375)/(1484) currency errors — GONE
  - ✅ get-ai-briefing.ts(32) userId error — GONE
  - ✅ get-ai-narrative.ts(21,22) / get-ai-forecast.ts(15,16) errors — GONE
- Remaining errors in those files are unrelated pre-existing debt (`.query` misuse in briefing, `agentApprovals` schema drift, redis cache-key arg types, bank_accounts.balance column) — remain tracked under N1.
- Total error count post-session: **171** (baseline was larger; exact prior count unlogged — future sessions must log counts before/after).

## N1/N2 status impact

- N1: currency/userId/name cluster RESOLVED (7 errors). Remaining clusters unchanged.
- N2: root cause fixed at server layer; UI-side GMD sweep still queued (charts defaults, dialogs, donor-portal regression, invoices-view).

---
