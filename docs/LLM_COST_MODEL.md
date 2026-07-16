# LLM Cost Model — Xenboox

> Quantitative cost analysis for Claude API inference across 19 agents.
> Last updated: July 2026

---

## 1. Claude API Pricing (June 2026)

All prices per **1 million tokens (MTok)**.

| Model | Input | Output | Context Window | Max Output | Use Case |
|-------|-------|--------|----------------|------------|----------|
| **Claude Sonnet 4.6** | $3.00 | $15.00 | 1M | 64K | Strategic, management, complex reasoning |
| **Claude Haiku 4.5** | $1.00 | $5.00 | 200K | 64K | Worker tasks, classification, structured extraction |

### Discount Tiers

| Technique | Discount | Applicable To | Notes |
|-----------|----------|---------------|-------|
| **Prompt Caching** | 90% off cached input | System prompts, repeated context | Break-even at 1 cache hit per 5 min TTL |
| **Batch API** | 50% off all tokens | Non-urgent background jobs | 24-hour processing window |
| **Batch + Cache** | Up to 95% off input | Batch jobs with cached prompts | Maximum cost reduction |

### Blended Rate Assumptions

For cost modeling, we assume the following blended rates based on prompt caching adoption:

| Scenario | Sonnet Effective Rate | Haiku Effective Rate |
|----------|----------------------|---------------------|
| No caching | $3.00/$15.00 | $1.00/$5.00 |
| **With caching (our target)** | ~$1.50/$15.00 | ~$0.50/$5.00 |
| With batch + caching | ~$0.75/$7.50 | ~$0.25/$2.50 |

---

## 2. Agent Token Usage Estimates

### 2.1 Agent Classification: Model Assignment

| Tier | Agent | Model | Rationale |
|------|-------|-------|-----------|
| **Tier 1: Strategic** | CFO Agent | **Sonnet** | Strategic orchestration, plain-English summaries, complex decisions |
| **Tier 2: Management** | Controller Agent | **Sonnet** | Ledger integrity review, double-entry enforcement |
| **Tier 2: Management** | Treasury Agent | **Sonnet** | Cash position analysis, cross-account decisions |
| **Tier 2: Management** | Payroll Manager Agent | **Sonnet** | Statutory compliance review, exception handling |
| **Tier 2: Management** | Compliance Agent | **Sonnet** | Regulatory interpretation, risk assessment |
| **Tier 3: Worker** | Ledger Agent | **Haiku** | Deterministic posting, mathematical validation |
| **Tier 3: Worker** | AP Agent | **Haiku** | Structured data extraction, invoice matching |
| **Tier 3: Worker** | AR Agent | **Haiku** | Invoice generation, payment matching |
| **Tier 3: Worker** | Asset Agent | **Haiku** | Depreciation calc, register maintenance |
| **Tier 3: Worker** | Inventory Agent | **Haiku** | Stock tracking, valuation calculations |
| **Tier 3: Worker** | Reconciliation Agent | **Haiku** | Transaction matching, bank statement parsing |
| **Tier 3: Worker** | Cash Agent | **Haiku** | Cash position tallying, imprest tracking |
| **Tier 3: Worker** | Mobile Money Agent | **Haiku** | Payment rail ingestion, transaction recording |
| **Tier 3: Worker** | Expense Agent | **Haiku** | OCR extraction, policy compliance check |
| **Tier 3: Worker** | Payroll Worker Agent | **Haiku** | Salary calculation, deduction computation |
| **Tier 3: Worker** | Tax Agent | **Haiku** | Tax calc by rule, return preparation |
| **Tier 3: Worker** | Audit Agent | **Haiku** | Transaction sampling, pattern detection |
| **Platform** | Reporting Agent | **Sonnet** | Report narrative generation, custom report building |
| **Platform** | Budget Agent | **Sonnet** | Variance analysis, plain-English explanations |
| **Platform** | Analytics Agent | **Sonnet** | Anomaly detection, trend analysis, forecasting |
| **Platform** | Document Agent | **Haiku** | OCR, classification, structured extraction |

**Summary:** 7 agents on Sonnet, 12 agents on Haiku.

### 2.2 Token Usage Per Invocation

Each invocation includes system prompt tokens (input), user/context tokens (input), and model-generated tokens (output).

| Agent | System Prompt (tokens) | Context/Input (tokens) | Output (tokens) | Total Input | Total Output |
|-------|----------------------|----------------------|-----------------|-------------|--------------|
| CFO Agent | 2,000 | 3,000 | 1,500 | 5,000 | 1,500 |
| Controller Agent | 2,000 | 4,000 | 800 | 6,000 | 800 |
| Treasury Agent | 2,000 | 3,000 | 600 | 5,000 | 600 |
| Payroll Manager Agent | 2,000 | 3,500 | 600 | 5,500 | 600 |
| Compliance Agent | 2,500 | 4,000 | 800 | 6,500 | 800 |
| Ledger Agent | 1,000 | 2,000 | 400 | 3,000 | 400 |
| AP Agent | 1,500 | 2,500 | 500 | 4,000 | 500 |
| AR Agent | 1,500 | 2,500 | 500 | 4,000 | 500 |
| Asset Agent | 1,000 | 2,000 | 400 | 3,000 | 400 |
| Inventory Agent | 1,000 | 2,000 | 400 | 3,000 | 400 |
| Reconciliation Agent | 1,500 | 3,000 | 500 | 4,500 | 500 |
| Cash Agent | 1,000 | 1,500 | 300 | 2,500 | 300 |
| Mobile Money Agent | 1,000 | 2,000 | 300 | 3,000 | 300 |
| Expense Agent | 1,500 | 2,000 | 400 | 3,500 | 400 |
| Payroll Worker Agent | 1,500 | 3,000 | 500 | 4,500 | 500 |
| Tax Agent | 1,500 | 2,500 | 500 | 4,000 | 500 |
| Audit Agent | 1,500 | 3,000 | 400 | 4,500 | 400 |
| Reporting Agent | 2,000 | 5,000 | 2,000 | 7,000 | 2,000 |
| Budget Agent | 2,000 | 4,000 | 1,200 | 6,000 | 1,200 |
| Analytics Agent | 2,000 | 5,000 | 1,500 | 7,000 | 1,500 |
| Document Agent | 1,500 | 3,000 | 600 | 4,500 | 600 |

### 2.3 Daily Invocations Per Entity (By Transaction Volume)

These estimates assume a typical entity activity pattern per day, averaged across 30 days.

| Agent | 50 txns/mo | 200 txns/mo | 1000 txns/mo | Trigger |
|-------|-----------|------------|-------------|---------|
| CFO Agent | 1 | 2 | 4 | Strategic queries, escalation review, close summaries |
| Controller Agent | 2 | 6 | 20 | Review batches, close checks, journal approval |
| Treasury Agent | 1 | 3 | 10 | Cash position, payment scheduling, reconciliation review |
| Payroll Manager Agent | 0.1 | 0.2 | 0.5 | Monthly payroll cycle (1x-2x/mo) |
| Compliance Agent | 0.1 | 0.3 | 1 | Filing checks, tax reviews, audit sampling |
| Ledger Agent | 5 | 20 | 100 | Posts every journal entry, one per transaction |
| AP Agent | 1 | 5 | 25 | Each supplier invoice = 1 invocation |
| AR Agent | 1 | 5 | 25 | Each customer invoice = 1 invocation |
| Asset Agent | 0.03 | 0.1 | 0.5 | Depreciation monthly, disposals as needed |
| Inventory Agent | 0.1 | 0.5 | 3 | Stock movements, valuations |
| Reconciliation Agent | 1 | 3 | 10 | Daily bank reconciliation |
| Cash Agent | 1 | 3 | 10 | Daily cash position, imprest processing |
| Mobile Money Agent | 1 | 5 | 20 | Mobile money transaction ingestion |
| Expense Agent | 0.3 | 2 | 10 | Employee expense submissions |
| Payroll Worker Agent | 0.1 | 0.2 | 0.5 | Monthly payroll calculation |
| Tax Agent | 0.1 | 0.3 | 1 | VAT prep, withholding checks |
| Audit Agent | 0.5 | 2 | 8 | Continuous sampling (proportional to volume) |
| Reporting Agent | 0.5 | 2 | 5 | On-demand reports, monthly close reports |
| Budget Agent | 0.2 | 0.5 | 1 | Monthly variance analysis |
| Analytics Agent | 0.3 | 1 | 3 | Daily anomaly scan, weekly trend analysis |
| Document Agent | 2 | 10 | 50 | Every uploaded document = 1 invocation |

---

## 3. Monthly Cost Per Entity

### 3.1 Per-Invocation Cost (With Prompt Caching)

Prompt caching applies to system prompts (repeated every invocation). Assuming system prompts are 1,000-2,500 tokens and get cached:

| Agent | Model | Cached Input Cost | Uncached Input Cost | Output Cost | **Total/Invocation** |
|-------|-------|-------------------|--------------------|-----------:|---------------------:|
| CFO Agent | Sonnet | $0.0030 | $0.0045 | $0.0225 | **$0.0300** |
| Controller Agent | Sonnet | $0.0030 | $0.0060 | $0.0120 | **$0.0210** |
| Treasury Agent | Sonnet | $0.0030 | $0.0045 | $0.0090 | **$0.0165** |
| Payroll Manager Agent | Sonnet | $0.0030 | $0.0053 | $0.0090 | **$0.0173** |
| Compliance Agent | Sonnet | $0.0038 | $0.0060 | $0.0120 | **$0.0218** |
| Ledger Agent | Haiku | $0.0010 | $0.0020 | $0.0020 | **$0.0050** |
| AP Agent | Haiku | $0.0015 | $0.0025 | $0.0025 | **$0.0065** |
| AR Agent | Haiku | $0.0015 | $0.0025 | $0.0025 | **$0.0065** |
| Asset Agent | Haiku | $0.0010 | $0.0020 | $0.0020 | **$0.0050** |
| Inventory Agent | Haiku | $0.0010 | $0.0020 | $0.0020 | **$0.0050** |
| Reconciliation Agent | Haiku | $0.0015 | $0.0030 | $0.0025 | **$0.0070** |
| Cash Agent | Haiku | $0.0010 | $0.0015 | $0.0015 | **$0.0040** |
| Mobile Money Agent | Haiku | $0.0010 | $0.0020 | $0.0015 | **$0.0045** |
| Expense Agent | Haiku | $0.0015 | $0.0020 | $0.0020 | **$0.0055** |
| Payroll Worker Agent | Haiku | $0.0015 | $0.0030 | $0.0025 | **$0.0070** |
| Tax Agent | Haiku | $0.0015 | $0.0025 | $0.0025 | **$0.0065** |
| Audit Agent | Haiku | $0.0015 | $0.0030 | $0.0020 | **$0.0065** |
| Reporting Agent | Sonnet | $0.0030 | $0.0075 | $0.0300 | **$0.0405** |
| Budget Agent | Sonnet | $0.0030 | $0.0060 | $0.0180 | **$0.0270** |
| Analytics Agent | Sonnet | $0.0030 | $0.0075 | $0.0225 | **$0.0330** |
| Document Agent | Haiku | $0.0015 | $0.0030 | $0.0030 | **$0.0075** |

**Cost formula:** (cached_system_prompt_tokens × $0.0000001) + (uncached_context_tokens × $0.000001) + (output_tokens × $0.000005) for Haiku. Triple for Sonnet input, triple for output.

### 3.2 Total Monthly Cost by Transaction Volume

#### Small SME: 50 transactions/month

| Agent | Invocations/mo | Cost/Invocation | Monthly Cost |
|-------|---------------|-----------------|-------------:|
| CFO Agent | 30 | $0.0300 | $0.90 |
| Controller Agent | 60 | $0.0210 | $1.26 |
| Treasury Agent | 30 | $0.0165 | $0.50 |
| Payroll Manager Agent | 3 | $0.0173 | $0.05 |
| Compliance Agent | 3 | $0.0218 | $0.07 |
| Ledger Agent | 150 | $0.0050 | $0.75 |
| AP Agent | 30 | $0.0065 | $0.20 |
| AR Agent | 30 | $0.0065 | $0.20 |
| Asset Agent | 1 | $0.0050 | $0.01 |
| Inventory Agent | 3 | $0.0050 | $0.02 |
| Reconciliation Agent | 30 | $0.0070 | $0.21 |
| Cash Agent | 30 | $0.0040 | $0.12 |
| Mobile Money Agent | 30 | $0.0045 | $0.14 |
| Expense Agent | 9 | $0.0055 | $0.05 |
| Payroll Worker Agent | 3 | $0.0070 | $0.02 |
| Tax Agent | 3 | $0.0065 | $0.02 |
| Audit Agent | 15 | $0.0065 | $0.10 |
| Reporting Agent | 15 | $0.0405 | $0.61 |
| Budget Agent | 6 | $0.0270 | $0.16 |
| Analytics Agent | 9 | $0.0330 | $0.30 |
| Document Agent | 60 | $0.0075 | $0.45 |
| **TOTAL** | | | **$5.14** |

#### Medium Business: 200 transactions/month

| Agent | Invocations/mo | Cost/Invocation | Monthly Cost |
|-------|---------------|-----------------|-------------:|
| CFO Agent | 60 | $0.0300 | $1.80 |
| Controller Agent | 180 | $0.0210 | $3.78 |
| Treasury Agent | 90 | $0.0165 | $1.49 |
| Payroll Manager Agent | 6 | $0.0173 | $0.10 |
| Compliance Agent | 9 | $0.0218 | $0.20 |
| Ledger Agent | 600 | $0.0050 | $3.00 |
| AP Agent | 150 | $0.0065 | $0.98 |
| AR Agent | 150 | $0.0065 | $0.98 |
| Asset Agent | 3 | $0.0050 | $0.02 |
| Inventory Agent | 15 | $0.0050 | $0.08 |
| Reconciliation Agent | 90 | $0.0070 | $0.63 |
| Cash Agent | 90 | $0.0040 | $0.36 |
| Mobile Money Agent | 150 | $0.0045 | $0.68 |
| Expense Agent | 60 | $0.0055 | $0.33 |
| Payroll Worker Agent | 6 | $0.0070 | $0.04 |
| Tax Agent | 9 | $0.0065 | $0.06 |
| Audit Agent | 60 | $0.0065 | $0.39 |
| Reporting Agent | 60 | $0.0405 | $2.43 |
| Budget Agent | 15 | $0.0270 | $0.41 |
| Analytics Agent | 30 | $0.0330 | $0.99 |
| Document Agent | 300 | $0.0075 | $2.25 |
| **TOTAL** | | | **$21.00** |

#### Large Organization: 1000 transactions/month

| Agent | Invocations/mo | Cost/Invocation | Monthly Cost |
|-------|---------------|-----------------|-------------:|
| CFO Agent | 120 | $0.0300 | $3.60 |
| Controller Agent | 600 | $0.0210 | $12.60 |
| Treasury Agent | 300 | $0.0165 | $4.95 |
| Payroll Manager Agent | 15 | $0.0173 | $0.26 |
| Compliance Agent | 30 | $0.0218 | $0.65 |
| Ledger Agent | 3,000 | $0.0050 | $15.00 |
| AP Agent | 750 | $0.0065 | $4.88 |
| AR Agent | 750 | $0.0065 | $4.88 |
| Asset Agent | 15 | $0.0050 | $0.08 |
| Inventory Agent | 90 | $0.0050 | $0.45 |
| Reconciliation Agent | 300 | $0.0070 | $2.10 |
| Cash Agent | 300 | $0.0040 | $1.20 |
| Mobile Money Agent | 600 | $0.0045 | $2.70 |
| Expense Agent | 300 | $0.0055 | $1.65 |
| Payroll Worker Agent | 15 | $0.0070 | $0.11 |
| Tax Agent | 30 | $0.0065 | $0.20 |
| Audit Agent | 240 | $0.0065 | $1.56 |
| Reporting Agent | 150 | $0.0405 | $6.08 |
| Budget Agent | 30 | $0.0270 | $0.81 |
| Analytics Agent | 90 | $0.0330 | $2.97 |
| Document Agent | 1,500 | $0.0075 | $11.25 |
| **TOTAL** | | | **$77.98** |

### 3.3 Cost Summary

| Transaction Volume | Monthly API Cost | Cost per Transaction | Margin at $19 tier | Margin at $39 tier | Margin at $99 tier | Margin at $149 tier |
|--------------------|-----------------|---------------------|--------------------|--------------------|--------------------|---------------------|
| 50 txns/mo (small) | **$5.14** | $0.103 | $13.86 (73%) | $33.86 (87%) | $93.86 (95%) | $143.86 (97%) |
| 200 txns/mo (medium) | **$21.00** | $0.105 | -$2.00 (negative) | $18.00 (46%) | $78.00 (79%) | $128.00 (86%) |
| 1000 txns/mo (large) | **$77.98** | $0.078 | -$77.98 (negative) | -$38.98 (negative) | $21.02 (21%) | $71.02 (48%) |

---

## 4. Cost vs Revenue Analysis

### 4.1 Pricing Tiers

| Tier | Price/mo | Target Segment | Agent Features |
|------|----------|---------------|----------------|
| Free | $0 | Solo freelancers, trial | Basic ledger, 5 AI queries/mo, 1 entity |
| Starter | $19 | Small SME (1-5 employees) | Full agent access, 1 entity, 200 txns/mo cap |
| Business | $39 | Growing business (5-25 employees) | Full agents, 3 entities, 1000 txns/mo cap |
| Professional | $99 | Mid-size org (25-100 employees) | Unlimited entities, priority processing, 5000 txns/mo |
| Enterprise | $149 | Large org / accounting firms | Unlimited everything, dedicated support, custom compliance |

### 4.2 Revenue per Tier vs. Agent Cost

| Tier | Revenue | Est. Avg Cost | Gross Margin | Margin % |
|------|---------|--------------|-------------|----------|
| Free ($0) | $0 | $1.50 | -$1.50 | N/A |
| Starter ($19) | $19 | $5.14 | $13.86 | 73% |
| Business ($39) | $39 | $12.00* | $27.00 | 69% |
| Professional ($99) | $99 | $35.00* | $64.00 | 65% |
| Enterprise ($149) | $149 | $55.00* | $94.00 | 63% |

*\* Weighted average across customer mix at that tier, not full volume*

### 4.3 Revenue Breakdown by Tier Composition

Assuming typical customer distribution at steady state:

| Tier | % of Customers | Avg Cost/Customer | Total Revenue (1000 cust) | Total API Cost (1000 cust) | Net Contribution |
|------|---------------|-------------------|--------------------------|---------------------------|-----------------|
| Free | 30% | $1.50 | $0 | $450 | -$450 |
| Starter | 35% | $5.14 | $6,650 | $1,799 | $4,851 |
| Business | 20% | $12.00 | $7,800 | $2,400 | $5,400 |
| Professional | 10% | $35.00 | $9,900 | $3,500 | $6,400 |
| Enterprise | 5% | $55.00 | $7,450 | $2,750 | $4,700 |
| **TOTAL** | | | **$31,800** | **$10,899** | **$20,901** |

**Blended gross margin: 65.7%**

---

## 5. Cost Optimization Strategies

### 5.1 Model Routing (Highest Impact: 60-80% savings)

| Strategy | Savings | Implementation |
|----------|---------|---------------|
| Haiku for all worker tasks | 67% vs Sonnet-only | Default model selection in agent config |
| Sonnet for management/strategic only | Baseline | Route by agent tier |
| Dynamic routing by task complexity | 10-15% additional | Simple tasks → Haiku, complex → Sonnet |

**Impact:** Moving all worker agents from Sonnet to Haiku saves ~$0.01 per worker invocation. Across thousands of invocations, this is the single largest lever.

### 5.2 Prompt Caching (Impact: 90% off system prompt costs)

System prompts are 1,000-2,500 tokens per agent. With 21 agents, that's ~35,000 tokens of system prompt per entity setup. These are identical across invocations.

| Metric | Without Cache | With Cache | Savings |
|--------|-------------|-----------|---------|
| System prompt cost per invocation (Sonnet) | $0.0075 | $0.00075 | 90% |
| System prompt cost per invocation (Haiku) | $0.0020 | $0.00020 | 90% |
| Monthly system prompt cost (200 txns) | $6.30 | $0.63 | $5.67 |

**Implementation:** All system prompts use `cache_control` annotation. TTL is 5 minutes. Every invocation within a session hits cache.

### 5.3 Batch Processing (Impact: 50% off batch-eligible workloads)

Non-urgent agent work can be batched with a 24-hour window:

| Eligible Work | Current Frequency | Can Batch? | Savings |
|---------------|-------------------|-----------|---------|
| Month-end close sequences | Once/month | Yes | 50% off all close agent costs |
| Audit Agent sampling | Continuous | Yes (4-hr batches) | 50% off audit costs |
| Analytics Agent trend analysis | Daily | Yes (nightly batch) | 50% off analytics |
| Budget Agent variance analysis | Monthly | Yes | 50% off budget analysis |
| Reporting Agent (non-urgent) | On-demand | Partially | 30% off reporting |

**Estimated monthly savings at 200 txns:** ~$1.50 (7% reduction)

### 5.4 Context Window Optimization (Impact: 20-40% on input costs)

| Technique | Token Reduction | Notes |
|-----------|-----------------|-------|
| Compress context before each invocation | 30-50% | Summarize previous turns, extract only relevant data |
| Structured input over natural language | 20-40% | Use JSON schemas, not prose |
| Lazy loading of historical data | 40-60% | Only fetch recent data unless history needed |
| Tool result compression | 30-50% | Summarize DB query results, not full dumps |

### 5.5 Token Budgets Per Entity (Hard Limits)

Enforce token budgets to prevent runaway costs:

```typescript
// Token budget configuration
const ENTITY_TOKEN_BUDGETS = {
  starter: {
    monthly_input_tokens: 5_000_000,   // ~$5 on Haiku, ~$15 on Sonnet
    monthly_output_tokens: 1_000_000,  // ~$5 on Haiku, ~$15 on Sonnet
    max_monthly_cost: 10.00,           // Hard cap at $10 API cost
    daily_invocation_limit: 200,
    alert_threshold: 0.8,              // Alert at 80% of budget
  },
  business: {
    monthly_input_tokens: 20_000_000,
    monthly_output_tokens: 5_000_000,
    max_monthly_cost: 35.00,
    daily_invocation_limit: 1000,
    alert_threshold: 0.8,
  },
  professional: {
    monthly_input_tokens: 80_000_000,
    monthly_output_tokens: 20_000_000,
    max_monthly_cost: 100.00,
    daily_invocation_limit: 5000,
    alert_threshold: 0.8,
  },
  enterprise: {
    monthly_input_tokens: 300_000_000,
    monthly_output_tokens: 75_000_000,
    max_monthly_cost: 250.00,
    daily_invocation_limit: 25000,
    alert_threshold: 0.8,
  }
}
```

### 5.6 Response Quality Gates

Avoid wasting tokens on low-quality outputs:

| Gate | Implementation | Token Waste Prevented |
|------|---------------|----------------------|
| Confidence threshold | Retry at lower token budget if confidence < 0.7 | 10-20% of retries |
| Output length cap | Hard limit on output tokens by agent type | Prevents runaway generation |
| Deterministic fallback | Rule-based validation before LLM call | 15-25% of Ledger Agent calls |

---

## 6. Break-Even Analysis

### 6.1 Per-Tier Break-Even Transaction Volume

At what transaction volume does API cost consume the entire revenue for each tier?

| Tier | Revenue | API Cost Formula | Break-Even Transactions | Notes |
|------|---------|-----------------|------------------------|-------|
| Free ($0) | $0 | N/A | **0** (always negative) | Free tier is a cost center; must be tightly limited |
| Starter ($19) | $19 | ~$0.10 × txns | **~190 txns/mo** | Capped at 200 txns/mo — close to break-even at cap |
| Business ($39) | $39 | ~$0.08 × txns | **~488 txns/mo** | Comfortable headroom up to 500 txns |
| Professional ($99) | $99 | ~$0.07 × txns | **~1,414 txns/mo** | Significant headroom; 5000 txns/mo cap is safe |
| Enterprise ($149) | $149 | ~$0.06 × txns | **~2,483 txns/mo** | High-volume pricing; enterprise customers typically at 1000-3000 txns |

### 6.2 Risk Zones

| Tier | Risk Zone | Mitigation |
|------|-----------|-----------|
| Free | All usage is loss. | Strict limits: 5 queries/mo, 1 entity, no batch jobs |
| Starter | >150 txns/mo approaches break-even | Hard cap at 200 txns, usage alerts at 150 |
| Business | >400 txns/mo reduces margin below 50% | Usage alerts at 400, suggest upgrade to Professional |
| Professional | >1000 txns/mo starts consuming margin | Dynamic model routing kicks in at 800 txns |
| Enterprise | >2000 txns/mo needs attention | Negotiate volume pricing, dedicated caching strategy |

---

## 7. Scaling Projections

### 7.1 Cost at Scale (Assumptions: Steady-state customer mix from 4.3)

| Entities | Free (30%) | Starter (35%) | Business (20%) | Professional (10%) | Enterprise (5%) | Total API Cost/mo | Total Revenue/mo | Net |
|----------|-----------|--------------|----------------|-------------------|-----------------|-------------------|-----------------|-----|
| 100 | $45 | $900 | $1,200 | $1,750 | $1,375 | **$5,270** | $15,900 | $10,630 |
| 500 | $225 | $4,498 | $6,000 | $8,750 | $6,875 | **$26,348** | $79,500 | $53,152 |
| 1,000 | $450 | $8,995 | $12,000 | $17,500 | $13,750 | **$52,695** | $159,000 | $106,305 |
| 5,000 | $2,250 | $44,975 | $60,000 | $87,500 | $68,750 | **$263,475** | $795,000 | $531,525 |
| 10,000 | $4,500 | $89,950 | $120,000 | $175,000 | $137,500 | **$526,950** | $1,590,000 | $1,063,050 |
| 50,000 | $22,500 | $449,750 | $600,000 | $875,000 | $687,500 | **$2,634,750** | $7,950,000 | $5,315,250 |

### 7.2 Key Scaling Metrics

| Metric | Value |
|--------|-------|
| **API cost per entity (blended avg)** | $5.27/mo |
| **Revenue per entity (blended avg)** | $15.90/mo |
| **Contribution margin per entity** | $10.63/mo |
| **Gross margin %** | 66.8% |
| **Cost per transaction (blended)** | $0.088 |
| **API cost doubles at** | ~2,000 entities (linear scaling assumed) |
| **Revenue exceeds $1M/mo at** | ~6,300 entities |

### 7.3 Cost Per Entity Trajectory

As scale increases, per-entity costs decrease through:

| Optimization | Milestone | Impact |
|-------------|-----------|--------|
| Prompt caching fully deployed | Day 1 | -15% per-entity cost |
| Batch processing for background agents | Month 1 | -7% per-entity cost |
| Context compression pipeline | Month 3 | -12% per-entity cost |
| Fine-tuned routing models | Month 6 | -10% per-entity cost |
| Anthropic volume discounts (if available) | Month 12 | -5-15% per-entity cost |
| **Cumulative reduction** | Month 12 | **-40 to -50% per-entity cost** |

### 7.4 Worst-Case Scenario (All Sonnet, No Optimization)

If every agent ran on Sonnet with no caching:

| Transaction Volume | Monthly Cost | vs. Revenue ($39 tier) | Margin |
|--------------------|-------------|----------------------|--------|
| 50 txns | $14.25 | $39 | 63% |
| 200 txns | $52.50 | $39 | **-35% (loss)** |
| 1000 txns | $225.00 | $99 | **-127% (loss)** |

This confirms that model routing and caching are **not optional** — they are required for the business to be viable.

---

## 8. Recommendations

### Immediate (Before Launch)

1. **Deploy prompt caching on all agents.** 90% discount on system prompts is the lowest-effort, highest-impact optimization.
2. **Enforce Haiku for all worker agents.** This is architecturally mandated in AGENTS.md — verify in code.
3. **Set hard token budgets per tier.** Prevent any single entity from blowing past break-even.
4. **Implement invocation logging.** You can't optimize what you can't measure. Log every token count.

### Month 1-3

5. **Batch all non-urgent background work.** Audit, analytics, reporting, budget analysis.
6. **Build context compression pipeline.** Summarize conversation history before feeding to next agent.
7. **Monitor actual vs. estimated token usage.** Adjust the numbers in this document based on real data.

### Month 6+

8. **Evaluate Anthropic commitment discounts** if entity count exceeds 5,000.
9. **Consider fine-tuned smaller models** for deterministic tasks (Ledger Agent, Cash Agent).
10. **Build real-time cost dashboard** per entity for customer-facing transparency and internal monitoring.

---

## Appendix A: Token Estimation Methodology

All estimates in this document are based on:

- **System prompts:** 1,000-2,500 tokens per agent (measured from actual prompt templates)
- **Context inputs:** 2,000-5,000 tokens per invocation (includes entity data, recent transactions, relevant history)
- **Agent outputs:** 300-2,000 tokens per invocation (depends on agent role: Ledger is short, Reporting is long)
- **Invocation frequency:** Derived from transaction volume × agent responsibility mapping
- **Prompt caching hit rate:** Assumed 85% (conservative; 90%+ achievable with proper cache keying)

## Appendix B: Sensitivity Analysis

| Variable | -20% Change | Base | +20% Change |
|----------|------------|------|-------------|
| Token count per invocation | $16.80 | $21.00 | $25.20 |
| Invocation frequency | $16.80 | $21.00 | $25.20 |
| Haiku price | $20.20 | $21.00 | $21.80 |
| Sonnet price | $19.50 | $21.00 | $22.50 |
| Cache hit rate (85% → 65%) | N/A | $21.00 | $24.50 |

**Key insight:** Invocation frequency and token count have the largest impact on total cost. Model pricing changes have the least impact because 70%+ of invocations are Haiku.

## Appendix C: The Gambia-Specific Considerations

| Factor | Impact on Cost Model |
|--------|---------------------|
| Mobile money volume | Higher Mobile Money Agent invocations vs. Western markets |
| Cash-heavy operations | More Cash Agent and imprest processing |
| Multi-currency (GMD/USD) | Additional FX calculation invocations |
| Small average entity size | Most entities at 50-200 txns/mo — favorable unit economics |
| Low willingness to pay | $0-19 tiers will dominate early — keep costs below $5/ entity |
| Agent accounting firms | Each firm = 10-50 entities at Starter tier — high leverage |

---

*This document should be updated monthly with actual token usage data from LangFuse traces. All estimates assume June 2026 pricing. Re-evaluate when Anthropic changes model pricing or releases new models.*
