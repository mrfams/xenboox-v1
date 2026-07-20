# Plan: Revamp Public-Facing Pages (footer/header + docs)

## What

Transform the flat, black-and-white public pages into a modern, breathing, premium marketing experience — consistent with the dark gradient homepage already built. Apply to every page linked in the header/footer nav and the docs site. Remove internal/unprofessional claims (e.g. "19 AI agents", "60+ database tables", "20 modules", Gambia-specific internal tax internals, internal agent-hierarchy descriptions) from publicly visible copy.

Scope excludes the homepage (`app/(marketing)/page.tsx`) per explicit instruction.

## Design Language (senior UI/UX direction)

- Dark, premium default aesthetic with gradient mesh backgrounds, soft glows, glassmorphism cards, animated scroll reveals, hover lift, accent color (indigo/violet/emerald/amber).
- Reuse the visual system already proven on the homepage (gradients, FloatingShape, CountUp, SectionWrapper).
- Light/dark aware via Tailwind `dark:` where needed; pages render with a `dark` wrapper so they feel alive.
- Respect `prefers-reduced-motion`.
- No new runtime deps — extend `globals.css` with keyframes + reuse `framer-motion` (already available).

## File List (create)

- `apps/web/app/(marketing)/components/marketing.tsx` — shared, reusable section primitives:
  - `PageHero` (gradient hero w/ eyebrow + title + subtitle + actions)
  - `GradientBg` / `GlowOrb` (animated background)
  - `Reveal` (framer-motion scroll-in wrapper)
  - `FeatureCard`, `BentoCard`, `StatPill`, `SectionHeading`, `CtaBand`
  - `GlassCard`
- `apps/web/app/globals.css` — add keyframes (`float`, `gradient`, `marquee`, `shimmer`, `blob`) + utility classes already referenced.

## File List (modify — pages linked in footer/header)

- `features/page.tsx` — gradient hero, bento feature grid, remove "19 agents" internal detail.
- `pricing/page.tsx` — gradient hero, glowing pricing cards (highlighted tier), remove "All 19 AI agents" copy.
- `about/page.tsx` — gradient hero, mission + animated value cards, remove "19/20/60+ DB tables" stats.
- `contact/page.tsx` — gradient hero, contact cards, FAQ.
- `blog/page.tsx` — gradient hero, animated post cards.
- `careers/page.tsx` — gradient hero, benefit + opening cards.
- `download/page.tsx` — gradient hero, platform cards, store buttons.
- `privacy/page.tsx`, `terms/page.tsx`, `cookies/page.tsx`, `refund/page.tsx`, `sla/page.tsx` — keep legal text intact but wrap in a polished "legal document" shell (gradient hero header, sticky table-of-contents sidebar, readable prose container). Do NOT alter legal wording.
- `docs/page.tsx` — already has a hero; upgrade to full dark gradient system, remove "19 modules / 19 agents" internal counts.
- `docs/modules/page.tsx` + `docs/security/page.tsx` + sample module pages (`docs/modules/treasury`, `getting-started`) — wrap in consistent dark shell; remove internal counts.

## Rules Applied

- AGENTS.md: entity scoping untouched (no DB queries here). Keep TS strict, no `any`.
- Do not change legal wording (compliance). Only restyle + remove internal marketing claims.
- Keep dark mode toggle working; new components default to a rich dark presentation.

## After Building

- `pnpm --filter=web lint`
- `pnpm --filter=web typecheck`
- `pnpm --filter=web build` (verify pages compile)
- Create git branch `revamp/marketing-pages`, commit, open PR.

## What I Won't Touch

- Homepage `page.tsx` (excluded by instruction).
- Dashboard/app `()` routes, auth routes, admin routes.
- Any DB schema, tRPC, agents code.
- Legal page text content.
