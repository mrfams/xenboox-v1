# Skill Loop Engineering & Graph Engineering — Master Plan

> **Goal:** Transform all 80+ skills from one-shot fire-and-forget into production-grade loop and graph workflows that process ALL items, verify their work, retry on failure, and don't stop until quality threshold is met.

---

## The Problem

Current skills are one-shot:

- Fire once, do one pass, declare done
- If told "review 20 files," they do 1-3 and stop
- No verification — don't check their own output
- No retry — something fails, they just stop
- No batching — can't handle "do this for all items"
- No quality gates — no threshold before stopping

## The Architecture

### Loop Pattern (every skill)

```
INTAKE → PLAN → LOOP { EXECUTE → VERIFY → RETRY? } → QUALITY GATE → REPORT
```

Each loop iteration:

1. **Pick next item** from work queue
2. **Execute** the skill's core work on that item
3. **Verify** the output meets quality standards
4. **If fail**: retry with context of what went wrong (max 3 retries)
5. **If pass**: mark item done, move to next
6. **Repeat** until queue is empty
7. **Quality gate**: overall score must meet threshold
8. **Report**: summary of all work done, findings, pass/fail

### Graph Pattern (skills that fan-out)

```
INTAKE → PLAN → PARALLEL { [item1, item2, item3, ...] } → AGGREGATE → VERIFY ALL → QUALITY GATE
```

1. **Intake**: understand full scope
2. **Plan**: identify all independent work items
3. **Fan-out**: process items in parallel (where possible)
4. **Fan-in**: aggregate all results
5. **Verify**: cross-check for consistency across items
6. **Quality gate**: all items processed, overall quality threshold met

### Work Queue (every skill)

Every skill maintains a work queue:

```
WORK QUEUE:
  [✅] item-1: completed
  [✅] item-2: completed
  [🔄] item-3: in progress (retry 1/3)
  [⬜] item-4: pending
  [⬜] item-5: pending

PROGRESS: 2/5 (40%)
```

### Quality Gate (every skill)

Every skill defines a quality gate that must pass before stopping:

- **engineering-critique**: 100% files reviewed, 0 Critical findings unresolved
- **qa**: 100% flows tested, 0 blocking bugs open
- **copywriting**: all sections written, brand voice check passed
- **test-coverage**: coverage gap analysis complete, tests written for all P0 gaps
- etc.

---

## Employee Upgrade Status

### Tier 1 — Critical Quality Gates

| #   | Skill                  | Status  | Version             |
| --- | ---------------------- | ------- | ------------------- |
| 1   | `engineering-critique` | ✅ DONE | v3.0.0 (loop+graph) |
| 2   | `review`               | ✅ DONE | v2.0.0 (loop+graph) |
| 3   | `qa`                   | ✅ DONE | v2.0.0 (loop+graph) |
| 4   | `test-coverage`        | ✅ DONE | v2.0.0 (loop)       |
| 5   | `design-critique`      | ✅ DONE | v2.0.0 (loop)       |

### Tier 2 — Content & Marketing

| #   | Skill                | Status  | Version             |
| --- | -------------------- | ------- | ------------------- |
| 6   | `copywriting`        | ✅ DONE | v3.0.0 (loop)       |
| 7   | `content-critique`   | ✅ DONE | v2.0.0 (loop)       |
| 8   | `seo-audit`          | ✅ DONE | v3.0.0 (loop+graph) |
| 9   | `blog-writer`        | ✅ DONE | v2.0.0 (loop)       |
| 10  | `marketing-critique` | ✅ DONE | v2.0.0 (loop)       |

### Tier 3 — Engineering Builders

| #   | Skill              | Status     | Version       |
| --- | ------------------ | ---------- | ------------- |
| 11  | `create-module`    | ✅ DONE    | v2.0.0 (loop) |
| 12  | `create-agent`     | ✅ DONE    | v2.0.0 (loop) |
| 13  | `create-api-route` | ✅ DONE    | v2.0.0 (loop) |
| 14  | `create-migration` | ✅ DONE    | v2.0.0 (loop) |
| 15  | `tdd`              | ⬜ Pending | —             |

### Tier 4 — Product & Strategy

| #   | Skill              | Status     | Version       |
| --- | ------------------ | ---------- | ------------- |
| 16  | `product-critique` | ✅ DONE    | v2.0.0 (loop) |
| 17  | `product-reviewer` | ✅ DONE    | v2.0.0 (loop) |
| 18  | `grill-with-docs`  | ⬜ Pending | —             |
| 19  | `office-hours`     | ⬜ Pending | —             |
| 25  | `brainstorming`    | ✅ DONE    | v2.0.0 (loop) |

### Tier 5 — Operations & Meta

| #   | Skill                | Status  | Version             |
| --- | -------------------- | ------- | ------------------- |
| 20  | `eval-runner`        | ✅ DONE | v2.0.0 (loop)       |
| 21  | `cso`                | ✅ DONE | v3.0.0 (loop+graph) |
| 22  | `departmental-audit` | ✅ DONE | v2.0.0 (loop+graph) |
| 23  | `code-review`        | ✅ DONE | v2.0.0 (loop)       |
| 24  | `handoff`            | ✅ DONE | v2.0.0 (loop)       |

---

## Implementation Approach

Each skill upgrade follows the same pattern:

1. **Read current SKILL.md** — understand what it does
2. **Add WORK QUEUE section** — define how items are tracked
3. **Add LOOP section** — define the execute→verify→retry cycle
4. **Add QUALITY GATE section** — define when to stop
5. **Add GRAPH section** (if applicable) — define fan-out/fan-in
6. **Add PROGRESS REPORTING** — show what's done vs pending
7. **Add FAILURE RECOVERY** — what happens when something fails
8. **Test the skill** — fire it on real work, verify it loops

---

## Research Sources

- Anthropic: "Building Effective Agents" — 5 workflow patterns (chaining, routing, parallelization, orchestrator-workers, evaluator-optimizer)
- Anthropic: "Effective Context Engineering for AI Agents" — compaction, progressive disclosure, just-in-time context
- LangGraph: Graph engineering — nodes, edges, state, fan-out/fan-in, conditional routing, checkpointing
- Claude Code: Loop engineering — think→act→observe→repeat, task verifier, budget guard
- Agentic Loops Guide (2026): 10 loop types including ReAct, Reflexion, evaluator-optimizer

---

## Execution Order

Start with employee #1 (engineering-critique) ✅, then #2 (review) ✅, then continue with remaining Tier 1 skills.

Each employee takes ~15-30 minutes to upgrade. With 23 remaining priority employees, that's ~6-10 hours of work.

**Recommended session plan:**

- Session 1 (DONE): engineering-critique ✅ + review ✅ + qa ✅ + test-coverage ✅ + design-critique ✅ — TIER 1 COMPLETE
- Session 2: Tier 2 (copywriting, content-critique, seo-audit, marketing-critique)
- Session 3: copywriting + content-critique + seo-audit + marketing-critique (Tier 2)
- Session 4: create-module + create-agent + create-api-route + create-migration + tdd (Tier 3)
- Session 5: product-critique + product-reviewer + grill-with-docs + office-hours (Tier 4)
- Session 6: eval-runner + cso + departmental-audit + code-review + handoff (Tier 5)
