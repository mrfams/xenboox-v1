# Feature Spec: Sentry Error Tracking

## Goal
Integrate Sentry for production error tracking with PII scrubbing and entity isolation.

## Why This Matters
- Can't debug production issues without error tracking
- console.error is not production monitoring
- Need to catch and alert on errors before users report them

## What We Must Build

### Sentry Configuration
- `@sentry/nextjs` SDK
- PII scrubbing (no sensitive data in reports)
- Entity context in error reports
- Source maps upload

### Error Boundary
- Global error boundary for unhandled errors
- Route-level error boundaries
- Component-level error boundaries for critical sections

### Alerting
- Error rate alerts
- New issue alerts
- Performance monitoring

## Acceptance Criteria
- [ ] Sentry SDK installed and configured
- [ ] PII scrubbing active
- [ ] Entity context in all reports
- [ ] Source maps uploaded
- [ ] Error boundaries at route level
- [ ] Alert rules configured
- [ ] No financial data in error reports
