---
name: qa
description: Browser-based QA testing that navigates the running application, finds bugs, and fixes them in source. Use after implementing features, before releases, and when regression testing. Works best with a running dev server.
license: MIT
metadata:
  author: garrytan/gstack
  category: testing
---

Test the running application by interacting with it. Find bugs, verify correct behavior, and fix issues found.

## Process

### 1. Smoke Test Core Flows

Test each critical user journey end-to-end:

- Login/logout flow
- Create/read/update/delete a record
- Entity switching (multi-entity)
- Search and pagination
- Export/report generation

### 2. Edge Case Testing

- Submit forms with empty required fields
- Submit with maximum-length inputs
- Submit with special characters
- Rapid double-click on submit buttons
- Network disconnect during save

### 3. Visual/UX

- Check responsive layout at mobile/tablet/desktop
- Verify loading states appear
- Verify error states display properly
- Check empty states (no data)
- Verify keyboard navigation works

### 4. Fix Bugs Found

For each bug found:

1. Identify the root cause in source code
2. Fix the issue
3. Verify the fix
4. Report what was found and fixed

## QA Report Format

```
## QA Session: [date/time]

### Passed
- [flow/test] — description

### Bugs Found & Fixed
- [severity] [location] — description → fix applied

### Remaining Issues
- [severity] [location] — description (why not fixed)

### Verdict
✅ PASS / ❌ FAIL (blocking issues found)
```
