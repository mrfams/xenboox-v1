# Feature Spec: Activation Tracking

## Goal
Track when users complete key activation events that correlate with 90-day retention. Surface activation status to help users complete their setup.

## User Problem
**User:** SME owner who just signed up
**Context:** Just created an account, doesn't know what to do next
**Pain:** No guidance on what actions to take, no feedback on progress
**Impact:** Users who don't activate in first 7 days likely never return
**Current solution:** None — no tracking, no guidance, no feedback

## Key Insight
From Arcade (2026): "Every 1% improvement in activation correlates with 2% lower 90-day churn."

## Activation Events

| Event | Description | Weight | Correlation |
|-------|-------------|--------|-------------|
| `signup` | User created account | 10% | Baseline |
| `setup_business` | User entered business info | 15% | Setup completion |
| `create_invoice` | User created first invoice | 30% | Core value moment |
| `see_narrative` | User saw AI narrative for first time | 15% | Aha moment |
| `import_bank` | User imported bank transactions | 20% | Data integration |
| `invite_team` | User invited team member | 10% | Expansion signal |

## Activation Score
- 0-25%: Not started
- 26-50%: Getting started
- 51-75%: Almost there
- 76-99%: Nearly activated
- 100%: Fully activated

## What We Must Build

### Database Schema
```typescript
analyticsEvents = pgTable("analytics_events", {
  id: uuidId(),
  entityId: entityId.references(() => entities.id),
  userId: text("user_id").notNull(),
  event: text("event").notNull(), // signup, create_invoice, etc.
  metadata: jsonb("metadata").default({}).$type<Record<string, unknown>>(),
  ...timestamps,
});
```

### Event Tracking
- Track all activation events in the database
- Calculate activation score based on events completed
- Store event metadata (e.g., invoice amount, narrative type)

### Activation Status Component
- Show activation progress on dashboard
- Highlight next step to complete
- Celebrate when fully activated

### Activation Funnel
- Track conversion from signup → first invoice
- Identify drop-off points
- Measure time-to-activation

## Acceptance Criteria
- [ ] All 6 activation events tracked in database
- [ ] Activation score calculated correctly
- [ ] Activation status shown on dashboard
- [ ] Next step highlighted
- [ ] Celebration animation on full activation
- [ ] Analytics dashboard for activation funnel
- [ ] Events respect entity scoping
- [ ] Events logged to LangFuse

## Success Metrics
| Metric | Current | Target | How to Measure |
|--------|---------|--------|----------------|
| Activation rate | Unknown | >60% | Users who reach 100% within 7 days |
| Time to first invoice | Unknown | <5 min | Time from signup to create_invoice |
| Day-7 retention | Unknown | >50% | Users who return after 7 days |
