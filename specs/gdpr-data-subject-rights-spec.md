# Feature Spec: GDPR Data Subject Rights

## Goal
Implement GDPR data subject rights: access, erasure, and portability.

## Why This Matters
- Legal compliance — GDPR fines up to €20M or 4% of revenue
- Users have right to access, correct, and delete their data
- Financial platforms handle sensitive data

## What We Must Build

### Right to Access
- API endpoint to export all user data
- Include: profile, transactions, documents, audit trail
- Machine-readable format (JSON/CSV)

### Right to Erasure
- API endpoint to delete user data
- Anonymize financial records (keep for compliance)
- Delete personal data, keep aggregated data

### Right to Portability
- Export in standard format (CSV, JSON)
- Include all user-generated content
- Exclude system-generated data

## Acceptance Criteria
- [ ] Data export endpoint
- [ ] Data deletion endpoint
- [ ] Anonymization of financial records
- [ ] Standard format export
- [ ] Audit trail for data requests
- [ ] Entity scoping verified
