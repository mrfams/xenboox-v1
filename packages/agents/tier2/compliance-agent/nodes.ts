import { langfuse } from "../../core/langfuse";
import { createAuditEntry } from "../../core/state";
import { getAgentGraph } from "../../core/orchestrator";
import type { AgentState } from "../../core/orchestrator";
import {
  reviewTaxPosition,
  checkFilingStatus,
  monitorDeadlines,
  reviewTaxAgentOutput,
  detectRuleChanges,
  confirmRuleUpdate,
  reportRegulatoryStatus,
} from "./tools";
import type { ComplianceStateType } from "./state";

export async function nodeParseInput(state: ComplianceStateType) {
  const trace = await langfuse.trace({
    name: "compliance-parse-input",
    metadata: { entityId: state.entityId },
  });

  await trace.update({
    output: { operationType: state.currentOperation?.type },
  });

  return {
    confidence: 0,
    reasoning: `Operation ${state.currentOperation?.type ?? "unknown"} received`,
  };
}

export async function nodeReviewTaxPosition(state: ComplianceStateType) {
  const trace = await langfuse.span({ name: "compliance-tax-review" });

  try {
    const taxInfo = await reviewTaxPosition(state.entityId);

    await trace.update({
      output: {
        hasTaxEntries: taxInfo.hasTaxEntries,
        accountCount: taxInfo.taxAccounts.length,
      },
    });

    return {
      result: {
        type: "tax_review",
        hasTaxEntries: taxInfo.hasTaxEntries,
        taxAccounts: taxInfo.taxAccounts,
      },
      confidence: 0.9,
      reasoning: taxInfo.hasTaxEntries
        ? `Found ${taxInfo.taxAccounts.length} tax-related accounts`
        : "No tax accounts found in chart of accounts",
      auditTrail: [
        createAuditEntry({
          agentId: "compliance-agent",
          action: "tax_review",
          details: {
            hasTaxEntries: taxInfo.hasTaxEntries,
            accountCount: taxInfo.taxAccounts.length,
          },
          confidence: 0.9,
        }),
      ],
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { errors: [`Tax review error: ${msg}`], confidence: 0.0 };
  }
}

export async function nodeCheckFilingStatus(state: ComplianceStateType) {
  const trace = await langfuse.span({ name: "compliance-filing-status" });

  try {
    const status = await checkFilingStatus(state.entityId);

    await trace.update({ output: status });

    return {
      filingStatus: status,
      confidence: 0.85,
      reasoning: `Filing status: VAT=${status.vat}, Income Tax=${status.incomeTax}, Payroll=${status.payroll}`,
      auditTrail: [
        createAuditEntry({
          agentId: "compliance-agent",
          action: "filing_status_checked",
          details: status as unknown as Record<string, unknown>,
          confidence: 0.85,
        }),
      ],
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { errors: [`Filing status error: ${msg}`], confidence: 0.0 };
  }
}

export async function nodeCloseConfirmation(state: ComplianceStateType) {
  const trace = await langfuse.span({ name: "compliance-close" });

  const allCurrent = state.filingStatus
    ? state.filingStatus.vat !== "overdue" &&
      state.filingStatus.incomeTax !== "overdue" &&
      state.filingStatus.payroll !== "overdue"
    : false;

  await trace.update({
    output: { confirmed: allCurrent, filingStatus: state.filingStatus },
  });

  return {
    result: {
      type: "close_confirmation",
      domain: "compliance",
      confirmed: allCurrent,
      filingStatus: state.filingStatus,
    },
    confidence: allCurrent ? 0.88 : 0.5,
    reasoning: allCurrent
      ? "All filings current — compliance domain confirmed for close"
      : "Filing(s) overdue — compliance domain blocked",
  };
}

export async function nodeMonitorDeadlines(state: ComplianceStateType) {
  const trace = await langfuse.span({ name: "compliance-monitor-deadlines" });

  try {
    const result = await monitorDeadlines(state.entityId);

    await trace.update({
      output: {
        totalDeadlines: result.deadlines.length,
        approaching: result.approachingDeadlines.length,
        critical: result.criticalDeadlines.length,
        overdue: result.overdueDeadlines.length,
        monitoringState: result.monitoringState,
      },
    });

    const urgencyDesc =
      result.criticalDeadlines.length > 0
        ? `${result.criticalDeadlines.length} critical deadline(s)`
        : result.approachingDeadlines.length > 0
          ? `${result.approachingDeadlines.length} approaching deadline(s)`
          : "All deadlines on track";

    return {
      deadlines: result.deadlines,
      deadlineMonitoringState: result.monitoringState,
      confidence: 0.95,
      reasoning: `Deadline monitoring: ${result.deadlines.length} total, ${urgencyDesc}`,
      auditTrail: [
        createAuditEntry({
          agentId: "compliance-agent",
          action: "deadlines_monitored",
          details: {
            total: result.deadlines.length,
            approaching: result.approachingDeadlines.length,
            critical: result.criticalDeadlines.length,
            overdue: result.overdueDeadlines.length,
            status: result.monitoringState.status,
          },
          confidence: 0.95,
        }),
      ],
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { errors: [`Deadline monitoring error: ${msg}`], confidence: 0.0 };
  }
}

export async function nodeReviewTaxAgent(state: ComplianceStateType) {
  const trace = await langfuse.span({ name: "compliance-review-tax-agent" });

  try {
    const deadlineId = state.currentOperation?.input?.deadlineId as
      | string
      | undefined;
    if (!deadlineId) {
      return {
        errors: ["No deadlineId provided for tax agent review"],
        confidence: 0.0,
      };
    }

    const result = await reviewTaxAgentOutput(state.entityId, deadlineId);

    await trace.update({
      output: { passed: result.passed, reason: result.reason },
    });

    return {
      result: {
        type: "tax_agent_review",
        deadlineId,
        passed: result.passed,
        reason: result.reason,
      },
      confidence: result.passed ? 0.9 : 0.5,
      reasoning: result.passed
        ? "Tax Agent output reviewed and passed"
        : `Tax Agent output kicked back: ${result.reason}`,
      auditTrail: [
        createAuditEntry({
          agentId: "compliance-agent",
          action: "tax_agent_reviewed",
          details: { deadlineId, passed: result.passed, reason: result.reason },
          confidence: result.passed ? 0.9 : 0.5,
        }),
      ],
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { errors: [`Tax agent review error: ${msg}`], confidence: 0.0 };
  }
}

export async function nodeDetectRuleChange(state: ComplianceStateType) {
  const trace = await langfuse.span({ name: "compliance-detect-rule-change" });

  try {
    const result = await detectRuleChanges(state.entityId);

    const proposal = result.proposals[0] ?? null;
    const inferredConfidence = proposal?.sourceConfidence ?? null;

    await trace.update({
      output: {
        hasPendingProposals: result.hasPendingProposals,
        proposalCount: result.proposals.length,
      },
    });

    if (proposal && result.hasPendingProposals) {
      return {
        ruleChangeState: {
          status: "rule_update_detected",
          proposal,
        },
        confidence: inferredConfidence ?? 0.8,
        reasoning: `Rule change detected: ${proposal.jurisdiction} ${proposal.ruleName} — source: ${proposal.sourceCitation ?? "unknown"}`,
        auditTrail: [
          createAuditEntry({
            agentId: "compliance-agent",
            action: "rule_change_detected",
            details: {
              jurisdiction: proposal.jurisdiction,
              ruleName: proposal.ruleName,
              sourceCitation: proposal.sourceCitation,
              confidence: inferredConfidence,
            },
            confidence: inferredConfidence ?? 0.8,
          }),
        ],
      };
    }

    return {
      ruleChangeState: { status: "idle", proposal: null },
      confidence: 1.0,
      reasoning: "No pending rule changes detected",
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { errors: [`Rule change detection error: ${msg}`], confidence: 0.0 };
  }
}

export async function nodeRequestHumanReview(state: ComplianceStateType) {
  const trace = await langfuse.span({
    name: "compliance-request-human-review",
  });

  const proposal = state.ruleChangeState?.proposal;
  if (!proposal) {
    return {
      errors: ["No rule change proposal to request review for"],
      confidence: 0.0,
    };
  }

  await trace.update({
    output: {
      proposalId: proposal.id,
      jurisdiction: proposal.jurisdiction,
      ruleName: proposal.ruleName,
    },
  });

  langfuse.event({
    name: "compliance-human-review-requested",
    metadata: {
      proposalId: proposal.id,
      jurisdiction: proposal.jurisdiction,
      ruleName: proposal.ruleName,
      oldValue: proposal.oldValue,
      newValue: proposal.newValue,
      sourceCitation: proposal.sourceCitation,
    },
  });

  return {
    ruleChangeState: {
      status: "human_review_requested",
      proposal,
    },
    result: {
      type: "human_review_requested",
      proposalId: proposal.id,
      jurisdiction: proposal.jurisdiction,
      ruleName: proposal.ruleName,
      oldValue: proposal.oldValue,
      newValue: proposal.newValue,
      sourceCitation: proposal.sourceCitation,
      message: `Please confirm this rule update before it's applied: ${proposal.jurisdiction} ${proposal.ruleName}`,
    },
    confidence: 0.9,
    reasoning: `Human review requested for rule change: ${proposal.jurisdiction} ${proposal.ruleName} — blocking until confirmed`,
    auditTrail: [
      createAuditEntry({
        agentId: "compliance-agent",
        action: "human_review_requested",
        details: {
          proposalId: proposal.id,
          jurisdiction: proposal.jurisdiction,
          ruleName: proposal.ruleName,
        },
        confidence: 0.9,
      }),
    ],
  };
}

export async function nodeApplyRuleUpdate(state: ComplianceStateType) {
  const trace = await langfuse.span({ name: "compliance-apply-rule-update" });

  try {
    const proposal = state.ruleChangeState?.proposal;
    if (!proposal) {
      return { errors: ["No rule change proposal to apply"], confidence: 0.0 };
    }

    await confirmRuleUpdate(proposal.id, "system");

    const oldRate = JSON.stringify(proposal.oldValue);
    const newRate = JSON.stringify(proposal.newValue);

    await trace.update({
      output: {
        proposalId: proposal.id,
        jurisdiction: proposal.jurisdiction,
        ruleName: proposal.ruleName,
        applied: true,
      },
    });

    return {
      ruleChangeState: {
        status: "rule_set_updated",
        proposal: null,
      },
      confidence: 0.95,
      reasoning: `Rule set updated — ${proposal.jurisdiction}, ${proposal.ruleName} (${oldRate} → ${newRate})`,
      auditTrail: [
        createAuditEntry({
          agentId: "compliance-agent",
          action: "rule_set_updated",
          details: {
            proposalId: proposal.id,
            jurisdiction: proposal.jurisdiction,
            ruleName: proposal.ruleName,
            oldValue: proposal.oldValue,
            newValue: proposal.newValue,
          },
          confidence: 0.95,
        }),
      ],
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return {
      errors: [`Rule update application error: ${msg}`],
      confidence: 0.0,
    };
  }
}

export async function nodeReportRegulatoryStatus(state: ComplianceStateType) {
  const trace = await langfuse.span({
    name: "compliance-report-regulatory-status",
  });

  try {
    const status = await reportRegulatoryStatus(state.entityId);

    await trace.update({ output: status });

    return {
      regulatoryStatus: {
        ...status,
        lastReportedAt: new Date().toISOString(),
      },
      result: {
        type: "regulatory_status",
        ...status,
      },
      confidence:
        status.status === "clean"
          ? 0.95
          : status.status === "items_pending"
            ? 0.7
            : 0.4,
      reasoning: `Compliance status: ${status.status} — ${status.summary}`,
      auditTrail: [
        createAuditEntry({
          agentId: "compliance-agent",
          action: "regulatory_status_reported",
          details: status as unknown as Record<string, unknown>,
          confidence: status.status === "clean" ? 0.95 : 0.7,
        }),
      ],
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { errors: [`Regulatory status error: ${msg}`], confidence: 0.0 };
  }
}

// ─── Node: Run Compliance Audit (Phase 6) ────────────────────────────────
// Calls Audit Agent for compliance sampling and drift analysis.

export async function nodeRunComplianceAudit(state: ComplianceStateType) {
  const trace = await langfuse.span({ name: "compliance-run-audit" });

  try {
    const auditGraph = await getAgentGraph("audit");
    const auditState: AgentState = {
      entityId: state.entityId,
      entityName: state.entityName,
      currency: state.currency,
      currentOperation: {
        type: "audit_sampling",
        status: "processing",
        input: {
          period: (state.currentOperation?.input as Record<string, unknown>)
            ?.period,
          scope: "compliance",
        },
        output: null,
        error: null,
      },
    };
    const auditResult = await auditGraph.invoke(auditState);

    langfuse.event({
      name: "compliance-audit-agent-dispatched",
      metadata: {
        confidence: (auditResult as any).confidence ?? 0,
        hasResult: !!(auditResult as any).result,
      },
    });

    await trace.update({
      output: {
        auditCalled: true,
        confidence: (auditResult as any).confidence ?? 0,
      },
    });

    return {
      result: {
        type: "compliance_audit",
        auditResult: (auditResult as any).result,
      },
      confidence: (auditResult as any).confidence ?? 0.8,
      reasoning: "Audit Agent completed compliance sampling",
      auditTrail: [
        createAuditEntry({
          agentId: "compliance-agent",
          action: "audit_dispatched",
          details: {
            auditAgentCalled: true,
            confidence: (auditResult as any).confidence ?? 0,
          },
          confidence: (auditResult as any).confidence ?? 0.8,
        }),
      ],
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    langfuse.event({
      name: "compliance-audit-dispatch-failed",
      metadata: { error: msg },
    });

    await trace.update({
      output: { auditCalled: false, error: msg },
    });

    // Non-fatal: compliance review continues without audit sampling
    return {
      confidence: 0.7,
      reasoning:
        "Audit Agent unavailable — compliance review proceeded without sampling",
    };
  }
}

export async function nodeEscalate(state: ComplianceStateType) {
  langfuse.event({
    name: "compliance-escalation",
    metadata: {
      entityId: state.entityId,
      confidence: state.confidence,
      errors: state.errors,
      reasoning: state.reasoning,
      escalated: true,
    },
  });

  return {
    result: {
      type: "escalation",
      agentId: "compliance-agent",
      confidence: state.confidence,
      reasoning: state.reasoning,
      errors: state.errors,
    },
  };
}
