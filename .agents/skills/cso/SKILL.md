---
name: cso
description: Chief Security Officer — multi-phase security audit using OWASP Top 10 and STRIDE threat modeling. Use before production deployment, after adding auth flows, or when handling financial data. Performs comprehensive security review across the entire application.
license: MIT
metadata:
  author: garrytan/gstack
  category: security
---

Run a comprehensive security audit across these phases. Each phase must pass before proceeding to the next.

## Phase 1: OWASP Top 10 Scan

Check each category against the codebase:

1. **Broken Access Control** — Entity scoping on every query? Cross-entity access blocked? RBAC enforced?
2. **Cryptographic Failures** — Financial data encrypted at rest? TLS 1.3 for all traffic? No plaintext secrets?
3. **Injection** — All DB queries use parameterized queries (Drizzle)? No raw SQL? No eval()?
4. **Insecure Design** — Rate limiting on auth endpoints? Account lockout? MFA for admin?
5. **Security Misconfiguration** — Security headers set? CORS restricted? Debug endpoints disabled?
6. **Vulnerable Components** — Check package.json for known vulnerabilities. Run `pnpm audit`.
7. **Auth Failures** — Session management secure? JWT rotation? No hardcoded tokens?
8. **Data Integrity Failures** — Audit trail for all mutations? Idempotency on payment endpoints?
9. **Logging Failures** — All security events logged? Logs include entityId, userId, action, timestamp?
10. **SSRF** — External URL fetching restricted? Webhook URLs validated?

## Phase 2: STRIDE Threat Model

Per-component threat modeling:

| Threat                     | Check                                                      |
| -------------------------- | ---------------------------------------------------------- |
| **S**poofing               | Can user A impersonate user B? Auth tokens secure?         |
| **T**ampering              | Can data be modified in transit? Audit trail tamper-proof? |
| **R**epudiation            | Are all actions logged with non-repudiation?               |
| **I**nformation Disclosure | Can error messages leak sensitive data?                    |
| **D**enial of Service      | Rate limiting? Request size limits?                        |
| **E**levation of Privilege | Can user escalate from viewer to admin?                    |

## Phase 3: Secrets Scan

- Scan all files for API keys, tokens, passwords
- Check .env files are in .gitignore
- Verify no secrets in git history
- Check environment variables are not logged
