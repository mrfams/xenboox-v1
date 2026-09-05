import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import {
  TasksRailPanel,
  type RailTask,
} from "@/components/dashboard/tasks-rail-panel";

// Vitest runs with cwd = apps/web. Resolve robustly whether cwd is the app
// dir or the repo root.
const REPO = join(process.cwd(), "..");
const root = existsSync(join(process.cwd(), "app"))
  ? process.cwd()
  : existsSync(join(REPO, "apps/web/app"))
    ? join(REPO, "apps/web")
    : process.cwd();

function read(rel: string): string {
  const p = join(root, rel);
  if (!existsSync(p)) throw new Error(`Missing file for UX check: ${rel}`);
  return readFileSync(p, "utf-8");
}

const TASKS: RailTask[] = [
  {
    id: "t-need",
    source: "live_run",
    title: "Chasing 4 overdue invoices",
    description: "Drafting reminders",
    status: "waiting",
    progress: 40,
    conversationId: "conv-1",
    needsDecision: true,
    currentStep: "Drafting reminders",
    error: null,
    startedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: "t-run",
    source: "daily_close",
    title: "Daily reconciliation",
    description: null,
    status: "in_progress",
    progress: 55,
    conversationId: null,
    needsDecision: false,
    currentStep: "Processing transactions",
    error: null,
    startedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: "t-done",
    source: "close_task",
    title: "Bank reconciliation — Jul",
    description: null,
    status: "completed",
    progress: 100,
    conversationId: null,
    needsDecision: false,
    currentStep: null,
    error: null,
    startedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  },
];

describe("Tasks rail — one surface, no tabs", () => {
  it("renders a single Tasks list grouped Needs you / Running / Done", () => {
    render(
      <TasksRailPanel
        tasks={TASKS}
        counts={{ total: 3, running: 1, completed: 1, failed: 0 }}
        selectedTaskId={null}
        onSelectTask={() => {}}
      />,
    );

    expect(screen.getByText("Tasks")).toBeInTheDocument();
    expect(screen.getByText("Needs you")).toBeInTheDocument();
    expect(screen.getByText("Running")).toBeInTheDocument();
    expect(screen.getByText("Done")).toBeInTheDocument();
    expect(screen.getByText("Chasing 4 overdue invoices")).toBeInTheDocument();
  });

  it("has no Agents or Chat tabs", () => {
    const { container } = render(
      <TasksRailPanel
        tasks={TASKS}
        selectedTaskId={null}
        onSelectTask={() => {}}
      />,
    );

    expect(container.textContent).not.toMatch(/Agents/);
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("selecting a task notifies the parent (thread loads inline)", () => {
    const onSelect = vi.fn();
    render(
      <TasksRailPanel tasks={TASKS} selectedTaskId={null} onSelectTask={onSelect} />,
    );

    fireEvent.click(screen.getByText("Daily reconciliation"));
    expect(onSelect).toHaveBeenCalledWith(
      expect.objectContaining({ id: "t-run" }),
    );
  });

  it("never renders agent identity, confidence, or timings", () => {
    const { container } = render(
      <TasksRailPanel tasks={TASKS} selectedTaskId={null} onSelectTask={() => {}} />,
    );

    expect(container.textContent).not.toMatch(/CFO Agent/);
    expect(container.textContent).not.toMatch(/confidence/i);
    expect(container.textContent).not.toMatch(/\d+ms/);
  });

  it("shows an honest empty state", () => {
    render(
      <TasksRailPanel tasks={[]} selectedTaskId={null} onSelectTask={() => {}} />,
    );
    expect(screen.getByText("Nothing running")).toBeInTheDocument();
  });
});

describe("Dashboard — rail is one Tasks panel", () => {
  it("renders TasksRailPanel, not the 3-tab rail or AgentStream", () => {
    const src = read("app/dashboard/page.tsx");
    expect(src).toMatch(/TasksRailPanel/);
    expect(src).toMatch(/TaskDetailDrawer/);
    expect(src).not.toMatch(/AgentConversationsRail/);
    expect(src).not.toMatch(/AgentStream/);
    expect(src).not.toMatch(/"agents" \| "conversations" \| "tasks"/);
  });

  it("task selection loads the linked conversation inline", () => {
    const src = read("app/dashboard/page.tsx");
    expect(src).toMatch(/loadConversation/);
    expect(src).toMatch(/task\.conversationId/);
    expect(src).not.toMatch(/\/dashboard\/activity-hub/);
  });
});

describe("Tasks router — task-as-session shape", () => {
  it("UnifiedTask carries conversationId and needsDecision", () => {
    const src = read("server/routers/tasks.ts");
    expect(src).toMatch(/conversationId: string \| null/);
    expect(src).toMatch(/needsDecision: boolean/);
    expect(src).toMatch(/readConversationId/);
    expect(src).toMatch(/metadata\.conversationId/);
  });

  it("task detail returns artifacts and open escalations", () => {
    const src = read("server/routers/tasks.ts");
    expect(src).toMatch(/getTaskThreadExtras/);
    expect(src).toMatch(/parseChatArtifacts/);
    expect(src).toMatch(/openEscalations/);
  });
});

describe("Thought contract — no agent internals in user UI", () => {
  it("stream route forwards only thinking text", () => {
    const src = read("app/api/chat/stream/route.ts");
    expect(src).toMatch(/type: "thinking", text: step\.note/);
    expect(src).not.toMatch(/label: step\.label/);
    expect(src).not.toMatch(/agent: "CFO Agent"/);
    expect(src).not.toMatch(/type: "agent_activity"/);
    expect(src).not.toMatch(/type: "delegation"/);
  });

  it("pipeline notes are user-safe sentences", () => {
    const src = readFileSync(
      join(root, "../../packages/agents/core/pipeline.ts"),
      "utf-8",
    );
    expect(src).toMatch(/Working through it now/);
    expect(src).not.toMatch(/Classified as/);
    expect(src).not.toMatch(/Dispatched /);
    expect(src).not.toMatch(/targetNames/);
    expect(src).not.toMatch(/AGENT_DISPLAY_NAMES/);
  });

  it("Thought components render sentences, never labels or timings", () => {
    for (const f of [
      "components/chat/thinking-steps.tsx",
      "components/workspace/thinking-reveal.tsx",
    ]) {
      const src = read(f);
      expect(src).not.toMatch(/durationMs/);
      expect(src).not.toMatch(/CFO Agent/);
    }
    const chat = read("components/chat/thinking-steps.tsx");
    expect(chat).toMatch(/Thought/);
  });
});

describe("Tasks page — review queue, two sections only", () => {
  it("has Needs you + All tasks and nothing else", () => {
    const src = read("app/dashboard/tasks/page.tsx");
    expect(src).toMatch(/Needs you/);
    expect(src).toMatch(/All tasks/);
    expect(src).not.toMatch(/"activity"/);
    expect(src).not.toMatch(/FYI/);
  });

  it("decisions resolve through the same mutation chat uses", () => {
    const src = read("app/dashboard/tasks/page.tsx");
    expect(src).toMatch(/approvals\.resolve/);
    expect(src).toMatch(/Ask Xenboox/);
  });
});
