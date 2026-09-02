# Business Continuity Plan

> Xenboox — AI-Native Accounting Platform
> Effective Date: September 2026
> Version: 1.0
> Owner: Security Officer

---

## 1. Purpose

This plan ensures Xenboox can continue critical operations during and after a disruptive event, minimizing impact on customers and maintaining service availability.

## 2. Scope

Covers all critical business functions: platform availability, data integrity, customer support, financial operations.

## 3. Recovery Objectives

| Metric                             | Target       | Current                                |
| ---------------------------------- | ------------ | -------------------------------------- |
| **RTO** (Recovery Time Objective)  | < 4 hours    | ~2 hours (Vercel auto-recovery)        |
| **RPO** (Recovery Point Objective) | < 1 hour     | ~5 minutes (Neon continuous backup)    |
| **Availability SLA**               | 99.9% uptime | ~99.95% (Vercel)                       |
| **Data Loss Tolerance**            | Zero         | Zero (ACID transactions + audit trail) |

## 4. Critical Systems and Dependencies

| System          | Provider        | RTO      | Backup                   | Failover               |
| --------------- | --------------- | -------- | ------------------------ | ---------------------- |
| Web Application | Vercel          | < 5 min  | Auto-redeploy            | Multi-region           |
| Database        | Neon PostgreSQL | < 15 min | Continuous backup        | Point-in-time recovery |
| Object Storage  | Cloudflare R2   | < 30 min | Cross-region replication | Automatic              |
| Email Service   | Resend          | < 1 hour | N/A                      | Manual switch          |
| AI/LLM          | Anthropic       | < 1 hour | N/A                      | Manual switch          |
| Background Jobs | Trigger.dev     | < 30 min | Auto-restart             | Automatic              |

## 5. Incident Response Procedures

### 5.1 Severity Levels

| Level             | Description                         | Response Time | Example                           |
| ----------------- | ----------------------------------- | ------------- | --------------------------------- |
| **P0 — Critical** | Platform down, data loss risk       | < 15 minutes  | Database failure, security breach |
| **P1 — High**     | Major feature broken, no workaround | < 1 hour      | Payment processing failure        |
| **P2 — Medium**   | Feature degraded, workaround exists | < 4 hours     | Slow query performance            |
| **P3 — Low**      | Minor issue, cosmetic               | < 24 hours    | UI glitch                         |

### 5.2 Communication Plan

| Stakeholder   | Channel          | Frequency                        |
| ------------- | ---------------- | -------------------------------- |
| Internal team | Slack #incidents | Every 30 min during P0/P1        |
| Customers     | Status page      | Every 1 hour during P0           |
| Leadership    | Email            | On P0 declaration and resolution |

### 5.3 Escalation Path

```
Automated Alert (Sentry/monitoring)
  → On-call Engineer (within 5 min)
    → Engineering Lead (if unresolved in 15 min)
      → Security Officer (if security-related)
        → CEO (if customer data at risk)
```

## 6. Backup and Recovery

### 6.1 Database

- **Neon**: Continuous backup with point-in-time recovery
- **Recovery**: Restore to any point within 30 days
- **Testing**: Monthly backup restoration test

### 6.2 Audit Logs

- **Storage**: Write-once R2 bucket with cross-region replication
- **Retention**: Indefinite
- **Integrity**: Hash-chained for tamper detection

### 6.3 Application Code

- **Source Control**: Git with remote backup
- **Deployment**: Vercel automatic deployment from `master` branch
- **Rollback**: Previous deployment restore in < 5 minutes

## 7. Disaster Recovery Drills

| Drill                   | Frequency     | Owner            | Last Conducted |
| ----------------------- | ------------- | ---------------- | -------------- |
| Database restore        | Monthly       | Engineering Lead | September 2026 |
| Full platform failover  | Quarterly     | Security Officer | September 2026 |
| Incident response drill | Semi-annually | Security Officer | September 2026 |

## 8. Contact List

| Role             | Name  | Contact |
| ---------------- | ----- | ------- |
| Security Officer | [TBD] | [TBD]   |
| Engineering Lead | [TBD] | [TBD]   |
| CEO              | [TBD] | [TBD]   |

---

**Approved by:** ************\_************ (Security Officer)
**Date:** ************\_************
**Next Review:** ************\_************
