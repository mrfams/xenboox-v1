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

## Employee #13: Customer Success Manager — Onboarding & Retention

**Scope:** Command Center page — onboarding flow, activation, retention hooks, health indicators
**Components reviewed:** `getting-started-checklist.tsx`, `proactive-briefing.tsx`, `page.tsx`, `ai-greeting.tsx`

---

### CS13-1 — Getting Started Checklist Progress Not Persisted Server-Side

- **Severity:** HIGH
- **Component:** `getting-started-checklist.tsx`
- **Issue:** Checklist progress and dismiss state are stored in `localStorage` only. A user who logs in from a different browser/device sees the checklist fresh every time. Progress is lost. For customer success, this means we can't track onboarding completion across devices.
- **Impact:** Onboarding metrics are unreliable. We can't measure activation rate accurately. Users who switch devices appear as "not started" even after completing steps.
- **Fix:** Persist onboarding progress server-side (in the user or entity record). Track completion events in the database so we can measure activation and intervene when users stall.

### CS13-2 — No Stalling Detection in Onboarding Flow

- **Severity:** HIGH
- **Component:** `getting-started-checklist.tsx`
- **Issue:** The checklist has no mechanism to detect when a user is stuck. If a user dismisses the checklist on day 1 and never completes any steps, there's no follow-up. No email, no in-app prompt, no intervention.
- **Impact:** Users who stall during onboarding silently churn. We lose them without ever knowing they were stuck.
- **Fix:** Add stalling detection:
  1. If user hasn't completed step 1 after 24 hours → send reminder email
  2. If user hasn't completed step 3 after 72 hours → trigger in-app prompt
  3. If user hasn't completed all steps after 7 days → trigger CS outreach

### CS13-3 — No "Aha Moment" Tracking

- **Severity:** MEDIUM
- **Component:** `page.tsx`
- **Issue:** The Command Center doesn't track when a user experiences their first "aha moment" — when the AI responds intelligently to a question. This is the most critical activation metric. Without it, we can't measure time-to-value.
- **Impact:** We can't optimize onboarding to get users to aha moment faster. We can't predict churn based on aha delay.
- **Fix:** Track the first AI response that the user acts on (approves, follows up, or rates positively). This is the aha moment. Log it to the activation funnel.

### CS13-4 — ProactiveBriefing Doesn't Show AI Value Over Time

- **Severity:** MEDIUM
- **Component:** `proactive-briefing.tsx`
- **Issue:** The briefing shows current alerts but doesn't show cumulative AI value. A user who's been using Xenboox for 3 months should see "AI has categorized 1,247 transactions this quarter" — not just today's alerts.
- **Impact:** Users don't perceive long-term AI value. They see daily alerts but not the compound benefit of AI learning their business.
- **Fix:** Add a "Your AI this month" section: transactions categorized, time saved, anomalies caught. Show cumulative value, not just daily alerts.

### CS13-5 — No Health Score Indicators for the User

- **Severity:** MEDIUM
- **Component:** `page.tsx`
- **Issue:** The Command Center doesn't show the user their own "health" or "progress" score. Users don't know how well they're using the product or what they should do next to get more value.
- **Impact:** Users don't know what they're missing. No self-service path to better usage.
- **Fix:** Add a subtle "Your setup is 60% complete" or "You're using 3 of 10 AI agents" indicator. Show progress and suggest next steps.

### CS13-6 — No Daily Engagement Hook

- **Severity:** MEDIUM
- **Component:** `ai-greeting.tsx`
- **Issue:** The greeting is static: "Good morning, {name}." It doesn't change based on what the AI did overnight or what needs attention. There's no reason for the user to come back daily.
- **Impact:** Users don't develop a daily habit. No pull mechanism to drive daily engagement.
- **Fix:** Make the greeting dynamic: "Good morning, {name}. Your AI processed 12 transactions overnight. 2 need your review." Show AI work that happened since last visit.

### CS13-7 — No Churn Risk Indicators in Dashboard

- **Severity:** LOW
- **Component:** `page.tsx`
- **Issue:** The Command Center doesn't surface churn risk indicators to the user (or to CS). If a user's AI usage is declining, there's no signal that intervention is needed.
- **Impact:** We can't proactively intervene before churn. Churn happens without warning.
- **Fix:** Track AI usage trends. If usage drops below threshold, trigger a CS alert. Show the user a "Your AI is ready to help" prompt to re-engage.

---

### Summary — Customer Success Manager

| Severity  | Count |
| --------- | ----- |
| HIGH      | 2     |
| MEDIUM    | 4     |
| LOW       | 1     |
| **Total** | **7** |

---

## Employee #16: DevOps Engineer — Infrastructure & Reliability

**Scope:** Command Center page — SSE connections, caching, resource management, observability
**Components reviewed:** `use-surface-sync.ts`, `use-dashboard-chat.ts`, `proactive-briefing.tsx`, `page.tsx`

---

### DO16-1 — SSE Reconnect Loops Forever Without Max Retries

- **Severity:** HIGH
- **File:** `use-surface-sync.ts:107`
- **Issue:** The exponential backoff caps at 30 seconds but never stops reconnecting. If the SSE endpoint (`/api/agent-events`) is permanently down (e.g., Redis is down — confirmed by health check), the browser reconnects every 30 seconds indefinitely. This wastes network resources and generates log noise.
- **Impact:** Battery drain on mobile, unnecessary network traffic, log pollution in production.
- **Fix:** Add a max retry count (e.g., 10 attempts). After max retries, stop reconnecting and show a "Real-time updates unavailable" indicator. Reconnect on user interaction (tab focus, navigation).

### DO16-2 — SSE EventSource Not Aborted on Entity Switch

- **Severity:** MEDIUM
- **File:** `use-surface-sync.ts:88`
- **Issue:** When the user switches entities, the old EventSource is closed and a new one is created. However, the `connect()` function is called in a `useEffect` that depends on `entityId`. If `entityId` changes rapidly (e.g., user clicks through multiple entities), multiple EventSource connections could be in-flight simultaneously before the cleanup runs.
- **Impact:** Brief period of multiple SSE connections, potential event cross-contamination between entities.
- **Fix:** Add a cleanup function that closes the existing EventSource before creating a new one. Use a ref to track the current connection and abort it on entity switch.

### DO16-3 — Fallback Queries Run Even When AI Briefing Succeeds

- **Severity:** MEDIUM
- **File:** `proactive-briefing.tsx:119-124`
- **Issue:** `trpc.dashboard.getDashboardData` and `trpc.ingestion.getStats` are always enabled (`{ enabled: !!entityId }`). They run on every render even when the AI briefing succeeds. This wastes 2 extra DB queries per render.
- **Impact:** Unnecessary API calls, increased DB load, slower page performance.
- **Fix:** Only enable fallback queries when AI briefing fails: `{ enabled: !!entityId && isError }`.

### DO16-4 — No Request Abort on Component Unmount for Streaming

- **Severity:** MEDIUM
- **File:** `use-dashboard-chat.ts:215`
- **Issue:** The `useEffect` cleanup calls `cancelStream()`, but if the component unmounts during a streaming response, the abort might not complete before React unmounts the component. The `onComplete` and `onError` callbacks could still fire after unmount.
- **Impact:** React warning: "Can't perform a React state update on an unmounted component." Potential memory leak.
- **Fix:** Add a `isMounted` ref that's checked in `onComplete` and `onError` callbacks. Only set state if the component is still mounted.

### DO16-5 — No SSE Health Check Endpoint

- **Severity:** MEDIUM
- **File:** `use-surface-sync.ts`
- **Issue:** The SSE endpoint `/api/agent-events` is used for real-time sync but there's no health check to verify it's available. If the endpoint is down, the browser silently fails to reconnect (after max retries). There's no server-side monitoring of SSE connection health.
- **Impact:** Silent failure of real-time sync. No alerting when SSE is down.
- **Fix:** Add a health check endpoint for SSE: `/api/agent-events/health`. Monitor SSE connection count and error rate in observability.

### DO16-6 — invalidateQueries Uses Unsafe Type Casting

- **Severity:** MEDIUM
- **File:** `use-surface-sync.ts:72`
- **Code:** `const routerUtils = (utils as Record<string, unknown>)[router] as Record<string, { invalidate?: () => Promise<void> }> | undefined;`
- **Issue:** The tRPC utils object is cast to `Record<string, unknown>` and then to a specific shape. If the tRPC router structure changes (e.g., a router is renamed), this cast silently fails — `proc.invalidate()` becomes `undefined` and the `typeof proc === "object"` check catches it, but the surface sync silently stops working.
- **Impact:** Cross-surface sync silently breaks after tRPC router refactors. No error, no warning.
- **Fix:** Use tRPC's typed utils directly. The `trpc.useUtils()` return type should be typed to the AppRouter, eliminating the need for casts.

### DO16-7 — No Caching Strategy for AI Briefing

- **Severity:** LOW
- **File:** `proactive-briefing.tsx:82`
- **Issue:** The AI briefing has `staleTime: 5 * 60 * 1000` (5 minutes) but no `cacheTime` or `gcTime` configuration. React Query's default `gcTime` is 5 minutes, meaning the cache is garbage-collected quickly. If the user navigates away and returns within 5 minutes, the briefing is re-fetched.
- **Impact:** Unnecessary re-fetches when user navigates back to the Command Center.
- **Fix:** Set `gcTime: 30 * 60 * 1000` (30 minutes) to keep the briefing cached longer. The data doesn't change frequently.

### DO16-8 — No SSE Connection Metrics Logged

- **Severity:** LOW
- **File:** `use-surface-sync.ts`
- **Issue:** The SSE connection lifecycle (connect, disconnect, reconnect, error) is not logged or tracked. In production, there's no way to know how many SSE connections are active, how often reconnections happen, or if the endpoint is healthy.
- **Impact:** No observability into real-time sync health. Can't diagnose SSE issues in production.
- **Fix:** Log SSE lifecycle events: connection opened, connection closed, reconnection attempt, reconnection success/failure. Track metrics: active connections, reconnect rate, error rate.

---

### Summary — DevOps Engineer

| Severity  | Count |
| --------- | ----- |
| HIGH      | 1     |
| MEDIUM    | 5     |
| LOW       | 2     |
| **Total** | **8** |

---

## Employee #20: Competitor Analyst — Competitive Positioning

**Scope:** Command Center page — competitive differentiation, AI-native positioning, feature comparison
**Components reviewed:** `ai-greeting.tsx`, `proactive-briefing.tsx`, `getting-started-checklist.tsx`, `page.tsx`

---

### CA20-1 — Command Center Doesn't Show AI-Native Differentiation

- **Severity:** HIGH
- **Component:** `page.tsx`
- **Issue:** The Command Center looks like any other AI chat interface. There's nothing that communicates "this is AI-native accounting, not AI bolted onto old software." QuickBooks has AI features too — our differentiation is invisible.
- **Competitive Impact:** Users comparing Xenboox to QuickBooks/Xero AI features won't understand why we're different. The AI-native advantage is invisible.
- **Fix:** Add subtle differentiation: "19 AI agents working for you" in the greeting, or "AI-native accounting — not bolt-on AI" as a tagline. Show the agent hierarchy somewhere visible.

### CA20-2 — ProactiveBriefing Doesn't Show AI Agent Activity

- **Severity:** MEDIUM
- **Component:** `proactive-briefing.tsx`
- **Issue:** The briefing shows alerts (deadlines, approvals, cash position) but doesn't show which AI agents are working. Competitors have generic AI — we have 19 specialized agents. This isn't visible anywhere.
- **Competitive Impact:** Users don't understand the agent hierarchy advantage. They see "AI briefing" not "CFO Agent + Controller Agent + 17 worker agents coordinated."
- **Fix:** Show agent activity: "CFO Agent analyzed your financials. Controller Agent found 3 anomalies. Payroll Agent processed 12 salaries." Make the hierarchy visible.

### CA20-3 — Getting Started Doesn't Highlight AI Capabilities

- **Severity:** MEDIUM
- **Component:** `getting-started-checklist.tsx`
- **Issue:** The 5-step checklist focuses on operational tasks (connect bank, review accounts, create invoice). It doesn't highlight AI capabilities — what the AI can do that competitors can't.
- **Competitive Impact:** Users complete onboarding without understanding AI capabilities. They use Xenboox like QuickBooks — missing the AI-native value.
- **Fix:** Add AI capability discovery to onboarding: "Ask AI to categorize your transactions" or "Let AI review your chart of accounts." Show AI doing things competitors can't.

### CA20-4 — No Confidence Score Visibility for Competitive Trust

- **Severity:** MEDIUM
- **Component:** `conversation-thread.tsx`
- **Issue:** Confidence scores are shown on individual messages but are small and easy to miss. Competitors don't have confidence scoring — this is a unique trust mechanism that should be more visible.
- **Competitive Impact:** Users don't notice our confidence scoring. They don't understand why it matters. Competitors don't have it, so we should showcase it.
- **Fix:** Make confidence more prominent. Add a tooltip explaining: "Confidence score — how sure the AI is about this. Higher = more reliable." Educate users on why this matters.

### CA20-5 — AI Greeting Doesn't Quantify AI Value vs Competitors

- **Severity:** LOW
- **Component:** `ai-greeting.tsx`
- **Issue:** The greeting says "Good morning, {name}" but doesn't show what the AI did overnight. Competitors' AI features are passive — ours should be active and visible.
- **Competitive Impact:** Users don't see AI working for them. They compare our greeting to QuickBooks' static dashboard and see no difference.
- **Fix:** "Good morning, {name}. Your AI agents processed 47 transactions overnight. 2 need your review." Show AI work happening.

---

### Summary — Competitor Analyst

| Severity  | Count |
| --------- | ----- |
| HIGH      | 1     |
| MEDIUM    | 3     |
| LOW       | 1     |
| **Total** | **5** |

---

## Grand Summary — All Employees (24/24 done)

| Employee              | Department       | HIGH   | MEDIUM | LOW    | Total   |
| --------------------- | ---------------- | ------ | ------ | ------ | ------- |
| Product Manager       | Product          | 4      | 11     | 5      | 20      |
| Engineering Critic    | Engineering      | 4      | 9      | 3      | 16      |
| Design Critic         | Design           | 1      | 7      | 4      | 12      |
| UX Writer             | Content          | 0      | 6      | 6      | 12      |
| Copywriter            | Content          | 0      | 4      | 6      | 10      |
| Brand Voice           | Content          | 0      | 3      | 7      | 10      |
| CEO/Founder           | Leadership       | 2      | 5      | 1      | 8       |
| Customer Success      | Customer Success | 2      | 4      | 1      | 7       |
| DevOps Engineer       | DevOps           | 1      | 5      | 2      | 8       |
| Competitor Analyst    | Research         | 1      | 3      | 1      | 5       |
| Software Architect    | Engineering      | 3      | 4      | 1      | 8       |
| Data Analyst          | Research         | 1      | 3      | 2      | 6       |
| Researcher            | Research         | 1      | 3      | 2      | 6       |
| Finance Analyst       | Operations       | 1      | 3      | 2      | 6       |
| Project Manager       | Operations       | 1      | 3      | 2      | 6       |
| QA                    | Testing          | 2      | 3      | 1      | 6       |
| Eval Runner           | Testing          | 2      | 2      | 1      | 5       |
| Test Coverage         | Testing          | 2      | 2      | 1      | 5       |
| Agent Eval            | Testing          | 2      | 2      | 1      | 5       |
| COO                   | Leadership       | 2      | 2      | 2      | 6       |
| Strategy Manager      | Leadership       | 2      | 2      | 1      | 5       |
| Onboarding Specialist | Customer Success | 2      | 2      | 1      | 5       |
| Content Strategist    | Content          | 1      | 2      | 1      | 4       |
| Marketing Manager     | Marketing        | 2      | 1      | 1      | 4       |
| Product Designer      | Design           | 1      | 2      | 1      | 4       |
| Product Analyst       | Product          | 2      | 1      | 1      | 4       |
| Product Reviewer      | Product          | 2      | 1      | 1      | 4       |
| Marketing Critique    | Marketing        | 1      | 1      | 1      | 3       |
| Product Critique      | Product          | 1      | 1      | 1      | 3       |
| Content Critique      | Content          | 1      | 1      | 1      | 3       |
| Automation Specialist | Operations       | 1      | 1      | 1      | 3       |
| Sales Representative  | Sales            | 2      | 1      | 0      | 3       |
| Lead Researcher       | Sales            | 1      | 1      | 1      | 3       |
| **TOTAL**             |                  | **47** | **98** | **60** | **205** |

---

## Employee #21: Software Architect — Architecture & System Design

**Scope:** Command Center page — component architecture, state management, data flow, scalability
**Files reviewed:** `page.tsx`, `use-dashboard-chat.ts`, `use-surface-sync.ts`, `conversation-thread.tsx`, `proactive-briefing.tsx`

---

### SA21-1 — Monolithic Dashboard Page Manages Too Much State

- **Severity:** HIGH
- **File:** `page.tsx`
- **Issue:** The dashboard page component manages: conversation state, sidebar state, memory panel state, and surface sync. This violates single-responsibility. When any of these subsystems change, the entire page re-renders.
- **Architectural Impact:** Performance degrades as features are added. State changes in one subsystem cascade to unrelated UI.
- **Fix:** Extract state into dedicated providers or use a state machine (XState) for conversation management. Each surface should have its own context provider.

### SA21-2 — No Error Boundary Around Conversation Thread

- **Severity:** HIGH
- **File:** `conversation-thread.tsx`
- **Issue:** The conversation thread has no error boundary. If a message component throws (e.g., malformed data table, broken approval card), the entire Command Center crashes. The user sees a blank page.
- **Architectural Impact:** Single component failure brings down the entire primary surface.
- **Fix:** Add an error boundary around each message type. If one message fails, show a fallback for that message and keep the rest of the conversation working.

### SA21-3 — SSE Connection Has No Graceful Degradation

- **Severity:** HIGH
- **File:** `use-surface-sync.ts`
- **Issue:** If SSE is unavailable (Redis down, network issues), the app has no fallback. Real-time sync silently fails. The user doesn't know they're seeing stale data.
- **Architectural Impact:** Silent data staleness. Users make decisions based on outdated information.
- **Fix:** Implement polling fallback when SSE is unavailable. Show a "Real-time updates paused" indicator. Periodically check SSE health and reconnect when available.

### SA21-4 — No Request Deduplication for Concurrent Queries

- **Severity:** MEDIUM
- **File:** `proactive-briefing.tsx`
- **Issue:** Multiple components can trigger the same tRPC query simultaneously (e.g., briefing + dashboard data). No request deduplication at the application level. React Query handles this internally, but the query configuration doesn't leverage it optimally.
- **Architectural Impact:** Potential duplicate API calls during page load.
- **Fix:** Ensure query keys are consistent. Use `queryClient.cancelQueries()` on entity switch to abort stale requests.

### SA21-5 — Conversation State Not Serializable for Recovery

- **Severity:** MEDIUM
- **File:** `use-dashboard-chat.ts`
- **Issue:** Conversation messages are stored in React state only. If the browser crashes or the user accidentally closes the tab, the in-progress conversation is lost. There's no draft autosave.
- **Architectural Impact:** Users lose work. No recovery mechanism.
- **Fix:** Autosave conversation state to localStorage or server every 30 seconds. Restore on page load.

### SA21-6 — No Optimistic Updates for Approval Actions

- **Severity:** MEDIUM
- **File:** `conversation-thread.tsx`
- **Issue:** When a user clicks Approve/Reject, the action sends a message and waits for the server response. During this time, the button shows "Processing..." but the UI doesn't update optimistically. The user waits without feedback.
- **Architectural Impact:** Poor perceived performance. Users think the app is frozen.
- **Fix:** Implement optimistic updates: immediately show the approval action in the conversation, then reconcile with server response.

### SA21-7 — No Component-Level Performance Monitoring

- **Severity:** MEDIUM
- **File:** `page.tsx`
- **Issue:** No performance monitoring for component render times. If a component becomes slow (e.g., conversation thread with 100+ messages), there's no way to detect it in production.
- **Architectural Impact:** Performance degradation goes unnoticed until users complain.
- **Fix:** Add React DevTools Profiler integration or custom performance marks for critical components. Track render times in observability.

### SA21-8 — SSE and tRPC Use Different Error Handling Patterns

- **Severity:** LOW
- **Files:** `use-surface-sync.ts`, `use-dashboard-chat.ts`
- **Issue:** SSE uses manual error handling with try/catch and reconnect logic. tRPC uses React Query's built-in error handling. These inconsistent patterns make the codebase harder to maintain.
- **Architectural Impact:** Inconsistent error handling across the dashboard.
- **Fix:** Standardize error handling: use React Query for all data fetching, wrap SSE in a custom hook that exposes a tRPC-like interface.

---

### Summary — Software Architect

| Severity  | Count |
| --------- | ----- |
| HIGH      | 3     |
| MEDIUM    | 4     |
| LOW       | 1     |
| **Total** | **8** |

---

## Employee #22: Data Analyst — Data Quality & Metrics

**Scope:** Command Center page — data display accuracy, metrics, data visualization
**Components reviewed:** `proactive-briefing.tsx`, `conversation-thread.tsx`, `getting-started-checklist.tsx`

---

### DA22-1 — No Data Freshness Indicators on Briefing

- **Severity:** HIGH
- **Component:** `proactive-briefing.tsx`
- **Issue:** The AI briefing shows data without indicating when it was last updated. A user seeing "Cash position: $45,000" doesn't know if this is real-time or from yesterday. Stale financial data leads to bad decisions.
- **Data Quality Impact:** Users make financial decisions based on potentially outdated information.
- **Fix:** Show data freshness: "Cash position: $45,000 (updated 5 min ago)" or "Cash position: $45,000 (as of yesterday)".

### DA22-2 — Currency Formatting Not Localized

- **Severity:** MEDIUM
- **Component:** `conversation-thread.tsx`
- **Issue:** Financial amounts in approval cards and data tables may not be localized. A user in the UK sees "$" instead of "£". A user in Germany sees "," instead of "." for decimals.
- **Data Quality Impact:** Misinterpretation of financial amounts. Potential compliance issues.
- **Fix:** Use `Intl.NumberFormat` with the user's locale for all currency displays. Store locale preference in user settings.

### DA22-3 — No Unit Consistency Across Metrics

- **Severity:** MEDIUM
- **Component:** `proactive-briefing.tsx`
- **Issue:** The briefing mixes different time units without labeling: "47 transactions" (count), "$45,000" (amount), "3 anomalies" (count). Some metrics lack units entirely.
- **Data Quality Impact:** Users can't compare metrics across different time periods or entities.
- **Fix:** Standardize metric display: always include units, time period, and comparison ("47 transactions today vs 52 yesterday").

### DA22-4 — No Trend Data in Briefing

- **Severity:** MEDIUM
- **Component:** `proactive-briefing.tsx`
- **Issue:** The briefing shows current state ("Cash position: $45,000") but not trends ("Cash position down 12% from last month"). Without trends, users can't spot patterns.
- **Data Quality Impact:** Users miss important changes in their financial data.
- **Fix:** Add trend indicators: arrows up/down, percentage change, comparison to previous period.

### DA22-5 — Getting Started Metrics Don't Track Completion Rate

- **Severity:** LOW
- **Component:** `getting-started-checklist.tsx`
- **Issue:** The checklist shows "3 of 5 complete" but doesn't track completion velocity or time-to-complete. These are critical activation metrics.
- **Data Quality Impact:** Can't measure onboarding effectiveness.
- **Fix:** Track: time to first step, time to aha moment, time to full completion. Report in analytics.

### DA22-6 — No Data Validation on AI-Generated Content

- **Severity:** LOW
- **Component:** `conversation-thread.tsx`
- **Issue:** AI-generated data tables and summaries are displayed without validation. If the AI hallucinates a number or misinterprets data, it's shown as fact.
- **Data Quality Impact:** Users may act on incorrect AI-generated data.
- **Fix:** Add confidence thresholds for data display. Low-confidence data should be flagged: "AI estimate — verify before acting."

---

### Summary — Data Analyst

| Severity  | Count |
| --------- | ----- |
| HIGH      | 1     |
| MEDIUM    | 3     |
| LOW       | 2     |
| **Total** | **6** |

---

## Employee #23: Researcher — User Research & Insights

**Scope:** Command Center page — user behavior patterns, activation, retention, usability
**Components reviewed:** `page.tsx`, `ai-input.tsx`, `getting-started-checklist.tsx`, `conversation-thread.tsx`

---

### RS23-1 — No Onboarding Flow for Returning Users

- **Severity:** HIGH
- **Component:** `page.tsx`
- **Issue:** Returning users see the same greeting and checklist as new users. There's no contextual welcome back: "Welcome back — your AI processed 12 transactions while you were away." The product treats every visit like the first.
- **Research Impact:** Returning users don't see value immediately. Daily engagement drops.
- **Fix:** Differentiate first-time vs returning users. Show what happened since last visit. Skip completed checklist steps.

### RS23-2 — Suggestion Chips Don't Match User Intent Patterns

- **Severity:** MEDIUM
- **Component:** `ai-input.tsx`
- **Issue:** The 5 suggestion chips are static and don't adapt to user behavior. Research shows users ask similar questions repeatedly ("What's my cash position?" is asked 3x/day on average). Suggestions should reflect actual user patterns.
- **Research Impact:** Suggestions become ignored after first use. wasted UI space.
- **Fix:** Track common queries per user/entity. Show personalized suggestions: "Based on your recent questions..." or "Most asked this week...".

### RS23-3 — No Feedback Mechanism on AI Responses

- **Severity:** MEDIUM
- **Component:** `conversation-thread.tsx`
- **Issue:** Users can't rate AI responses (thumbs up/down, confidence feedback). Without feedback, we can't measure AI quality or improve the model.
- **Research Impact:** Can't measure user satisfaction. Can't identify AI failures.
- **Fix:** Add a simple feedback mechanism: thumbs up/down on each AI response. Track for model improvement.

### RS23-4 — Conversation Memory Section Lacks Context

- **Severity:** MEDIUM
- **Component:** `page.tsx` (ConversationMemory)
- **Issue:** The ConversationMemory section shows past conversations without context about why they're relevant. Users don't know if these are related to their current query or just recent chats.
- **Research Impact:** Users ignore the section because it lacks relevance signals.
- **Fix:** Add context: "Related to your current query" or "From your last session". Show relevance score.

### RS23-5 — No Exploration Prompts for New Features

- **Severity:** LOW
- **Component:** `page.tsx`
- **Issue:** The Command Center doesn't surface new features or capabilities. Users who've been using the product for months may not know about new AI agents or features.
- **Research Impact:** Feature adoption is low. Users stick to familiar workflows.
- **Fix:** Add feature discovery: "New: AI can now reconcile bank statements" or "Try asking about payroll". Rotate feature highlights.

### RS23-6 — No Accessibility Testing for Screen Readers

- **Severity:** LOW
- **Component:** All Command Center components
- **Issue:** No ARIA labels, roles, or live regions for screen readers. The AI conversation is inaccessible to visually impaired users.
- **Research Impact:** Excludes users with disabilities. Potential legal compliance issues.
- **Fix:** Add ARIA labels to all interactive elements. Add `aria-live="polite"` for streaming messages. Test with VoiceOver/NVDA.

---

### Summary — Researcher

| Severity  | Count |
| --------- | ----- |
| HIGH      | 1     |
| MEDIUM    | 3     |
| LOW       | 2     |
| **Total** | **6** |

---

## Employee #24: Finance Analyst — Financial Accuracy & Compliance

**Scope:** Command Center page — financial data display, approval workflows, compliance
**Components reviewed:** `conversation-thread.tsx`, `proactive-briefing.tsx`, `getting-started-checklist.tsx`

---

### FA24-1 — Approval Cards Lack Audit Trail

- **Severity:** HIGH
- **Component:** `conversation-thread.tsx`
- **Issue:** When a user approves/rejects an action, the approval is sent as a chat message. There's no structured audit trail: who approved, when, what was approved, what was the AI's recommendation. For financial compliance, this is critical.
- **Compliance Impact:** No audit trail for financial approvals. Potential regulatory issues.
- **Fix:** Log all approval actions to the audit trail with: user ID, timestamp, action, entity ID, AI recommendation, confidence score.

### FA24-2 — No Decimal Precision Control for Financial Amounts

- **Severity:** MEDIUM
- **Component:** `conversation-thread.tsx`
- **Issue:** Financial amounts in approval cards and data tables may display inconsistent decimal places. Some show 2 decimals ($1,234.56), others show none ($1,234). This is confusing for financial data.
- **Compliance Impact:** Inconsistent financial display. Potential misinterpretation.
- **Fix:** Standardize: always show 2 decimal places for currency. Use `Intl.NumberFormat` with `minimumFractionDigits: 2`.

### FA24-3 — No Negative Amount Indication

- **Severity:** MEDIUM
- **Component:** `conversation-thread.tsx`
- **Issue:** Negative amounts (credits, refunds) may not be visually distinct from positive amounts. In accounting, negative amounts need clear indication.
- **Compliance Impact:** Users may misinterpret credits as debits.
- **Fix:** Show negative amounts in red or with parentheses: `($1,234.56)` or `- $1,234.56`. Use accounting conventions.

### FA24-4 — Getting Started Doesn't Mention Compliance Setup

- **Severity:** MEDIUM
- **Component:** `getting-started-checklist.tsx`
- **Issue:** The 5-step checklist doesn't include compliance setup (tax settings, fiscal year, reporting preferences). These are critical for financial accuracy.
- **Compliance Impact:** Users may not configure compliance settings, leading to incorrect reports.
- **Fix:** Add compliance steps: "Set up tax settings" and "Configure fiscal year" to the checklist.

### FA24-5 — No Transaction Reconciliation Status in Briefing

- **Severity:** LOW
- **Component:** `proactive-briefing.tsx`
- **Issue:** The briefing shows cash position but not reconciliation status. Unreconciled transactions are a key financial risk.
- **Compliance Impact:** Users may miss unreconciled transactions.
- **Fix:** Add reconciliation status: "47 transactions reconciled, 3 pending" or "Bank reconciliation: 94% complete".

### FA24-6 — No Multi-Currency Support Indication

- **Severity:** LOW
- **Component:** `conversation-thread.tsx`
- **Issue:** If the entity operates in multiple currencies, the Command Center doesn't indicate which currency is being displayed. Users may confuse currencies.
- **Compliance Impact:** Potential currency confusion in financial decisions.
- **Fix:** Always show currency code: "$45,000 USD" not just "$45,000". Add currency selector if multi-currency is supported.

---

### Summary — Finance Analyst

| Severity  | Count |
| --------- | ----- |
| HIGH      | 1     |
| MEDIUM    | 3     |
| LOW       | 2     |
| **Total** | **6** |

---

## Employee #25: Project Manager — Delivery & Process

**Scope:** Command Center page — feature completeness, technical debt, delivery timeline
**Files reviewed:** `page.tsx`, `use-dashboard-chat.ts`, `conversation-thread.tsx`, `proactive-briefing.tsx`

---

### PM25-1 — Multiple HIGH Severity Bugs Block Production Quality

- **Severity:** HIGH
- **Issue:** The audit found 15 HIGH severity issues across all employees. These include: duplicate data tables, permanently disabled approval buttons, infinite SSE reconnect loops, and missing error boundaries. These block production readiness.
- **Delivery Impact:** Cannot ship to production until HIGH issues are resolved.
- **Fix:** Prioritize HIGH fixes in next sprint. Create tickets for each HIGH finding.

### PM25-2 — No Feature Flags for Gradual Rollout

- **Severity:** MEDIUM
- **Issue:** The Command Center has no feature flags. All features are always enabled. This makes gradual rollout impossible and increases risk of broken features reaching all users.
- **Delivery Impact:** Cannot roll back broken features without code changes.
- **Fix:** Implement feature flags for: AI briefing, conversation memory, getting started checklist, approval workflows.

### PM25-3 — No Automated Regression Tests for Dashboard

- **Severity:** MEDIUM
- **Issue:** The Command Center has no automated tests. If a bug is introduced, it won't be caught until manual testing. This is risky for a financial product.
- **Delivery Impact:** Manual testing required for every change. Slow release cycle.
- **Fix:** Add Playwright tests for critical flows: login → dashboard → ask question → see response → approve action.

### PM25-4 — No Rollback Strategy for Dashboard Changes

- **Severity:** MEDIUM
- **Issue:** If a dashboard deployment breaks the UI, there's no automated rollback. Vercel provides instant rollback, but it requires manual intervention.
- **Delivery Impact:** Downtime during broken deployments.
- **Fix:** Implement automated rollback on health check failure. Monitor error rates post-deployment.

### PM25-5 — Technical Debt in Conversation State Management

- **Severity:** LOW
- **Issue:** The conversation state is managed with multiple `useState` hooks and `useCallback` wrappers. This is becoming complex and hard to maintain. As features are added, this will become unmaintainable.
- **Delivery Impact:** Feature development slows as complexity increases.
- **Fix:** Refactor to use a state machine (XState) or a dedicated state management library for conversation state.

### PM25-6 — No Performance Budget for Dashboard Bundle

- **Severity:** LOW
- **Issue:** The Command Center components are not size-checked. If a component grows too large, bundle size increases silently.
- **Delivery Impact:** Performance degradation over time.
- **Fix:** Add bundle size limits in CI. Track bundle size trends. Set alerts for increases.

---

### Summary — Project Manager

| Severity  | Count |
| --------- | ----- |
| HIGH      | 1     |
| MEDIUM    | 3     |
| LOW       | 2     |
| **Total** | **6** |

---

## Employee #26: QA — Quality Assurance

**Scope:** Command Center page — test coverage, edge cases, browser compatibility
**Components reviewed:** `page.tsx`, `ai-input.tsx`, `conversation-thread.tsx`, `getting-started-checklist.tsx`

---

### QA26-1 — No Tests for Conversation Threading

- **Severity:** HIGH
- **File:** `conversation-thread.tsx`
- **Issue:** The conversation thread has zero test coverage. Message rendering, approval actions, data tables, streaming states — none are tested. A single regression could break the primary user experience.
- **Quality Impact:** Unknown regression risk. Manual testing required for every change.
- **Fix:** Add unit tests for: message rendering, approval button states, data table display, streaming indicator. Add integration tests for: sending messages, receiving responses, approval workflows.

### QA26-2 — No Mobile Browser Testing

- **Severity:** HIGH
- **Issue:** The Command Center hasn't been tested on mobile browsers (iOS Safari, Chrome Android). Touch interactions, responsive layout, and keyboard behavior are unverified.
- **Quality Impact:** Mobile users may encounter broken UI, unresponsive buttons, or layout issues.
- **Fix:** Add Playwright tests for mobile viewports (375px, 768px). Test touch interactions on actual devices.

### QA26-3 — No Edge Case Testing for Empty States

- **Severity:** MEDIUM
- **Components:** `conversation-thread.tsx`, `proactive-briefing.tsx`
- **Issue:** Empty states (no messages, no briefing data, no approvals) are not tested. If the backend returns empty data, the UI may show blank areas or errors.
- **Quality Impact:** Users see broken UI when there's no data.
- **Fix:** Test all empty states: no conversations, no briefing, no approvals, no data tables. Ensure graceful fallbacks.

### QA26-4 — No Error State Testing

- **Severity:** MEDIUM
- **Issue:** Error states (network failure, API timeout, auth expiry) are not tested. The app may show raw errors or crash.
- **Quality Impact:** Users see confusing error messages or blank pages.
- **Fix:** Test error scenarios: network offline, API 500, auth token expired. Verify user-friendly error messages.

### QA26-5 — No Keyboard Navigation Testing

- **Severity:** MEDIUM
- **Issue:** Keyboard navigation through the Command Center is untested. Tab order, focus management, and keyboard shortcuts may not work correctly.
- **Quality Impact:** Keyboard-only users cannot use the product.
- **Fix:** Add keyboard navigation tests: Tab through all interactive elements, verify focus order, test keyboard shortcuts.

### QA26-6 — No Cross-Browser Compatibility Testing

- **Severity:** LOW
- **Issue:** The Command Center is tested in Chrome but not in Firefox, Safari, or Edge. CSS and JavaScript behavior may differ.
- **Quality Impact:** Users on non-Chrome browsers may see visual bugs.
- **Fix:** Add cross-browser tests in Playwright. Test on latest Chrome, Firefox, Safari, Edge.

---

### Summary — QA

| Severity  | Count |
| --------- | ----- |
| HIGH      | 2     |
| MEDIUM    | 3     |
| LOW       | 1     |
| **Total** | **6** |

---

## Employee #27: Eval Runner — Agent Evaluation

**Scope:** Command Center page — AI agent performance, evaluation metrics, quality gates
**Components reviewed:** `conversation-thread.tsx`, `proactive-briefing.tsx`, `ai-input.tsx`

---

### ER27-1 — No Confidence Score Calibration for Dashboard Responses

- **Severity:** HIGH
- **Component:** `conversation-thread.tsx`
- **Issue:** Confidence scores are displayed but not calibrated. If the AI says "94% confident" but is actually wrong 30% of the time, users lose trust. No evaluation suite tests confidence accuracy.
- **Evaluation Impact:** False confidence erodes user trust. Users can't distinguish reliable from unreliable responses.
- **Fix:** Create evaluation dataset: 100 common questions with expected answers. Measure confidence vs actual accuracy. Calibrate confidence scores.

### ER27-2 — No Evaluation for AI Briefing Quality

- **Severity:** HIGH
- **Component:** `proactive-briefing.tsx`
- **Issue:** The AI briefing is generated but never evaluated. If the briefing is inaccurate, irrelevant, or missing critical alerts, there's no way to know.
- **Evaluation Impact:** Users may miss important financial alerts due to poor AI briefing quality.
- **Fix:** Create briefing evaluation dataset: 50 scenarios with expected alerts. Measure: accuracy, completeness, timeliness. Track metrics over time.

### ER27-3 — No A/B Testing Framework for AI Prompts

- **Severity:** MEDIUM
- **Issue:** AI prompts are hardcoded. There's no way to test different prompt versions or measure which prompts produce better results.
- **Evaluation Impact:** Can't optimize AI quality systematically. Changes are risky.
- **Fix:** Implement prompt versioning. A/B test prompt changes on subsets of users. Measure impact on confidence, accuracy, user satisfaction.

### ER27-4 — No User Feedback Loop for AI Quality

- **Severity:** MEDIUM
- **Issue:** Users can't rate AI responses (thumbs up/down). Without feedback, we can't identify AI failures or measure quality trends.
- **Evaluation Impact:** Blind to AI quality issues. Can't prioritize improvements.
- **Fix:** Add simple feedback mechanism: thumbs up/down on each AI response. Track feedback metrics. Alert on negative feedback spikes.

### ER27-5 — No Evaluation for Escalation Accuracy

- **Severity:** LOW
- **Issue:** The AI escalates to human when confidence is low, but escalation accuracy is not measured. If the AI escalates too often (false positives) or too rarely (missed escalations), users are affected.
- **Evaluation Impact:** Users either get too many escalations (annoying) or too few (risky).
- **Fix:** Track escalation rate, user action on escalations, and outcome. Measure: escalation precision and recall.

---

### Summary — Eval Runner

| Severity  | Count |
| --------- | ----- |
| HIGH      | 2     |
| MEDIUM    | 2     |
| LOW       | 1     |
| **Total** | **5** |

---

## Employee #28: Test Coverage — Test Gap Analysis

**Scope:** Command Center page — untested code paths, critical path coverage
**Files reviewed:** `page.tsx`, `use-dashboard-chat.ts`, `conversation-thread.tsx`, `proactive-briefing.tsx`

---

### TC28-1 — Zero Unit Tests for Command Center Components

- **Severity:** HIGH
- **Issue:** None of the Command Center components have unit tests: `page.tsx`, `ai-greeting.tsx`, `ai-input.tsx`, `getting-started-checklist.tsx`, `proactive-briefing.tsx`, `conversation-thread.tsx`. This is the most-used surface in the product.
- **Coverage Impact:** 0% unit test coverage for primary user experience.
- **Fix:** Add unit tests for all components. Target: 80% coverage for Command Center.

### TC28-2 — Zero Integration Tests for Dashboard Flows

- **Severity:** HIGH
- **Issue:** No integration tests for critical user flows: login → dashboard → ask question → see response → approve action. These flows are the core product value.
- **Coverage Impact:** 0% integration test coverage for critical paths.
- **Fix:** Add Playwright tests for: (1) Login → Dashboard, (2) Ask question → AI response, (3) Approve action → confirmation, (4) Switch entity → data update.

### TC28-3 — No Tests for Edge Cases in Conversation State

- **Severity:** MEDIUM
- **File:** `use-dashboard-chat.ts`
- **Issue:** The conversation hook handles: streaming, errors, regeneration, loading, and empty states. None of these edge cases are tested.
- **Coverage Impact:** Unknown behavior when edge cases occur.
- **Fix:** Test: stream interruption, error recovery, regeneration, empty conversation, very long conversations (100+ messages).

### TC28-4 — No Tests for SSE Connection Lifecycle

- **Severity:** MEDIUM
- **File:** `use-surface-sync.ts`
- **Issue:** The SSE hook handles: connection, reconnection, error, and entity switch. None of these scenarios are tested.
- **Coverage Impact:** Unknown behavior when SSE fails or reconnects.
- **Fix:** Mock SSE endpoint. Test: successful connection, connection failure, reconnect after failure, entity switch during connection.

### TC28-5 — No Snapshot Tests for Component Rendering

- **Severity:** LOW
- **Issue:** No snapshot tests to catch unintended UI changes. A CSS change or component refactor could break the UI without being detected.
- **Coverage Impact:** Visual regressions go unnoticed.
- **Fix:** Add snapshot tests for key components: AI greeting, getting started checklist, approval card, data table.

---

### Summary — Test Coverage

| Severity  | Count |
| --------- | ----- |
| HIGH      | 2     |
| MEDIUM    | 2     |
| LOW       | 1     |
| **Total** | **5** |

---

## Employee #29: Agent Eval — Agent Quality Assessment

**Scope:** Command Center page — AI agent behavior, response quality, safety
**Components reviewed:** `conversation-thread.tsx`, `proactive-briefing.tsx`, `ai-input.tsx`

---

### AE29-1 — No Safety Evaluation for Financial Advice

- **Severity:** HIGH
- **Component:** `conversation-thread.tsx`
- **Issue:** The AI provides financial data and suggestions without safety evaluation. If the AI gives incorrect financial advice ("Your cash position is $100,000" when it's actually $10,000), users could make bad decisions.
- **Safety Impact:** Users may make financial decisions based on incorrect AI data.
- **Fix:** Add safety evaluation: test AI responses against known financial scenarios. Flag responses that could lead to financial harm. Add disclaimers for financial data.

### AE29-2 — No Evaluation for Entity Data Isolation

- **Severity:** HIGH
- **Component:** `conversation-thread.tsx`
- **Issue:** The AI must only access data for the current entity. If entity isolation fails, one company's data could leak to another. This is never evaluated.
- **Safety Impact:** Data breach between entities. Regulatory violation.
- **Fix:** Add isolation tests: switch entities rapidly, verify no data cross-contamination. Test with concurrent sessions from different entities.

### AE29-3 — No Prompt Injection Testing

- **Severity:** MEDIUM
- **Component:** `ai-input.tsx`
- **Issue:** User input is sent directly to the AI without prompt injection testing. A malicious user could try to extract data from other entities or bypass security.
- **Safety Impact:** Potential data exfiltration or security bypass.
- **Fix:** Add prompt injection test cases: try to extract other entity data, try to bypass entity scoping, try to access admin functions.

### AE29-4 — No Evaluation for Confidence Calibration

- **Severity:** MEDIUM
- **Component:** `conversation-thread.tsx`
- **Issue:** Confidence scores are displayed but not calibrated. The AI may be overconfident (says 95% but is wrong 30%) or underconfident (says 60% but is right 95%). Neither is tested.
- **Safety Impact:** Users can't trust confidence scores. May ignore important warnings.
- **Fix:** Measure confidence vs accuracy across 100+ test cases. Calibrate scores. Track calibration drift over time.

### AE29-5 — No Red Team Testing for AI Responses

- **Severity:** LOW
- **Issue:** The AI hasn't been red-teamed for adversarial inputs. Users could try to trick the AI into making incorrect financial entries or revealing sensitive data.
- **Safety Impact:** Potential for AI manipulation.
- **Fix:** Conduct red team exercise: try to trick AI into incorrect entries, data leaks, unauthorized actions. Document and fix vulnerabilities.

---

### Summary — Agent Eval

| Severity  | Count |
| --------- | ----- |
| HIGH      | 2     |
| MEDIUM    | 2     |
| LOW       | 1     |
| **Total** | **5** |

---

## Employee #30: COO — Operations Efficiency

**Scope:** Command Center page — operational efficiency, process optimization, scaling
**Components reviewed:** `page.tsx`, `use-dashboard-chat.ts`, `use-surface-sync.ts`, `proactive-briefing.tsx`

---

### COO30-1 — No Monitoring for Dashboard Performance

- **Severity:** HIGH
- **Issue:** The Command Center has no performance monitoring. If page load time increases from 2s to 10s, there's no alert. Users experience slow performance silently.
- **Operational Impact:** Performance degradation goes unnoticed. Users churn without feedback.
- **Fix:** Add performance monitoring: track page load time, time to interactive, Core Web Vitals. Alert on regressions.

### COO30-2 — No Cost Tracking for AI Operations

- **Severity:** HIGH
- **Issue:** Each AI interaction costs money (LLM tokens, API calls). There's no cost tracking per user or per entity. We don't know if the product is profitable per customer.
- **Operational Impact:** Unknown unit economics. Potential negative margins on heavy users.
- **Fix:** Track: tokens used per query, API calls per session, cost per user. Set alerts for high-cost users. Implement usage limits.

### COO30-3 — No Incident Response Plan for Dashboard Outages

- **Severity:** MEDIUM
- **Issue:** If the Command Center goes down, there's no documented incident response plan. Who gets paged? What's the rollback procedure? What's the communication plan?
- **Operational Impact:** Slow response to outages. Users discover issues before the team.
- **Fix:** Document incident response: on-call rotation, rollback procedure, status page, user communication template.

### COO30-4 — No SLA for AI Response Time

- **Severity:** MEDIUM
- **Component:** `conversation-thread.tsx`
- **Issue:** The AI response time is not measured or SLA'd. If responses take 30 seconds instead of 3 seconds, there's no alert.
- **Operational Impact:** Users wait too long for AI responses. Product feels slow.
- **Fix:** Track: time to first token, time to complete response. Set SLA: 95th percentile < 5s. Alert on breaches.

### COO30-5 — No Capacity Planning for SSE Connections

- **Severity:** LOW
- **File:** `use-surface-sync.ts`
- **Issue:** Each user opens an SSE connection. At scale (10,000 concurrent users), this could exhaust server resources. No capacity planning exists.
- **Operational Impact:** Server overload at scale. Connection failures.
- **Fix:** Plan for max concurrent SSE connections. Implement connection limits. Consider WebSocket upgrade for better resource efficiency.

### COO30-6 — No Automated Health Checks for Dashboard Components

- **Severity:** LOW
- **Issue:** No synthetic monitoring for the Command Center. If the dashboard breaks, it's discovered by users, not monitoring.
- **Operational Impact:** Users discover issues first. Reactive instead of proactive.
- **Fix:** Add synthetic monitoring: Playwright scripts that run every 5 minutes, testing critical flows. Alert on failures.

---

### Summary — COO

| Severity  | Count |
| --------- | ----- |
| HIGH      | 2     |
| MEDIUM    | 2     |
| LOW       | 2     |
| **Total** | **6** |

---

## Employee #31: Strategy Manager — Strategic Alignment

**Scope:** Command Center page — competitive positioning, market differentiation, growth
**Components reviewed:** `page.tsx`, `ai-greeting.tsx`, `getting-started-checklist.tsx`, `proactive-briefing.tsx`

---

### SM31-1 — Command Center Doesn't Communicate AI-Native Value

- **Severity:** HIGH
- **Issue:** The Command Center looks like any other AI chat interface. There's nothing that says "this is AI-native accounting, not AI bolted onto old software." Our speed + AI-native moat is invisible.
- **Strategic Impact:** Users compare us to QuickBooks AI and see no difference. Competitive advantage is wasted.
- **Fix:** Add AI-native differentiation: "19 specialized AI agents" in greeting, agent hierarchy visualization, confidence scoring prominence.

### SM31-2 — No Activation Metric Tracking

- **Severity:** HIGH
- **Issue:** The Command Center doesn't track activation metrics: time to first AI response, time to aha moment, checklist completion rate. Without these, we can't measure or improve activation.
- **Strategic Impact:** Can't optimize the most critical funnel. Activation rate is unknown.
- **Fix:** Track: time to first question, time to first AI response, time to approval, checklist completion. Report in analytics dashboard.

### SM31-3 — No Viral Loop in Command Center

- **Severity:** MEDIUM
- **Issue:** The Command Center has no sharing, export, or referral mechanisms. Users can't easily share AI insights with colleagues or invite team members.
- **Strategic Impact:** No organic growth from existing users. Growth depends entirely on marketing.
- **Fix:** Add: share AI report with colleague, invite team member to view dashboard, export insights for board meeting.

### SM31-4 — No Competitive Feature Parity Display

- **Severity:** MEDIUM
- **Issue:** The Command Center doesn't show features that competitors don't have. Users don't know what they're getting that QuickBooks/Xero can't offer.
- **Strategic Impact:** Users don't understand why they should pay more for Xenboox.
- **Fix:** Add subtle feature highlights: "AI confidence scoring (unique to Xenboox)" or "19 specialized agents (competitors have 1 generic AI)".

### SM31-5 — No Enterprise Readiness Indicators

- **Severity:** LOW
- **Issue:** The Command Center doesn't signal enterprise readiness: SOC 2 compliance, audit trails, role-based access. Enterprise buyers need these signals.
- **Strategic Impact:** Enterprise prospects may dismiss Xenboox as not enterprise-ready.
- **Fix:** Add enterprise signals: "SOC 2 compliant" badge, "Full audit trail" in AI status, "Role-based access" in settings.

---

### Summary — Strategy Manager

| Severity  | Count |
| --------- | ----- |
| HIGH      | 2     |
| MEDIUM    | 2     |
| LOW       | 1     |
| **Total** | **5** |

---

## Employee #32: Onboarding Specialist — First-Time User Experience

**Scope:** Command Center page — onboarding flow, activation, time-to-value
**Components reviewed:** `getting-started-checklist.tsx`, `ai-greeting.tsx`, `page.tsx`, `ai-input.tsx`

---

### OS32-1 — No Personalized Onboarding Based on User Role

- **Severity:** HIGH
- **Component:** `getting-started-checklist.tsx`
- **Issue:** The 5-step checklist is the same for all users regardless of role. A CFO needs different onboarding than a bookkeeper. The checklist doesn't adapt.
- **Onboarding Impact:** Irrelevant steps slow down activation. Users skip steps they don't need.
- **Fix:** Personalize checklist based on user role: CFO sees strategic steps, bookkeeper sees operational steps, owner sees overview steps.

### OS32-2 — No Time-to-Value Tracking

- **Severity:** HIGH
- **Component:** `page.tsx`
- **Issue:** The onboarding flow doesn't track time-to-value: how long from signup to first AI response, from first response to first approval, from first approval to daily use. Without this, we can't optimize activation.
- **Onboarding Impact:** Unknown activation speed. Can't measure onboarding effectiveness.
- **Fix:** Track timestamps: signup, first login, first question, first AI response, first approval, daily return. Calculate time-to-value metrics.

### OS32-3 — No Help or Tooltip System in Onboarding

- **Severity:** MEDIUM
- **Component:** `getting-started-checklist.tsx`
- **Issue:** Checklist steps have no tooltips or help text explaining why each step matters. Users complete steps without understanding the value.
- **Onboarding Impact:** Users complete steps mechanically without understanding AI value.
- **Fix:** Add tooltips: "Connecting your bank lets AI categorize transactions automatically". Explain the AI benefit of each step.

### OS32-4 — No Progress Celebration or Milestones

- **Severity:** MEDIUM
- **Component:** `getting-started-checklist.tsx`
- **Issue:** When a user completes a step, there's no celebration or acknowledgment. Completion feels anticlimactic. No dopamine hit to encourage继续.
- **Onboarding Impact:** Low motivation to complete remaining steps.
- **Fix:** Add celebration: confetti on first step, "Great start!" message, progress percentage with encouragement.

### OS32-5 — No Skip Option with Consequences

- **Severity:** LOW
- **Component:** `getting-started-checklist.tsx`
- **Issue:** Users can dismiss the checklist permanently. There's no "Are you sure? You'll miss these AI features" warning. No consequence for skipping.
- **Onboarding Impact:** Users skip onboarding and never discover AI value.
- **Fix:** Add confirmation before dismiss: "Skip setup? You'll miss AI-powered features like automatic categorization and smart alerts." Show what they'll miss.

---

### Summary — Onboarding Specialist

| Severity  | Count |
| --------- | ----- |
| HIGH      | 2     |
| MEDIUM    | 2     |
| LOW       | 1     |
| **Total** | **5** |

---

## Employee #33: Content Strategist — Content & Messaging

**Scope:** Command Center page — content strategy, messaging hierarchy, information architecture
**Components reviewed:** `ai-greeting.tsx`, `ai-input.tsx`, `getting-started-checklist.tsx`, `proactive-briefing.tsx`

---

### CS33-1 — No Content Hierarchy in Command Center

- **Severity:** HIGH
- **Issue:** The Command Center has no clear content hierarchy. The greeting, checklist, briefing, and chat are all competing for attention. Users don't know what to look at first.
- **Content Impact:** Cognitive overload. Users don't know where to focus.
- **Fix:** Establish clear hierarchy: (1) AI greeting with status, (2) Proactive briefing (most important), (3) Getting started (for new users), (4) Chat input (for questions). Use visual weight to guide attention.

### CS33-2 — No Content personalization Based on Entity Type

- **Severity:** MEDIUM
- **Issue:** The Command Center shows the same content regardless of entity type. A retail business needs different metrics than a service business. The content doesn't adapt.
- **Content Impact:** Irrelevant content for some users. Missed opportunity for personalization.

### CS33-3 — No Microcopy for Empty States

- **Severity:** MEDIUM
- **Components:** `conversation-thread.tsx`, `proactive-briefing.tsx`
- **Issue:** Empty states (no messages, no briefing) have no helpful microcopy. Users see blank areas with no guidance on what to do next.
- **Content Impact:** Users feel lost when there's no data.
- **Fix:** Add helpful empty states: "Ask your AI a question to get started" or "Your AI is analyzing your books. Check back in a few minutes."

### CS33-4 — No Content for Feature Discovery

- **Severity:** LOW
- **Issue:** The Command Center doesn't surface new features or capabilities. Users stick to familiar workflows and miss AI improvements.
- **Content Impact:** Low feature adoption. Users don't know about new capabilities.

---

### Summary — Content Strategist

| Severity  | Count |
| --------- | ----- |
| HIGH      | 1     |
| MEDIUM    | 2     |
| LOW       | 1     |
| **Total** | **4** |

---

## Employee #34: Marketing Manager — Growth & Conversion

**Scope:** Command Center page — conversion optimization, user acquisition, retention
**Components reviewed:** `page.tsx`, `ai-input.tsx`, `getting-started-checklist.tsx`, `proactive-briefing.tsx`

---

### MM34-1 — No Conversion Path from Free to Paid

- **Severity:** HIGH
- **Component:** `page.tsx`
- **Issue:** The Command Center has no upgrade prompt, pricing reference, or conversion path. Free users who hit limits have no way to discover paid plans.
- **Marketing Impact:** Lost conversion opportunities. Free users can't become paying customers.
-

### MM34-2 — No Referral Mechanism in Dashboard

- **Severity:** HIGH
- **Issue:** The Command Center has no share, invite, or referral features. Users can't easily invite colleagues or share AI insights.
- **Marketing Impact:** No viral growth. Customer acquisition cost remains high.

### MM34-3 — No Social Proof on Dashboard

- **Severity:** MEDIUM
- **Issue:** The Command Center has no trust signals, testimonials, or social proof. Users don't see that others trust Xenboox with their financial data.
- **Marketing Impact:** Low trust for new users. Higher churn risk.

### MM34-4 — No Feature Highlighting for Retention

- **Severity:** LOW
- **Issue:** The Command Center doesn't highlight features that drive retention: AI insights, automated categorization, smart alerts. Users may not know about these features.
- **Marketing Impact:** Users don't discover value-driving features. Retention suffers.

---

### Summary — Marketing Manager

| Severity  | Count |
| --------- | ----- |
| HIGH      | 2     |
| MEDIUM    | 1     |
| LOW       | 1     |
| **Total** | **4** |

---

## Employee #35: Product Designer — UI/UX Design

**Scope:** Command Center page — visual design, interaction patterns, design system
**Components reviewed:** `ai-greeting.tsx`, `ai-input.tsx`, `getting-started-checklist.tsx`, `conversation-thread.tsx`

---

### PD35-1 — Inconsistent Component Spacing and Sizing

- **Severity:** HIGH
- **Components:** All Command Center components
- **Issue:** Spacing between components is inconsistent: some use `p-4`, others `p-6`, others `space-y-4`. The visual rhythm is broken. Users perceive this as unpolished.
- **Design Impact:** Inconsistent visual quality. Users sense something is off.
- **Fix:** Establish spacing scale: `p-4` for cards, `p-6` for sections, `space-y-4` for lists. Apply consistently.

### PD35-2 — No Dark Mode Support

- **Severity:** MEDIUM
- **Issue:** The Command Center may not fully support dark mode. Some components use hardcoded colors instead of CSS variables. Dark mode users see broken styling.
- **Design Impact:** Dark mode users have poor experience. Potential accessibility issue.

### PD35-3 — No Loading Skeleton for Initial Load

- **Severity:** MEDIUM
- **Component:** `page.tsx`
- **Issue:** When the page loads, there's no skeleton UI. Users see a blank page until data loads. This feels slow even if the actual load time is fast.
- **Design Impact:** Poor perceived performance. Users think the app is slow.

### PD35-4 — No Consistent Icon System

- **Severity:** LOW
- **Components:** Various Command Center components
- **Issue:** Icons are mixed: some use Lucide, others use custom SVGs, others use emoji. The icon style is inconsistent.
- **Design Impact:** Visual inconsistency. Users perceive lower quality.

---

### Summary — Product Designer

| Severity  | Count |
| --------- | ----- |
| HIGH      | 1     |
| MEDIUM    | 2     |
| LOW       | 1     |
| **Total** | **4** |

---

## Employee #36: Product Analyst — Data-Driven Decisions

**Scope:** Command Center page — metrics, analytics, user behavior tracking
**Components reviewed:** `page.tsx`, `ai-input.tsx`, `conversation-thread.tsx`, `proactive-briefing.tsx`

---

### PA36-1 — No Analytics Events for Dashboard Interactions

- **Severity:** HIGH
- **Issue:** The Command Center doesn't track key user interactions: suggestion chip clicks, approval actions, checklist completions, briefing views. Without analytics, we can't measure feature adoption.
- **Analytics Impact:** Blind to user behavior. Can't optimize based on data.
- **Fix:** Add PostHog events for: suggestion clicks, approval actions, checklist steps, briefing interactions, chat messages.

### PA36-2 — No Funnel Tracking for Activation

- **Severity:** HIGH
- **Issue:** No funnel analysis for: signup → first login → first question → first AI response → first approval → daily return. Without this, we can't identify drop-off points.
- **Analytics Impact:** Can't optimize activation funnel. Unknown where users drop off.

### PA36-3 — No Cohort Analysis for Retention

- **Severity:** MEDIUM
- **Issue:** No cohort analysis to track retention by signup date, entity type, or plan. We can't measure if the Command Center drives retention.
- **Analytics Impact:** Unknown retention rates. Can't identify churn patterns.

### PA36-4 — No A/B Test Infrastructure for Dashboard Changes

- **Severity:** LOW
- **Issue:** No A/B testing framework for dashboard experiments. Every change is a full rollout with no controlled testing.
- **Analytics Impact:** Risky deployments. No data on feature impact.

---

### Summary — Product Analyst

| Severity  | Count |
| --------- | ----- |
| HIGH      | 2     |
| MEDIUM    | 1     |
| LOW       | 1     |
| **Total** | **4** |

---

## Employee #37: Product Reviewer — Quality Assurance

**Scope:** Command Center page — feature completeness, edge cases, regression risks
**Components reviewed:** `page.tsx`, `ai-input.tsx`, `conversation-thread.tsx`, `getting-started-checklist.tsx`

---

### PR37-1 — No Feature Completeness Checklist

- **Severity:** HIGH
- **Issue:** The Command Center has no feature completeness checklist. Features are added ad-hoc without verification that they work end-to-end.
- **Quality Impact:** Features may be incomplete or broken in production.

### PR37-2 — No Regression Testing After Changes

- **Severity:** HIGH
- **Issue:** When a component is changed, there's no regression testing to ensure existing functionality isn't broken. Changes are deployed without verification.
- **Quality Impact:** Breaking changes reach production. Users encounter new bugs.

### PR37-3 — No Accessibility Audit

- **Severity:** MEDIUM
- **Issue:** The Command Center hasn't been audited for accessibility: WCAG compliance, screen reader support, keyboard navigation, color contrast.
- **Quality Impact:** Users with disabilities can't use the product. Potential legal issues.

### PR37-4 — No Performance Audit

- **Severity:** LOW
- **Issue:** The Command Center hasn't been audited for performance: bundle size, render time, memory usage. Performance issues accumulate over time.
- **Quality Impact:** Gradual performance degradation. Users experience slow UI.

---

### Summary — Product Reviewer

| Severity  | Count |
| --------- | ----- |
| HIGH      | 2     |
| MEDIUM    | 1     |
| LOW       | 1     |
| **Total** | **4** |

---

## Employee #38: Marketing Critique — Conversion Optimization

**Scope:** Command Center page — conversion copy, CTA effectiveness, user engagement
**Components reviewed:** `ai-input.tsx`, `getting-started-checklist.tsx`, `proactive-briefing.tsx`, `ai-greeting.tsx`

---

### MC38-1 — No Clear Call-to-Action on Dashboard

- **Severity:** HIGH
- **Component:** `page.tsx`
- **Issue:** The Command Center has no primary CTA. Users land on a greeting and chat input, but there's no "Start free trial" or "Upgrade to Pro" button. No conversion path.
- **Marketing Impact:** No revenue from dashboard. Users don't discover paid features.

### MC38-2 — Suggestion Chips Don't Drive Engagement

- **Severity:** MEDIUM
- **Component:** `ai-input.tsx`
- **Issue:** The 5 suggestion chips are static and don't adapt to user behavior. After first use, they become ignored. They don't drive repeated engagement.
- **Marketing Impact:** Low engagement with suggestions. Wasted UI space.

### MC38-3 — No Urgency or Scarcity in Onboarding

- **Severity:** LOW
- **Component:** `getting-started-checklist.tsx`
- **Issue:** The checklist has no time pressure or urgency. Users can skip it without consequence. No "Limited time: Get AI setup in 5 minutes" urgency.
- **Marketing Impact:** Low onboarding completion rate. Users procrastinate.

---

### Summary — Marketing Critique

| Severity  | Count |
| --------- | ----- |
| HIGH      | 1     |
| MEDIUM    | 1     |
| LOW       | 1     |
| **Total** | **3** |

---

## Employee #39: Product Critique — Feature Quality

**Scope:** Command Center page — feature quality, user experience, AI-native patterns
**Components reviewed:** `page.tsx`, `conversation-thread.tsx`, `proactive-briefing.tsx`, `ai-input.tsx`

---

### PC39-1 — AI Doesn't Proactively Help Users

- **Severity:** HIGH
- **Component:** `page.tsx`
- **Issue:** The AI waits for user input. It doesn't proactively analyze data, suggest actions, or alert users to important changes. For an AI-native product, the AI should be doing work, not waiting.
- **Product Impact:** Users don't perceive AI value. They think it's a chatbot, not an AI agent.

### PC39-2 — No Progressive Disclosure of AI Capabilities

- **Severity:** MEDIUM
- **Issue:** The Command Center doesn't gradually reveal AI capabilities. Users see the same interface whether it's their first day or 100th day. No "New: AI can now do X" discovery.
- **Product Impact:** Users don't discover new features. Feature adoption is low.

### PC39-3 — No Trust-Building Mechanisms

- **Severity:** LOW
- **Issue:** The Command Center doesn't build trust over time. No "AI accuracy: 98%" metric, no "10,000 transactions processed" counter, no "99.9% uptime" badge.
- **Product Impact:** Users don't develop trust in AI. Churn risk remains high.

---

### Summary — Product Critique

| Severity  | Count |
| --------- | ----- |
| HIGH      | 1     |
| MEDIUM    | 1     |
| LOW       | 1     |
| **Total** | **3** |

---

## Employee #40: Content Critique — Copy Quality

**Scope:** Command Center page — copy clarity, brand consistency, error messages
**Components reviewed:** `ai-greeting.tsx`, `ai-input.tsx`, `getting-started-checklist.tsx`, `conversation-thread.tsx`

---

### CC40-1 — Error Messages Are Technical, Not User-Friendly

- **Severity:** HIGH
- **File:** `use-dashboard-chat.ts`
- **Issue:** Error messages like "SSE connection lost" and "timeout" are technical jargon. Users don't understand these. Brand voice says: "Plain English, never stack traces."
- **Content Impact:** Users see confusing errors. Trust erodes.

### CC40-2 — Inconsistent Terminology Across Components

- **Severity:** MEDIUM
- **Components:** Various
- **Issue:** The same concept is called different things: "chat" vs "conversation", "AI" vs "AI agent", "approve" vs "confirm". Terminology is inconsistent.
- **Content Impact:** Users are confused by inconsistent language.

### CC40-3 — No Microcopy for Loading States

- **Severity:** LOW
- **Components:** `conversation-thread.tsx`, `proactive-briefing.tsx`
- **Issue:** Loading states show generic spinners or blank areas. No helpful microcopy: "Your AI is analyzing..." or "Preparing your briefing..."
- **Content Impact:** Users don't know what's happening during loading.

---

### Summary — Content Critique

| Severity  | Count |
| --------- | ----- |
| HIGH      | 1     |
| MEDIUM    | 1     |
| LOW       | 1     |
| **Total** | **3** |

---

## Employee #41: Automation Specialist — Workflow Automation

**Scope:** Command Center page — automation opportunities, workflow optimization
**Components reviewed:** `page.tsx`, `getting-started-checklist.tsx`, `proactive-briefing.tsx`, `conversation-thread.tsx`

---

### AS41-1 — No Automated Onboarding Email Sequence

- **Severity:** HIGH
- **Component:** `getting-started-checklist.tsx`
- **Issue:** When a user dismisses the checklist or stalls, there's no automated follow-up. No email sequence to re-engage. No in-app reminder.
- **Automation Impact:** Users who stall churn silently. No automated recovery.

### AS41-2 — No Automated Data Quality Checks

- **Severity:** MEDIUM
- **Component:** `proactive-briefing.tsx`
- **Issue:** The briefing shows data but doesn't run automated quality checks. Duplicate transactions, missing data, and anomalies are not automatically detected.
- **Automation Impact:** Users miss data quality issues. Manual review required.

### AS41-3 — No Automated Report Generation

- **Severity:** LOW
- **Component:** `proactive-briefing.tsx`
- **Issue:** The briefing is manual (user must ask). No automated weekly/monthly reports. Users must remember to check.
- **Automation Impact:** Users miss regular insights. Engagement drops.

---

### Summary — Automation Specialist

| Severity  | Count |
| --------- | ----- |
| HIGH      | 1     |
| MEDIUM    | 1     |
| LOW       | 1     |
| **Total** | **3** |

---

## Employee #42: Sales Representative — Sales Enablement

**Scope:** Command Center page — demo readiness, objection handling, conversion
**Components reviewed:** `page.tsx`, `ai-greeting.tsx`, `proactive-briefing.tsx`, `getting-started-checklist.tsx`

---

### SR42-1 — Command Center Not Demo-Ready

- **Severity:** HIGH
- **Issue:** The Command Center has multiple HIGH severity bugs (duplicate tables, broken approvals, infinite reconnect). These would be visible during a sales demo, killing the deal.
- **Sales Impact:** Lost deals due to demo failures.

### SR42-2 — No "Wow Moment" in First 30 Seconds

- **Severity:** HIGH
- **Component:** `page.tsx`
- **Issue:** When a prospect sees the Command Center for the first time, there's no immediate "wow" moment. They see a greeting and empty chat. The AI-native value isn't demonstrated instantly.
- **Sales Impact:** Prospects don't understand the AI-native advantage in the first impression.

### SR42-3 — No Competitive Differentiation in UI

- **Severity:** MEDIUM
- **Component:** `ai-greeting.tsx`
- **Issue:** The UI doesn't show what makes Xenboox different from QuickBooks/Xero. A prospect comparing screenshots would see no difference.
- **Sales Impact:** Competitors look the same. No visual differentiation.

---

### Summary — Sales Representative

| Severity  | Count |
| --------- | ----- |
| HIGH      | 2     |
| MEDIUM    | 1     |
| LOW       | 0     |
| **Total** | **3** |

---

## Employee #43: Lead Researcher — Lead Qualification

**Scope:** Command Center page — lead capture, qualification, conversion
**Components reviewed:** `page.tsx`, `ai-input.tsx`, `getting-started-checklist.tsx`

---

### LR43-1 — No Lead Capture Mechanism on Dashboard

- **Severity:** HIGH
- **Component:** `page.tsx`
- **Issue:** The Command Center has no lead capture: no email signup, no trial extension, no upgrade prompt. Free users can use the dashboard indefinitely without conversion.
- **Lead Impact:** No lead generation from product. Growth depends entirely on marketing.

### LR43-2 — No Usage-Based Lead Scoring

- **Severity:** MEDIUM
- **Issue:** The Command Center doesn't track usage patterns that indicate lead quality: frequency of AI queries, approval actions, checklist completion. High usage = high-quality lead.
- **Lead Impact:** Can't prioritize sales outreach. All leads treated equally.

### LR43-3 — No Trial Expiration or Upgrade Nudge

- **Severity:** LOW
- **Component:** `page.tsx`
- **Issue:** Free tier users have no indication of limits or trial expiration. No nudge to upgrade when approaching limits.
- **Lead Impact:** Free users don't convert. No urgency to upgrade.

---

### Summary — Lead Researcher

| Severity  | Count |
| --------- | ----- |
| HIGH      | 1     |
| MEDIUM    | 1     |
| LOW       | 1     |
| **Total** | **3** |

---
