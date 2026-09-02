# Data Classification and Handling Policy

> Xenboox — AI-Native Accounting Platform
> Effective Date: September 2026
> Version: 1.0
> Owner: Security Officer

---

## 1. Purpose

This policy defines how Xenboox classifies, handles, stores, and disposes of data based on its sensitivity and regulatory requirements.

## 2. Data Classification Levels

### Level 1: Confidential (Highest Sensitivity)

**Definition:** Data that, if disclosed, could cause significant harm to the business or customers.

**Examples:**

- Customer financial records (invoices, journal entries, bank transactions)
- Personally identifiable information (PII): names, addresses, tax IDs, SSNs
- Bank account numbers, routing numbers, payment details
- Tax filing data, payroll records
- Authentication credentials, API keys, encryption keys
- AI agent prompts containing financial data

**Handling Requirements:**

- Encrypted at rest (AES-256-GCM) and in transit (TLS 1.3)
- Access restricted to authorized personnel only
- All access logged in audit trail
- Never stored in plaintext
- Never shared via unapproved channels
- Disposed via secure deletion with verification

### Level 2: Internal

**Definition:** Data intended for internal use that is not public but does not carry the same risk as Confidential data.

**Examples:**

- Internal business processes and procedures
- Source code and architecture documentation
- Internal communications and meeting notes
- Product roadmap and strategy documents
- Employee information (non-PII)

**Handling Requirements:**

- Access restricted to employees and authorized contractors
- Encrypted in transit
- Not shared externally without approval
- Retained per business need

### Level 3: Public

**Definition:** Data intended for public access or that poses no risk if disclosed.

**Examples:**

- Marketing materials and website content
- Public API documentation
- Open-source code contributions
- Press releases and blog posts

**Handling Requirements:**

- Integrity controls to prevent unauthorized modification
- No special access restrictions required
- Published through approved channels

## 3. Data Handling by Type

| Data Type              | Classification | Storage               | Encryption    | Access             | Retention             |
| ---------------------- | -------------- | --------------------- | ------------- | ------------------ | --------------------- |
| Financial records      | Confidential   | Neon PostgreSQL       | AES-256-GCM   | Entity-scoped RBAC | 7+ years              |
| PII (customer)         | Confidential   | Neon PostgreSQL       | AES-256-GCM   | Entity-scoped RBAC | Until erasure request |
| PII (employee)         | Confidential   | Neon PostgreSQL       | AES-256-GCM   | HR + Admin only    | Employment + 3 years  |
| Authentication secrets | Confidential   | Environment variables | Never in code | System only        | Rotated annually      |
| Audit logs             | Confidential   | PostgreSQL + R2       | Hash-chained  | Admin read-only    | Indefinite            |
| Source code            | Internal       | Git (GitHub)          | In transit    | Team members       | Indefinitely          |
| Financial reports      | Internal       | Application cache     | In transit    | Entity-scoped      | 7+ years              |
| Marketing content      | Public         | Application           | N/A           | Public             | Indefinitely          |

## 4. Data Disposal

| Data Type              | Method                              | Verification                |
| ---------------------- | ----------------------------------- | --------------------------- |
| Database records       | SQL DELETE + VACUUM                 | Audit log entry             |
| PII (erasure requests) | Anonymization (replace with hashes) | Verification query          |
| Files in R2            | R2 lifecycle policy (delete marker) | Deletion confirmation       |
| Audit logs             | Write-once storage (no deletion)    | N/A (retained indefinitely) |
| Source code            | Git history retained                | N/A                         |

## 5. Data in Transit

- All data transmitted over TLS 1.3
- API communication: HTTPS only
- Email: TLS-encrypted connections
- File transfers: SFTP or HTTPS only
- No sensitive data in URL parameters

## 6. Data at Rest

- Database: Neon PostgreSQL with encryption at rest (AES-256)
- Object storage: Cloudflare R2 with server-side encryption
- Application secrets: Environment variables (Vercel)
- No sensitive data in logs (PII redaction via `beforeSend`)

## 7. Compliance

- GDPR: Right to erasure implemented via anonymization flow
- Local data protection: Compliant with applicable jurisdictions
- Financial regulations: Data retention per accounting standards
- SOC 2: Controls mapped in SOC2-READINESS.md

## 8. Responsibilities

| Role             | Responsibility                              |
| ---------------- | ------------------------------------------- |
| Security Officer | Policy ownership, classification oversight  |
| Engineering Lead | Technical controls implementation           |
| All Employees    | Correct handling of data per classification |
| Data Processors  | Compliance with DPA requirements            |

---

**Approved by:** ************\_************ (Security Officer)
**Date:** ************\_************
