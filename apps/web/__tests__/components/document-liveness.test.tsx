import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { DocumentLiveness } from "@/components/agents/document-liveness";

describe("DocumentLiveness v1.0 — Spec-Compliant", () => {
  // ── Happy Path: Active Ingestion Pipeline ──────────────────────────

  it("renders the agent name and role in the header", () => {
    render(<DocumentLiveness />);
    // "Document Agent" also appears in the cross-agent chain chip, so scope to the heading.
    expect(
      screen.getByRole("heading", { name: "Document Agent" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Universal ingestion/i)).toBeInTheDocument();
  });

  it("renders pipeline stages in correct order: DETECTED → CLASSIFYING → EXTRACTING → LINKING → ROUTING → DONE", () => {
    render(<DocumentLiveness />);
    expect(screen.getByText("Document State Machine")).toBeInTheDocument();
    const stages = screen.getAllByRole("listitem");
    const stageLabels = stages.map((el) => el.textContent);
    const detectedIdx = stageLabels.findIndex((t) => t?.includes("DETECTED"));
    const classifyingIdx = stageLabels.findIndex((t) =>
      t?.includes("CLASSIFYING"),
    );
    const extractingIdx = stageLabels.findIndex((t) =>
      t?.includes("EXTRACTING"),
    );
    const linkingIdx = stageLabels.findIndex((t) => t?.includes("LINKING"));
    const routingIdx = stageLabels.findIndex((t) => t?.includes("ROUTING"));
    const doneIdx = stageLabels.findIndex((t) => t?.includes("DONE"));

    expect(detectedIdx).toBeLessThan(classifyingIdx);
    expect(classifyingIdx).toBeLessThan(extractingIdx);
    expect(extractingIdx).toBeLessThan(linkingIdx);
    expect(linkingIdx).toBeLessThan(routingIdx);
    expect(routingIdx).toBeLessThan(doneIdx);
  });

  it("shows the current operation status (classifying)", () => {
    render(<DocumentLiveness />);
    const status = screen.getByRole("status");
    expect(status.textContent).toContain("CLASSIFYING");
    expect(status.textContent).toContain("invoice-1042.pdf");
  });

  // ── Detection (Layer 1 deterministic) ──────────────────────────────

  it("shows the detection step with source metadata", () => {
    render(<DocumentLiveness />);
    expect(
      screen.getByText(/New file: invoice-1042\.pdf detected/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/source: web upload/i)).toBeInTheDocument();
  });

  it("does NOT render a confidence meter on the deterministic detection card", () => {
    render(<DocumentLiveness />);
    const detection = screen.getByRole("region", { name: /Detection/i });
    expect(within(detection).queryAllByRole("meter").length).toBe(0);
  });

  // ── Classification (Layer 2 probabilistic) ─────────────────────────

  it("shows the classification result with confidence and basis", () => {
    render(<DocumentLiveness />);
    expect(screen.getByText(/Classified as invoice/i)).toBeInTheDocument();
    expect(screen.getByText(/layout pattern/i)).toBeInTheDocument();
    expect(screen.getByText(/'Invoice #' field/i)).toBeInTheDocument();
  });

  it("renders a confidence meter on the classification step (94%)", () => {
    render(<DocumentLiveness />);
    const classify = screen.getByRole("region", { name: /Classification/i });
    const meters = within(classify).queryAllByRole("meter");
    expect(meters.length).toBe(1);
    expect(meters[0]).toHaveAttribute("aria-valuenow", "94");
  });

  // ── Extraction (Layer 2 probabilistic, per-field) ──────────────────

  it("shows extracted fields against the source document", () => {
    render(<DocumentLiveness />);
    expect(screen.getByText("Acme Supplies")).toBeInTheDocument();
    expect(screen.getByText("GMD 1,240.00")).toBeInTheDocument();
    expect(screen.getByText("Jun 14, 2026")).toBeInTheDocument();
    expect(screen.getByText("INV-4471")).toBeInTheDocument();
  });

  it("renders per-field confidence meters for every extracted field", () => {
    render(<DocumentLiveness />);
    const extract = screen.getByRole("region", { name: /Field Extraction/i });
    const meters = within(extract).queryAllByRole("meter");
    expect(meters.length).toBe(4);
  });

  it("shows per-field confidence values (96% vendor, 91% amount, 88% date, 97% invoice)", () => {
    render(<DocumentLiveness />);
    const mentions = screen.getAllByText(/96%/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/91%/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/88%/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/97%/).length).toBeGreaterThanOrEqual(1);
  });

  it("renders exactly 5 confidence meters total (1 classification + 4 per-field extraction)", () => {
    render(<DocumentLiveness />);
    const meters = screen.queryAllByRole("meter");
    expect(meters.length).toBe(5);
  });

  it("does NOT render a summary 'Agent Confidence' aggregate", () => {
    render(<DocumentLiveness />);
    expect(screen.queryByText(/Agent Confidence/i)).not.toBeInTheDocument();
  });

  // ── Linking (structural) ───────────────────────────────────────────

  it("shows link status pending until downstream agent confirms", () => {
    render(<DocumentLiveness />);
    expect(screen.getByText(/Link pending/i)).toBeInTheDocument();
    // "downstream agent" also appears in the cross-agent footer note.
    expect(
      screen.getAllByText(/downstream agent/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("does NOT render a confidence meter on the deterministic linking card", () => {
    render(<DocumentLiveness />);
    const link = screen.getByRole("region", { name: /Link/i });
    expect(within(link).queryAllByRole("meter").length).toBe(0);
  });

  // ── Routing (structural) ───────────────────────────────────────────

  it("shows the routing decision to the downstream agent", () => {
    render(<DocumentLiveness />);
    expect(screen.getByText(/Routed to AP Agent/i)).toBeInTheDocument();
    expect(screen.getByText(/invoice processing/i)).toBeInTheDocument();
  });

  it("shows entity information", () => {
    render(<DocumentLiveness />);
    const mentions = screen.getAllByText(/Xenboox/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  // ── Universal Inbox / Surfaces ─────────────────────────────────────

  it("shows the universal surfaces (web, mobile, desktop, email)", () => {
    render(<DocumentLiveness />);
    const mentions = screen.getAllByText(/web|mobile|desktop|email/i);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("shows source metadata and retention policy in the status grid", () => {
    render(<DocumentLiveness />);
    expect(screen.getByText(/Retention/i)).toBeInTheDocument();
    expect(screen.getByText(/7 years/i)).toBeInTheDocument();
  });

  // ── "Why" Explanation ──────────────────────────────────────────────

  it("shows the classification reasoning sentence", () => {
    render(<DocumentLiveness />);
    expect(
      screen.getByText(/94% confidence, based on layout pattern/i),
    ).toBeInTheDocument();
  });

  // ── How It Works ───────────────────────────────────────────────────

  it("shows the 'how it works' decomposition toggle", () => {
    render(<DocumentLiveness />);
    const mentions = screen.getAllByText(/How It Works/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("reveals step details when 'How It Works' is clicked", () => {
    render(<DocumentLiveness />);
    const toggle = screen.getByText(/How It Works — Step-by-Step/i);
    fireEvent.click(toggle);
    // Note: /Detect/ also matches the "Detection" region heading and /Route/
    // matches "Routed to AP Agent", so use getAllByText for those two.
    expect(screen.getAllByText(/Detect/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Classify Type/)).toBeInTheDocument();
    expect(screen.getByText(/Extract Fields/)).toBeInTheDocument();
    expect(screen.getByText(/Link to Transaction/)).toBeInTheDocument();
    expect(screen.getAllByText(/Route/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Confirm Done/)).toBeInTheDocument();
  });

  it("shows 'No confidence score' notes on deterministic steps in How It Works", () => {
    render(<DocumentLiveness />);
    fireEvent.click(screen.getByText(/How It Works — Step-by-Step/i));
    expect(
      screen.getAllByText(/No confidence score/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  // ── Constraint Enforcement ─────────────────────────────────────────

  it("shows constraint enforcement badges", () => {
    render(<DocumentLiveness />);
    expect(
      screen.getByRole("region", { name: /Constraint Enforcement/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Classify With Confidence")).toBeInTheDocument();
    expect(screen.getByText("No Silent Default")).toBeInTheDocument();
    // "Bidirectional Link" also appears as the link-card heading in the main view.
    expect(
      screen.getAllByText("Bidirectional Link").length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Never Silently Dropped")).toBeInTheDocument();
    expect(screen.getByText("Duplicate Detection")).toBeInTheDocument();
  });

  // ── Critical Rule: No Silent Default ───────────────────────────────

  it("surfaces the no-silent-default critical rule in the main view", () => {
    render(<DocumentLiveness />);
    const mentions = screen.getAllByText(/flagged for human confirmation/i);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  // ── Audit Trail ────────────────────────────────────────────────────

  it("shows the audit trail section", () => {
    render(<DocumentLiveness />);
    const mentions = screen.getAllByText(/Audit Trail/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("shows audit trail entries with timestamps and state info when expanded", () => {
    render(<DocumentLiveness />);
    const auditToggle = screen.getByText(
      /Audit Trail — Every State Transition/i,
    );
    fireEvent.click(auditToggle);
    const auditRows = screen.getAllByRole("row");
    expect(auditRows.length).toBeGreaterThanOrEqual(7);
  });

  it("logs detection source, classification confidence, and routing in the audit trail", () => {
    render(<DocumentLiveness />);
    fireEvent.click(screen.getByText(/Audit Trail — Every State Transition/i));
    expect(screen.getByText(/0\.94/)).toBeInTheDocument();
    expect(screen.getAllByText(/web upload/i).length).toBeGreaterThanOrEqual(1);
  });

  // ── Cross-Agent Dependencies ───────────────────────────────────────

  it("shows downstream agents fed by Document Agent", () => {
    render(<DocumentLiveness />);
    const mentions = screen.getAllByText(/AP Agent/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Expense Agent/).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(
      screen.getAllByText(/Reconciliation Agent/).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Tax Agent/).length).toBeGreaterThanOrEqual(1);
  });

  // ── Accessibility ──────────────────────────────────────────────────

  it("renders with accessible region roles", () => {
    render(<DocumentLiveness />);
    const regions = screen.getAllByRole("region");
    expect(regions.length).toBeGreaterThanOrEqual(5);
  });

  it("has descriptive aria-labels on confidence meters", () => {
    render(<DocumentLiveness />);
    const meters = screen.getAllByRole("meter");
    meters.forEach((meter) => {
      expect(meter).toHaveAttribute("aria-valuenow");
      expect(meter).toHaveAttribute("aria-valuemin", "0");
      expect(meter).toHaveAttribute("aria-valuemax", "100");
    });
  });

  // ── Edge Cases: Empty State ────────────────────────────────────────

  it("shows 'No documents in inbox' empty state", () => {
    render(<DocumentLiveness showEmptyState />);
    expect(screen.getByText(/No documents in inbox/i)).toBeInTheDocument();
  });

  // ── Edge Cases: Low Classification Confidence (Critical Rule) ──────

  it("flags low classification confidence for human confirmation, never guessed", () => {
    render(<DocumentLiveness showLowConfidence />);
    expect(
      screen.getByText(/Low Classification Confidence/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/52%/)).toBeInTheDocument();
    expect(
      screen.getByText(/could be invoice or receipt/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/What type of document is this\?/i),
    ).toBeInTheDocument();
  });

  it("low-confidence branch is blocking for that document", () => {
    render(<DocumentLiveness showLowConfidence />);
    expect(screen.getByText(/Blocking for that document/i)).toBeInTheDocument();
  });

  it("low-confidence branch renders 0 confidence meters (human decides)", () => {
    render(<DocumentLiveness showLowConfidence />);
    expect(screen.queryAllByRole("meter").length).toBe(0);
  });

  it("low-confidence branch never silently defaults to the most common type", () => {
    render(<DocumentLiveness showLowConfidence />);
    expect(screen.getByText(/never silently default/i)).toBeInTheDocument();
  });

  // ── Edge Cases: Extraction Failure ─────────────────────────────────

  it("shows extraction failure on a critical field with manual entry offer", () => {
    render(<DocumentLiveness showExtractionFailure />);
    expect(screen.getByText(/Extraction Needs Input/i)).toBeInTheDocument();
    expect(screen.getByText(/Couldn't read amount/i)).toBeInTheDocument();
    expect(screen.getByText(/enter manually/i)).toBeInTheDocument();
  });

  it("extraction failure renders 0 confidence meters", () => {
    render(<DocumentLiveness showExtractionFailure />);
    expect(screen.queryAllByRole("meter").length).toBe(0);
  });

  // ── Edge Cases: Unrecognized File Format ───────────────────────────

  it("shows unrecognized file format with alternatives", () => {
    render(<DocumentLiveness showUnrecognized />);
    expect(screen.getByText(/Unrecognized File Format/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Can't process this file type/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/PDF, PNG, JPG/i)).toBeInTheDocument();
  });

  it("unrecognized format renders 0 confidence meters", () => {
    render(<DocumentLiveness showUnrecognized />);
    expect(screen.queryAllByRole("meter").length).toBe(0);
  });

  // ── Edge Cases: Corrupt / Duplicate ────────────────────────────────

  it("shows corrupt files as failed inbox items, never silently dropped", () => {
    render(<DocumentLiveness showCorrupt />);
    // "Corrupt or Unreadable" appears in the branch h2 and the BranchCard body.
    expect(
      screen.getAllByText(/Corrupt or Unreadable/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/never silently dropped/i)).toBeInTheDocument();
  });

  it("shows duplicate document detection, not processed twice", () => {
    render(<DocumentLiveness showDuplicate />);
    expect(screen.getByText(/Duplicate Document/i)).toBeInTheDocument();
    // "uploaded twice" appears in the branch subtitle and the BranchCard title.
    expect(
      screen.getAllByText(/uploaded twice/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/not processed twice/i)).toBeInTheDocument();
  });

  // ── Edge Cases: DONE Terminal State ────────────────────────────────

  it("shows the DONE terminal state with confirmed transaction link", () => {
    render(<DocumentLiveness showDone />);
    expect(screen.getByText(/Document Done/i)).toBeInTheDocument();
    expect(screen.getByText(/Linked to transaction/i)).toBeInTheDocument();
    // "AP-2026-0412" appears in the BranchCard title and the link-confirmation note.
    expect(screen.getAllByText(/AP-2026-0412/i).length).toBeGreaterThanOrEqual(
      1,
    );
  });

  // ── Liveness Footer ────────────────────────────────────────────────

  it("shows Layer 1 deterministic liveness footer", () => {
    render(<DocumentLiveness />);
    const layerMentions = screen.getAllByText(/Layer 1/i);
    expect(layerMentions.length).toBeGreaterThanOrEqual(1);
    const detMentions = screen.getAllByText(/deterministic/i);
    expect(detMentions.length).toBeGreaterThanOrEqual(1);
  });

  it("shows Layer 2 probabilistic liveness footer", () => {
    render(<DocumentLiveness />);
    const layerMentions = screen.getAllByText(/Layer 2/i);
    expect(layerMentions.length).toBeGreaterThanOrEqual(1);
    const probMentions = screen.getAllByText(/probabilistic/i);
    expect(probMentions.length).toBeGreaterThanOrEqual(1);
  });

  // ── Escalation & Human-in-the-Loop ─────────────────────────────────

  it("shows escalation triggers for classification and extraction", () => {
    render(<DocumentLiveness />);
    expect(
      screen.getByText(/Escalation & Human-in-the-Loop/i),
    ).toBeInTheDocument();
    // "below threshold" appears in the escalation row AND the constraint section.
    expect(
      screen.getAllByText(/below threshold/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/critical field/i)).toBeInTheDocument();
  });
});
