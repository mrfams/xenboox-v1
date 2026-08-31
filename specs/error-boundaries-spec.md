# Feature Spec: Error Boundaries

## Goal
Add error boundaries to all routes for graceful crash recovery.

## Why This Matters
- Unhandled errors show white screen
- Users lose context when component crashes
- Error boundaries catch and display friendly error pages

## What We Must Build

### Route-Level Error Boundaries
- `error.tsx` for each major route
- Friendly error message
- Retry button
- Home link

### Component-Level Boundaries
- Critical sections wrapped in boundaries
- Financial data display protected
- Agent output protected

## Acceptance Criteria
- [ ] error.tsx for all major routes
- [ ] Friendly error message
- [ ] Retry button
- [ ] Home link
- [ ] Error logging to Sentry
- [ ] No white screen on crash
