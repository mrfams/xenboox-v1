import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { ControllerLiveness } from "@/components/agents/controller-liveness";

describe("ControllerLiveness v1.0 — Spec-Compliant", () => {
  // ── Happy Path: Active Management-Tier Review ───────────────────────

  it("renders the agent name and role in the header", () => {
    render(<ControllerLiveness />);
    // "Controller Agent" also appears in the cross-agent chain chip, so scope to the heading.
    expect(
      screen.getByRole("heading", { name: "Controller Agent" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/reviewer/i).length).toBeGreaterThanOrEqual(1);
  });

  it("renders pipeline stages in correct order: POSTING_RECEIVED_FOR_REVIEW → REVIEWING → CONFIRMED → AGGREGATED_INTO_CLOSE_CHECKLIST (with KICKED_BACK as fork branch)", () => {
    render(<ControllerLiveness />);
    expect(screen.getByText("Controller State Machine")).toBeInTheDocument();
    const stages = screen.getAllByRole("listitem");
    const stageLabels = stages.map((el) => el.textContent);
    const receivedIdx = stageLabels.findIndex((t) =>
      t?.includes("POSTING_RECEIVED_FOR_REVIEW"),
    );
    const reviewingIdx = stageLabels.findIndex((t) => t?.includes("REVIEWING"));
    const confirmedIdx = stageLabels.findIndex((t) => t?.includes("CONFIRMED"));
    const kickedIdx = stageLabels.findIndex((t) => t?.includes("KICKED_BACK"));
    const closeIdx = stageLabels.findIndex((t) =>
      t?.includes("AGGREGATED_INTO_CLOSE_CHECKLIST"),
    );

    expect(receivedIdx).toBeLessThan(reviewingIdx);
    expect(reviewingIdx).toBeLessThan(confirmedIdx);
    // Fork: both CONFIRMED and KICKED_BACK precede the close checklist roll-up.
    expect(confirmedIdx).toBeLessThan(closeIdx);
    expect(kickedIdx).toBeLessThan(closeIdx);
  });

  it("shows the current operation status (reviewing a posting)", () => {
    render(<ControllerLiveness />);
    const status = screen.getByRole("status");
    expect(status.textContent).toContain("REVIEWING");
    expect(status.textContent).toContain("AP Agent");
  });

  // ── Exactly 1 Confidence Meter (judgment-based categorization only) ─

  it("renders exactly one confidence meter — the judgment-based categorization check", () => {
    render(<ControllerLiveness />);
    const meters = screen.getAllByRole("meter");
    expect(meters.length).toBe(1);
    // jest-dom compares getAttribute() literally here, so assert via getAttribute + toMatch.
    expect(meters[0].getAttribute("aria-label")).toMatch(/categorization/i);
    expect(meters[0]).toHaveAttribute("aria-valuenow", "82");
  });

  it("does NOT show 'Agent Confidence' summary", () => {
    render(<ControllerLiveness />);
    expect(screen.queryByText(/Agent Confidence/i)).not.toBeInTheDocument();
  });

  it("the close checklist roll-up is deterministic — no confidence meter on it", () => {
    render(<ControllerLiveness />);
    const checklist = screen.getByRole("region", { name: /Close Checklist/i });
    expect(within(checklist).queryAllByRole("meter").length).toBe(0);
  });

  // ── Live Review Feed — distinct from Ledger Agent's posting feed ────

  it("shows a live 'currently reviewing' feed distinct from Ledger Agent's posting feed", () => {
    render(<ControllerLiveness />);
    const feed = screen.getByRole("region", { name: /Review Feed/i });
    expect(
      within(feed).getByText(/Reviewing posting from AP Agent/i),
    ).toBeInTheDocument();
    expect(
      within(feed).getByText(
        /active second layer, not the same event repeated/i,
      ),
    ).toBeInTheDocument();
  });

  it("shows the posting being reviewed right now with its transaction reference", () => {
    render(<ControllerLiveness />);
    const feed = screen.getByRole("region", { name: /Review Feed/i });
    expect(within(feed).getByText(/AP-2026-0412/i)).toBeInTheDocument();
  });

  it("shows a confirmed posting marked as reviewed", () => {
    render(<ControllerLiveness />);
    const feed = screen.getByRole("region", { name: /Review Feed/i });
    // "Confirmed:" row text + CONFIRMED badge + "Confirmed postings" footer all match case-insensitively
    expect(
      within(feed).getAllByText(/CONFIRMED/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      within(feed).getAllByText(/contribute to clean trial balance/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("shows a kicked-back item with the specific reason", () => {
    render(<ControllerLiveness />);
    const feed = screen.getByRole("region", { name: /Review Feed/i });
    expect(
      within(feed).getByText(/Kicked back to AP Agent/i),
    ).toBeInTheDocument();
    expect(
      within(feed).getByText(
        /categorized as 'Marketing' but vendor 'Cloudline Ltd' historically/i,
      ),
    ).toBeInTheDocument();
  });

  it("shows the kicked-back item routed visibly back to the originating agent's queue", () => {
    render(<ControllerLiveness />);
    const feed = screen.getByRole("region", { name: /Review Feed/i });
    expect(
      within(feed).getByText(/routed back to AP Agent's queue/i),
    ).toBeInTheDocument();
  });

  // ── Categorization check — judgment cites its basis (Spec §3/§5) ───

  it("shows the judgment-based categorization check with its cited basis", () => {
    render(<ControllerLiveness />);
    const check = screen.getByRole("region", { name: /Categorization Check/i });
    expect(within(check).getByText(/vendor history/i)).toBeInTheDocument();
    expect(
      within(check).getByText(/82% — judgment-based, basis cited/i),
    ).toBeInTheDocument();
  });

  it("shows that deterministic completeness checks carry no confidence score", () => {
    render(<ControllerLiveness />);
    const check = screen.getByRole("region", { name: /Categorization Check/i });
    expect(
      within(check).getByText(/completeness checks — no confidence score/i),
    ).toBeInTheDocument();
  });

  // ── Critical Rule: never silently confirmed (Spec §7) ───────────────

  it("surfaces the never-silently-confirmed critical rule in the main view", () => {
    render(<ControllerLiveness />);
    expect(
      screen.getAllByText(/never silently confirmed/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/must escalate/i).length).toBeGreaterThanOrEqual(
      1,
    );
  });

  // ── Live Close Checklist (Spec §4/§2) ───────────────────────────────

  it("shows the close checklist ticking live as conditions are met", () => {
    render(<ControllerLiveness />);
    const checklist = screen.getByRole("region", { name: /Close Checklist/i });
    expect(
      within(checklist).getByText(/Trial balance balanced/i),
    ).toBeInTheDocument();
    expect(
      within(checklist).getByText(/AP\/AR reconciled/i),
    ).toBeInTheDocument();
    expect(
      within(checklist).getByText(/All postings reviewed/i),
    ).toBeInTheDocument();
    expect(
      within(checklist).getByText(/ticks live as conditions are met/i),
    ).toBeInTheDocument();
  });

  it("shows the checklist is not revealed only at month-end", () => {
    render(<ControllerLiveness />);
    const checklist = screen.getByRole("region", { name: /Close Checklist/i });
    expect(
      within(checklist).getByText(/not revealed only at month-end/i),
    ).toBeInTheDocument();
  });

  // ── Status Grid ────────────────────────────────────────────────────

  it("shows controller metadata in the status grid", () => {
    render(<ControllerLiveness />);
    const metadata = screen.getByRole("region", {
      name: /Controller Metadata/i,
    });
    expect(within(metadata).getByText(/Period/i)).toBeInTheDocument();
    expect(within(metadata).getByText("Q2 2026")).toBeInTheDocument();
    expect(
      within(metadata).getByText(/Postings Reviewed/i),
    ).toBeInTheDocument();
    expect(within(metadata).getByText(/Kicked Back/i)).toBeInTheDocument();
  });

  // ── How It Works ───────────────────────────────────────────────────

  it("shows the 'how it works' decomposition toggle", () => {
    render(<ControllerLiveness />);
    const mentions = screen.getAllByText(/How It Works/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("reveals step details when 'How It Works' is clicked", () => {
    render(<ControllerLiveness />);
    fireEvent.click(screen.getByText(/How It Works — Step-by-Step/i));
    expect(screen.getByText(/Receive Posting for Review/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Check Categorization and Completeness/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Confirm or Kick Back/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Roll Up into Close Checklist/i),
    ).toBeInTheDocument();
  });

  it("shows 'No confidence score' notes on deterministic steps in How It Works", () => {
    render(<ControllerLiveness />);
    fireEvent.click(screen.getByText(/How It Works — Step-by-Step/i));
    expect(
      screen.getAllByText(/No confidence score/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("shows that judgment-based categorization must cite its basis", () => {
    render(<ControllerLiveness />);
    fireEvent.click(screen.getByText(/How It Works — Step-by-Step/i));
    expect(
      screen.getAllByText(/must cite the basis/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  // ── Constraint Enforcement ─────────────────────────────────────────

  it("shows constraint enforcement badges", () => {
    render(<ControllerLiveness />);
    expect(
      screen.getByRole("region", { name: /Constraint Enforcement/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Review Feed Distinct")).toBeInTheDocument();
    expect(screen.getByText("Kickback Reason Named")).toBeInTheDocument();
    expect(screen.getByText("Judgment Cites Basis")).toBeInTheDocument();
    expect(screen.getByText("Never Silently Confirmed")).toBeInTheDocument();
    expect(screen.getByText("Close Checklist Live")).toBeInTheDocument();
  });

  // ── Audit Trail ────────────────────────────────────────────────────

  it("shows the audit trail section", () => {
    render(<ControllerLiveness />);
    const mentions = screen.getAllByText(/Audit Trail/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });

  it("shows audit trail entries with every review decision and reason when expanded", () => {
    render(<ControllerLiveness />);
    fireEvent.click(screen.getByText(/Audit Trail — Every Review Decision/i));
    const auditRows = screen.getAllByRole("row");
    expect(auditRows.length).toBeGreaterThanOrEqual(8);
    expect(screen.getAllByText(/confirmed/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/kicked back/i).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(
      screen.getAllByText(/close checklist status/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  // ── Cross-Agent Dependencies ───────────────────────────────────────

  it("shows the worker agents whose postings flow through Controller review", () => {
    render(<ControllerLiveness />);
    expect(screen.getAllByText(/Ledger Agent/).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(screen.getAllByText(/AP Agent/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/AR Agent/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/CFO Agent/).length).toBeGreaterThanOrEqual(1);
  });

  it("shows that Controller reports to CFO Agent and feeds the close checklist", () => {
    render(<ControllerLiveness />);
    expect(screen.getByText(/reports to CFO Agent/i)).toBeInTheDocument();
    expect(
      screen.getAllByText(/Month-End Close/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  // ── Accessibility ──────────────────────────────────────────────────

  it("renders with accessible region roles", () => {
    render(<ControllerLiveness />);
    const regions = screen.getAllByRole("region");
    expect(regions.length).toBeGreaterThanOrEqual(5);
  });

  // ── Edge Cases: Empty State ────────────────────────────────────────

  it("shows 'No postings awaiting review' empty state", () => {
    render(<ControllerLiveness showEmptyState />);
    expect(
      screen.getByText(/No postings awaiting review/i),
    ).toBeInTheDocument();
  });

  // ── Edge Cases: Kickback Loop (Spec §6) — blocking ─────────────────

  it("shows the kickback loop escalated to CFO Agent and human with full history", () => {
    render(<ControllerLiveness showKickbackLoop />);
    // h2 title + BranchCard inner div ("until the kickback loop is resolved") both match
    expect(screen.getAllByText(/Kickback Loop/i).length).toBeGreaterThanOrEqual(
      1,
    );
    // BranchCard title + subtitle both match
    expect(
      screen.getAllByText(/kicked back twice/i).length,
    ).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/full history shown/i)).toBeInTheDocument();
    expect(screen.getAllByText(/CFO Agent/).length).toBeGreaterThanOrEqual(1);
  });

  it("kickback loop is blocking for that posting", () => {
    render(<ControllerLiveness showKickbackLoop />);
    expect(
      screen.getAllByText(/Blocking for that posting/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("kickback loop branch renders 0 confidence meters", () => {
    render(<ControllerLiveness showKickbackLoop />);
    expect(screen.queryAllByRole("meter").length).toBe(0);
  });

  // ── Edge Cases: Close at Risk (Spec §6) — non-blocking but flagged ─

  it("shows close-at-risk flagged to CFO Agent when a checklist item can't be satisfied", () => {
    render(<ControllerLiveness showCloseAtRisk />);
    // h2 title + BranchCard title ("— close at risk") both match case-insensitively
    expect(screen.getAllByText(/Close at Risk/i).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(
      screen.getByText(/Trial balance not yet balanced/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/CFO Agent/).length).toBeGreaterThanOrEqual(1);
  });

  it("close-at-risk is non-blocking but flagged", () => {
    render(<ControllerLiveness showCloseAtRisk />);
    expect(
      screen.getAllByText(/Non-blocking but flagged/i).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("close-at-risk branch renders 0 confidence meters", () => {
    render(<ControllerLiveness showCloseAtRisk />);
    expect(screen.queryAllByRole("meter").length).toBe(0);
  });

  // ── Edge Cases: Material Issue (Spec §7) — never silently confirmed ─

  it("escalates material issues instead of silently confirming to keep close on schedule", () => {
    render(<ControllerLiveness showMaterialIssue />);
    expect(screen.getByText(/Material Issue Escalated/i)).toBeInTheDocument();
    expect(
      screen.getByText(/never silently confirmed to keep close on schedule/i),
    ).toBeInTheDocument();
    // BranchCard paragraph ("it must escalate") + inner div ("Must escalate") both match
    expect(screen.getAllByText(/must escalate/i).length).toBeGreaterThanOrEqual(
      1,
    );
  });

  it("material-issue branch renders 0 confidence meters", () => {
    render(<ControllerLiveness showMaterialIssue />);
    expect(screen.queryAllByRole("meter").length).toBe(0);
  });

  // ── Edge Cases: KICKED_BACK terminal view ──────────────────────────

  it("shows a kicked-back posting with its routing in the terminal branch view", () => {
    render(<ControllerLiveness showKickedBack />);
    // h2 + BranchCard title + BranchCard body all match case-insensitively
    expect(screen.getAllByText(/Kicked Back/i).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(
      screen.getByText(/please confirm or recategorize/i),
    ).toBeInTheDocument();
  });

  it("kicked-back branch renders 0 confidence meters", () => {
    render(<ControllerLiveness showKickedBack />);
    expect(screen.queryAllByRole("meter").length).toBe(0);
  });

  // ── Edge Cases: Close Checklist Complete (terminal) ────────────────

  it("shows all close checklist items satisfied at completion", () => {
    render(<ControllerLiveness showChecklistComplete />);
    expect(screen.getByText(/Close Checklist Complete/i)).toBeInTheDocument();
    expect(screen.getByText(/Trial balance balanced/i)).toBeInTheDocument();
    expect(screen.getByText(/All postings reviewed/i)).toBeInTheDocument();
  });

  it("checklist-complete branch renders 0 confidence meters", () => {
    render(<ControllerLiveness showChecklistComplete />);
    expect(screen.queryAllByRole("meter").length).toBe(0);
  });

  // ── Escalation & Human-in-the-Loop ─────────────────────────────────

  it("shows escalation triggers for kickback loop and close-at-risk", () => {
    render(<ControllerLiveness />);
    expect(
      screen.getByText(/Escalation & Human-in-the-Loop/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Kickback loop \(same posting kicked back twice\)/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Close checklist item can't be satisfied by target date/i,
      ),
    ).toBeInTheDocument();
  });

  // ── Liveness Footer ────────────────────────────────────────────────

  it("shows Layer 1 deterministic vs Layer 2 probabilistic liveness footer", () => {
    render(<ControllerLiveness />);
    const layerMentions = screen.getAllByText(/Layer 1/i);
    expect(layerMentions.length).toBeGreaterThanOrEqual(1);
    const probMentions = screen.getAllByText(/probabilistic/i);
    expect(probMentions.length).toBeGreaterThanOrEqual(1);
  });

  it("shows entity information", () => {
    render(<ControllerLiveness />);
    const mentions = screen.getAllByText(/Xenboox/);
    expect(mentions.length).toBeGreaterThanOrEqual(1);
  });
});
