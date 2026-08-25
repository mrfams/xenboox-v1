# Engineering Review — /dashboard (Command Center)

> All findings from employee audits of the `/dashboard` page.
> Each employee reviews their domain, lists every problem found.
> Generated: August 25, 2026

---

## Employee #1: Product Manager — Product Critique

**Scope:** Command Center page — all components, flows, UX patterns, AI-native design
**Components reviewed:** `page.tsx`, `ai-greeting.tsx`, `ai-input.tsx`, `getting-started-checklist.tsx`, `proactive-briefing.tsx`, `conversation-thread.tsx`, `conversation-sidebar.tsx`, `conversation-memory.tsx`

---

### P1-1 — AI Active Badge is Always Shown (Misleading)

- **Severity:** HIGH
- **Component:** `ai-greeting.tsx`
- **Issue:** The "AI active" badge with green pulse is hardcoded and always visible regardless of actual AI backend status. If the LLM is down, rate-limited, or the agent is unresponsive, users still see "AI active" — eroding trust when AI doesn't respond.
- **Fix:** Wire badge to actual AI health/status. Show "AI active" only when the backend is reachable. Show "AI unreachable" or hide the badge when it's not.

### P1-2 — Getting Started Progress Not Persisted Across Devices

- **Severity:** MEDIUM
- **Component:** `getting-started-checklist.tsx`
- **Issue:** Checklist progress and dismiss state are stored in `localStorage` only. A user who logs in from a different browser/device sees the checklist fresh every time. Progress is lost.
- **Fix:** Persist onboarding progress server-side (in the user or entity record) so it follows the user across devices.

### P1-3 — Getting Started Steps Never Auto-Complete

- **Severity:** HIGH
- **Component:** `getting-started-checklist.tsx`
- **Issue:** Steps are only marked complete when the user clicks the checklist button. If the user completes a step via the AI chat (e.g., "Create an invoice for $500"), the checklist doesn't know. The progress bar stays at 0% even after completing tasks.
- **Fix:** Listen for actual completion events (invoice created, bank connected, etc.) and auto-check the corresponding step.

### P1-4 — No Way to Re-Show Dismissed Checklist

- **Severity:** MEDIUM
- **Component:** `getting-started-checklist.tsx`
- **Issue:** Once dismissed, the getting-started checklist is gone forever (localStorage flag). A user who dismissed it on day 1 but never completed any steps has no way to get it back.
- **Fix:** Add a "Show getting started" option in settings or a persistent subtle indicator until all 5 steps are actually completed server-side.

### P1-5 — "Connect Bank" Links to Potentially Non-Existent Route

- **Severity:** HIGH
- **Component:** `getting-started-checklist.tsx`
- **Issue:** Step 2 ("Connect a bank account") links to `/dashboard/operations/banking`. Per the redirect map in `next.config.ts`, banking routes redirect to `/dashboard/operations`. The onboarding step should link to the actual operations surface, not a potentially stale sub-route.
- **Fix:** Verify the link target resolves correctly. Consider linking to `/dashboard/operations` directly.

### P1-6 — Export Chat Only Exports Text Messages

- **Severity:** MEDIUM
- **Component:** `ai-input.tsx`
- **Issue:** The "Export chat" button only exports user/assistant text messages as markdown. It ignores tool traces, thinking steps, data tables, charts, documents, approvals, and citations. An exported conversation is incomplete and loses critical context.
- **Fix:** Export all message types — text, tables, charts summary, tool calls, approvals, and document links.

### P1-7 — "Uploaded files" Fallback Text Sent to AI

- **Severity:** MEDIUM
- **Component:** `ai-input.tsx`
- **Issue:** When a user uploads files but doesn't type a message, the literal string "Uploaded files" is sent to the AI. This is vague and confusing — the AI has to guess what the user wants.
- **Fix:** When only files are uploaded with no message, prompt the user: "What would you like me to do with these files?" or auto-generate a context-aware prompt based on file types.

### P1-8 — ProactiveBriefing Uses Fragile Type Cast

- **Severity:** MEDIUM
- **Component:** `proactive-briefing.tsx`
- **Issue:** The `trpc.dashboard.getAiBriefing.useQuery` result is cast with `as { data: ... }` because "tRPC inference resolves to Record<never, never>". This hides real type errors and makes the component fragile to schema changes.
- **Fix:** Fix the tRPC procedure return type so inference works correctly. Remove the `as` cast.

### P1-9 — No Error State When Both AI Briefing and Fallback Fail

- **Severity:** MEDIUM
- **Component:** `proactive-briefing.tsx`
- **Issue:** If the AI briefing fails AND the fallback queries (`getDashboardData`, `ingestionStats`) also fail, the component silently shows nothing — no error, no empty state. The user sees a blank area where their briefing should be.
- **Fix:** Add an error state: "Unable to load your briefing. [Retry]"

### P1-10 — ProactiveBriefing Doesn't Auto-Refresh

- **Severity:** LOW
- **Component:** `proactive-briefing.tsx`
- **Issue:** The briefing is fetched once with `staleTime: 5 * 60 * 1000` and never auto-refreshes. If the user stays on the page for 30 minutes, the briefing becomes stale. Deadlines and approvals may change.
- **Fix:** Add a periodic refetch (e.g., every 5 minutes) or refetch when the user returns to the tab.

### P1-11 — ConversationThread Renders Data Tables Twice

- **Severity:** HIGH
- **Component:** `conversation-thread.tsx`
- **Issue:** `dataTables` are rendered twice — once inside `msg.dataTables` (committed tables from completed messages) and again at the bottom as `{dataTables.map(...)}` (streaming tables). After streaming completes, both the committed version and the streaming version render simultaneously, causing duplicate tables.
- **Fix:** The bottom `dataTables.map` should only render during streaming. After streaming completes, committed tables on the message take over. Add a guard: only render bottom tables when `isStreaming` is true.

### P1-12 — Handle Regenerate is a Re-Send, Not a True Regenerate

- **Severity:** MEDIUM
- **Component:** `conversation-thread.tsx`
- **Issue:** `handleRegenerate` finds the previous user message and re-sends it as a new message. This creates a duplicate conversation turn instead of replacing the AI's response. The user sees two AI responses to the same question.
- **Fix:** True regenerate should replace the last assistant message, not append a new one. Or clearly label it as "Resend" instead of implying replacement.

### P1-13 — Approval Actions Send Natural Language, Not Structured Commands

- **Severity:** MEDIUM
- **Component:** `conversation-thread.tsx`
- **Issue:** Approve/reject actions send strings like "Approved: {title}" as chat messages. The AI has to parse natural language to understand the action. This is fragile — the AI might misinterpret the approval.
- **Fix:** Send structured commands (e.g., `{"action": "approve", "id": "..."}`) or use a dedicated tRPC mutation for approval actions instead of routing through the chat.

### P1-14 — AiInput Suggestions Are Static, Not Contextual

- **Severity:** MEDIUM
- **Component:** `ai-input.tsx`
- **Issue:** The 5 suggestion chips ("Cash position", "Show P&L", "What's overdue?", "Run payroll", "Close books") are hardcoded. They don't change based on time of month, entity state, or what the user has already done. A user who already closed their books still sees "Close books."
- **Fix:** Make suggestions dynamic based on: (1) time of month — show "Close books" only near month-end, (2) entity state — show "Run payroll" only if payroll is due, (3) user history — don't suggest things already done.

### P1-15 — No Keyboard Shortcut to Open Conversation Sidebar

- **Severity:** LOW
- **Component:** `page.tsx`
- **Issue:** The conversation sidebar can only be opened by clicking the "Conversations" button. There's no keyboard shortcut. The dashboard layout has `/` for chat panel, but the conversation sidebar has no equivalent.
- **Fix:** Add a keyboard shortcut (e.g., `Ctrl+Shift+C` or similar) to toggle the conversation sidebar.

### P1-16 — Missing Loading State for ConversationThread When No Messages

- **Severity:** LOW
- **Component:** `page.tsx`
- **Issue:** When the page first loads and messages haven't been fetched yet, there's no skeleton or loading indicator for the conversation area. The `DashboardSkeleton` is imported but only used as a fallback in the error boundary, not during initial load.
- **Fix:** Show a skeleton loading state while the chat hook is initializing.

### P1-17 — AI Greeting Doesn't Update After Midnight

- **Severity:** LOW
- **Component:** `ai-greeting.tsx`
- **Issue:** The greeting ("Good morning/afternoon/evening") is computed once at render time using `new Date().getHours()`. If the user keeps the tab open past midnight, the greeting stays "Good evening" instead of updating to "Good morning."
- **Fix:** Use a `setInterval` or detect day change to update the greeting dynamically.

### P1-18 — ConversationMemory Renders Even With Empty Results

- **Severity:** LOW
- **Component:** `page.tsx`
- **Issue:** `ConversationMemory` is always rendered even when there are no relevant past conversations. This could show an empty container or a "no results" state that adds visual noise.
- **Fix:** Conditionally render `ConversationMemory` only when there are relevant past conversations to show.

### P1-19 — Inline Input Form Lacks Character/Field Limits

- **Severity:** MEDIUM
- **Component:** `conversation-thread.tsx` (InlineInputForm)
- **Issue:** The `NeedsInputEvent` form fields (text input, textarea, number, date) have no `maxLength`, `min`, `max`, or validation. Users can enter arbitrarily long text or invalid values.
- **Fix:** Add sensible limits: text inputs `maxLength=255`, textareas `maxLength=2000`, number inputs with `min`/`max` based on context.

### P1-20 — Approval Card Has No Timeout or Expiry

- **Severity:** MEDIUM
- **Component:** `conversation-thread.tsx`
- **Issue:** Approval cards persist indefinitely in the conversation. If the user ignores an approval for hours/days, it stays visible with no indication of urgency or staleness. Financial approvals should have time context.
- **Fix:** Add a timestamp to approval cards and show relative time ("2 hours ago"). Consider a visual indicator for stale approvals (>24h).

---

### Summary — Product Manager

| Severity  | Count  |
| --------- | ------ |
| HIGH      | 4      |
| MEDIUM    | 11     |
| LOW       | 5      |
| **Total** | **20** |

---

_Next employee: Engineering Critic (#7)_

---

## Employee #7: Engineering Critic — Code Quality & Architecture

**Scope:** Command Center page — all components, hooks, tRPC calls, state management, error handling
**Files reviewed:** `page.tsx`, `ai-greeting.tsx`, `ai-input.tsx`, `getting-started-checklist.tsx`, `proactive-briefing.tsx`, `conversation-thread.tsx`, `use-dashboard-chat.ts`, `use-page-context.ts`, `use-surface-sync.ts`, `command-center/index.ts`

---

### E7-1 — Empty Catch Block Silently Swallows Conversation Load Errors

- **Severity:** HIGH
- **File:** `use-dashboard-chat.ts:199`
- **Code:**
  ```typescript
  } catch {
    // The sidebar list already came from the dashboard router, so a
    // failure here is unexpected — keep the overview rather than leave a
    // blank chat screen.
  }
  ```
- **Problem:** The `loadConversation` catch block is completely empty. If the tRPC fetch fails (network error, DB timeout, auth expiry), the error is silently swallowed. The user sees no feedback — the conversation just doesn't load.
- **Impact:** Silent failures make debugging impossible. The user has no idea why a conversation won't open.
- **Fix:** Log the error with structured context (conversationId, entityId). Show a toast: "Failed to load conversation. Please try again."

### E7-2 — User Message IDs Use Date.now() (Collision Risk)

- **Severity:** MEDIUM
- **File:** `use-dashboard-chat.ts:158`
- **Code:**
  ```typescript
  id: `user-${Date.now()}`,
  ```
- **Problem:** If two messages are sent within the same millisecond (rapid double-click, programmatic sends), they get identical IDs. React keys will collide, causing rendering bugs.
- **Impact:** Duplicate keys cause React to skip rendering or render incorrectly.
- **Fix:** Use `crypto.randomUUID()` or append a counter: `user-${Date.now()}-${counter++}`.

### E7-3 — handleStreamError Drops Error Details

- **Severity:** MEDIUM
- **File:** `use-dashboard-chat.ts:131`
- **Code:**
  ```typescript
  const handleStreamError = useCallback(
    (message: string) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          content: `Sorry, I ran into a problem: ${message}. Please try again.`,
  ```
- **Problem:** The error message from the streaming hook is passed through, but the original error object (stack trace, error code, request ID) is lost. In production, you can't debug what actually failed.
- **Impact:** Production debugging is impossible — you only see a generic user-facing message.
- **Fix:** Log the full error to the structured logger before displaying the user-friendly message. Include requestId, entityId, and conversationId.

### E7-4 — SSE Reconnect Has No Max Retry Limit

- **Severity:** HIGH
- **File:** `use-surface-sync.ts:107`
- **Code:**
  ```typescript
  const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
  reconnectTimeoutRef.current = setTimeout(() => {
    reconnectAttemptsRef.current++;
    connect();
  }, delay);
  ```
- **Problem:** The exponential backoff caps at 30 seconds but never stops reconnecting. If the SSE endpoint is permanently down (e.g., Redis is down, as confirmed by health check), the browser will reconnect every 30 seconds forever — wasting resources and generating noise in logs.
- **Impact:** Battery drain on mobile, unnecessary network traffic, log pollution.
- **Fix:** Add a max retry count (e.g., 10 attempts). After max retries, stop reconnecting and show a "Real-time updates unavailable" indicator. Reconnect on user interaction (tab focus, navigation).

### E7-5 — useSurfaceSync invalidateQueries Uses Unsafe Type Casting

- **Severity:** MEDIUM
- **File:** `use-surface-sync.ts:72`
- **Code:**
  ```typescript
  const routerUtils = (utils as Record<string, unknown>)[router] as
    Record<string, { invalidate?: () => Promise<void> }> | undefined;
  ```
- **Problem:** The tRPC utils object is cast to `Record<string, unknown>` and then to a specific shape. If the tRPC router structure changes (e.g., a router is renamed), this cast silently fails — `proc.invalidate()` becomes `undefined` and the `typeof proc === "object"` check catches it, but the surface sync silently stops working.
- **Impact:** Cross-surface sync silently breaks after tRPC router refactors. No error, no warning.
- **Fix:** Use tRPC's typed utils directly. The `trpc.useUtils()` return type should be typed to the AppRouter, eliminating the need for casts.

### E7-6 — Fallback Queries Run Even When AI Briefing Succeeds

- **Severity:** MEDIUM
- **File:** `proactive-briefing.tsx:119-124`
- **Code:**
  ```typescript
  // Fallback to count-based briefing (if AI fails)
  const { data: dashboardData } = trpc.dashboard.getDashboardData.useQuery(
    {},
    { enabled: !!entityId },
  );
  const { data: ingestionStats } = trpc.ingestion.getStats.useQuery(undefined, {
    enabled: !!entityId,
  });
  ```
- **Problem:** These two queries are ALWAYS enabled (no conditional `enabled` flag). They run on every render even when the AI briefing succeeds. This wastes bandwidth and DB resources.
- **Impact:** Unnecessary API calls on every page load. 2 extra DB queries per render.
- **Fix:** Only enable fallback queries when AI briefing fails: `{ enabled: !!entityId && isError }`.

### E7-7 — ProactiveBriefing Type Cast Hides tRPC Return Type Bug

- **Severity:** MEDIUM
- **File:** `proactive-briefing.tsx:82`
- **Code:**
  ```typescript
  } as {
    data:
      | { text: string; actions?: Array<{ label: string; href: string }> }
      | null
      | undefined;
    isError: boolean;
  };
  ```
- **Problem:** The `as` cast hides a real type inference failure. The comment says "tRPC inference resolves to Record<never, never>" — this means the tRPC procedure's return type is not being inferred correctly. Any schema change to `getAiBriefing` will not be caught at compile time.
- **Impact:** Type safety is broken for this query. Schema changes silently break the component.
- **Fix:** Fix the `getAiBriefing` tRPC procedure to have a proper return type (Zod schema or explicit TypeScript return type). Remove the `as` cast.

### E7-8 — ConversationThread handleJumpTo Uses Direct DOM Manipulation

- **Severity:** MEDIUM
- **File:** `conversation-thread.tsx:155`
- **Code:**
  ```typescript
  const handleJumpTo = useCallback((messageId: string) => {
    const element = document.getElementById(`message-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.classList.add("ring-2", "ring-primary/50");
      setTimeout(() => {
        element.classList.remove("ring-2", "ring-primary/50");
      }, 2000);
    }
  }, []);
  ```
- **Problem:** Direct DOM manipulation (`document.getElementById`, `classList.add/remove`) bypasses React's rendering model. The `setTimeout` cleanup is never cancelled if the component unmounts, causing a React state update warning on unmounted components.
- **Impact:** React warning in console. Potential memory leak if component unmounts during the 2-second window.
- **Fix:** Use `useRef` to track the highlighted element and `useEffect` for cleanup. Or use a state variable to control the highlight class.

### E7-9 — processingApproval State Never Resets After Completion

- **Severity:** HIGH
- **File:** `conversation-thread.tsx:171`
- **Code:**
  ```typescript
  const [processingApproval, setProcessingApproval] = useState<string | null>(
    null,
  );
  ```
- **Problem:** `processingApproval` is set to the approval title when an action is clicked, but it's never reset to `null`. After the approval completes (message sent via `onSendMessage`), the button stays in "Processing..." state permanently until the component re-renders for another reason.
- **Impact:** Approve/Reject/Review buttons appear permanently disabled after first use.
- **Fix:** Reset `setProcessingApproval(null)` after `onSendMessage` completes. Or use a useEffect that watches for the approval message to appear in the messages array.

### E7-10 — Data Tables Rendered Twice (Streaming + Committed)

- **Severity:** HIGH
- **File:** `conversation-thread.tsx:380-410`
- **Problem:** The bottom `{dataTables.map(...)}` section renders streaming data tables on EVERY render, not just during streaming. After streaming completes, the tables are committed to the message's `msg.dataTables` AND still rendered at the bottom. This creates duplicate tables.
- **Impact:** Users see every data table twice — once in the message and once at the bottom of the thread.
- **Fix:** Guard the bottom dataTables rendering: `{isStreaming && dataTables.map(...)}`.

### E7-11 — usePageContext useMemo Has Unused Dependency

- **Severity:** LOW
- **File:** `use-page-context.ts:56`
- **Code:**
  ```typescript
  return useMemo(() => {
    if (!pathname) return undefined;
    // ... uses pathname but NOT entityId
  }, [pathname]); // entityId is in the hook but not in deps
  ```
- **Problem:** `entityId` is destructured from `useEntity()` but never used in the memo body, and is not in the dependency array. This is a minor code smell — the import is unnecessary.
- **Impact:** No runtime impact. Code clarity issue.
- **Fix:** Remove `const { entityId } = useEntity();` since it's unused.

### E7-12 — Export Chat Button Doesn't Handle Mobile Blob Download

- **Severity:** LOW
- **File:** `ai-input.tsx:155`
- **Code:**
  ```typescript
  const blob = new Blob([md], { type: "text/markdown;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `conversation-${new Date().toISOString().split("T")[0]}.md`;
  a.click();
  URL.revokeObjectURL(url);
  ```
- **Problem:** The `a.click()` pattern for blob downloads doesn't work reliably on iOS Safari. Mobile browsers often block programmatic clicks on dynamically created elements.
- **Impact:** Export feature silently fails on mobile.
- **Fix:** Use `navigator.share()` API on mobile as a fallback, or show a copy-to-clipboard option.

### E7-13 — handleRegenerate Creates Duplicate Conversation Turn

- **Severity:** MEDIUM
- **File:** `conversation-thread.tsx:145`
- **Code:**
  ```typescript
  const handleRegenerate = useCallback(
    (messageId: string) => {
      const msgIndex = messages.findIndex((m) => m.id === messageId);
      if (msgIndex > 0) {
        const prevMsg = messages[msgIndex - 1];
        if (prevMsg.role === "user") {
          onSendMessage(prevMsg.content);
        }
      }
    },
    [messages, onSendMessage],
  );
  ```
- **Problem:** "Regenerate" re-sends the previous user message as a new message. This creates a duplicate user message + new assistant response. The user sees two user messages and two AI responses for the same question.
- **Impact:** Confusing UX — the conversation has duplicate turns.
- **Fix:** Either: (1) remove the old assistant message and replace it, or (2) label the button "Resend" instead of "Regenerate", or (3) implement true regeneration by removing the last assistant message before re-sending.

### E7-14 — emitDataChanged Silently Catches All Errors

- **Severity:** LOW
- **File:** `use-surface-sync.ts:143`
- **Code:**
  ```typescript
  } catch {
    // Non-critical — sync is best-effort
  }
  ```
- **Problem:** The fetch error is completely swallowed. If the POST fails (network error, 401, 500), there's no logging. In production, you can't tell if surface sync is working.
- **Impact:** Silent failure of cross-surface sync. No observability.
- **Fix:** Log the error with structured context. Even a `console.warn` would help debugging.

### E7-15 — No Cancellation of In-Flight Queries on Entity Switch

- **Severity:** MEDIUM
- **File:** `proactive-briefing.tsx`
- **Problem:** When the user switches entities (via entity switcher), the briefing queries continue fetching with the old entityId until the new query replaces them. During this window, stale data from the previous entity could briefly flash on screen.
- **Impact:** Briefly showing wrong entity's data. Entity isolation concern.
- **Fix:** Add `entityId` to the query key (tRPC does this automatically) and cancel in-flight requests on entity switch. Or use `enabled: !!entityId && entityId === currentEntityId` pattern.

### E7-16 — useRef Activity Arrays Grow Unboundedly During Streaming

- **Severity:** MEDIUM
- **File:** `use-dashboard-chat.ts:82-87`
- **Code:**
  ```typescript
  onAgentActivity: (activity) => {
    activitiesRef.current = [...activitiesRef.current, activity];
  },
  ```
- **Problem:** During a long streaming response, every agent activity event is appended to the ref array. For complex operations (e.g., month-end close with 50+ steps), this array grows without bound. It's only cleared when the message commits.
- **Impact:** Memory usage grows during long streams. Unlikely to cause issues in practice but is a code smell.
- **Fix:** Cap the array at a reasonable limit (e.g., last 100 events) or use a sliding window.

---

### Summary — Engineering Critic

| Severity  | Count  |
| --------- | ------ |
| HIGH      | 4      |
| MEDIUM    | 9      |
| LOW       | 3      |
| **Total** | **16** |

---

_Next employee: Design Critic (#5)_

---

## Employee #5: Design Critic — Visual Design, UX & Accessibility

**Scope:** Command Center page — all components, visual polish, accessibility, responsive design
**Components reviewed:** `page.tsx`, `ai-greeting.tsx`, `ai-input.tsx`, `getting-started-checklist.tsx`, `proactive-briefing.tsx`, `conversation-thread.tsx`

---

### D5-1 — Text Sizes Below 12px Fail WCAG Readability

- **Severity:** HIGH
- **Components:** `ai-greeting.tsx`, `ai-input.tsx`, `getting-started-checklist.tsx`, `proactive-briefing.tsx`
- **Issue:** Multiple components use `text-[10px]`, `text-[11px]`, and `text-[9px]` for body text, labels, and descriptions. These sizes are below the WCAG recommended minimum of 12px and are difficult to read, especially on mobile devices and for users with vision impairments.
- **Affected locations:**
  - `ai-greeting.tsx:23` — date text `text-[11px]`
  - `ai-greeting.tsx:32` — "AI active" label `text-[10px]`
  - `ai-input.tsx:73` — suggestion chip labels `text-[11px]`
  - `ai-input.tsx:168` — keyboard hints `text-[9px]`
  - `ai-input.tsx:153` — "Export chat" button `text-[10px]`
  - `getting-started-checklist.tsx:155` — footer hint `text-[10px]`
  - `proactive-briefing.tsx:191` — "AI-generated" timestamp `text-[10px]`
- **Fix:** Minimum font size for readable text should be `text-xs` (12px). Use `text-[10px]` only for purely decorative labels. Keyboard hints and timestamps can stay small but should have sufficient contrast.

### D5-2 — Export Chat Button Is Nearly Invisible

- **Severity:** MEDIUM
- **Component:** `ai-input.tsx:150`
- **Issue:** The "Export chat" button uses `text-[10px] text-muted-foreground/50` — extremely small text with 50% opacity on an already muted color. It's nearly invisible and users will never find it.
- **Fix:** Increase to `text-xs text-muted-foreground` with a hover state. Consider moving it to a more discoverable location (e.g., a download icon in the input toolbar).

### D5-3 — Getting Started Progress Bar Is Too Thin to Notice

- **Severity:** MEDIUM
- **Component:** `getting-started-checklist.tsx:131`
- **Code:** `h-1.5 w-full overflow-hidden rounded-full bg-muted/40`
- **Issue:** The progress bar is 6px tall (`h-1.5`) with 40% opacity background. It's easy to miss entirely. Users won't notice their progress.
- **Fix:** Increase to `h-2` (8px) minimum. Use a more visible background color. Add a percentage label next to the bar.

### D5-4 — Step Descriptions Truncated Without Tooltip

- **Severity:** MEDIUM
- **Component:** `getting-started-checklist.tsx:168`
- **Code:** `<p className="text-xs text-muted-foreground/70 mt-0.5 truncate">`
- **Issue:** Long step descriptions are truncated with CSS `truncate` but have no `title` attribute or tooltip. Users can't read the full description of what each step does.
- **Fix:** Add `title={step.description}` to show the full text on hover. Or remove `truncate` and let the text wrap.

### D5-5 — AI Input Area Has Too Many Visual Elements

- **Severity:** MEDIUM
- **Component:** `ai-input.tsx`
- **Issue:** The input area contains: file upload button, bot icon, context pin indicator, textarea, send button, export button, keyboard hints, and 5 suggestion chips above. That's 9 distinct visual elements in a small area. The cognitive load is high for what should be a simple "ask a question" interface.
- **Fix:** Simplify the input area:
  1. Move "Export chat" to a menu or the conversation header
  2. Move keyboard hints to a settings/help section
  3. Reduce suggestion chips to 3 maximum
  4. Consider hiding the bot icon (redundant with the AI greeting)

### D5-6 — Suggestion Chips Have Insufficient Touch Target Size

- **Severity:** MEDIUM
- **Component:** `ai-input.tsx:78`
- **Issue:** Suggestion chips use `px-2.5 py-1.5` which yields a touch target of approximately 28px height. WCAG requires 44px minimum for touch targets on mobile.
- **Fix:** Increase padding to `px-3 py-2` minimum on mobile. Or use `min-h-[44px]` to ensure the touch target meets accessibility requirements.

### D5-7 — Conversation Thread Missing Scroll-to-Bottom Button

- **Severity:** MEDIUM
- **Component:** `conversation-thread.tsx`
- **Issue:** When the user scrolls up in a long conversation, there's no "scroll to bottom" button to quickly return to the latest messages. The only way back is manual scrolling.
- **Fix:** Add a floating "↓ New messages" button that appears when the user scrolls up, similar to chat apps like WhatsApp/Slack.

### D5-8 — Approval Cards Lack Visual Hierarchy for Amounts

- **Severity:** LOW
- **Component:** `conversation-thread.tsx:340`
- **Issue:** The approval amount (`approval.amount`) uses the same font size as the description text. For financial approvals, the amount should be visually prominent — it's the most important piece of information.
- **Fix:** Increase amount font size to `text-base font-semibold` or `text-lg font-bold`. Add currency formatting if not already applied.

### D5-9 — Streaming Indicator Dots Are Too Small

- **Severity:** LOW
- **Component:** `conversation-thread.tsx:430`
- **Code:** `h-1.5 w-1.5 animate-pulse rounded-full bg-primary/60`
- **Issue:** The thinking indicator dots are 6px (`h-1.5 w-1.5`) with 60% opacity. They're hard to notice, especially on high-DPI screens.
- **Fix:** Increase to `h-2 w-2` (8px) and use `bg-primary` without opacity reduction. The animation already draws attention — the dots should be clearly visible.

### D5-10 — No Visual Distinction Between AI and User Messages on Mobile

- **Severity:** MEDIUM
- **Component:** `conversation-thread.tsx:270`
- **Issue:** On mobile, the user message bubble (`bg-primary text-primary-foreground`) and AI message bubble (`bg-card border border-border/50`) can look similar in bright environments. The AI bubble has a border but no background color differentiation.
- **Fix:** Add a subtle background tint to AI messages (e.g., `bg-muted/30`) or increase the border opacity to `border-border` for clearer distinction.

### D5-11 — Greeting Section Lacks Visual Weight for "AI Active" Status

- **Severity:** LOW
- **Component:** `ai-greeting.tsx:27`
- **Issue:** The "AI active" badge uses `border-border/40 bg-card/60` — very low contrast against the background. The green pulse dot is small and easy to miss. This is meant to be a trust signal but doesn't draw enough attention.
- **Fix:** Use a more visible background: `bg-emerald-500/10 border-emerald-500/20`. Increase the pulse dot to `h-2 w-2`.

### D5-12 — Context Pin Indicator Positioned Above Input Boundary

- **Severity:** LOW
- **Component:** `ai-input.tsx:107`
- **Code:** `absolute -top-6 left-4`
- **Issue:** The context pin indicator is positioned `absolute -top-6` which places it outside the input card's border. On some screen sizes, this could overlap with the suggestion chips above, creating visual clutter.
- **Fix:** Verify positioning at all breakpoints. Consider placing the context indicator inside the input card as a small tag, rather than floating above it.

---

### Summary — Design Critic

| Severity  | Count  |
| --------- | ------ |
| HIGH      | 1      |
| MEDIUM    | 7      |
| LOW       | 4      |
| **Total** | **12** |

---

_Next employee: Security Engineer (#6) — SKIPPED (skill not found)_

---

## Employee #3: UX Writer — Microcopy & Content Quality

**Scope:** Command Center page — all labels, hints, error messages, empty states, AI copy
**Components reviewed:** `ai-greeting.tsx`, `ai-input.tsx`, `getting-started-checklist.tsx`, `proactive-briefing.tsx`, `conversation-thread.tsx`

---

### U3-1 — Suggestion Chips Mix Question and Command Styles

- **Severity:** MEDIUM
- **Component:** `ai-input.tsx:62-66`
- **Issue:** The 5 suggestion chips mix inconsistent styles:
  - "Cash position" — noun phrase
  - "Show P&L" — command (verb + noun)
  - "What's overdue?" — question
  - "Run payroll" — command
  - "Close books" — command

  Users scan these quickly. Mixed styles create cognitive friction.

- **Fix:** Standardize to command style: "Check cash position", "Show P&L", "Find overdue bills", "Run payroll", "Close books". All start with a verb.

### U3-2 — "AI active" Label Is Meaningless

- **Severity:** MEDIUM
- **Component:** `ai-greeting.tsx:30`
- **Issue:** The badge says "AI active" but doesn't explain what that means. Active how? Ready to respond? Currently processing? Connected to the backend? Users don't know what "active" implies.
- **Fix:** Either: (1) remove the badge entirely (it's decorative, not informative), or (2) change to "AI ready" which implies it's waiting for input, or (3) make it dynamic: "AI ready" / "AI processing..." / "AI offline".

### U3-3 — "Here's your business snapshot" Is Vague

- **Severity:** LOW
- **Component:** `ai-greeting.tsx:20`
- **Issue:** "Here's your business snapshot for {date}" — "snapshot" is generic. It doesn't tell the user what they'll see or why it matters.
- **Fix:** "Here's what your AI found today" or "Your AI has analyzed your books for {date}". Lead with the AI doing work, not just showing data.

### U3-4 — Keyboard Hints Use Jargon

- **Severity:** LOW
- **Component:** `ai-input.tsx:168`
- **Code:** `Enter send · Shift+Enter newline`
- **Issue:** "newline" is developer jargon. Regular users say "new line" or "line break". Also, the hints are only visible on focus, making them undiscoverable.
- **Fix:** Change to "Enter to send · Shift+Enter for new line". Consider showing hints once on first use, then hiding them.

### U3-5 — "Export chat" Button Label Is Too Generic

- **Severity:** LOW
- **Component:** `ai-input.tsx:153`
- **Issue:** "Export chat" doesn't specify the format or what will be exported. Users might expect a PDF, a shareable link, or a different format.
- **Fix:** "Download as Markdown" or "Export conversation (.md)". Be specific about the format.

### U3-6 — Getting Started "Or just type a question below" Undermines the Checklist

- **Severity:** MEDIUM
- **Component:** `getting-started-checklist.tsx:189`
- **Code:** `Or just type a question below — the AI handles anything.`
- **Issue:** This hint tells users they can skip the checklist entirely. It undermines the onboarding flow by suggesting the checklist is optional. Also, "anything" is too broad — the AI can't literally do anything.
- **Fix:** Remove this hint, or change to: "Or ask the AI a question to get started". Don't promise "anything".

### U3-7 — Error Message in handleStreamError Is Too Generic

- **Severity:** MEDIUM
- **Component:** `use-dashboard-chat.ts:136`
- **Code:** `Sorry, I ran into a problem: ${message}. Please try again.`
- **Issue:** The `${message}` comes from the streaming hook and could be a technical error string (e.g., "SSE connection lost", "timeout"). Users don't understand these.
- **Fix:** Map common error messages to user-friendly text:
  - "SSE connection lost" → "The connection was interrupted. Please try again."
  - "timeout" → "The AI took too long to respond. Please try again."
  - "rate_limited" → "Too many requests. Please wait a moment and try again."

### U3-8 — ProactiveBriefing "AI-curated" Badge Is Unnecessary

- **Severity:** LOW
- **Component:** `proactive-briefing.tsx:188`
- **Code:** `AI-curated`
- **Issue:** The "AI-curated" badge next to "Your AI briefing" is redundant. The section is already titled "Your AI briefing" — adding "AI-curated" as a badge is visual noise.
- **Fix:** Remove the badge. The heading already communicates that this is AI-generated.

### U3-9 — Conversation Memory Has No Heading or Context

- **Severity:** MEDIUM
- **Component:** `page.tsx` (ConversationMemory component)
- **Issue:** The `ConversationMemory` component renders without a heading or explanation. Users see a section of past conversations with no context about why they're being shown or what to do with them.
- **Fix:** Add a heading: "Related conversations" or "From your past chats". Add a one-line description if the section is visible.

### U3-10 — Inline Input Form "Submit" Button Is Generic

- **Severity:** LOW
- **Component:** `conversation-thread.tsx:118`
- **Code:** `{isSubmitting ? "Sending..." : "Submit"}`
- **Issue:** "Submit" is generic. It doesn't tell the user what will happen when they click. The button should reflect the action being taken.
- **Fix:** Use action-specific labels: "Send details", "Confirm", or match the action name (e.g., "Create invoice" if the action is invoice creation).

### U3-11 — Approval "Review" Button Label Is Ambiguous

- **Severity:** MEDIUM
- **Component:** `conversation-thread.tsx:362`
- **Issue:** The "Review" button on approval cards doesn't clearly communicate what happens. Does it open a detail view? Does it send a message to the AI? Users don't know.
- **Fix:** Change to "Ask AI to explain" or "Get more details". Or if it sends a chat message, say "Ask about this".

### U3-12 — AI Greeting Uses "Good morning/afternoon/evening" Without Context

- **Severity:** LOW
- **Component:** `ai-greeting.tsx:14`
- **Issue:** The time-based greeting is a nice touch, but it's not personalized beyond the first name. For an AI-native product, the greeting could set the tone for what the AI has been doing.
- **Fix:** Consider: "Good morning, {name}. Your AI processed 12 transactions overnight." This immediately shows AI value.

---

### Summary — UX Writer

| Severity  | Count  |
| --------- | ------ |
| HIGH      | 0      |
| MEDIUM    | 6      |
| LOW       | 6      |
| **Total** | **12** |

---

_Next employee: Content Critic / Copywriter_

---

## Employee #4: Copywriter — Brand Voice & Conversion Copy

**Scope:** Command Center page — all copy, brand voice compliance, AI-native positioning
**Components reviewed:** `ai-greeting.tsx`, `ai-input.tsx`, `getting-started-checklist.tsx`, `proactive-briefing.tsx`, `conversation-thread.tsx`

---

### C4-1 — "Business Snapshot" Is SaaS Language, Not AI-Native

- **Severity:** MEDIUM
- **Component:** `ai-greeting.tsx:20`
- **Copy:** "Here's your business snapshot for {date}"
- **Problem:** "Business snapshot" is generic SaaS language. It implies a static report, not an AI that's actively analyzing. AI-native copy should lead with what the AI did, not what the user sees.
- **Fix:** "Your AI analyzed your books for {date}. Here's what it found." or "Good morning, {name}. Your AI processed 12 transactions overnight."

### C4-2 — Getting Started Steps Use Passive Voice

- **Severity:** LOW
- **Component:** `getting-started-checklist.tsx`
- **Issue:** Some step titles are passive or unclear:
  - "Review your accounts" — who reviews? The user or the AI?
  - "Create your first invoice" — implies manual work, not AI-assisted
- **Fix:** Make it clear the AI helps:
  - "Let AI review your accounts"
  - "AI helps you create your first invoice"

### C4-3 — "The AI Handles Anything" Is an Overclaim

- **Severity:** MEDIUM
- **Component:** `getting-started-checklist.tsx:189`
- **Copy:** "Or just type a question below — the AI handles anything."
- **Problem:** "Anything" is a false promise. The AI can't do literally anything. Overclaiming erodes trust when the AI can't deliver. Brand voice says: "We respect the reader's intelligence without dumbing down." Overclaiming is the opposite.
- **Fix:** "Or ask the AI a question — it handles accounting tasks." Be specific about what it does.

### C4-4 — ProactiveBriefing Fallback Lacks AI-Native Voice

- **Severity:** LOW
- **Component:** `proactive-briefing.tsx:210`
- **Copy:** "All clear — nothing needs your attention right now."
- **Problem:** This is fine but misses an opportunity to reinforce AI value. The AI should tell you what it did, not just that nothing is wrong.
- **Fix:** "All clear — your AI handled 47 transactions today. Nothing needs your attention." Show the AI's work.

### C4-5 — Conversation Error Message Is Apologetic, Not Confident

- **Severity:** LOW
- **Component:** `use-dashboard-chat.ts:136`
- **Copy:** "Sorry, I ran into a problem: {message}. Please try again."
- **Problem:** "Sorry" is apologetic. Brand voice is "Confident — We know accounting. We know AI. We're not guessing." An AI-native product doesn't apologize — it explains and solves.
- **Fix:** "Something went wrong: {message}. Try again or ask the AI to help." Or: "The AI encountered an issue. Here's what happened and what to do."

### C4-6 — Approval Card Buttons Use Generic Labels

- **Severity:** MEDIUM
- **Component:** `conversation-thread.tsx:348-370`
- **Copy:** "Approve", "Review", "Reject"
- **Problem:** These are generic button labels. They don't tell the user what they're approving or what happens next. Brand voice says: "Be specific. 'Approve payment of $1,250 to Acme Corp' not 'Approve'."
- **Fix:** "Approve payment" / "Get details" / "Decline". Or better: "Approve $1,250 to Acme Corp" on the button itself.

### C4-7 — AiInput Suggestions Don't Quantify AI Value

- **Severity:** MEDIUM
- **Component:** `ai-input.tsx:62-66`
- **Issue:** The suggestion chips are task-oriented but don't show AI value. "Cash position" tells you what you'll see, not what the AI does. AI-native copy should lead with AI capability.
- **Fix:** "AI: Show cash position" or "Ask AI about cash position". Make it clear the AI is doing the work.

### C4-8 — "AI-Generated Briefing" Timestamp Is Redundant

- **Severity:** LOW
- **Component:** `proactive-briefing.tsx:191`
- **Copy:** "AI-generated briefing • {time}"
- **Problem:** The section is already titled "Your AI briefing". Adding "AI-generated" as a footer is redundant. The timestamp is useful but the "AI-generated" prefix is noise.
- **Fix:** Just show the timestamp: "Updated {time}". The heading already communicates AI.

### C4-9 — ConversationThread "Thinking..." Is Too Generic

- **Severity:** LOW
- **Component:** `conversation-thread.tsx:435`
- **Copy:** "Thinking..."
- **Problem:** "Thinking" is vague. The AI is doing specific work — categorizing, analyzing, generating. Specific copy builds trust.
- **Fix:** Use dynamic labels based on what the AI is doing: "Analyzing your request...", "Categorizing transactions...", "Preparing your report...".

### C4-10 — Getting Started Progress Text Doesn't Show AI Value

- **Severity:** LOW
- **Component:** `getting-started-checklist.tsx:140`
- **Copy:** "{completedCount} of {STEPS.length} complete — you're making progress!"
- **Problem:** "You're making progress" is generic encouragement. It doesn't connect completion to AI value. Each step completed should show what the AI gains.
- **Fix:** "3 of 5 complete — your AI is getting smarter" or "3 of 5 complete — AI can now categorize your transactions".

---

### Summary — Copywriter

| Severity  | Count  |
| --------- | ------ |
| HIGH      | 0      |
| MEDIUM    | 4      |
| LOW       | 6      |
| **Total** | **10** |

---

_Next employee: Brand Voice (#14)_

---

## Employee #14: Brand Voice — Messaging Consistency

**Scope:** Command Center page — all copy, terminology, tone consistency
**Components reviewed:** `ai-greeting.tsx`, `ai-input.tsx`, `getting-started-checklist.tsx`, `proactive-briefing.tsx`, `conversation-thread.tsx`

---

### BV-14-1 — "AI active" Violates Brand Terminology

- **Severity:** MEDIUM
- **Component:** `ai-greeting.tsx:30`
- **Copy:** "AI active"
- **Problem:** Brand terminology guide says to use "AI agent" or "AI" — not "AI active". "Active" is a status label, not brand voice. The brand voice is "Confident — We make definitive statements." "AI active" is a passive status indicator.
- **Fix:** "AI ready" or remove the badge entirely. If keeping it, use: "AI is ready" — confident, definitive.

### BV-14-2 — "Business Snapshot" Is Not Brand Voice

- **Severity:** LOW
- **Component:** `ai-greeting.tsx:20`
- **Copy:** "Here's your business snapshot for {date}"
- **Problem:** "Snapshot" is not in the terminology guide. Brand voice says: "We explain complex things simply." "Snapshot" is a metaphor that doesn't add clarity. Also, "Here's your" is passive — brand voice prefers active statements.
- **Fix:** "Your AI analyzed your books for {date}" or "Here's what your AI found today". Active voice, AI-led.

### BV-14-3 — "Activate Your AI Accounting Team" Uses Non-Brand Language

- **Severity:** LOW
- **Component:** `getting-started-checklist.tsx:143`
- **Copy:** "Complete these steps to activate your AI accounting team"
- **Problem:** "Activate" is not brand voice. Brand terminology uses "agents" not "team". Also, "complete these steps" is passive — brand voice prefers action-oriented language.
- **Fix:** "Set up your AI agents" or "Get your AI agents working". Use "agents" consistently.

### BV-14-4 — "The AI Handles Anything" Is an Overclaim

- **Severity:** MEDIUM
- **Component:** `getting-started-checklist.tsx:189`
- **Copy:** "Or just type a question below — the AI handles anything."
- **Problem:** Brand voice says: "We respect the reader's intelligence without dumbing down." Overclaiming "anything" is the opposite — it's a false promise that erodes trust. Also, brand terminology uses "AI agents" not just "the AI".
- **Fix:** "Or ask the AI agents a question". Remove "anything" — be specific about what the AI does.

### BV-14-5 — "Sorry" Violates Confident Voice Attribute

- **Severity:** MEDIUM
- **Component:** `use-dashboard-chat.ts:136`
- **Copy:** "Sorry, I ran into a problem: {message}. Please try again."
- **Problem:** Brand voice attribute #2 is "Confident — We make definitive statements. We're not wishy-washy or hedging." "Sorry" is hedging. It apologizes for something that might not be the product's fault. Brand voice for errors is: "Honest, solution-focused, no-blame."
- **Fix:** "Something went wrong: {message}. Try again." or "The AI encountered an issue. Here's what happened." No apology — just facts and next steps.

### BV-14-6 — "Thinking..." Is Too Generic for Brand Voice

- **Severity:** LOW
- **Component:** `conversation-thread.tsx:435`
- **Copy:** "Thinking..."
- **Problem:** Brand voice for AI communication is: "Helpful, transparent about confidence, human." "Thinking" is neither helpful nor transparent. The AI is doing specific work — say what it's doing.
- **Fix:** Use dynamic labels: "Analyzing...", "Categorizing...", "Preparing...". Be specific about the AI's action.

### BV-14-7 — "Export chat" Uses Non-Brand Terminology

- **Severity:** LOW
- **Component:** `ai-input.tsx:153`
- **Copy:** "Export chat"
- **Problem:** Brand terminology guide doesn't define "export" or "chat". The product uses "conversation" not "chat" (see ConversationSidebar, ConversationThread, ConversationMemory). "Export" is generic — brand voice prefers specific, action-oriented language.
- **Fix:** "Download conversation" — matches the component naming convention.

### BV-14-8 — "Submit" Button Violates Action-Oriented Voice

- **Severity:** LOW
- **Component:** `conversation-thread.tsx:118`
- **Copy:** "Submit"
- **Problem:** Brand voice for buttons is: "Direct action — 'Connect Bank' not 'Submit'". "Submit" is generic and doesn't tell the user what will happen.
- **Fix:** Use action-specific labels: "Send details", "Confirm", or match the action name.

### BV-14-9 — "All Clear" Missing AI Agent Language

- **Severity:** LOW
- **Component:** `proactive-briefing.tsx:210`
- **Copy:** "All clear — nothing needs your attention right now."
- **Problem:** This is close to brand voice but misses the AI agent language opportunity. Brand voice says: "AI agents handle 80%+ of bookkeeping without intervention." The "all clear" state should show what the AI did, not just that nothing is wrong.
- **Fix:** "All clear — your AI agents handled 47 transactions today. Nothing needs your attention."

### BV-14-10 — "AI-curated" Badge Uses Non-Brand Terminology

- **Severity:** LOW
- **Component:** `proactive-briefing.tsx:188`
- **Copy:** "AI-curated"
- **Problem:** "Curated" is not brand terminology. Brand voice uses "AI agents" and specific action verbs. "Curated" is vague — what did the AI actually do? Select? Analyze? Generate?
- **Fix:** Remove the badge (redundant with heading) or change to "AI-generated" which is more transparent.

---

### Summary — Brand Voice

| Severity  | Count  |
| --------- | ------ |
| HIGH      | 0      |
| MEDIUM    | 3      |
| LOW       | 7      |
| **Total** | **10** |

---

_Next employee: CEO/Founder (#19)_

---

## Employee #19: CEO/Founder — Strategic Vision & Product-Market Fit

**Scope:** Command Center page — strategic alignment, AI-native positioning, activation, retention
**Components reviewed:** `page.tsx`, `ai-greeting.tsx`, `getting-started-checklist.tsx`, `proactive-briefing.tsx`, `conversation-thread.tsx`

---

### CEO-1 — Command Center Doesn't Show AI Value on First Load

- **Severity:** HIGH
- **Component:** `page.tsx`
- **Issue:** When a user first loads the Command Center, they see a greeting, a checklist, and an empty chat area. There's no immediate demonstration of AI value. The user has to type a question or click a checklist item to see the AI do anything. For an AI-native product, the first impression should be AI doing work, not waiting for input.
- **Strategic Impact:** First-time users may not understand the AI-native value proposition. Activation rate drops if users don't experience AI value within 30 seconds.
- **Fix:** On first load, show a proactive AI insight: "Your AI reviewed 47 transactions today and found 2 anomalies" or "AI categorized all transactions from last week." Show AI work, not just a chat box.

### CEO-2 — Getting Started Checklist Doesn't Drive to "Aha Moment"

- **Severity:** HIGH
- **Component:** `getting-started-checklist.tsx`
- **Issue:** The 5-step checklist is designed for activation, but step 1 ("Ask your first question") is the real aha moment — when the AI responds intelligently. However, the checklist doesn't emphasize this. Steps 2-5 (connect bank, review accounts, create invoice, close month) are operational tasks that don't demonstrate AI intelligence.
- **Strategic Impact:** Users may complete operational steps without ever experiencing the AI's core value — intelligent responses to natural language questions.
- **Fix:** Restructure the checklist to front-load the aha moment:
  1. Ask the AI a question (aha moment)
  2. See AI categorize your transactions (demonstrate AI work)
  3. Connect a bank (data source for AI)
  4. Review AI's suggestions (human-in-the-loop)
  5. Close your first month (complete loop)

### CEO-3 — ProactiveBriefing Doesn't Quantify AI Value

- **Severity:** MEDIUM
- **Component:** `proactive-briefing.tsx`
- **Issue:** The AI briefing shows alerts (deadlines, approvals, cash position) but doesn't quantify what the AI did. It says "nothing needs your attention" but doesn't say "AI processed 47 transactions" or "AI categorized 127 entries." The user doesn't see the AI's work.
- **Strategic Impact:** Users don't perceive AI value because they can't see what the AI did. This reduces retention and willingness to pay.
- **Fix:** Always show AI activity metrics: "AI processed 47 transactions today" or "AI categorized 127 entries with 94% accuracy." Quantify AI work.

### CEO-4 — No Social Proof or Trust Signals on Command Center

- **Severity:** MEDIUM
- **Component:** `page.tsx`
- **Issue:** The Command Center has no social proof, trust signals, or credibility indicators. For an AI-native product that handles financial data, trust is critical. Users need to see that others trust the AI with their books.
- **Strategic Impact:** New users may hesitate to trust AI with financial data without social proof.
- **Fix:** Add subtle trust signals: "Trusted by 500+ businesses" in the greeting area, or "Every action logged for audit" in the AI status badge.

### CEO-5 — Conversation Thread Doesn't Show AI Confidence Prominently

- **Severity:** MEDIUM
- **Component:** `conversation-thread.tsx`
- **Issue:** Confidence scores are shown on individual messages (`<ConfidenceBadge score={msg.confidence / 100} />`), but they're small and easy to miss. For an AI-native product, confidence is the primary trust mechanism. It should be more prominent.
- **Strategic Impact:** Users who don't notice confidence scores may not trust the AI's responses. Confidence is our key differentiator.
- **Fix:** Make confidence more prominent:
  1. Show confidence as a larger, colored indicator (green > 90%, yellow 70-90%, red < 70%)
  2. Add a brief explanation: "AI is 94% confident" not just a badge
  3. Show confidence in the streaming indicator: "Thinking... (92% confident)"

### CEO-6 — No Path from Free to Paid on Command Center

- **Severity:** MEDIUM
- **Component:** `page.tsx`
- **Issue:** The Command Center has no upgrade prompt, pricing reference, or conversion path. If a free-tier user is hitting limits, there's no way to discover paid plans from the primary surface.
- **Strategic Impact:** Free users who love the product can't easily upgrade. Conversion opportunity lost.
- **Fix:** Add a subtle upgrade prompt when free-tier limits are approached: "You've used 18/20 AI queries this month. Upgrade for unlimited." Or: "AI processing complete. [Upgrade for more AI agents]"

### CEO-7 — No Retention Hooks in Command Center

- **Severity:** MEDIUM
- **Component:** `page.tsx`
- **Issue:** The Command Center has no daily/weekly hooks to bring users back. No "AI has new insights for you" notification, no "Your AI found something interesting" prompt, no scheduled briefing summary.
- **Strategic Impact:** Users may forget to check the platform. No pull mechanism to drive daily engagement.
- **Fix:** Add daily hooks:
  1. Push notification: "AI found 3 things to review today"
  2. Email digest: "Your AI's weekly summary is ready"
  3. Greeting update: "Good morning, {name}. Your AI has 5 new insights."

### CEO-8 — Command Center Lacks Competitive Differentiation Display

- **Severity:** LOW
- **Component:** `ai-greeting.tsx`
- **Issue:** The greeting and AI status don't communicate what makes Xenboox different from QuickBooks/Xero. The user sees "AI active" but doesn't understand why this AI is better than competitors' AI features.
- **Strategic Impact:** Users may not understand the AI-native positioning. Competitive advantage is invisible.
- **Fix:** Add subtle differentiation: "AI agents processing your books (19 specialized agents)" or "AI-native accounting — not bolt-on AI."

---

### Summary — CEO/Founder

| Severity  | Count |
| --------- | ----- |
| HIGH      | 2     |
| MEDIUM    | 5     |
| LOW       | 1     |
| **Total** | **8** |

---

## Grand Summary — All Employees

| Employee           | HIGH   | MEDIUM | LOW    | Total   |
| ------------------ | ------ | ------ | ------ | ------- |
| Product Manager    | 4      | 11     | 5      | 20      |
| Engineering Critic | 4      | 9      | 3      | 16      |
| Design Critic      | 1      | 7      | 4      | 12      |
| UX Writer          | 0      | 6      | 6      | 12      |
| Copywriter         | 0      | 4      | 6      | 10      |
| Brand Voice        | 0      | 3      | 7      | 10      |
| CEO/Founder        | 2      | 5      | 1      | 8       |
| Security Engineer  | —      | —      | —      | SKIPPED |
| **TOTAL**          | **11** | **45** | **32** | **88**  |
