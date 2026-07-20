# XENBOOX — Model Provider Layer & Inference Scaling Spec

> Engineering handoff doc. Companion to XENBOOX_PRD.md and all prior specs — most directly XENBOOX_SYSTEM_ARCHITECTURE.md (Section 6, Agent Layer Interface) and XENBOOX_AGENT_WORKFORCE.md (Section 7, Model Assignment).
> This is the system that lets Xenboox run on Claude, GPT, and open-weight models (Kimi, GLM, DeepSeek, whatever ships next) interchangeably per agent — test new models safely, roll them out with evidence, and scale inference to thousands then hundreds of thousands of concurrent users without a rewrite.
> Version: v1.0 | Last updated: July 2026

---

## 1. Purpose and Boundary

Prior specs (Architecture doc Section 6, Agent Workforce doc Section 7) assumed a fixed model assignment (Claude Haiku/Sonnet). This doc replaces "fixed assignment" with a **provider-agnostic layer** that any agent calls through, plus the **evaluation and rollout pipeline** that governs which model is actually live for which agent at any given time. It does not change what agents decide (doc #3) or what's accounting-valid (doc #4) — it changes how the "call a model" step is implemented underneath every agent.

```
Agent needs inference
        │
        ▼
callModel(agentName, task, payload)   ← every agent calls this, never a raw SDK call
        │
        ▼
Model Router  → looks up current live model assignment for (agentName, task)
        │              from model_assignments table (admin-configurable)
        ▼
Provider Adapter → Anthropic API | AWS Bedrock | Google Vertex | OpenAI |
                    Fireworks/Together/DeepInfra (open-weight hosting)
        │
        ▼
Response returned in a normalized shape regardless of provider
```

---

## 2. The Abstraction Layer

### 2.1 Router Interface

```ts
async function callModel(params: {
  agentName: string; // e.g. 'ledger_agent'
  taskType: string; // e.g. 'post_journal_entry', 'ocr_field_extraction'
  entityId: string;
  payload: unknown;
  fallbackAllowed: boolean; // whether router may fail over to backup model on error
}): Promise<NormalizedModelResponse>;
```

- Every one of the 19 agents (doc #3) calls this — no agent code contains a provider SDK import directly
- `NormalizedModelResponse` wraps whatever the underlying provider returns into one consistent shape: `{ content, toolCalls, confidence, tokensUsed, latencyMs, modelId, providerId }` — downstream code (Rules Engine calls, escalation logic) never needs to know which provider answered

### 2.2 Provider Adapters

One adapter per provider, each responsible only for translating the normalized request into that provider's API shape and translating the response back:

```
/server/models/adapters/
  anthropic.ts     (direct API, primary)
  bedrock.ts        (Claude via AWS — redundancy pool)
  vertex.ts          (Claude via Google — redundancy pool)
  openai.ts          (GPT family)
  openweight.ts      (Fireworks/Together/DeepInfra — Kimi, GLM, DeepSeek, etc.,
                       parameterized by model ID so new open-weight releases
                       don't need a new adapter, just a new config entry)
```

- Adding a new open-weight model (Kimi K3, GLM 5.2, whatever ships next month) is a **config change to `openweight.ts`'s model registry, not new code** — this is what makes "when a better model comes out, test it" actually fast rather than an engineering project every time

### 2.3 Model Assignment Table

```sql
model_assignments
  id, agent_name, task_type,
  live_model_id, live_provider,          -- what's actually serving traffic
  fallback_model_id, fallback_provider,  -- used on error/timeout if fallbackAllowed
  traffic_split jsonb,                    -- e.g. {"claude-sonnet-4-6": 90, "kimi-k3": 10}
                                           -- for gradual rollout, see Section 4
  updated_by, updated_at
```

- This table is what the admin panel (Section 5) actually edits — changing a model in production is a row update, not a deploy

---

## 3. The Evaluation Pipeline (this is the actual answer to "test it, then roll it out")

Every candidate model — new Claude version, new GPT version, new open-weight release — goes through the same four gates before it can serve any live traffic for any agent. This reuses the golden dataset infrastructure already defined in the Accounting Rules Engine spec (doc #4 Section 10) and Agent Workforce spec (doc #3 Section 8) — this doc adds the _process_ around it.

```
GATE 1 — Capability Screen
  Run candidate model against the agent-specific golden dataset test suite
  (per agent, per task type — e.g. Ledger Agent's posting suite, AP Agent's
  invoice-matching suite). Pass threshold defined per agent (ledger-critical
  agents require near-perfect scores; low-judgment agents like OCR cleanup
  tolerate more variance).

GATE 2 — Shadow Mode
  Candidate model runs in parallel with the live model on real (or replayed)
  traffic, for a defined window (e.g. 2 weeks / N transactions), but its output
  is NEVER written to the database or shown to users — only logged and compared
  against the live model's actual output and against ground truth where available.

GATE 3 — Canary Rollout
  Candidate model takes a small live traffic percentage (traffic_split, Section
  2.3) — e.g. 5% of AP Agent's invoice matching — with full monitoring. Any
  confidence-score regression, escalation-rate spike, or Audit Agent disagreement
  rate increase versus the incumbent model triggers automatic rollback.

GATE 4 — Full Rollout
  Traffic split moves to 100% only after canary shows no regression over a
  defined minimum sample size. Old model stays configured as fallback_model_id
  for a burn-in period before being fully retired from that agent's config.
```

- **No model skips gates for any agent touching the ledger-critical chain** (Ledger, Controller, AP, AR, Reconciliation) regardless of how good its public benchmarks look — public benchmarks (SWE-bench, coding arenas) are a reason to prioritize evaluating a model, not a reason to skip evaluating it. This is directly relevant right now: a model can debut with genuinely strong published numbers and still have enterprise-specific reliability unproven, which is exactly why Gate 1 through Gate 3 exist rather than a straight swap-in.
- **Low-judgment agents (OCR cleanup, initial document classification) can move through gates faster** with a lower Gate 1 threshold and shorter Gate 2 window — a wrong classification gets re-routed by the Document Agent, not silently posted, so the cost of a miss is low. This is where it makes sense to be aggressive about adopting new open-weight models fast.

---

## 4. Rollout Mechanics

- `traffic_split` in `model_assignments` drives a weighted random selection at request time in the Model Router — no separate rollout infrastructure needed, it's one config field
- Every request logs which model/provider actually served it (`agent_actions` table, Architecture doc Section 3.8) — this makes canary comparison a query, not a guessing game
- Rollback is a single config write (`traffic_split` back to 100% incumbent) — no deploy, no downtime, takes effect on the next request

---

## 5. Admin Panel (Model Ops)

A dedicated internal screen (not customer-facing) for managing this system:

- **Model registry**: add a new candidate model (provider, model ID, cost per token) — this is what makes evaluating Kimi K3 the day its weights land a config entry, not a sprint
- **Evaluation dashboard**: per agent, per candidate model — Gate 1-4 status, golden dataset pass rate, shadow-mode comparison stats, canary performance metrics
- **Live assignment view**: what model is actually serving each agent right now, traffic split if mid-rollout
- **One-click rollback**: sets traffic_split to 100% fallback immediately
- **Cost dashboard**: spend per agent per model, so cost-driven decisions (this open-weight model is 80% cheaper and passing its gates, promote it) are visible, not guessed

---

## 6. Inference Scaling for Concurrency (thousands → hundreds of thousands of users)

This is the piece that actually determines whether Xenboox stays up under load — model diversity helps with this, but isn't sufficient by itself. Layered approach:

### 6.1 Traffic shaping (biggest lever, per earlier discussion — still true)

- Real-time-necessary calls (chat, live document processing a user is watching) go through the router with normal priority
- Everything else (bulk categorization, nightly reconciliation sweeps, Audit Agent sampling) queues through Trigger.dev with controlled concurrency, using Batch API where the provider offers it — this alone removes the majority of load from the real-time path, which is what actually lets a system "operate smoothly" at scale the way Cursor and similar AI-native tools do: they're not brute-forcing every request through a single synchronous provider call, they're shaping when and how each request actually hits inference.

### 6.2 Provider-pool load balancing

- The Model Router doesn't just pick a model — for a given model available via multiple routes (Claude via Anthropic direct + Bedrock + Vertex; open-weight models via multiple inference providers like Fireworks/Together/DeepInfra), it load-balances across routes
- Each route has its own independent rate-limit pool — this is the concrete mechanism that multi-provider access actually buys you at scale, distinct from model quality: more capacity ceiling, not just more options
- Router tracks per-route health (latency, error rate, rate-limit headroom from response headers) and shifts traffic away from a degraded or throttled route automatically

### 6.3 Caching

- Prompt caching (per earlier discussion) on every provider that supports it — shared context (chart of accounts, entity settings, system instructions) cached per entity, reused across every agent call for that entity
- This compounds with provider pooling: caching reduces the tokens each request costs against a rate limit, pooling increases the number of parallel rate-limit budgets you're drawing from

### 6.4 Graceful degradation, not failure

- If every route for a given task type is genuinely saturated, the request queues rather than errors to the user — chat shows "thinking a little longer than usual," document processing stays in `processing` status rather than `failed`
- Per the Data Ingestion spec's failure-handling principle (doc #5 Section 7) — extended here to inference capacity, not just parsing failures: never a dead end, always a visible, honest status

### 6.5 What "smoothly at hundreds of thousands of users" actually requires

Being direct about sequencing: the architecture above is what makes that ceiling reachable without a rewrite, but reaching it in practice also requires the negotiated enterprise capacity conversation with Anthropic/OpenAI/inference providers that was flagged in the earlier scaling discussion — infrastructure design and commercial capacity are two different problems, and this doc solves the first one. Build the router and evaluation pipeline now, correctly, so the second problem is a conversation to have when you have the usage data to have it — not a blocker before you have a single paying customer.

---

## 7. Security & Data Handling Per Provider

Extends Security spec (doc #6) rather than replacing it:

- Every provider adapter (Section 2.2) must be vetted for data retention policy, encryption in transit, and (where relevant) data residency before it's allowed into the `model_assignments` registry at all — this vetting happens once per provider, not per model
- Open-weight models hosted via third-party inference providers carry the same scrutiny as any other vendor per doc #6's principle — the model being "open-weight" doesn't reduce data-handling risk if it's served through a third party's API rather than self-hosted
- No entity's raw financial documents leave the approved provider list under any circumstances, including for evaluation (Gate 1/2 above use synthetic or anonymized/golden-dataset data, never live customer documents, until a model has cleared to canary stage)

---

## 8. What This Doc Changes in Prior Specs

- **Architecture doc Section 6** ("Agent Layer Interface"): the hand-off from Trigger.dev task to LangGraph agent now includes the agent calling `callModel()` per this doc's Section 2, rather than a fixed model call
- **Agent Workforce doc Section 7** ("Model Assignment"): the fixed Haiku/Sonnet table becomes the **default `model_assignments` seed data** — still the correct starting point per that doc's reasoning (cost discipline, don't guess), but now changeable via this doc's pipeline rather than requiring a spec rewrite every time you want to test a new model

---

## 9. What This Doc Deliberately Does NOT Cover

- Which specific model is best today — that answer changes monthly and belongs in the admin dashboard's live data, not a static doc
- Accounting correctness of any model's output → still **doc #4**, unchanged — the Rules Engine validates every agent's output regardless of which model produced it, which is precisely why this whole multi-model system is safe to build: a bad model can get flagged/escalated/rolled back, but it can never post an unbalanced entry, because that gate doesn't care which model tried

---

_Companion to XENBOOX_SYSTEM_ARCHITECTURE.md Section 6 and XENBOOX_AGENT_WORKFORCE.md Section 7._
_Seventh document in the spec set._
