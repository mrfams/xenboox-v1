# Financial Pulse New — Feature Migration Plan

> **Goal:** Bring high-value features from the old Financial Pulse (1588 lines, now tabbed) to the AI-native /financial-pulse/new page (462 lines).

**Current state:** Old page has Overview/Performance/Planning/Reports tabs with KPIs, charts, scenario planner, budget vs actual, report library, and quick actions. New page has metric narratives, charts, forecast, and anomaly alerts.

---

## What to Bring

### Priority 1: Scenario Planner

**Value:** HIGH — unique feature, no equivalent in new page
**Adaptation:** AI-native version:

- Instead of manual input fields, user describes scenario in natural language
- "What if revenue drops 20% next quarter?" → AI models the impact
- Show projected P&L, cash flow, runway impact
- Keep the existing `ScenarioPlanner` component but wrap it in AI context

### Priority 2: Budget vs Actual

**Value:** HIGH — essential for financial health monitoring
**Adaptation:** AI-narrated version:

- Status card: "You're 5% over budget overall. Rent and marketing are the main drivers."
- Simplified table with variance highlighting
- "Ask AI" to explain any variance
- Use existing `BudgetVsActualSection` component

### Priority 3: Report Library with Downloads

**Value:** MEDIUM — users need to export reports
**Adaptation:** Keep as a compact grid:

- P&L, Cash Flow, Trial Balance, Tax Summary cards
- Each has "Ask AI" + download buttons (PDF/Excel/Word)
- Use existing `DocumentDownloadButtons` component
- AI narrates: "Your P&L shows $X revenue, $Y expenses, $Z net profit"

### Priority 4: KPI Drill-Down Drawer

**Value:** MEDIUM — detailed breakdown when clicking KPIs
**Adaptation:** Slide-over panel with:

- Itemized breakdown (revenue by account, expenses by category)
- AI insight text
- "Ask AI" for deeper analysis
- Use existing `KpiDrillDownDrawer` component

### Skip: Quick Actions

**Reason:** In AI-native model, the command bar replaces quick actions. Users ask the AI, not click buttons.

---

## Implementation

### File: `apps/web/app/dashboard/financial-pulse/new/page.tsx`

**Add to existing file:**

1. **Scenario Planner section** — after charts, before forecast
2. **Budget vs Actual section** — after forecast
3. **Report Library section** — compact grid at bottom
4. **KPI Drill-Down Drawer** — triggered by clicking metric cards

### Build Order

1. Add Scenario Planner (highest value, unique feature)
2. Add Budget vs Actual (essential for financial health)
3. Add Report Library with downloads
4. Add KPI Drill-Down Drawer
5. Polish spacing and transitions

### Data Sources (all exist already)

| Source           | Query                                       |
| ---------------- | ------------------------------------------- |
| Budget vs Actual | `reports.getBudgetVsActual`                 |
| P&L Data         | `reports.getPnlOverview` (already used)     |
| Dashboard Data   | `dashboard.getDashboardData` (already used) |
| AI Narrative     | `dashboard.getAiNarrative` (already used)   |
| Anomalies        | `dashboard.detectAnomalies` (already used)  |

### Components to Reuse

| Component                 | Location                                                        |
| ------------------------- | --------------------------------------------------------------- |
| `ScenarioPlanner`         | `financial-pulse/page.tsx` (inline)                             |
| `BudgetVsActualSection`   | `financial-pulse/page.tsx` (inline)                             |
| `ForecastView`            | `components/finance/forecast-view.tsx` ✅ (already imported)    |
| `DocumentDownloadButtons` | `components/documents/document-download-buttons.tsx`            |
| `AnomalyAlerts`           | `components/financial/anomaly-alerts.tsx` ✅ (already imported) |

### What Each Section Looks Like

**Scenario Planner:**

```
┌─────────────────────────────────────────┐
│ 🔮 Scenario Planner         [Ask AI]   │
│                                         │
│ "What if revenue drops 20%?"            │
│ ┌─────────────────────────────────────┐ │
│ │ Projected Impact:                   │ │
│ │ Revenue: $80K → $64K               │ │
│ │ Net Profit: $20K → $4K             │ │
│ │ Runway: 8 months → 3 months        │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Budget vs Actual:**

```
┌─────────────────────────────────────────┐
│ 📊 Budget vs Actual           [Ask AI] │
│                                         │
│ Rent        $5,000    $5,200    +$200  │
│ Marketing   $3,000    $4,500   +$1,500 │
│ Salaries   $15,000   $15,000       $0  │
│                                         │
│ Overall: 5% over budget                │
└─────────────────────────────────────────┘
```

**Report Library:**

```
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│ 📈 P&L   │ │ 💰 Cash  │ │ 📋 TB    │ │ 🏛 Tax   │
│ [PDF]    │ │ [PDF]    │ │ [PDF]    │ │ [PDF]    │
│ [Excel]  │ │ [Excel]  │ │ [Excel]  │ │ [Excel]  │
└──────────┘ └──────────┘ └──────────┘ └──────────┘
```
