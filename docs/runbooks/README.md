# Runbooks

Scenario-specific response procedures referenced from
[`docs/INCIDENT_RUNBOOK.md`](../INCIDENT_RUNBOOK.md).

| Runbook                                        | When to use                                                |
| ---------------------------------------------- | ---------------------------------------------------------- |
| [`llm-outage.md`](llm-outage.md)               | Anthropic/OpenAI unreachable or erroring                   |
| [`redis-down.md`](redis-down.md)               | Upstash/Redis unreachable (rate limits, caches)            |
| [`db-failover.md`](db-failover.md)             | Database down, connection pool exhausted, migration broken |
| [`r2-outage.md`](r2-outage.md)                 | R2 uploads/downloads failing (documents, bank statements)  |
| [`job-backlog.md`](job-backlog.md)             | Trigger.dev queue backing up / DLQ spiking                 |
| [`email-outage.md`](email-outage.md)           | Resend failures, notification retry queue growing          |
| [`security-incident.md`](security-incident.md) | Breach, key leak, unauthorized access                      |

**Drills:** [`drills/`](drills/) contains chaos-drill scripts that exercise the
`redis-down`, `llm-outage`, and `db-failover` runbooks in a controlled
(staging) environment — see [`drills/README.md`](drills/README.md).
