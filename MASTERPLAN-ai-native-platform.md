# Xenboox — Production-Grade AI-Native Platform Masterplan

> **Status:** Approved master plan (Plan → Build phase)
> **Owner:** Engineering / Agent Platform
> **Scope:** Full accounting platform — ingestion, model control plane, tool-calling, RAG, document/artifact storage, deterministic validation, and the agent runtime.
> **Companion docs:** `ARCHITECTURE.md`, `DATABASE.md`, `XENBOOX_PRD.md`, `AGENTS.md`, `BUILD_LOG.md`.

---

## Agent Status Convention

> **Every agent that fully or partially completes an item in this masterplan must mark it inline.**
> Use the following markers immediately after the item's checkbox or heading:
>
> - `[x]` — **Fully fixed.** The item is complete, tested, and production-ready. No further work required.
> - `[~]` — **Partially fixed.** The item is started but not complete. Note what remains below the item.
> - `[ ]` — **Pending.** Not yet started.
>
> When marking an item `[~]` or `[x]`, always note:
>
> - What was done (files changed, behavior added)
> - What remains (if `[~]`)
> - The agent name and date of the change
>
> This ensures every agent can see the live state of the plan at a glance and pick up where the last left off.

---

## 1. Executive Summary

Xenboox is not a tool — it is an autonomous accounting workforce. Production-grade, AI-native accounting
requires that **every number that enters the general ledger is trusted to the cent**. That trust is not
earned by an LLM alone. It is earned by a layered system in which:

1. **Deterministic code is the source of truth** for all money math (double-entry, totals, VAT, depreciation, balances).
2. **LLMs are extractors, classifiers, connectors, and conversationalists** — never the final authority on a figure.
3. **Every AI output is cross-validated** against deterministic recomputation before it is allowed to write to the GL.
4. **The model that does the work is chosen by an admin in the Model Ops panel**, not hard-coded, and never called directly by application code.
5. **Every agent holds only the tools it needs** (least privilege). A tool is the smallest Web-API/DB capability boundary, and the model can only influence money when routed through deterministic guards.

This masterplan replaces non-production mechanisms (regex intent classification, direct Anthropic HTTP
fetches, orphaned LangChain tool predicates, JSON-in-prompt "tools") with a single, controllable,
observable, auditable platform.

---

## 2. Current-State Gap Analysis

Grounded in the codebase as it exists today.

| Area                                        | As-Is                                                                                                                                                                                                                                                                                                   | Problem                                                                                | Target                                                       |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| [x] **Model access** ✅ opencode 2026-08-06 | `packages/jobs/lib/extraction.ts` and `packages/jobs/lib/classification.ts` call `https://api.anthropic.com/v1/messages` directly → **Fixed:** classification.ts, extraction.ts, ocr.ts all routed through `@xenboox/models` `callModel` gateway. Zero direct provider calls remain in `packages/jobs`. | Bypasses router, cost/fallback/eval tracking; cannot swap providers from admin         | Route **everything** through `core/models` gateway           |
| **Intent resolution**                       | `core/pipeline.ts:390` `resolveIntent` is a **regex keyword classifier** (`new RegExp(d.keyword, "i")` at `:549`)                                                                                                                                                                                       | Fragile, misses intent, no confidence, hard to extend                                  | Model-level intent resolution with tool dispatch             |
| **Agent LLM calls**                         | Use deprecated `callLLM` (`core/llm/agent-llm.ts`), pass **no tools**                                                                                                                                                                                                                                   | Agents can reason but cannot _do_; JSON-prompt classification has no schema guarantee  | Tool-calling loop via `callModel` with per-agent tool grants |
| **Tool definitions**                        | `core/tools.ts` defines 5 LangChain `tool()` **never bound anywhere**                                                                                                                                                                                                                                   | Dead code, no schema-bound execution, no audit                                         | Registry with zod schemas + grants + span-logged execution   |
| **Ingestion**                               | Scattered: `packages/jobs/ingestion.ts`, `bank-import.ts`, `email-processing.ts`, `lib/{ocr,classification,extraction}.ts`                                                                                                                                                                              | No unified pipeline, no state machine, tools bypass router                             | Orchestrated ingestion DAG with state per document           |
| **Document storage**                        | `documents` table (R2 key/bucket, OCR fields) exists; attachments in `chatAttachments`                                                                                                                                                                                                                  | No artifact store for **generated** outputs (reports/exports); no presigned-URL policy | Add artifact + report storage and lifecycle                  |
| **RAG / Company Brain**                     | Ops schema `ops-company-brain` tables exist (**no ingestion**)                                                                                                                                                                                                                                          | No embeddings, no vector store, no retrieval                                           | pgvector RAG pipeline + entity-scoped retrieval              |
| **Confidence/escalation**                   | Thresholds in AGENTS.md, ad-hoc                                                                                                                                                                                                                                                                         | Not enforced centrally in one guard rail                                               | Central `TrustGuard` between model output and write          |
| **Observability**                           | `langfuse.ts`, `agentActivity` partial                                                                                                                                                                                                                                                                  | Tools, prompts, decisions not uniformly traced                                         | Uniform span per model call, tool run, validation            |

---

## 3. Target Architecture (Overview)

```
                        ┌─────────────────────────────────────────────┐
   INPUTS ────────────► │              INGESTION PIPELINE            │
   user prompt          │  state machine: detect→parse→normalize      │
   documents (pdf/img)  │  →classify →extract →validate →link →write │
   email                └───────────────┬─────────────────────────────┘
   bank import/csv          ocr/vision │                │  deterministic
   RAG knowledge source                 ▼                ▼
   chat attachments    ┌──────────────────────────┐   TrustGuard
                       │        AGENT RUNTIME    │   (cross-validation)
                       │  LangGraph StateGraph    │──(recalc, double-entry,
                       │  tool-calling loop       │   budget check…)──► escalate / reject
                       │  per-agent tool grants   │
                       └────────────┬──────────────┘
                                    ▼
              Ledger Agent = SINGLE POINT of GL write + idempotency
                                    │
          ┌───────────────┬─────────┴──────────┬──────────────────┐
          ▼               ▼                    ▼                  ▼
        DATABASE      ARTIFACT STORE       RAG (pgvector)      CONVERSATION
     (Neon/Drizzle)   (R2 reports,        (company brain,        (chat history,
      entity-scoped)   exports, pdfs)       entity-scoped)        attachments)
          └───────────────┬────────────────────────────────────────┘
                          ▼
              MODEL OPS CONTROL PLANE (Admin)
        model_registry / model_assignments / evals / cost / routing
        callModel() gateway ← ALL model traffic; providers pluggable
```

**Non-negotiable rule:** _no code path outside the model gateway may call a model provider directly._
Providers are `anthropic | bedrock | vertex | openai | fireworks | together | deepinfra | openrouter`
and are chosen per (agent, task type) from the database.

---

## 4. Model Control Plane (Model Ops)

### 4.1 Data model (exists, extend)

- [x] `model_registry` — every candidate/live model, provider, capabilities (`supportsTools|supportsVision|supportsStreaming|maxContextTokens`), cost, endpoints. ✅
- [x] `model_assignments` — decide which model serves an `(agentName, taskType)`, with fallback and `trafficSplit`. ✅
- [x] `model_evaluations` — Gate 1–4 sign-off before a model goes live. ✅
- [x] `model_cost_tracking` — daily aggregated cost per entity/agent/model. ✅
- [x] **Extend (done):** ✅ Buffy 2026-08-06 — added `supportsEmbeddings`, `embeddingDimensions`, `systemPromptOverride`, `temperatureOverride`, `retryPolicy` to `modelAssignments` table.

### 4.2 The gateway (`packages/agents/core/models/`)

- [x] `router.ts` resolves an assignment → ordered `ProviderRoute[]` (live, fallback), consults health tracker, applies traffic split. ✅ opencode 2026-08-06 — moved to `packages/models/router.ts`.
- [x] `adapters/*.ts` translate normalized `callModel` params into provider-native schemas **and translate provider tool calls back to `NormalizedToolCall`** — Anthropic/OpenAI/OpenWeight fully support tools + vision blocks. Bedrock: tool forwarding (tools + tool_choice + tool_use response parsing) ✅ opencode 2026-08-06. Vertex: function calling (functionDeclarations + toolConfig + functionCalls response) ✅ opencode 2026-08-06. All 5 adapters now fully support tool calling.
- [x] `entry.ts` `callModel` / `streamModel` expose a single typed surface: system prompt + messages + **tools** + routing context; returns `NormalizedModelResponse { content, toolCalls, confidence, tokens… }`. ✅ opencode 2026-08-06 — moved to `packages/models/entry.ts`, supports `ModelMessageContentBlock[]` for vision.

**Direct-call elimination:** ✅ opencode 2026-08-06 — `classification.ts`, `extraction.ts`, `ocr.ts` all rewritten to call `callModel` with forced tool schemas and `tool_choice`. Zero `api.anthropic.com` references remain in `packages/jobs`.

### 4.3 RouteHealth & reliability

- [x] In-process circuit breaker: ≥3 consecutive errors → mark unhealthy, route to fallback (in `RouteHealthTracker`). ✅ opencode 2026-08-06 — configurable threshold + auto-recovery.
- [x] Timeouts, retries with exponential backoff, and rate-limit awareness per provider. ✅ opencode 2026-08-06 — per-route timeout (default 30s), per-route retry with backoff (max 2 retries), rate-limit skip (remaining=0 + resetAt in future).
- [x] Per-assignment `evaluationGate` disables a model that has not passed its gate. ✅ opencode 2026-08-06 — routes skipped if evaluationGate is gate1/gate2/gate3 (not "none" or "complete").

### 4.4 Reconciliation & LLM telemetry

- [x] Every gateway call emits a LangFuse span + writes `agentActivity` with `model_id/provider/latency/tokens/cost`. ✅ opencode 2026-08-06 — `recordAgentActivity()` called after every `callModel` (success + error), writes modelId/provider/inputTokens/outputTokens/costCents/durationMs/langfuseTraceId.
- [x] Daily rollup `modelCostTracking`, surfaced in the admin cost dashboard. ✅ opencode 2026-08-06 — `rollupDailyCosts()` aggregates agent_activity into modelCostTracking with upsert (date, agent, model).

---

## 5. Tool System & Least-Privilege Grants

### 5.1 Tool contract (replaces `core/tools.ts`)

Each tool has: `name`, `description`, `inputSchema` (zod), `execute(ctx)`, `grantPolicy`, `readOnly:boolean`,
`writes: boolean`, `idempotencyKey: boolean`.

Tools fall into two classes:

- **Read tools** — entity-scoped queries (`getAccountBalance`, `listJournalEntries`, `getEntitySettings`, `searchLedger`).
- **Write/Capability tools** — things that change accounting state; **always behind the TrustGuard** and available
  only to the responsible agent.

### 5.2 Registry & grants

A **ToolRegistry** enumerates every tool once. Grants are a matrix (agent × tool + action), stored in DB and/or
environment, default **deny**. Only a deliberately granted tool can be dispatched.

| Agent              | Reading tools (example)                          | Write/capability tools                                      |
| ------------------ | ------------------------------------------------ | ----------------------------------------------------------- |
| CFO (tier1)        | ledger summaries, reports, budget variance, risk | `requestEscalation`, async decision; **no GL writes**       |
| Controller (tier2) | trial balance, account balances, close checklist | `approveEntry`, `runCloseChecklist`                         |
| Ledger (tier3)     | GL, journal structure                            | `postJournalEntry`, `validateDoubleEntry` (**sole writer**) |
| Treasury/Recon     | cash position, statements                        | `markReconciled`, `postBankRecon` (via ledger)              |
| Document/platform  | document list, RAG                               | `createArtifact`, embeddings upsert                         |
| AP / AR            | vendors, invoices, aging                         | `createInvoice`, `matchPayment` (via ledger)                |
| Compliance         | tax rules, filings                               | `prepareFiling`, hold for human                             |

### 5.3 Tool execution loop (agent)

```
repeat until assistant has no toolCall:
  response = callModel(messages, tools=called agent's grant set)
  for toolCall in response.toolCalls:
     grant = registry.deny unless granted else execute(ctx, toolCall)
     deterministicGuard(order: item math) → validate
     log to auditLangFuse
     append toolResult as a message
```

No tool result is ever fed back without a `confidence` and an audit entry.

---

## 6. Document & Artifact Storage Layer (R2)

### 6.1 Uploaded/app raised documents

- `documents` table (exists) backs all inbound docs: type, `ocrText`/`ocrConfidence`, r2Key, tags, metadata, status (detected→…→done).
- Upload via presigned URL (short TTL), `r2Key = entityId/type/docId.ext`, bucket per env.
- `documentLinks` pins a doc to any domain entity (invoice, expense, bank statement…).
- **Encryption at rest (R2 SSE)**, TLS in transit; **retention/lifecycle** rules + purge policy by jurisdiction.

### 6.2 Artifact store (generated outputs — new)

Users and agents **generate** files (reports, exports, PDFs, CSVs, invoices, tax filings). Add:

- `artifact_registry` table: `artifactId`, `entityId`, `kind` (report|export|file|invoice_pdf|filing), `documentId`,
  `r2Key`, `mimeType`, `sizeBytes`, `createdBy` (user or agent), `ttl`.

### 6.3 Serving

- Presigned GET URLs with short expiry, enforced RBAC (entity-scoped).
- Where transactions are sensitive, inspection admin download is separately audited.

---

## 7. Data Ingestion Pipelines

A single `analytics-ingestion` orchestration package (Trigger.dev) with a per-document **state machine** row.

### 7.1 Unified states

`DETECTED → PARSING → NORMALIZED → CLASSIFIED → EXTRACTED → VALIDATED → PERSISTED`.

### 7.2 Sources

| Source                             | Entry                                | Steps                                   |
| ---------------------------------- | ------------------------------------ | --------------------------------------- |
| User prompt                        | chat message                         | intent → tool call                      |
| Image (receipt/invoice photo)      | vision OCR of adapter                | OCR → classify → extract (fields)       |
| PDF/doc (invoice, statement)       | OCR (for images) / text parse        | classify → extract                      |
| Bank statement / CSV               | `bank-csv-parser`/`Statement-parser` | normalize lines → reconcile → ledger    |
| Email / mobile money / attachments | `email-processing`, chat attachment  | classify attachment → same doc pipeline |
| RAG knowledge                      | crawlers/sync                        | chunk → embed → upsert pgvector         |

### 7.3 Cross-validation (Trust Verify)

The critical accounting safety net — for **every** extraction:

1. **Recompute deterministically** from line items: e.g. invoice `total = Σ line(qty × unitPrice {+ tax})`.
2. **Compare** to the model's extracted `total`; if difference > tolerance (default 0.00 in accounting) → flag.
3. On mismatch: **escalate to human review queue**; never auto-write.
4. Also deterministic checks: double-entry balance, VAT recompute, budget check, currency conversion, GL account existence.

Each validation emits a `confidence` + `checks[]` recorded in the document's `metadata` and the audit trail.

---

## 8. RAG / Company Brain (pgvector)

- **Vector store:** Neon **pgvector** extension (Postgres-native, entity-scoped, no external infra).
- **Embeddings:** called through the model gateway: an `embedTask` using a registered embedding model from
  `model_registry` (provider-agnostic), new `embed` capability in gateway adapters.
- **Chunking:** smart chunking by document semantics (invoice, contract, policy, journal, historical report);
  store per **entity**, always filter by `entityId` at query time (multi-tenant isolation).
- **Hybrid retrieval:** vector sim + BM25 over OCR/text; reranker when the model tier supports it.
- **Usage:** CFO/Controller/chat answers cite source chunks; every citation logged.

> Reuse the `ops-company-brain` tables as the **operational UI/logging** layer; the serving layer is the pgvector
> columns on `knowledge_documents` + a retrieval service.

---

## 9. Agent Runtime & Pipelines

### 9.1 LangGraph tiered hierarchy (existing 19-agent model)

```
Human → CFO (tier1, strategic) → Dept Heads (tier2) → Workers (tier3) → Ledger (single writer)
```

- Workers report to a department head; only the CFO talks to humans; the Ledger is the **only** writer to the GL.
- State per GraphNode is typed (`Annotation.Root`). All agent outputs include `confidence`.

### 9.2 Orchestration

- `core/orchestrator.ts` dispatches runs to worker vs head ± CFO, with escalation path **(escalate to human, escalate to supervisor)**.
- Node runs in observability span; partial failures → atomic rollback, retry, escalate.

### 9.3 Reliability

- Idempotency keys on every POST/write (replay-safe).
- Timeouts per node (strategic vs worker), with retry/backoff.
- Timeouts per node (strategic vs worker), retry/backoff, and automatic fail-fast + fallback when a provider is unhealthy.

---

## 10. Conversational Surface (replace regex)

- Replace `resolveIntent` regex with a model **intent span**: `classify intent + needed tools`, gated by grants.
- Chat workers can call read tools (summarize GL, answer "what was cash last month") and trigger lower-risk writes
  after confirmation.
- Streaming via `streamModel` (`chat/stream/route.ts`), attachment ingestion goes through `ingestion` pipeline.
- Conversation/message/activity tables already exist — extend with `toolCalls[]` + `citations[]` on messages.

---

## 11. DB Read/Write Strategy

- **Write-through Data Access Layer (DAL)** in `packages/db` wrappers, every query carries `entityId`.
- GL writes take place only via the Ledger Agent's `postJournalEntry` under `TrustGuard` + idempotency key.
- Read replicas for reports; consistent reads for writes.
- CQRS when a materialized report is needed (summaries recomputed at time cost safe).

---

## 12. Security, Compliance & Audit

- AES-256 at rest, TLS 1.3 in transit, key in KMS (R2/ gateway), secrets in env/Vault.
- RBAC on every tRPC procedure via `protected + entityScoped` middleware.
- Audit log on every write (pool `audit_log`): who/what/when/why/confidence + old/new + ip + user agent.
- **Approval queue:** any write whose model confidence < threshold or that the deterministic checks flag, goes human.
- PII redaction in logs/telemetry (`core/retry.ts` PII patterns), no plaintext secrets, least-privileged tool grants.

---

## 13. Observability & Evaluation

- LangFuse traces for: every `callModel`, every tool execution, every escalation, every GL write.
- Language level: golden dataset `packages/agents/core/eval`, per task, Gate 1–4 before live traffic.
- Dashboards: cost per agent/model/entity, escalation rates, tool error rates, confidence distributions.
- Metrics thresholds → escalate/alert.

---

## 14. Implementation Roadmap

| Phase                             | Scope                   | Key deliverables                                                                                                                                                                                                                                                                                                                                          | Gate                                                     |
| --------------------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| [x] **P0** ✅ opencode 2026-08-06 | Close direct-call holes | Rewrite `classification.ts`/`extraction.ts`/`ocr.ts` to gateway; delete direct anthropic fetch; no code `fetch` to provider; extend `CallModelParams` to support `ModelMessageContentBlock[]` for vision; update all 5 adapters (Anthropic, OpenAI, OpenWeight, Bedrock, Vertex)                                                                          | typecheck / lint pass                                    |
| [x] **P1** ✅ opencode 2026-08-06 | Model control plane     | Fix adapters for tools (Bedrock/Vertex), complete Router→DB wiring, admin Model Ops page reads/writes `model_assignments` — **done:** Bedrock tool forwarding (tools + tool_choice + tool_use response parsing), Vertex function calling (functionDeclarations + toolConfig + functionCalls response), admin UI with full CRUD for assignments and models | admin can switch model live, cost telemetry in dashboard |
| [x] **P2** ✅ Buffy 2026-08-06    | Ingestion pipelines     | Unify state-machine; fully deterministic Trust-verify; improve OCR+classify+extract; artifact store                                                                                                                                                                                                                                                       | financial PDF ingestion end-to-end                       |
| **P3**                            | Tools & RAG             | Replace `core/tools.ts` with registry+grants; tool execution loop; pgvector embed+retrieval; citation in chat                                                                                                                                                                                                                                             | HR document → company brain; CFO can answer from docs    |
| **P4**                            | Chat & pipeline         | Replace regex intent; full chat→agent glue; streaming tool effects coded for                                                                                                                                                                                                                                                                              | beats eval, cross-validation green                       |
| **P5**                            | Evaluations & hardening | Golden suites, scaling load, security/SSO, installable desktop                                                                                                                                                                                                                                                                                            | Go-live / rollout                                        |

> Each phase ends with `pnpm typecheck`, `pnpm lint`, `pnpm test`, and an update to `BUILD_LOG.md`.

---

## 15. Risk Register

| Risk                                     | L   | I   | Mitigation                                                                            |
| ---------------------------------------- | --- | --- | ------------------------------------------------------------------------------------- |
| LLM extracts a wrong figure auto-written | H   | 5   | Trust‑Verify recalc rejects mismatch micro-check; human confirmation on all GL writes |
| Tool call leaks another tenant's data    | L   | 5   | entity-scope in every tool `execute`; ambient equality, row-level context in DAL      |
| Provider outage / fallback absent        | M   | 3   | circuit breaker + fallback routes + per-provider rate limit                           |
| Cost blowout of embedding/RAG many docs  | M   | 3   | cost dashboard, entity caps, caching embeddings                                       |
| Regex intent misroute (removed)          | H   | 2   | replaced by model intent + confidence threshold + escalation                          |
| Model regression despite passing gates   | M   | 4   | continuous eval suite, shadow mode comparing live vs candidate, canary traffic        |

---

## 16. Open Decisions

1. Vector search stack: **pgvector on Neon** (default) vs external (Pinecone). Chosen pgvector for entity-scoping simplicity.
2. Embedding provider default (e.g., OpenAI `text-embedding-3` vs provider-neutral) — settable in admin; no code change.
3. Whether batch ingestion is Trigger.dev (default based on current) or worker pool.
4. Artifact retention periods per jurisdiction / tax law.
5. How much of the company-brain product (graph connections, popular questions) to keep vs. treat as thin logging.

---

_Next: user approval to begin Phase P0 — eliminating all provider-direct calls through the model gateway._
