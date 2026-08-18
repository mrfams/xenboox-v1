// ─── Sentry Alerting Rules ─────────────────────────────────────────────────
//
// This file documents the alerting rules to configure in the Sentry dashboard.
// Sentry alerts are configured via the Sentry UI or API, not in code.
// This file serves as the source of truth for what alerts should exist.
//
// Setup: https://docs.sentry.io/product/alerts/
// Last updated: Aug 18, 2026

export const SENTRY_ALERT_RULES = [
  // ─── Error Alerts ──────────────────────────────────────────────────────

  {
    name: "Critical: Error rate spike",
    description:
      "Triggers when the error rate exceeds 5% of total traffic in a 10-minute window.",
    type: "metric_alert",
    metric: "error_rate",
    threshold: 0.05,
    window: 10,
    action: "slack, email",
    severity: "critical",
    runbook:
      "Check Sentry issue details. If it's a new issue, investigate the stack trace. If it's a regression, roll back the last deployment.",
  },
  {
    name: "High: New error type",
    description:
      "Triggers when a completely new error type appears (not seen in the last 7 days).",
    type: "issue_alert",
    trigger: "first_seen",
    action: "slack",
    severity: "high",
    runbook:
      "Review the error in Sentry. Check if it's related to a recent deployment. If it's a known issue, suppress it.",
  },
  {
    name: "Medium: Error budget burn",
    description:
      "Triggers when 50% of the monthly error budget is consumed before the 15th of the month.",
    type: "metric_alert",
    metric: "error_rate",
    threshold: 0.02,
    window: 60,
    action: "email",
    severity: "medium",
    runbook:
      "Review error trends in Sentry. Identify the top error sources and prioritize fixes.",
  },

  // ─── Performance Alerts ────────────────────────────────────────────────

  {
    name: "Critical: p95 latency > 2s",
    description:
      "Triggers when the 95th percentile response time exceeds 2 seconds.",
    type: "metric_alert",
    metric: "p95_duration",
    threshold: 2000,
    window: 10,
    action: "slack",
    severity: "critical",
    runbook:
      "Check Sentry performance traces. Identify slow spans. Check database query performance and external API calls.",
  },
  {
    name: "High: Apdex score < 0.9",
    description:
      "Triggers when the Apdex (user satisfaction) score drops below 0.9.",
    type: "metric_alert",
    metric: "apdex",
    threshold: 0.9,
    window: 30,
    action: "slack, email",
    severity: "high",
    runbook:
      "Review slow transactions in Sentry. Check for N+1 queries, slow external calls, or resource contention.",
  },
  {
    name: "Medium: LCP > 4s",
    description:
      "Triggers when Largest Contentful Paint exceeds 4 seconds for more than 10% of page loads.",
    type: "metric_alert",
    metric: "web_vitals_lcp",
    threshold: 4000,
    window: 60,
    action: "email",
    severity: "medium",
    runbook:
      "Check Sentry Web Vitals. Review image optimization, font loading, and critical rendering path.",
  },

  // ─── LLM/AI Alerts ────────────────────────────────────────────────────

  {
    name: "Critical: LLM API failures",
    description:
      "Triggers when Anthropic API calls fail at a rate > 10% in a 5-minute window.",
    type: "metric_alert",
    metric: "llm_error_rate",
    threshold: 0.1,
    window: 5,
    action: "slack",
    severity: "critical",
    runbook:
      "Check Anthropic status page. Verify API key validity. Check rate limits. If sustained, enable the AI kill switch.",
  },
  {
    name: "High: Agent confidence drop",
    description:
      "Triggers when the average agent confidence drops below 0.6 across all entities.",
    type: "metric_alert",
    metric: "agent_confidence_avg",
    threshold: 0.6,
    window: 30,
    action: "slack",
    severity: "high",
    runbook:
      "Review LangFuse traces. Check if a specific agent type is degrading. Review recent prompt changes.",
  },

  // ─── Financial Alerts ──────────────────────────────────────────────────

  {
    name: "Critical: Transaction posting failure",
    description:
      "Triggers when journal entry posting fails (double-entry violation, constraint error).",
    type: "issue_alert",
    trigger: "issue_tag:financial_error",
    action: "slack, email, sms",
    severity: "critical",
    runbook:
      "Check the specific error in Sentry. Review the journal entry data. Check for constraint violations. This is a data integrity issue — escalate immediately.",
  },

  // ─── Infrastructure Alerts ─────────────────────────────────────────────

  {
    name: "Critical: Database connection failure",
    description:
      "Triggers when the /api/health?check=ready endpoint returns 503.",
    type: "metric_alert",
    metric: "health_check_failure",
    threshold: 1,
    window: 5,
    action: "slack, sms",
    severity: "critical",
    runbook:
      "Check Neon dashboard for connection pool status. Verify DATABASE_URL is correct. Check for connection leaks.",
  },
  {
    name: "High: Redis connection failure",
    description:
      "Triggers when Redis (Upstash) is unreachable for > 2 minutes.",
    type: "metric_alert",
    metric: "redis_health",
    threshold: 1,
    window: 2,
    action: "slack",
    severity: "high",
    runbook:
      "Check Upstash dashboard. Rate limiting falls back to in-memory. Verify UPSTASH_REDIS_REST_URL and token.",
  },
];

// ─── Sentry Dashboard Setup Checklist ─────────────────────────────────────
//
// After first deploy, configure these in the Sentry dashboard:
//
// 1. Go to Alerts → Create Alert Rule
// 2. For each rule above:
//    a. Select the metric type (Error, Performance, etc.)
//    b. Set the threshold and window
//    c. Add notification action (Slack channel, email, SMS)
//    d. Add the runbook as a comment
//
// 3. Configure Slack integration:
//    a. Go to Settings → Integrations → Slack
//    b. Connect your Slack workspace
//    c. Set the default channel for alerts (#xenboox-alerts)
//
// 4. Configure email notifications:
//    a. Go to Settings → Notifications
//    b. Enable "Alerts" for the team
//    c. Set up on-call rotation for critical alerts
//
// 5. Set up performance budgets:
//    a. Go to Performance → Web Vitals
//    b. Set LCP target: < 2.5s (good), < 4.0s (needs improvement)
//    c. Set CLS target: < 0.1 (good), < 0.25 (needs improvement)
//    d. Set INP target: < 200ms (good), < 500ms (needs improvement)
//
// 6. Configure release tracking:
//    a. Releases are auto-created by the Vercel build
//    b. Set up commit tracking for stack trace linking
//    c. Configure source maps upload (already done in next.config.ts)
