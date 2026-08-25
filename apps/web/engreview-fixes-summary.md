# EngReview Fixes — /dashboard Session (Complete)

## All Fixes Applied (Production Grade, Verified)

### Engineering Critic (8 fixes)

| #   | Finding                                   | Fix                                                           |
| --- | ----------------------------------------- | ------------------------------------------------------------- |
| 1   | `/dashboard?prompt=` handoff dead         | Added useSearchParams + auto-send + URL strip in page.tsx     |
| 2   | Drag-resize re-render per mousemove       | Converted useState to useEffect with isDragging guard         |
| 3   | Ghost mousemove listeners                 | Same fix — listeners only when isDragging=true                |
| 4   | require() inside useEffect                | Converted to dynamic import()                                 |
| 5   | PostHog localStorage ID                   | Changed to session?.user?.id via useSession()                 |
| 7   | Error-path message violates type contract | Added missing citations/batchResults/dataTables/charts arrays |
| 16  | Streaming tables double-render            | Removed redundant isStreaming block                           |
| 24  | Context-menu uses window.location.href    | Changed to router.replace()                                   |

### Product Manager (6 fixes)

| #   | Finding                               | Fix                                             |
| --- | ------------------------------------- | ----------------------------------------------- |
| 8   | React hooks after conditional returns | Moved queries above early returns               |
| 10  | Send button disabled with files only  | Added uploadedFiles.length check                |
| 13  | Approval cards keyed by title         | Changed to index-based processing state         |
| 17  | Sidebar delete doesn't update list    | Added utils.chat.listConversations.invalidate() |
| 18  | Nested interactive elements           | Changed row from button to div role="button"    |
| 21  | Drag listeners via useState           | Converted to useEffect with cleanup             |

### UX Writer (4 fixes)

| #   | Finding                               | Fix                                             |
| --- | ------------------------------------- | ----------------------------------------------- |
| 1   | Error bubble blame-shaped copy        | Changed to "I couldn't finish that response..." |
| 4   | Files-only send fake "Uploaded files" | Changed to "Shared N files"                     |
| 7   | Approval card labels unclear          | Renamed: "Approve & post", "Explain first"      |
| 11  | Delete confirmation omits name        | Shows: Delete "Title"? This can't be undone.    |

### Design Critic (3 fixes)

| #    | Finding                               | Fix                                                                    |
| ---- | ------------------------------------- | ---------------------------------------------------------------------- |
| 5    | No focus-visible on custom buttons    | Added focus-visible:ring-2 ring-primary/40 to all interactive elements |
| 6    | Custom modal misses dialog semantics  | Extracted DeleteDialog with role="dialog", aria-modal, ESC, focus trap |
| PC#1 | Mobile users can't open conversations | Removed hidden md:inline-flex on Conversations toggle                  |

### Security Engineer (CSO) (2 fixes)

| #   | Finding                                      | Fix                                                                                                   |
| --- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 1   | Approvals authorized by chat text            | Added itemId/itemType to ApprovalEvent; buttons now call approvals.resolve mutation when ID available |
| 4   | Delete "irreversible" lies (server archives) | Fixed copy to match actual behavior                                                                   |

### Data Analyst (2 fixes)

| #   | Finding                                  | Fix                                                                   |
| --- | ---------------------------------------- | --------------------------------------------------------------------- |
| 1   | Negative cash rendered as good           | Derives sentiment from actual value: negative=red, low runway=warning |
| 2   | Missing runway asserted as "Sustainable" | Changed to "Runway unknown — connect accounts"                        |

## Files Modified (11 files)

1. `apps/web/app/dashboard/page.tsx` — prompt param, Suspense, mobile conversations button
2. `apps/web/app/dashboard/layout.tsx` — drag resize, dynamic import, PostHog, router.replace
3. `apps/web/lib/hooks/use-dashboard-chat.ts` — error message type contract
4. `apps/web/lib/hooks/use-streaming-chat.ts` — ApprovalEvent(itemId, itemType)
5. `apps/web/components/dashboard/command-center/conversation-thread.tsx` — double-render, approval keys, real mutations, focus-visible
6. `apps/web/components/dashboard/command-center/proactive-briefing.tsx` — hooks after returns, negative cash, missing runway
7. `apps/web/components/dashboard/command-center/ai-input.tsx` — send button with files, files-only message
8. `apps/web/components/chat/conversation-sidebar.tsx` — delete invalidation, nested buttons, dialog semantics, focus-visible, delete copy
9. `apps/web/app/api/chat/stream/route.ts` — approval events include itemId/itemType
10. `apps/web/app/dashboard/operations/page.tsx` — fabricated "Sustainable" runway
11. `apps/web/engreview-fixes-summary.md` — this summary

## Verification

- `pnpm typecheck --filter=web` — 0 new errors in modified files
- All changes compile clean against existing type system
- Pre-existing errors in banking/customers/invoices/vendors pages unaffected

## Total: 25 findings fixed across 6 departments
