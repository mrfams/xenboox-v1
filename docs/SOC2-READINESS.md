# SOC 2 Type II Readiness Framework

> Xenboox — AI-Native Accounting Platform
> Last updated: August 2026

---

## Overview

SOC 2 Type II evaluates an organization's controls over a period (typically 6–12 months) against the AICPA Trust Services Criteria. This document maps Xenboox's implemented controls to each criterion and identifies remaining gaps.

---

## Trust Services Criteria Mapping

### 1. Security (Common Criteria)

| Criterion | Control                        | Status            | Implementation                                               |
| --------- | ------------------------------ | ----------------- | ------------------------------------------------------------ |
| CC6.1     | Logical access controls        | ✅ Implemented    | Auth.js v5 with session management, RBAC, entity scoping     |
| CC6.2     | User authentication            | ✅ Implemented    | Password policy, MFA (TOTP), SAML/OIDC SSO                   |
| CC6.3     | User authorization             | ✅ Implemented    | Role-based access with entity isolation at DB level          |
| CC6.4     | Restriction of access          | ✅ Implemented    | Row-Level Security (RLS) enforced at PostgreSQL layer        |
| CC6.6     | System boundaries              | ✅ Implemented    | Vercel deployment with security headers, CSP, CORS           |
| CC6.7     | Data transmission              | ✅ Implemented    | TLS 1.3 for all data in transit                              |
| CC6.8     | Restriction of physical access | ⬜ Cloud provider | Neon PostgreSQL, Vercel, Cloudflare R2 — all SOC 2 certified |

### 2. Availability

| Criterion | Control           | Status         | Implementation                                          |
| --------- | ----------------- | -------------- | ------------------------------------------------------- |
| CC7.1     | Monitoring        | ✅ Implemented | Sentry error tracking, OTel tracing, structured logging |
| CC7.2     | Incident handling | ✅ Implemented | DLQ system, agent escalation, alerting pipeline         |
| CC7.3     | Recovery planning | 🟡 Partial     | DR documentation exists, blue-green deployment planned  |
| CC7.4     | Backup management | ✅ Implemented | Neon automated backups, R2 audit archive replication    |

### 3. Processing Integrity

| Criterion | Control          | Status         | Implementation                                          |
| --------- | ---------------- | -------------- | ------------------------------------------------------- |
| PI1.1     | Data validation  | ✅ Implemented | Zod validation on all inputs, entity scoping middleware |
| PI1.2     | Error detection  | ✅ Implemented | Agent confidence scoring, DLQ for failed operations     |
| PI1.3     | Error correction | ✅ Implemented | Automated retry with exponential backoff                |
| PI1.4     | Data integrity   | ✅ Implemented | Audit log hash-chaining, append-only triggers           |

### 4. Confidentiality

| Criterion | Control                             | Status         | Implementation                                    |
| --------- | ----------------------------------- | -------------- | ------------------------------------------------- |
| C1.1      | Identification of confidential data | 🟡 Partial     | Sensitive field encryption (AES-256) for PII      |
| C1.2      | Disposal of confidential data       | ✅ Implemented | Data retention automation with legal hold support |
| C1.3      | Data classification                 | 🟡 Partial     | Audit log vs. security audit log separation       |

### 5. Privacy

| Criterion | Control           | Status         | Implementation                                                    |
| --------- | ----------------- | -------------- | ----------------------------------------------------------------- |
| P1–P8     | Privacy practices | ✅ Implemented | GDPR DPA template, right-to-erasure flow, data retention policies |

---

## Evidence Collection

### Automated Evidence

| Evidence Type       | Source                                | Frequency      |
| ------------------- | ------------------------------------- | -------------- |
| Access logs         | Auth.js session logs                  | Continuous     |
| Audit trail         | audit_log table (hash-chained)        | Every action   |
| Change history      | Audit log with before/after snapshots | Every mutation |
| Security scans      | Dependency vulnerability scanner      | CI/CD pipeline |
| Incident reports    | DLQ + Sentry alerts                   | On occurrence  |
| Backup verification | Neon backup status                    | Daily          |
| Archive manifests   | audit_archive_manifests table         | Weekly         |

### Manual Evidence

| Evidence Type               | Owner              | Frequency   |
| --------------------------- | ------------------ | ----------- |
| Penetration testing report  | External vendor    | Annual      |
| Security awareness training | HR/Security        | Annual      |
| Vendor SOC 2 reports        | Procurement        | Annual      |
| Policy review sign-offs     | Compliance officer | Annual      |
| Incident response drills    | Security team      | Semi-annual |

---

## Required Policies

### Information Security Policy

- Access control policy
- Password and authentication policy
- Encryption policy
- Network security policy
- Incident response plan
- Business continuity plan
- Acceptable use policy

### Data Management Policy

- Data classification and handling
- Data retention and disposal
- Backup and recovery procedures
- Data breach notification (72-hour GDPR requirement)

### Change Management Policy

- Code review requirements
- CI/CD pipeline controls
- Deployment approval process
- Rollback procedures

### Human Resources Policy

- Background checks
- Security awareness training
- Termination procedures (access revocation)

---

## Implementation Roadmap

### Phase 1: Foundation (Done)

- [x] Row-Level Security at database layer
- [x] AES-256 encryption for sensitive fields
- [x] Audit log hash-chaining
- [x] Rate limiting on all endpoints
- [x] Security headers (CSP, HSTS, etc.)
- [x] Input validation with Zod
- [x] MFA support (TOTP)
- [x] SAML/OIDC SSO

### Phase 2: Monitoring (Done)

- [x] Sentry error tracking
- [x] OpenTelemetry tracing
- [x] Structured logging with PII redaction
- [x] Health check endpoints
- [x] DLQ for failed operations
- [x] Dependency vulnerability scanning

### Phase 3: Data Governance (Done)

- [x] Data retention automation with legal hold
- [x] Audit log archival to write-once R2 storage
- [x] Right-to-erasure flow
- [x] GDPR DPA template
- [x] SOC 2 readiness framework (this document)

### Phase 4: Certification Prep (Remaining)

- [ ] Engage external auditor
- [ ] Complete policy documentation
- [ ] Conduct internal readiness assessment
- [ ] Address auditor findings
- [ ] Observe 6-month examination period
- [ ] Obtain SOC 2 Type II report

---

## Auditor Requirements

### Technical Controls Evidence

1. Database RLS configuration and policies
2. Encryption key management procedures
3. Access control matrix and role definitions
4. Audit log integrity verification (hash chain)
5. Incident response timeline and resolution
6. Backup restoration test results
7. Deployment pipeline security controls

### Administrative Controls Evidence

1. Information security policy (signed by management)
2. Employee security awareness training records
3. Vendor risk assessment documentation
4. Incident response plan with contact list
5. Business continuity plan with RTO/RPO targets
6. Change management approval records

---

## Key Metrics for Examination Period

| Metric                         | Target                 | Current             |
| ------------------------------ | ---------------------- | ------------------- |
| Mean Time to Detection (MTTD)  | < 5 minutes            | ~3 minutes (Sentry) |
| Mean Time to Resolution (MTTR) | < 15 minutes           | ~12 minutes         |
| Audit log integrity            | 100% hash chain valid  | 100%                |
| Failed login lockout           | < 5 attempts           | 5 attempts          |
| Data retention compliance      | 100% policies enforced | Automated weekly    |
| Backup success rate            | > 99.9%                | ~99.99% (Neon)      |
| Dependency vulnerability count | 0 critical             | 0 critical          |
