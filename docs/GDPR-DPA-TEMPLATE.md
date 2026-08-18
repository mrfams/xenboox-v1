# Data Processing Agreement (DPA)

> Template for Xenboox enterprise customers requiring GDPR-compliant data processing terms.
> This DPA is incorporated by reference into the Master Services Agreement.

---

## DATA PROCESSING AGREEMENT

**Effective Date:** [DATE]

**Between:**

- **Data Controller:** [CUSTOMER NAME] ("Controller")
- **Data Processor:** Xenboox Ltd. ("Processor")

---

## 1. Definitions

| Term              | Definition                                                                        |
| ----------------- | --------------------------------------------------------------------------------- |
| **Personal Data** | Any information relating to an identified or identifiable natural person          |
| **Processing**    | Any operation performed on Personal Data (collection, storage, use, deletion)     |
| **Data Subject**  | The identified or identifiable natural person whose Personal Data is processed    |
| **Sub-processor** | Third party engaged by Processor to process Personal Data on behalf of Controller |

---

## 2. Scope and Purpose of Processing

### 2.1 Subject Matter

Processor processes Personal Data as necessary to provide the Xenboox accounting platform services to Controller.

### 2.2 Duration

Processing continues for the duration of the Master Services Agreement, plus any retention period required by applicable law.

### 2.3 Nature and Purpose

- Financial record management (journal entries, invoices, payments)
- Employee payroll processing
- Tax compliance and filing
- Audit trail maintenance
- Financial reporting and analytics

### 2.4 Categories of Personal Data

- Employee names, email addresses, phone numbers
- Bank account details (for payments)
- Tax identification numbers
- Transaction records containing personal information
- System usage data (logs, access records)

### 2.5 Categories of Data Subjects

- Controller's employees and contractors
- Controller's customers and vendors
- Controller's authorized users

---

## 3. Processor Obligations

### 3.1 Processing Instructions

Processor shall:

- Process Personal Data only on documented instructions from Controller
- Immediately inform Controller if an instruction violates GDPR
- Not engage sub-processors without prior written authorization
- Maintain a record of all categories of processing activities

### 3.2 Confidentiality

Processor shall ensure that:

- All personnel authorized to process Personal Data are bound by confidentiality obligations
- Access to Personal Data is limited to authorized personnel on a need-to-know basis
- Personal Data is not disclosed to unauthorized third parties

### 3.3 Security Measures

Processor implements the following technical and organizational measures:

| Measure                | Implementation                                      |
| ---------------------- | --------------------------------------------------- |
| Encryption at rest     | AES-256 for sensitive fields                        |
| Encryption in transit  | TLS 1.3                                             |
| Access control         | RBAC with entity isolation (Row-Level Security)     |
| Authentication         | MFA (TOTP), SAML/OIDC SSO                           |
| Audit logging          | Hash-chained, append-only audit trail               |
| Input validation       | Zod schemas on all API inputs                       |
| Rate limiting          | Per-endpoint and per-user rate limits               |
| Security headers       | CSP, HSTS, X-Frame-Options                          |
| Vulnerability scanning | Automated dependency scanning in CI/CD              |
| Backup                 | Automated daily backups with point-in-time recovery |
| Incident response      | DLQ system with automated escalation                |
| Data retention         | Automated purge with legal hold support             |

### 3.4 Sub-processors

Current sub-processors:

| Sub-processor   | Purpose             | Location   | Certification |
| --------------- | ------------------- | ---------- | ------------- |
| Vercel Inc.     | Web hosting         | USA (iad1) | SOC 2 Type II |
| Neon Inc.       | PostgreSQL database | USA        | SOC 2 Type II |
| Cloudflare Inc. | R2 object storage   | USA        | SOC 2 Type II |
| Anthropic PBC   | AI model inference  | USA        | SOC 2 Type II |
| Trigger.dev     | Background jobs     | USA        | SOC 2 Type II |
| Resend Inc.     | Transactional email | USA        | SOC 2 Type II |

Processor shall notify Controller at least 30 days before adding or replacing sub-processors.

### 3.5 Data Transfers

Processor does not transfer Personal Data outside the EEA/UK unless:

- Adequacy decision exists for the destination country
- Standard Contractual Clauses (SCCs) are in place
- Binding Corporate Rules are approved

### 3.6 Data Retention and Deletion

- Data is retained per Controller's retention policies
- Upon termination, Processor deletes all Personal Data within 30 days
- Controller may request deletion at any time via the right-to-erasure flow
- Audit logs are retained for 7 years (regulatory requirement)

---

## 4. Controller Obligations

### 4.1 Instructions

Controller shall:

- Provide documented processing instructions
- Ensure it has legal basis for all processing
- Notify Processor of any changes to processing requirements

### 4.2 Compliance

Controller is responsible for:

- Determining the lawfulness of processing
- Obtaining necessary consents from Data Subjects
- Responding to Data Subject requests

---

## 5. Data Subject Rights

Processor assists Controller in fulfilling Data Subject rights:

| Right                     | Implementation                                    |
| ------------------------- | ------------------------------------------------- |
| Right of access           | Export function in platform settings              |
| Right to rectification    | Edit capabilities with audit trail                |
| Right to erasure          | Automated anonymization flow (§11.2)              |
| Right to restriction      | Account suspension with data preservation         |
| Right to data portability | CSV/JSON export of all entity data                |
| Right to object           | Processing cessation within 72 hours              |
| Automated decision-making | Agent confidence thresholds with human escalation |

---

## 6. Data Breach Notification

### 6.1 Notification Timeline

- Processor notifies Controller within **48 hours** of becoming aware of a breach
- Notification includes: nature of breach, categories affected, likely consequences, mitigation measures

### 6.2 Breach Response

Processor shall:

- Investigate the breach immediately
- Take steps to contain and remediate
- Document all breach-related facts and decisions
- Cooperate with supervisory authorities as required

---

## 7. Data Protection Impact Assessment

Processor shall cooperate with Controller's DPIAs by providing:

- Description of processing activities
- Assessment of necessity and proportionality
- Assessment of risks to Data Subjects
- Description of measures to address risks

---

## 8. Audit Rights

Controller may audit Processor's compliance with this DPA:

- With 30 days written notice
- During normal business hours
- No more than once per year (unless a breach has occurred)

Processor shall provide reasonable access to:

- Security certifications (SOC 2 Type II)
- Audit logs and evidence
- Sub-processor agreements
- Security policies and procedures

---

## 9. Liability

- Each party is liable for damages caused by processing that violates GDPR
- Processor's liability is limited to damages directly attributable to its breach of this DPA
- Neither party limits liability for: wilful misconduct, fraud, or death/personal injury

---

## 10. Term and Termination

- This DPA remains in effect for the duration of the MSA
- Upon termination, Processor deletes all Personal Data within 30 days
- Processor retains audit logs for 7 years (regulatory requirement)
- Controller may request deletion confirmation in writing

---

## 11. Governing Law

This DPA is governed by the laws of [JURISDICTION], without regard to conflict of laws principles.

---

## Signatures

|               | Data Controller      | Data Processor       |
| ------------- | -------------------- | -------------------- |
| **Company**   | [CUSTOMER NAME]      | Xenboox Ltd.         |
| **Name**      | ********\_\_******** | ********\_\_******** |
| **Title**     | ********\_\_******** | ********\_\_******** |
| **Date**      | ********\_\_******** | ********\_\_******** |
| **Signature** | ********\_\_******** | ********\_\_******** |
