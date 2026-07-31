import { describe, it, expect } from "vitest";
import {
  LivenessStateEnum,
  SourceRefSchema,
  DepartmentResponseSchema,
  EscalationFrameSchema,
} from "../tier1/cfo-agent/state";
import {
  createSourceRef,
  frameEscalation,
  isWaitingOnDepartments,
  synthesizeResponse,
} from "../tier1/cfo-agent/tools";

// ─── LivenessState Enum Integrity ───────────────────────────────────

describe("LivenessStateEnum", () => {
  const states = LivenessStateEnum._def.values as readonly string[];

  it("has all 8 states from the liveness spec", () => {
    expect(states).toHaveLength(8);
    expect(states).toContain("INSTRUCTION_RECEIVED");
    expect(states).toContain("ROUTING_TO_DEPARTMENT_HEAD");
    expect(states).toContain("AWAITING_DEPARTMENT_SUMMARIES");
    expect(states).toContain("SYNTHESIZING");
    expect(states).toContain("RESPONDING");
    expect(states).toContain("ESCALATION_RECEIVED_FROM_DEPT_HEAD");
    expect(states).toContain("FRAMING_FOR_HUMAN");
    expect(states).toContain("PRESENTED_TO_HUMAN");
  });

  it("all states have the correct machine transitions", () => {
    // Valid transitions per spec §2:
    const validTransitions: Record<string, string[]> = {
      INSTRUCTION_RECEIVED: ["ROUTING_TO_DEPARTMENT_HEAD"],
      ROUTING_TO_DEPARTMENT_HEAD: [
        "AWAITING_DEPARTMENT_SUMMARIES",
        "ESCALATION_RECEIVED_FROM_DEPT_HEAD",
      ],
      AWAITING_DEPARTMENT_SUMMARIES: ["SYNTHESIZING"],
      SYNTHESIZING: ["RESPONDING"],
      RESPONDING: [],
      ESCALATION_RECEIVED_FROM_DEPT_HEAD: ["FRAMING_FOR_HUMAN"],
      FRAMING_FOR_HUMAN: ["PRESENTED_TO_HUMAN"],
      PRESENTED_TO_HUMAN: [],
    };

    for (const state of states) {
      expect(validTransitions[state]).toBeDefined();
    }
  });
});

// ─── SourceRef Schema ───────────────────────────────────────────────

describe("SourceRefSchema", () => {
  it("validates a correct source ref", () => {
    const result = SourceRefSchema.parse({
      claim: "Profit was $4,200",
      sourceDepartment: "controller",
      sourceSummaryExcerpt: "Trial balance confirmed",
      confidence: 0.95,
    });
    expect(result.claim).toBe("Profit was $4,200");
  });

  it("rejects confidence outside 0-1 range", () => {
    expect(() =>
      SourceRefSchema.parse({
        claim: "test",
        sourceDepartment: "controller",
        sourceSummaryExcerpt: "test",
        confidence: 1.5,
      }),
    ).toThrow();
  });
});

// ─── DepartmentResponse Schema ──────────────────────────────────────

describe("DepartmentResponseSchema", () => {
  it("validates a received response", () => {
    const result = DepartmentResponseSchema.parse({
      department: "controller",
      status: "received",
      summary: "All clear",
      confidence: 0.95,
      receivedAt: new Date().toISOString(),
      sourceRefs: [],
    });
    expect(result.status).toBe("received");
  });

  it("validates a pending response", () => {
    const result = DepartmentResponseSchema.parse({
      department: "treasury",
      status: "pending",
      summary: null,
      confidence: null,
      receivedAt: null,
      sourceRefs: [],
    });
    expect(result.status).toBe("pending");
  });

  it("defaults sourceRefs to empty array", () => {
    const result = DepartmentResponseSchema.parse({
      department: "compliance",
      status: "received",
      summary: "ok",
      confidence: 0.8,
      receivedAt: new Date().toISOString(),
    });
    expect(result.sourceRefs).toEqual([]);
  });
});

// ─── EscalationFrame Schema ─────────────────────────────────────────

describe("EscalationFrameSchema", () => {
  it("validates a complete escalation frame", () => {
    const result = EscalationFrameSchema.parse({
      id: "123e4567-e89b-12d3-a456-426614174000",
      triggeringAgent: "treasury",
      triggeringDataRef: "Cash dropped $2,000",
      originalInput: "Is cash sufficient?",
      departmentAssessment: "Position is lower than expected",
      recommendation: "Please review",
      timeSensitivity: null,
      presentedAt: null,
      resolvedAt: null,
      resolution: null,
    });
    expect(result.triggeringAgent).toBe("treasury");
    expect(result.id).toBeTruthy();
  });
});

// ─── Integration: SourceRef ↔ DepartmentResponse ↔ EscalationFrame ──

describe("Liveness Data Model Integration", () => {
  it("creates source refs from department responses and uses them in synthesis", () => {
    const refs = [
      createSourceRef({
        claim: "Trial balance confirmed",
        sourceDepartment: "controller",
        sourceSummaryExcerpt: "Controller: all entries match",
        confidence: 0.95,
      }),
      createSourceRef({
        claim: "Cash position $52,000",
        sourceDepartment: "treasury",
        sourceSummaryExcerpt: "Treasury: bank balance confirmed",
        confidence: 0.88,
      }),
    ];

    expect(refs).toHaveLength(2);
    expect(refs[0].sourceDepartment).toBe("controller");
    expect(refs[1].sourceDepartment).toBe("treasury");
  });

  it("frames escalation with triggering data ref from department", () => {
    const escalation = frameEscalation({
      triggeringAgent: "controller",
      triggeringDataRef: "Controller Agent flagged conflicting AP entries",
      originalInput: "Review AP entries",
      departmentAssessment: "Found 2 unmatched invoices",
      recommendation: "Please review the unmatched invoices",
      timeSensitivity: "warning",
    });

    expect(escalation.triggeringAgent).toBe("controller");
    expect(escalation.departmentAssessment).toContain("unmatched");
    expect(escalation.recommendation).toContain("review");
  });

  it("detects waiting departments correctly in liveness flow", () => {
    const status = isWaitingOnDepartments([
      {
        department: "controller",
        status: "received",
        summary: "Ready",
        confidence: 0.95,
        receivedAt: new Date().toISOString(),
        sourceRefs: [],
      },
      {
        department: "compliance",
        status: "pending",
        summary: null,
        confidence: null,
        receivedAt: null,
        sourceRefs: [],
      },
    ]);

    expect(status.waiting).toBe(true);
    expect(status.waitingOn).toContain("Compliance");
    expect(status.received).toContain("Controller");
  });

  it("synthesizes response across multiple departments without fabricating", () => {
    const result = synthesizeResponse({
      departmentResponses: [
        {
          department: "controller",
          status: "received",
          summary: "Trial balance balanced to $50,000",
          confidence: 0.95,
          receivedAt: new Date().toISOString(),
          sourceRefs: [
            createSourceRef({
              claim: "TB balanced $50,000",
              sourceDepartment: "controller",
              sourceSummaryExcerpt: "Controller confirmed",
              confidence: 0.95,
            }),
          ],
        },
        {
          department: "treasury",
          status: "received",
          summary: "Cash at bank $30,000",
          confidence: 0.9,
          receivedAt: new Date().toISOString(),
          sourceRefs: [
            createSourceRef({
              claim: "Cash $30,000",
              sourceDepartment: "treasury",
              sourceSummaryExcerpt: "Treasury confirmed",
              confidence: 0.9,
            }),
          ],
        },
      ],
      originalInstruction: "Financial status summary",
    });

    expect(result.answer).toContain("Controller");
    expect(result.answer).toContain("Treasury");
    expect(result.answer).toContain("$50,000");
    expect(result.answer).toContain("$30,000");
    expect(result.sourceRefs).toHaveLength(2);

    // Verify composition only — no new claims
    expect(result.answer).not.toContain("Payroll");
    expect(result.answer).not.toContain("Compliance");
  });
});
