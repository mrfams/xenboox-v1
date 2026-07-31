import { describe, it, expect } from "vitest";
import {
  mapPipelineResultToLiveness,
  type PipelineResultInput,
  type LivenessDeptStatus,
} from "@/lib/cfo-liveness";

// ─── Fixture helpers ────────────────────────────────────────────────────

function makePipeline(
  overrides: Partial<PipelineResultInput> = {},
): PipelineResultInput {
  return {
    response: "All departments processed.",
    decision: { action: "proceed", reason: "All within threshold" },
    summaries: [
      {
        agentId: "controller",
        department: "controller",
        status: "clean",
        headline: "Trial balance confirmed",
        confidence: 0.95,
        supportingDataRef: null,
        escalations: [],
      },
      {
        agentId: "treasury",
        department: "treasury",
        status: "clean",
        headline: "Cash at bank GMD 52,000",
        confidence: 0.88,
        supportingDataRef: null,
        escalations: [],
      },
    ],
    auditEntry: {
      agentId: "cfo-agent",
      action: "routing_auto",
      timestamp: "2026-07-31T09:00:00.000Z",
      confidence: 0.9,
    },
    stepTelemetry: [
      {
        step: "intent_resolution",
        label: "Intent & Context Resolution",
        status: "completed",
        durationMs: 12,
      },
      {
        step: "response_synthesis",
        label: "Response Synthesis",
        status: "completed",
        durationMs: 4,
      },
    ],
    durationMs: 240,
    ...overrides,
  };
}

// ─── Liveness State Mapping ─────────────────────────────────────────────

describe("mapPipelineResultToLiveness — state machine mapping", () => {
  it("maps a 'proceed' decision to RESPONDING (terminal for an instruction)", () => {
    const payload = mapPipelineResultToLiveness(makePipeline());
    expect(payload.livenessState).toBe("RESPONDING");
  });

  it("maps an 'escalate_to_human' decision to PRESENTED_TO_HUMAN", () => {
    const pipeline = makePipeline({
      decision: {
        action: "escalate_to_human",
        reason: "Treasury below threshold",
        escalationItems: [
          {
            id: "esc-1",
            what: "treasury report flagged",
            why: "Confidence 0.55 below threshold 0.80",
            whichAgent: "treasury",
            confidence: 0.55,
            amount: null,
            recommendedAction: "Review treasury output",
          },
        ],
      },
    });
    const payload = mapPipelineResultToLiveness(pipeline);
    expect(payload.livenessState).toBe("PRESENTED_TO_HUMAN");
    expect(payload.decision).toBe("escalate_to_human");
  });

  it("records routedDepartments from the summaries in routing order", () => {
    const payload = mapPipelineResultToLiveness(makePipeline());
    expect(payload.routedDepartments).toEqual(["controller", "treasury"]);
  });
});

// ─── Department Response Mapping ────────────────────────────────────────

describe("mapPipelineResultToLiveness — department responses", () => {
  it("maps a clean summary to a 'received' response with display name and headline", () => {
    const payload = mapPipelineResultToLiveness(makePipeline());
    const controller = payload.departmentResponses.find(
      (r) => r.department === "controller",
    );
    expect(controller).toBeDefined();
    expect(controller!.status).toBe("received");
    expect(controller!.displayName).toBe("Controller");
    expect(controller!.headline).toBe("Trial balance confirmed");
    expect(controller!.confidence).toBe(0.95);
  });

  it("maps a blocked summary to an 'error' response", () => {
    const pipeline = makePipeline({
      summaries: [
        {
          agentId: "compliance",
          department: "compliance",
          status: "blocked",
          headline: "Blocked: filing package incomplete",
          confidence: 0.4,
          supportingDataRef: null,
          escalations: [],
        },
      ],
    });
    const payload = mapPipelineResultToLiveness(pipeline);
    expect(payload.departmentResponses[0].status as LivenessDeptStatus).toBe(
      "error",
    );
  });

  it("maps a flagged summary to a 'received' response carrying its escalations", () => {
    const pipeline = makePipeline({
      summaries: [
        {
          agentId: "treasury",
          department: "treasury",
          status: "flagged",
          headline: "Cash position lower than expected",
          confidence: 0.72,
          supportingDataRef: null,
          escalations: [
            {
              severity: "warning",
              description: "Cash position GMD 2,000 below month-end typical",
            },
          ],
        },
      ],
    });
    const payload = mapPipelineResultToLiveness(pipeline);
    const treasury = payload.departmentResponses.find(
      (r) => r.department === "treasury",
    );
    expect(treasury!.status).toBe("received");
    expect(treasury!.escalations).toHaveLength(1);
    expect(treasury!.escalations[0].description).toContain("2,000 below");
  });
});

// ─── Source Refs (Traceable Claims) ─────────────────────────────────────

describe("mapPipelineResultToLiveness — source refs (traceable claims)", () => {
  it("creates a source ref for every non-blocked department summary", () => {
    const payload = mapPipelineResultToLiveness(makePipeline());
    expect(payload.sourceRefs.length).toBe(2);
    expect(payload.sourceRefs[0].sourceDepartment).toBe("controller");
    expect(payload.sourceRefs[0].claim).toContain("Trial balance");
    expect(payload.sourceRefs[0].confidence).toBe(0.95);
  });

  it("does not create source refs for blocked departments (no claim to trust)", () => {
    const pipeline = makePipeline({
      summaries: [
        {
          agentId: "controller",
          department: "controller",
          status: "blocked",
          headline: "Blocked: no data",
          confidence: 0.3,
          supportingDataRef: null,
          escalations: [],
        },
      ],
    });
    const payload = mapPipelineResultToLiveness(pipeline);
    expect(payload.sourceRefs).toEqual([]);
  });
});

// ─── Conflicts ──────────────────────────────────────────────────────────

describe("mapPipelineResultToLiveness — conflicts", () => {
  it("maps the orchestrator conflict summary to a side-by-side conflict entry", () => {
    const pipeline = makePipeline({
      summaries: [
        ...makePipeline().summaries,
        {
          agentId: "cfo-agent",
          department: "orchestrator",
          status: "flagged",
          headline: "Conflicting outputs between: treasury, controller",
          confidence: 0.5,
          supportingDataRef: null,
          escalations: [
            {
              severity: "warning",
              description:
                "Treasury reports GMD 52,000 but Controller reports GMD 49,000",
            },
          ],
        },
      ],
    });
    const payload = mapPipelineResultToLiveness(pipeline);
    expect(payload.conflicts).toHaveLength(1);
    expect(payload.conflicts[0].agents).toEqual(["treasury", "controller"]);
    expect(payload.conflicts[0].description).toContain("52,000");
  });

  it("leaves conflicts empty when no orchestrator summary exists", () => {
    const payload = mapPipelineResultToLiveness(makePipeline());
    expect(payload.conflicts).toEqual([]);
  });
});

// ─── Escalations ────────────────────────────────────────────────────────

describe("mapPipelineResultToLiveness — escalations", () => {
  it("carries escalation items with the triggering agent and why", () => {
    const pipeline = makePipeline({
      decision: {
        action: "escalate_to_human",
        reason: "item below threshold",
        escalationItems: [
          {
            id: "esc-9",
            what: "compliance blocked",
            why: "Blocked status: filing missing",
            whichAgent: "compliance",
            confidence: 0.35,
            amount: null,
            recommendedAction: "Unblock compliance",
          },
        ],
      },
    });
    const payload = mapPipelineResultToLiveness(pipeline);
    expect(payload.escalations).toHaveLength(1);
    expect(payload.escalations[0].whichAgent).toBe("compliance");
    expect(payload.escalations[0].why).toContain("filing missing");
    expect(payload.escalations[0].recommendedAction).toContain("Unblock");
  });
});

// ─── Steps, Audit, Duration ─────────────────────────────────────────────

describe("mapPipelineResultToLiveness — steps / audit / duration", () => {
  it("maps step telemetry into a liveness step feed", () => {
    const payload = mapPipelineResultToLiveness(makePipeline());
    expect(payload.steps).toHaveLength(2);
    expect(payload.steps[0].label).toBe("Intent & Context Resolution");
    expect(payload.steps[0].status).toBe("completed");
  });

  it("passes through audit entry identity and duration", () => {
    const payload = mapPipelineResultToLiveness(makePipeline());
    // Fixture always provides auditEntry, so audit is guaranteed non-null
    expect(payload.audit!.agentId).toBe("cfo-agent");
    expect(payload.audit!.action).toBe("routing_auto");
    expect(payload.durationMs).toBe(240);
  });

  it("computes overall confidence as the average across summaries", () => {
    const payload = mapPipelineResultToLiveness(makePipeline());
    expect(payload.overallConfidence).toBeCloseTo((0.95 + 0.88) / 2, 5);
  });

  it("returns zero overall confidence for an empty summary list", () => {
    const payload = mapPipelineResultToLiveness(
      makePipeline({ summaries: [] }),
    );
    expect(payload.overallConfidence).toBe(0);
    expect(payload.departmentResponses).toEqual([]);
  });
});
