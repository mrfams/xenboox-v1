# Confidence & Escalation Mechanics

> Implements PRD §6.7 Layer 3 (Confidence Threshold System) and Layer 4 (Human in the Loop) as an actual working system, not an aspiration. Every agent spec references this doc instead of redefining confidence per-agent.

---

## 1. Why This Doc Exists

The PRD says: _"Every agent output carries a confidence score. Below threshold → flag to appropriate superior agent or human. Never guess silently on anything material."_

That's a promise, not a mechanism. This doc defines the mechanism so it's implemented consistently across 19 agents instead of 19 slightly different half-versions.

---

## 2. The Confidence Score

### 2.1 Scale

Every scoreable agent output carries a confidence score from **0.0 to 1.0**, computed as part of the agent's response (structured output field, not prose the model happens to mention).

- **1.0** — exact match to a deterministic rule or unambiguous data (e.g. bank statement line item matches ledger entry on amount + date + reference number, exact)
- **0.9–0.99** — strong precedent match (near-identical case exists in golden dataset / historical pattern for this entity), no conflicting signals
- **0.75–0.89** — reasonable inference, some ambiguity, no strong precedent but no red flags either
- **0.5–0.74** — meaningful ambiguity or missing data; agent can produce an answer but multiple interpretations are plausible
- **< 0.5** — agent cannot produce a reliable answer; this is not "low confidence output," this is "no output, escalate immediately"

### 2.2 What Feeds the Score

Not a single LLM self-report (self-reported confidence from LLMs is notoriously uncalibrated). The score is a **composite** of:

| Signal                | How it's computed                                                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Precedent match       | Similarity to golden dataset / historical entity data — computed programmatically, not by the model guessing                                      |
| Data completeness     | Are all required fields present and well-formed? (deterministic check, not model judgment)                                                        |
| Rule conflicts        | Does the deterministic rule layer (Layer 1) flag any violation? If yes, score is forced below escalation threshold regardless of model confidence |
| Model self-assessment | The LLM's own stated confidence — used as one input, never the sole input                                                                         |

**Rule: deterministic signals override model self-assessment.** If Layer 1 rule checks fail, confidence is forced low regardless of what the model says. The model does not get to talk its way past a broken double-entry check.

### 2.3 Calibration Requirement

Confidence scores are meaningless unless calibrated — an agent claiming 0.9 confidence should be right ~90% of the time on that class of decision. Calibration is checked in the eval harness (see `EVAL_HARNESS_SPEC.md` §4) by comparing stated confidence against golden dataset outcomes. An agent that is overconfident (high score, frequently wrong) fails eval regardless of raw accuracy.

---

## 3. Escalation Thresholds

Thresholds are **per-agent, set in each agent's spec (§9 Escalation Triggers)**, not global — a Ledger Agent posting a routine journal entry needs a different bar than a Tax Agent computing a VAT filing. But all thresholds must be chosen from this shared vocabulary so behavior is predictable across the system:

| Threshold tier       | Confidence range | Default behavior                                                                                                           |
| -------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Auto-proceed         | ≥ 0.9            | Agent acts, logs decision + confidence to audit trail, no interruption                                                     |
| Proceed + flag       | 0.75–0.89        | Agent acts, but flags to superior agent for async review (non-blocking)                                                    |
| Hold for review      | 0.5–0.74         | Agent does NOT act. Queues for superior agent or human review before proceeding                                            |
| Escalate immediately | < 0.5            | Agent stops, no action taken, immediate escalation — treated as "agent cannot handle this," not "agent has a weak opinion" |

Any agent spec that wants a different default (e.g. Payroll — errors are high-stakes and personal, so thresholds should be stricter) must state the deviation explicitly and justify it in §9 of that agent's spec.

**Material transactions get a hard override**: regardless of confidence, any transaction above the org's configured dollar threshold (PRD §21 — undecided, TBD from beta feedback) always requires human approval before posting. Confidence affects _how fast_ something moves through review, never whether human review is skippable for material amounts.

---

## 4. Escalation Types

Every escalation trigger in an agent spec must declare one of these three types — not "flag it somehow":

| Type       | Meaning                                                                                                                      | Blocks execution? |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| **Notify** | Informational — superior agent or human is told, no action required from them                                                | No                |
| **Flag**   | Added to a review queue, visible in dashboard/agent activity feed, needs eventual sign-off but doesn't block downstream work | No (usually)      |
| **Block**  | Agent halts this specific action pending resolution — nothing downstream proceeds until resolved                             | Yes               |

Example: Reconciliation Agent finding one unmatched $12 transaction → **flag**. Reconciliation Agent asked to close a period with unresolved items → **block** (per PRD §6.4 Treasury Agent: "never closes a reconciliation with unresolved items" — this is a hard block, not a flag).

---

## 5. Escalation Path

Escalations always follow the hierarchy — no agent skips a tier:

```
Worker Agent → Management Agent (Controller / Treasury / Payroll Manager / Compliance)
Management Agent → CFO Agent
CFO Agent → Human
```

Exception: **Layer 1 deterministic rule violations** (e.g. debits ≠ credits) escalate directly and immediately regardless of tier — these are not judgment calls, they are hard stops, and every tier in the chain is notified simultaneously so nothing quietly waits in a queue.

Every escalation, regardless of path, is logged to the audit trail with: what, why, which agent, confidence score, timestamp (PRD §6.7 Layer 4).

---

## 6. Disagreement Between Agents

Per PRD §6.7 Layer 2: "Disagreements between agents trigger escalation not coin-flip."

Mechanism:

1. If two agents produce conflicting outputs on the same transaction/data (e.g. AP Agent categorizes an expense one way, Controller Agent's review disagrees), the conflict is **not resolved by either agent's confidence score alone**.
2. It escalates one tier above both agents (or to CFO Agent if one of the disagreeing agents is already Tier 2).
3. The escalation record includes both agents' reasoning and confidence scores side by side.
4. Resolution is logged as a golden dataset candidate — disagreements are exactly the cases that should get added to eval data, since they represent genuine ambiguity the system needs to learn to handle consistently.

---

## 7. What "Never Guess Silently" Means Operationally

This is the line the PRD draws that must not be violated by convenience. Concretely:

- An agent must never emit a final, un-flagged output when its composite confidence is below its "auto-proceed" threshold.
- An agent must never suppress a Layer 1 rule failure to keep a workflow moving.
- An agent must never average/round a low-confidence score upward to avoid triggering escalation (this is checked in eval — see calibration requirement above).
- If an agent literally cannot compute a confidence score (e.g. missing data prevents any assessment), that itself is treated as < 0.5 and escalates.

---

## 8. Open Questions

- Exact dollar threshold for mandatory human approval — PRD §21, not yet decided, needs beta user input.
- Whether calibration drift (agent becoming overconfident over time as it processes more real data) needs a live monitoring alert vs. only being caught at eval/regression time. Leaning toward: needs both, but live monitoring is Phase 2 — MVP relies on eval-time calibration checks.
- Per-agent threshold deviations from the default tiers in §3 — will surface as each agent spec gets written; track here as they're decided so this doc stays the source of truth for the _pattern_, even though specifics live in individual specs.
