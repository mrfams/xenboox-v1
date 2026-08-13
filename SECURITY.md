# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

**Do NOT open a public GitHub issue for security vulnerabilities.**

If you discover a security vulnerability, please report it responsibly:

### 1. Email

Send an email to **security@xenboox.com** with:

- Description of the vulnerability
- Steps to reproduce
- Potential impact assessment
- Suggested fix (if any)

### 2. What to Expect

| Stage                 | Timeline              |
| --------------------- | --------------------- |
| Acknowledgment        | Within 24 hours       |
| Triage & assessment   | Within 72 hours       |
| Fix for critical/high | Within 7 days         |
| Fix for medium        | Within 30 days        |
| Fix for low           | Within 90 days        |
| Public disclosure     | After fix is deployed |

### 3. Safe Harbor

We support safe harbor for security researchers who:

- Make a good faith effort to avoid privacy violations, data destruction, or disruption
- Only interact with accounts you own or have explicit permission to test
- Do not exploit a vulnerability beyond what is necessary to confirm its existence
- Report vulnerabilities promptly and do not publicly disclose before a fix is available

## Security Measures

### Authentication & Authorization

- **Multi-Factor Authentication (MFA)** mandatory for admin accounts
- **Auth.js v5** with session-based authentication
- **Account lockout** after 5 failed attempts (30-minute lockout)
- **Email verification** required for all new accounts
- **RBAC** with 5 roles: super_admin, ops_admin, finance_admin, support_agent, read_only_auditor
- **Entity scoping** — every database query is scoped to the authenticated user's entity

### Data Protection

- **AES-256-GCM encryption** for sensitive fields at rest
- **TLS 1.3** for all data in transit
- **bcrypt** with cost factor 12 for password hashing
- **Field-level encryption** for PII and financial data
- **Neon PostgreSQL** with encrypted storage

### Application Security

- **Content Security Policy (CSP)** with nonce-based script loading
- **Rate limiting** via Upstash Redis (5 login/60s, 1000 API/min)
- **Input validation** with Zod on all 76+ tRPC endpoints
- **Parameterized queries** via Drizzle ORM (no raw SQL interpolation)
- **CSRF protection** via Auth.js built-in + origin validation
- **Security headers** on all responses (HSTS, X-Frame-Options, etc.)

### Infrastructure Security

- **GitHub Actions CI/CD** with security scanning gate
- **Semgrep SAST** — static analysis on every PR
- **CodeQL** — semantic code analysis (taint-mode, data flow)
- **gitleaks** — secret scanning on every commit
- **pnpm audit** — dependency vulnerability scanning
- **OpenSSF Scorecard** — automated security health checks
- **License compliance** — no AGPL/SSPL in production

### Monitoring & Observability

- **Sentry** error tracking (client, server, edge)
- **LangFuse** agent trace logging
- **Structured logging** via Pino
- **Audit trail** — immutable, tamper-evident logs for every mutation

### Compliance

- **GDPR** — right to erasure, data portability, consent management
- **SOC 2** — access control, logging, vulnerability management
- **African DP laws** — NDPA (Nigeria), POPIA (South Africa), DPA (Ghana/Kenya)
- **Audit trail** — append-only, hash-chained, per-entity

## Security Scanning

All PRs must pass the Security Gate before merging:

| Scan               | Tool              | Purpose                                       |
| ------------------ | ----------------- | --------------------------------------------- |
| Secret scanning    | gitleaks          | Catches leaked API keys, tokens, passwords    |
| SAST               | Semgrep           | Static analysis for code vulnerabilities      |
| SAST               | CodeQL            | Semantic analysis (taint-mode, data flow)     |
| Dependency audit   | pnpm audit        | Known CVEs in dependencies                    |
| License compliance | license-checker   | No AGPL/SSPL in production                    |
| IaC scanning       | checkov           | Dockerfile & GitHub Actions misconfigurations |
| Env leak detection | Custom script     | .env files and credential patterns            |
| Security scorecard | OpenSSF Scorecard | Automated security health check               |

## Bug Bounty

We plan to launch a bug bounty program. Details will be announced at security@xenboox.com.

## Security Changelog

| Date       | Change                                         |
| ---------- | ---------------------------------------------- |
| 2026-08-13 | Enterprise security scanning pipeline deployed |
| 2026-08-13 | Admin 2FA self-service enrollment added        |
| 2026-08-13 | AUTH_SECRET fallback removed (CSO audit fix)   |
| 2026-08-12 | Sentry error tracking installed                |
| 2026-08-12 | CSP, HSTS, security headers configured         |
| 2026-08-12 | Rate limiting implemented (Upstash Redis)      |
| 2026-08-12 | Input sanitization library added               |
