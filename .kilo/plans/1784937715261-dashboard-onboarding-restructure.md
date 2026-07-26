# Plan: Restructure Dashboard Onboarding Into Guided Multi-Step Experience

## Problem

The current empty-state onboarding scatters the user experience:

- `OnboardingModal` is a single dialog cramming the welcome message, AI chat prompt, suggested prompts, setup checklist, and quick actions into one view.
- The dashboard welcome banner is minimal and offloads the real onboarding to that modal.
- There is no persistent visual cue of setup progress apart from reopening the same modal.

## Goal

Make the first-time experience feel like a guided tour of the platform, with clear spatial hierarchy:

- **Top of dashboard**: welcome message + AI chat prompt + suggested prompt chips.
- **Below that**: quick action buttons for document/bank actions.
- **Bottom-right**: persistent setup progress indicator that opens a **multi-step setup wizard**, one focused step at a time.

## Files to Modify

| File                                                     | Change                                                                                                                                                                                                            |
| -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/app/dashboard/page.tsx`                        | Restructure empty-state JSX: move welcome + chat + prompts to top, keep `QuickActions` below, replace modal with a step controller and progress float.                                                            |
| `apps/web/components/dashboard/onboarding-modal.tsx`     | Convert from single-page crammed dialog into a **multi-step setup wizard** (`SetupWizard`): one focused step per screen with Next/Back navigation. Keep the same 5 steps (org → coa → fiscal → bank → documents). |
| `apps/web/components/dashboard/onboarding-checklist.tsx` | Minor updates to stay in sync with new step IDs / completion logic if the wizard exposes progress state.                                                                                                          |
| `apps/web/components/dashboard/quick-actions.tsx`        | No functional change required; keep as-is. It already renders below the upload/document dialogs.                                                                                                                  |

## What Each File Contains After Build

### `page.tsx` — empty state restructure

- Remove the cramped welcome banner button group (“Open Setup Guide” / “Ask CFO Agent”).
- Replace it with an **inline** welcome section:
  - Sparkles icon + `<h1>Welcome to Xenboox</h1>`
  - Description: _“Your AI accounting team is ready. Tell your agent what to do — connect your bank, upload documents, or ask anything about your finances.”_
  - AI chat input bar (same text + send button currently inside the modal).
  - Suggested prompt chips row (same 4 prompts currently inside the modal).
- Render `<QuickActions />` directly below the welcome section.
- Replace `OnboardingModal` with a **stateful step controller**:
  - `const [setupStep, setSetupStep] = useState(0)` // 0 = closed, 1..5 = steps
  - Render `<SetupWizard open={setupStep > 0} step={setupStep} onStepChange={setSetupStep} onClose={() => setSetupStep(0)} />`
- Replace `FloatingSetupButton` with a **`FloatingSetupProgress`** component:
  - Fixed bottom-right pill/badge showing `Step X of 5` or completion state.
  - Clicking it opens the wizard at the next incomplete step.
  - Dismissible but re-appears on next visit until all 5 steps are complete.

### `onboarding-modal.tsx` → `SetupWizard`

- Rename and refactor into a multi-step dialog.
- UI shape:
  - Dialog header: _“Setup Guide”_ + step indicator dots/progress bar.
  - Dialog body: one step view at a time.
  - Dialog footer: Back / Next / Skip buttons.
- Step views:
  1. **Organization** — confirm/create entity (link to `/welcome` if none).
  2. **Chart of Accounts** — link to `/dashboard/coa`, show count of loaded accounts.
  3. **Fiscal Year** — link to `/dashboard/fiscal`, show periods status.
  4. **Bank & Integrations** — link to `/dashboard/integrations`, show connection status.
  5. **Documents** — link to `/dashboard/documents`, show uploaded count.
- Each step shows: title, description, status badge (complete / pending), and a primary CTA button.
- Track completion via the same tRPC queries currently used in `OnboardingModal`.
- When all 5 steps are complete, show a “You’re all set!” congratulation screen inside the wizard.

### `onboarding-checklist.tsx`

- Update imports and props to match any renamed types from the wizard.
- Ensure it can be embedded inline if the user wants the checklist view on the dashboard later (optional; keep existing behavior unchanged for now).

### `quick-actions.tsx`

- No structural changes required.
- It already renders its own upload/bank dialogs; the welcome section will sit above it as intended.

## Rules Applied

- Keep all existing tRPC endpoints and data flows unchanged.
- Reuse existing `OnboardingStep` type shape (`id`, `label`, `description`, `completed`, `href`).
- Keep `use client` boundary only where interactive state is required.
- No new routes or API changes; purely UI restructuring.
- Maintain accessibility: keyboard-focusable steps, aria labels, semantic buttons/links.

## Multi-Step Flow (User Journey)

```
Dashboard empty state
├── Welcome banner (always visible)
│   ├── Sparkles + "Welcome to Xenboox"
│   ├── Description text
│   ├── AI chat input + send button
│   └── Suggested prompt chips
├── Quick Actions grid
│   ├── Upload Receipt
│   ├── Upload Invoice
│   ├── Connect Bank
│   ├── Upload Statement
│   └── Email Forwarding
└── Floating setup progress (bottom-right)
    └── Click → SetupWizard modal
        ├── Step 1: Organization
        ├── Step 2: Chart of Accounts
        ├── Step 3: Fiscal Year
        ├── Step 4: Bank & Integrations
        ├── Step 5: Documents
        └── Complete: "You're all set!"
```

## After Building

- Visual review: dashboard empty state on a fresh/no-data account shows the new layout.
- Verify: clicking each setup step navigates correctly.
- Verify: quick action dialogs still open from the grid.
- Verify: chat input submits to `/dashboard/chat?initial=...`.
- Run `pnpm lint --filter=@xenboox/web` and `pnpm typecheck --filter=@xenboox/web`.
- No DB or migration changes required.

## What I Won’t Touch

- Auth flows, tRPC routers, database schema.
- Existing onboarding wizard at `/register/onboarding` (post-signup flow is separate).
- `ChatPanel`, `TopNav`, `Sidebar`, or other dashboard chrome.
