# Feature Spec: Cache Revalidation

## Goal
Add cache revalidation after mutations to prevent stale data in Next.js 15.

## Why This Matters
- Next.js 15 changed caching defaults — fetch calls are uncached by default
- After mutations, data can become stale
- Users see old data after creating/updating records

## What We Must Build

### Revalidation Strategy
- Call `revalidatePath()` after mutations
- Call `revalidateTag()` for targeted invalidation
- Apply to all mutation endpoints

### Affected Areas
- Invoice creation/update
- Bill creation/update
- Journal entry posting
- Customer/vendor updates
- Settings changes

## Acceptance Criteria
- [ ] All mutations call revalidatePath
- [ ] Data refreshes immediately after mutation
- [ ] No stale data on page refresh
- [ ] Performance impact minimal
