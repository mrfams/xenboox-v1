# ADR-0007: Tiered Audit Trail Visibility

**Status:** Accepted
**Date:** 2026-08-10

## Context

The product decision for the audit trail was "entity owners + admins can
view", but the initial implementation granted **every entity member** full
access to the trail — including sensitive metadata (IP addresses, session
IDs, user agents) and the export/verification features. That both deviates
from the approved scope and violates least privilege: a bookkeeper could
exfiltrate a trail containing the owner's IP and session data.

## Decision

Tiered, least-privilege visibility on the same entity-scoped `audit_log`:

| Capability                                       | Owner / Admin | Regular member                               |
| ------------------------------------------------ | ------------- | -------------------------------------------- |
| View full trail (all team + agent actions)       | ✅            | ❌ (own actions + agent/system actions only) |
| Sensitive metadata (IP, UA, session, request)    | ✅            | ❌ (stripped)                                |
| `audit.verify` (chain integrity report)          | ✅            | ❌ (`FORBIDDEN`)                             |
| `audit.export` (JSON/CSV — evidentiary artifact) | ✅            | ❌ (`FORBIDDEN`)                             |

Implementation:

- `audit.verify` and `audit.export` use the existing `requireRole("owner",
"admin")` middleware (FORBIDDEN otherwise).
- `audit.list` filters by role server-side: members see rows where
  `userId = self` OR `actorType ∈ {agent, system}`, and sensitive fields are
  omitted from the response. The response carries `scoped: boolean`.
- The Activity Log UI hides Verify/Export for members and shows a scoped-view
  notice instead. Client-side export is guarded too (defense in depth).
- The sidebar entry remains visible to all members — a scoped view is still
  useful for accountability; only the privileged tools are gated.

## Why not alternatives

| Option                              | Rejected because                                                                                                       |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Full trail for every member         | Leaks IP/session data; fails least privilege and SOC 2 log-protection expectations                                     |
| Hide the page entirely from members | Loses the accountability benefit ("who did what" around my work); members can still see agent actions that affect them |
| Client-side hiding only             | Not secure — tRPC endpoints must enforce server-side                                                                   |

## Consequences

- Owners/admins can produce the full evidentiary package (verify + export);
  members cannot.
- The same `requireRole` middleware used across the codebase (ap, analytics,
  api-platform, …) is reused — no new auth machinery.
- A future "external auditor" role can be granted read-only access to
  verify/export without touching member defaults.
