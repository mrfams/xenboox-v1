# Information Security Policy

> Xenboox — AI-Native Accounting Platform
> Effective Date: September 2026
> Version: 1.0
> Owner: Security Officer
> Review Cycle: Annual

---

## 1. Purpose

This policy establishes the information security framework for Xenboox, protecting the confidentiality, integrity, and availability of all company and customer data, including financial records, personally identifiable information (PII), and proprietary business information.

## 2. Scope

This policy applies to:

- All Xenboox employees, contractors, and third-party vendors
- All systems, applications, databases, and infrastructure
- All data: customer financial data, PII, intellectual property, operational data
- All environments: production, staging, development

## 3. Roles and Responsibilities

| Role                | Responsibility                                                         |
| ------------------- | ---------------------------------------------------------------------- |
| Security Officer    | Policy ownership, compliance oversight, incident response coordination |
| Engineering Lead    | Technical control implementation, vulnerability management             |
| All Employees       | Compliance with this policy, reporting security incidents              |
| Third-party Vendors | Compliance with security requirements in vendor agreements             |

## 4. Access Control

### 4.1 Authentication

- All users authenticate via Auth.js v5 with session management
- Multi-factor authentication (MFA) is required for all admin accounts and optional for standard users
- Passwords must meet minimum complexity requirements: 8+ characters, 4 character classes, common-pattern blocklist
- Sessions expire after configurable inactivity period
- Session tokens are httpOnly, secure, and same-site

### 4.2 Authorization

- Role-based access control (RBAC) enforced at application and database layers
- Entity scoping ensures tenant isolation — no cross-entity data access
- Row-Level Security (RLS) enforced at PostgreSQL layer as defense-in-depth
- Principle of least privilege: users receive minimum permissions required

### 4.3 Access Reviews

- User access reviews conducted quarterly
- Privileged access reviews conducted monthly
- Terminated accounts revoked within 24 hours
- Dormant accounts (90+ days inactive) flagged for review

## 5. Data Protection

### 5.1 Data Classification

| Classification   | Examples                                       | Protection                                                        |
| ---------------- | ---------------------------------------------- | ----------------------------------------------------------------- |
| **Confidential** | Financial records, PII, tax data, bank details | AES-256-GCM encryption at rest, TLS 1.3 in transit, audit logging |
| **Internal**     | Business processes, internal docs, code        | Access control, encryption in transit                             |
| **Public**       | Marketing materials, public API docs           | Integrity controls                                                |

### 5.2 Encryption

- Data at rest: AES-256-GCM for sensitive fields (SSN, bank account numbers, passwords)
- Data in transit: TLS 1.3 for all connections
- Key management via environment variables; keys rotated annually
- No plaintext secrets, passwords, or API keys in code or logs

### 5.3 Data Retention

- Financial records: retained per applicable regulatory requirements (minimum 7 years)
- Audit logs: retained indefinitely in write-once R2 storage
- PII: retained only as long as necessary for business purpose
- Data disposal: secure deletion with verification

## 6. Network Security

- All production traffic served over HTTPS
- Security headers enforced: CSP, HSTS, X-Frame-Options, X-Content-Type-Options
- CORS restricted to known origins
- Rate limiting on all API endpoints
- DDoS protection via Vercel/Cloudflare infrastructure

## 7. Application Security

### 7.1 Secure Development

- Input validation with Zod on all user inputs
- Parameterized queries only (no raw SQL interpolation)
- Output encoding to prevent XSS
- CSRF protection via same-site cookies
- No eval(), new Function(), or dangerouslySetInnerHTML without sanitization

### 7.2 Code Review

- All code changes require peer review before merge
- Security-sensitive changes require Security Officer review
- Automated security scanning in CI/CD pipeline (Semgrep, CodeQL, gitleaks)

### 7.3 Dependency Management

- Automated dependency updates via Dependabot (weekly)
- `pnpm audit --audit-level=high` in CI pipeline
- Critical/high vulnerabilities patched within 72 hours
- License compliance: no AGPL/SSPL in production dependencies

## 8. Incident Management

- Security incidents reported immediately to Security Officer
- Incident response plan maintained in `docs/INCIDENT_RUNBOOK.md`
- Post-incident review within 48 hours
- Root cause analysis documented in postmortem
- Lessons learned incorporated into controls

## 9. Monitoring and Logging

- Structured logging (JSON) on all operations
- Audit trail for every data mutation (who, what, when, why)
- Error tracking via Sentry with PII redaction
- Anomaly detection on access patterns
- Log integrity protected via hash-chaining

## 10. Physical Security

- Cloud infrastructure (Neon, Vercel, Cloudflare, AWS) maintains SOC 2 Type II certifications
- No on-premise production infrastructure
- Developer access to production requires MFA + audit logging

## 11. Third-Party Risk Management

- All vendors assessed for security posture before engagement
- Vendor SOC 2 reports collected annually
- Data processing agreements (DPAs) executed with all data processors
- Vendor access reviewed quarterly

## 12. Policy Compliance

- This policy reviewed and updated annually
- All employees acknowledge policy upon hire and annually thereafter
- Violations result in disciplinary action up to termination
- Compliance monitored via automated controls and periodic audits

---

**Approved by:** ************\_************ (Security Officer)
**Date:** ************\_************
**Next Review:** ************\_************
