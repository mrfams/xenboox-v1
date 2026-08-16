# Key Rotation & Secrets Management

> Last updated: Aug 16, 2026 · Owner: Platform/DevSecOps · Scope: all production secrets
>
> Reference: ROADTOPRODUCTION.md §1.3 (key management), §20.3 (gitleaks), §20.4 (rotation schedule).

## 1. Secret Inventory

| #   | Secret                       | Env var(s)                                                         | Used by                                                                                           | Rotation class                                     |
| --- | ---------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| 1   | Auth session/JWT secret      | `AUTH_SECRET`                                                      | User + admin auth (JWT encryption, direct-auth tokens)                                            | **KEK** (annually, or on any suspected compromise) |
| 2   | Field-encryption master key  | `FIELD_ENCRYPTION_KEY` + `FIELD_ENCRYPTION_KEY_VERSION`            | `packages/db/lib/field-encryption` (AES-256-GCM, PBKDF2-derived) — restricted/confidential fields | **DEK** (90 days)                                  |
| 3   | Google OAuth                 | `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`                             | User sign-in via Google                                                                           | KEK                                                |
| 4   | SSO (Azure AD / Okta / OIDC) | `SSO_CLIENT_ID`, `SSO_CLIENT_SECRET` (+ provider-specific)         | `apps/web/lib/auth/sso.ts`                                                                        | KEK                                                |
| 5   | Webhook signing              | `WEBHOOK_SECRET`, `MONO_WEBHOOK_SECRET`                            | `apps/web/lib/webhook-verify.ts` (HMAC-SHA256) + Vercel cron gate (`X-Cron-Secret`)               | DEK (90 days)                                      |
| 6   | Cloudflare R2                | `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`                         | Document storage (presigned uploads)                                                              | DEK (90 days)                                      |
| 7   | AI providers                 | `ANTHROPIC_API_KEY`, LangFuse keys, Upstash                        | Agents, observability, rate limits                                                                | KEK                                                |
| 8   | Email                        | `RESEND_API_KEY`                                                   | Transactional email                                                                               | KEK                                                |
| 9   | Per-tenant webhook secrets   | `webhook_secrets` table                                            | Outbound webhook HMAC signing                                                                     | DEK (90 days)                                      |
| 10  | TOTP secrets                 | `ADMIN_TOTP_ENCRYPTION_KEY` (via `lib/admin/totp.ts`, AES-256-GCM) | Admin MFA                                                                                         | KEK (annual)                                       |
| 11  | TLS certificates             | Vercel-managed                                                     | HTTPS edge                                                                                        | TLS (≤ 398 days)                                   |

## 2. Rotation Schedule

| Class                                  | Cadence                                                                                                            | Secrets                 |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------- |
| **DEK** (data-encryption keys)         | **90 days**                                                                                                        | #2, #5, #6, #9          |
| **KEK** (key-encryption / app secrets) | **Annually**                                                                                                       | #1, #3, #4, #7, #8, #10 |
| **TLS**                                | **≤ 398 days** (Vercel auto-manages)                                                                               | #11                     |
| **On-demand**                          | Immediately on: suspected leak, team member departure with secret access, vendor breach advisory, gitleaks finding | any                     |

## 3. Rotation Procedures

### 3.1 Auth session secret (`AUTH_SECRET`)

Rotating `AUTH_SECRET` signs **every user and admin out** (JWT strategy + encrypted cookies). Plan for a maintenance window.

1. Generate: `openssl rand -base64 32`
2. Update on Vercel (and local `.env` for dev).
3. Deploy. All sessions invalidate — expected. Users re-authenticate.
4. Update the two direct-auth token flows note in runbook: any in-flight `direct_auth` tokens issued under the old secret are invalidated too (they are HS256-signed with `AUTH_SECRET`).

### 3.2 Field-encryption master key (`FIELD_ENCRYPTION_KEY`)

The key is derived per-value via PBKDF2 with a random salt, so **re-encryption is required on rotation** — old ciphertexts cannot be decrypted with the new key.

1. Generate a new key: `openssl rand -base64 48`
2. Back up the current key (`FIELD_ENCRYPTION_KEY` + version) to the vault before rotating — it is needed to decrypt existing rows.
3. Set `FIELD_ENCRYPTION_KEY_VERSION=v2` (increment from current) alongside the new `FIELD_ENCRYPTION_KEY`.
4. Run the re-encryption job — iterate `encrypted_fields` rows with `key_version = 'v1'`, decrypt with the old key, re-encrypt with `v2`, update row (see §4 automation hook):
   ```sql
   SELECT * FROM encrypted_fields WHERE key_version != current_setting('app.key_version');
   ```
5. Verify: zero rows with the old version, decrypt round-trip smoke test on one restricted field.
6. After the 90-day overlap window, destroy the old key material.

> Current limitation: `packages/db/lib/encryption.ts` derives from a single password — there is no multi-key ring. If multi-key support is needed for zero-downtime rotation, extend `deriveKey` to resolve `keyVersion → password` from a map of active keys (the `key_version` column already supports this model).

### 3.3 Webhook secrets (#5, #9)

1. Rotate `WEBHOOK_SECRET` / `MONO_WEBHOOK_SECRET` and the Vercel `x-cron-secret`.
2. For per-tenant webhook secrets: rotate via the webhook management UI; update the downstream consumer's stored secret (they must reconfigure).
3. **Order matters for HMAC consumers**: publish the new secret to consumers **before** the enforcement deadline; keep the old secret accepted for one overlap period (dual-verify in `webhook-verify.ts` if a grace window is required).

### 3.4 OAuth / SSO / provider secrets (#3, #4, #7, #8)

These are issued by the provider (Google, Azure AD, Resend, Anthropic…):

1. Generate the new credential in the provider console.
2. Add the new value to Vercel; deploy.
3. Verify the new credential end-to-end (test login / send / agent call).
4. **Only then** revoke the old credential in the provider console — never the reverse.

### 3.5 TOTP admin MFA (#10)

Rotating the TOTP encryption key orphans stored TOTP secrets (they're AES-256-GCM encrypted at rest). Plan: all admin users re-enroll MFA.

## 4. Automation

| Hook                            | Status  | Purpose                                                                                                               |
| ------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------- |
| gitleaks in CI (`security.yml`) | ✅ live | Blocks commits containing secrets; 25+ custom rules                                                                   |
| `pnpm audit --audit-level=high` | ✅ live | Dependency CVE gate                                                                                                   |
| **Re-encryption job**           | ⏳ TODO | Cron/script for §3.2 step 4 — decrypt with old key version, re-encrypt with new, update `key_version`                 |
| **Rotation reminder**           | ⏳ TODO | Calendar/issue template reminding DEK rotation every 90 days, KEK annually                                            |
| **Age check**                   | ⏳ TODO | CI drift check asserting `FIELD_ENCRYPTION_KEY_VERSION` ≤ expected rotation age and gitleaks history scan on schedule |

### Re-encryption job sketch (to implement)

```ts
// packages/db/scripts/re-encrypt-fields.ts — run with old key in OLD_KEY,
// new key in FIELD_ENCRYPTION_KEY, new version in FIELD_ENCRYPTION_KEY_VERSION.
import { decrypt, encrypt } from "../lib/encryption";
import { db } from "../index";
import { encryptedFields } from "../schema/security";
import { eq, and, ne } from "drizzle-orm";

const OLD_KEY = process.env.FIELD_ENCRYPTION_KEY_OLD!;
const NEW_KEY = process.env.FIELD_ENCRYPTION_KEY!;
const NEW_VERSION = process.env.FIELD_ENCRYPTION_KEY_VERSION!;

const rows = await db
  .select()
  .from(encryptedFields)
  .where(ne(encryptedFields.keyVersion, NEW_VERSION));

for (const row of rows) {
  const { decrypted, success } = decrypt(row.encryptedValue, OLD_KEY);
  if (!success) {
    console.error(
      `decrypt failed: ${row.tableName}/${row.recordId}/${row.fieldName}`,
    );
    continue; // never re-encrypt garbage — fail loud instead
  }
  const { encrypted } = encrypt(decrypted, NEW_KEY, NEW_VERSION);
  await db
    .update(encryptedFields)
    .set({
      encryptedValue: encrypted,
      keyVersion: NEW_VERSION,
      updatedAt: new Date(),
    })
    .where(eq(encryptedFields.id, row.id));
}
```

## 5. Secrets Manager Migration (deferred — §1.3 / ROADTOPRODUCTION §20.4)

Today secrets live in Vercel dashboard env vars (no audit trail, no role-scoped access). **Recommended: Infisical or Doppler** — both offer per-environment secrets, audit logs, and role-scoped access; Infisical is self-hostable (air-gap option for enterprise financial data). Migration steps:

1. Import current Vercel env vars into the secrets manager (per-environment: production/staging/preview).
2. Wire deploys to pull from the manager (Vercel integration or `vercel env pull` in CI).
3. Scope access: platform engineers = production writes; app engineers = preview/staging only.
4. Enable audit logging + require approval for production secret changes.
5. Gate rotation on the manager's versioning (each rotation = a new version with a changelog entry).

## 6. Git History Hygiene

- `.gitignore` covers `.env`, `.env.local`, `.env.bak*`, `.env.*` — verified **no real env file is tracked** (only `.env.example` with placeholders; re-checked Aug 16, 2026).
- gitleaks CI scans every push; run a full-history scan before any external release:
  ```bash
  gitleaks detect --source . --log-opts="--all"
  ```
- If history scan ever finds a secret: rotate it immediately (on-demand class), then scrub history with `git filter-repo` (requires force-push — coordinate with all clones first).
