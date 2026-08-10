import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { ActivityLogView } from "@/components/audit/activity-log-view";

const events = [
  {
    id: "evt-1",
    seq: 1,
    action: "create",
    entityType: "invoice",
    entityIdRef: "inv-1",
    actorType: "user",
    userId: "user-1",
    agentId: null,
    reason: null,
    oldValues: null,
    newValues: { amount: "100" },
    createdAt: "2026-01-01T00:00:00.000Z" as string | null,
    ipAddress: "10.0.0.1",
  },
  {
    id: "evt-2",
    seq: 2,
    action: "update",
    entityType: "invoice",
    entityIdRef: "inv-1",
    actorType: "agent",
    userId: null,
    agentId: "cfo-agent",
    reason: "Corrected amount",
    oldValues: { amount: "100" },
    newValues: { amount: "250" },
    createdAt: "2026-01-01T00:00:01.000Z" as string | null,
    ipAddress: null,
  },
];

describe("ActivityLogView", () => {
  it("renders events with seq, action, and actor", () => {
    render(
      <ActivityLogView
        events={events as never}
        verification={{
          valid: true,
          status: "valid",
          checkedCount: 2,
          firstBrokenSeq: null,
        }}
        onVerify={vi.fn()}
        onExportJson={vi.fn()}
        onExportCsv={vi.fn()}
      />,
    );
    expect(screen.getByText("create")).toBeTruthy();
    expect(screen.getByText("update")).toBeTruthy();
    expect(screen.getByText("cfo-agent")).toBeTruthy();
    expect(screen.getByText("#1")).toBeTruthy();
    expect(screen.getByText("#2")).toBeTruthy();
  });

  it("shows an integrity-verified banner when the chain is valid", () => {
    render(
      <ActivityLogView
        events={events as never}
        verification={{
          valid: true,
          status: "valid",
          checkedCount: 2,
          firstBrokenSeq: null,
        }}
        onVerify={vi.fn()}
        onExportJson={vi.fn()}
        onExportCsv={vi.fn()}
      />,
    );
    expect(screen.getByText(/integrity verified/i)).toBeTruthy();
    expect(screen.getByText(/2 events checked/i)).toBeTruthy();
  });

  it("shows a tamper warning with the first broken sequence when broken", () => {
    render(
      <ActivityLogView
        events={events as never}
        verification={{
          valid: false,
          status: "broken",
          checkedCount: 0,
          firstBrokenSeq: 1,
        }}
        onVerify={vi.fn()}
        onExportJson={vi.fn()}
        onExportCsv={vi.fn()}
      />,
    );
    expect(screen.getByText(/integrity broken/i)).toBeTruthy();
    expect(screen.getByText(/first broken link/i)).toBeTruthy();
    expect(screen.getAllByText("#1").length).toBeGreaterThan(0);
  });

  it("shows an informational banner when the chain has not been backfilled", () => {
    render(
      <ActivityLogView
        events={events as never}
        verification={{
          valid: false,
          status: "unchained",
          checkedCount: 0,
          firstBrokenSeq: null,
        }}
        onVerify={vi.fn()}
        onExportJson={vi.fn()}
        onExportCsv={vi.fn()}
      />,
    );
    expect(screen.getByText(/history not yet chained/i)).toBeTruthy();
  });

  it("renders an empty state when there are no events", () => {
    render(
      <ActivityLogView
        events={[]}
        verification={{
          valid: true,
          status: "valid",
          checkedCount: 0,
          firstBrokenSeq: null,
        }}
        onVerify={vi.fn()}
        onExportJson={vi.fn()}
        onExportCsv={vi.fn()}
      />,
    );
    expect(screen.getByText(/no activity recorded/i)).toBeTruthy();
  });

  it("calls the export callbacks from the toolbar", () => {
    const onExportJson = vi.fn();
    const onExportCsv = vi.fn();
    render(
      <ActivityLogView
        events={events as never}
        verification={{
          valid: true,
          status: "valid",
          checkedCount: 2,
          firstBrokenSeq: null,
        }}
        onVerify={vi.fn()}
        onExportJson={onExportJson}
        onExportCsv={onExportCsv}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /export json/i }));
    expect(onExportJson).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: /export csv/i }));
    expect(onExportCsv).toHaveBeenCalledTimes(1);
  });

  it("calls onVerify from the banner", () => {
    const onVerify = vi.fn();
    render(
      <ActivityLogView
        events={events as never}
        verification={{
          valid: false,
          status: "broken",
          checkedCount: 0,
          firstBrokenSeq: 2,
        }}
        onVerify={onVerify}
        onExportJson={vi.fn()}
        onExportCsv={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /verify again/i }));
    expect(onVerify).toHaveBeenCalledTimes(1);
  });
});
