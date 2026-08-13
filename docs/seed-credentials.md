# Seed Credentials

This document contains credentials for the database seed data. **DO NOT commit this file to version control.** Add it to `.gitignore`.

## Demo Accounts

| Email            | Password | Company               | Country / Currency  | Profile                                                                                     |
| ---------------- | -------- | --------------------- | ------------------- | ------------------------------------------------------------------------------------------- |
| demo@xenboox.com | demo1234 | Kerr Jula Trading Co. | Gambia / GMD        | Trading & distribution SME, 3 consolidation subsidiaries (Bakau Ltd, Logistics, Properties) |
| yc@xenboox.com   | demo1234 | Northwind Labs Inc.   | United States / USD | US SaaS startup (Austin, TX), May–Jul 2026 books                                            |

Both accounts are **email-verified** and use **US-style credentials/company data** (EIN format tax ID, TX state, US payroll deductions: FIT, FICA SS, Medicare, 401(k), group health).

## Admin Control Plane

Separate identity system from customer accounts (own `admin_users` / `admin_sessions` tables, own cookie namespace, **mandatory TOTP 2FA**).

| Email            | Password | Role        | TOTP Secret                               |
| ---------------- | -------- | ----------- | ----------------------------------------- |
| demo@xenboox.com | admin123 | super_admin | See `pnpm --filter=db seed` helpers below |

The TOTP secret is generated fresh per run and stored in `admin_users.totp_secret_encrypted`. To print the current 6-digit code (and the secret):

```bash
cd packages/db && set -a && source ../../.env.local && set +a
npx tsx seed/get-admin-totp.ts
```

(The db scripts read `DATABASE_URL` from the environment — they never hardcode a connection string.)

Sign in at `/admin-login` (email + password, then the 6-digit TOTP code). Admin sessions are limited to 4h idle / 12h absolute, and 2FA is mandatory — the account cannot sign in without an authenticator.

## Re-seeding

Both accounts are re-seeded in one idempotent, non-destructive run from `packages/db`:

```bash
pnpm seed:all
```

- Bootstraps both users/orgs/entities via find-or-create (re-runs reuse the live accounts).
- Resets only the two seeded entities' data (ordered FK-aware delete, preserves append-only audit logs).
- Removes junk entities; leaves all other accounts untouched.
- Safe to run any number of times against local or live Neon.

Individual seeds: `pnpm seed:demo` (Kerr Jula, Gambia) and `pnpm seed:yc` (Northwind Labs, US).

## Security

- Change the password immediately after first login in any non-local environment
- Consider using environment variables or a secrets manager for credentials
- Delete this file after setting up your development environment
