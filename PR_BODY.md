## Summary

Transforms the flat, black-and-white public pages into a premium, breathing experience consistent with the existing homepage identity (gradient mesh backgrounds, glassmorphism, scroll-reveal motion, vibrant accents, ambient glow orbs).

## What changed

- **New shared design system** (`apps/web/app/(marketing)/components/marketing-primitives.tsx`): `MarketingShell`, `PageHero`, `Reveal`, `GlassCard`, `CtaBand`, `LegalShell`, plus gradient/glass motion utilities in `globals.css` (respects `prefers-reduced-motion`).
- **Footer/header pages revamped**: `features`, `pricing`, `about`, `contact`, `blog`, `careers`, `download` — gradient heroes, animated card reveals, glass surfaces, hover lift.
- **Legal pages** (`privacy`, `terms`, `cookies`, `refund`, `sla`) wrapped in a polished `LegalShell`; legal wording left 100% intact for compliance.
- **Docs**: index, modules index, security, getting-started, and all module pages wrapped in the dark shell with glass cards; shared doc components (`DocsPageHeader`, `FeatureGrid`, `RelatedLinks`, `InfoCallout`) updated for dark presentation.
- **Removed unprofessional/internal claims** from prominent marketing copy (e.g. "19 specialized AI agents", "60+ database tables", "20 modules" stats on the About page, "All 19 AI agents" on pricing).

## Scope

- Homepage (`app/(marketing)/page.tsx`) untouched per request.
- No DB, tRPC, agent, auth, or dashboard code changed.
- Legal text content unchanged.

## Verification

- `pnpm --filter=web typecheck` passes for all changed files (only pre-existing framer-motion `Variants` type warnings remain in the untouched homepage).
- `pnpm --filter=web lint` clean for all changed files.

Build will be verified on Vercel once this PR is opened.

Generated with Kilo.
