"use client";

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { CFOConversationPanel } from "@/components/cfo/cfo-conversation-panel";
import { CFOContextPanel } from "@/components/cfo/cfo-context-panel";
import { CFOdeliverablesPanel } from "@/components/cfo/cfo-deliverables-panel";
import { CFOSkillsLibrary } from "@/components/cfo/cfo-skills-library";
import {
  CFOAIModeSwitcher,
  type AIMode,
} from "@/components/cfo/cfo-mode-switcher";
import { CFOTimeline } from "@/components/cfo/cfo-timeline";
import { CFOmemory } from "@/components/cfo/cfo-memory";
import { CFORunningTasks } from "@/components/cfo/cfo-running-tasks";
import {
  X,
  PanelRight,
  PanelRightOpen,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type Message = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  confidence?: number;
  timestamp?: Date;
};

export default function ChatPage() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<AIMode>("cfo");
  const [messages, setMessages] = useState<Message[]>(() => {
    const initial = searchParams?.get("initial");
    if (initial) {
      return [
        {
          id: "init-user",
          role: "user",
          content: initial,
          timestamp: new Date(),
        },
        {
          id: "init-ai",
          role: "assistant",
          content: "",
          timestamp: new Date(),
        },
      ];
    }
    return [];
  });
  const [isStreaming, setIsStreaming] = useState(false);
  const [suggestedFollowups, setSuggestedFollowups] = useState<string[]>([]);
  const [showContext, setShowContext] = useState(true);
  const [showDeliverables, setShowDeliverables] = useState(true);

  const handleSend = useCallback((text: string) => {
    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    const assistantMsg: Message = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content:
        "I analyzed your financial data:\n\n✓ Cash Flow\n✓ Payroll\n✓ Revenue Trend\n✓ Budget\n✓ Outstanding Receivables\n\n" +
        (text.toLowerCase().includes("hire") ||
        text.toLowerCase().includes("engineer")
          ? "**Yes.** Hiring another engineer at approximately $6,000/month would leave your runway at 13.4 months.\n\nThe biggest risk is delayed customer payments rather than payroll.\n\n**Recommendations:**\n• Hire now\n• Improve collections\n• Delay office expansion" +
            "\n\n[Generate Hiring Scenario]"
          : text.toLowerCase().includes("cash") ||
              text.toLowerCase().includes("forecast")
            ? "Your current cash position is **GMD 184,300** across all accounts. Based on projected inflows and outflows, you have **13 months of runway** at the current burn rate.\n\n**Key drivers:**\n• Receivables: GMD 78,500 outstanding (4 invoices overdue)\n• Payroll: GMD 147,050 fully funded\n• Next VAT payment: GMD 106,902 due in 18 days\n\nWould you like me to:\n• Build a detailed cash flow projection\n• Simulate a revenue decrease scenario\n• Suggest working capital improvements"
            : "I'll analyze that for you. Let me run the numbers.\n\n**Summary:**\n• Revenue: Trending positive this quarter\n• Expenses: Within budget across all categories\n• Cash position: Stable with healthy runway\n\nWould you like me to drill deeper into any specific area?"),
      timestamp: new Date(),
      confidence: 0.96,
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);

    // Simulate streaming
    setTimeout(() => {
      setMessages((prev) => [...prev, assistantMsg]);
      setIsStreaming(false);
      setSuggestedFollowups([
        "Build an action plan",
        "Simulate recovery scenario",
        "Compare against budget",
        "Generate a board-ready summary",
      ]);
    }, 1500);
  }, []);

  const handleStop = useCallback(() => {
    setIsStreaming(false);
  }, []);

  const handleSelectSkill = useCallback(
    (prompt: string) => {
      handleSend(prompt);
    },
    [handleSend],
  );

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-0 -m-4 lg:-m-6">
      {/* ─── Left Panel: Conversation ─────────────────────────────── */}
      <div className="flex flex-1 flex-col min-w-0">
        {/* Skills + Mode bar */}
        <div className="shrink-0 border-b bg-card/50 backdrop-blur-sm">
          <div className="flex items-center justify-between px-4 py-2 lg:px-6">
            <CFOAIModeSwitcher currentMode={mode} onModeChange={setMode} />
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setShowContext(!showContext)}
                className={cn(
                  "flex h-7 items-center gap-1 rounded-lg px-2 text-[10px] font-medium transition-all",
                  showContext
                    ? "bg-signal-indigo/10 text-signal-indigo"
                    : "text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50",
                )}
              >
                <PanelRight className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Context</span>
              </button>
              <button
                type="button"
                onClick={() => setShowDeliverables(!showDeliverables)}
                className={cn(
                  "flex h-7 items-center gap-1 rounded-lg px-2 text-[10px] font-medium transition-all",
                  showDeliverables
                    ? "bg-signal-indigo/10 text-signal-indigo"
                    : "text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50",
                )}
              >
                <PanelRightOpen className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Files</span>
              </button>
            </div>
          </div>
        </div>

        {/* Conversation */}
        <CFOConversationPanel
          mode={mode}
          messages={messages}
          isStreaming={isStreaming}
          onSend={handleSend}
          onStop={handleStop}
          suggestedFollowups={suggestedFollowups}
          className="flex-1"
        />
      </div>

      {/* ─── Middle Panel: Context + Skills ───────────────────────── */}
      {showContext && (
        <div className="hidden lg:flex lg:w-72 shrink-0 flex-col border-l bg-card/30 overflow-y-auto">
          <div className="flex items-center justify-between px-4 py-2.5 border-b">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Workspace
            </span>
            <button
              type="button"
              onClick={() => setShowContext(false)}
              className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground/30 hover:text-foreground hover:bg-muted transition-all"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-5">
            <CFOContextPanel />
            <CFOSkillsLibrary onSelectSkill={handleSelectSkill} />
            <div className="border-t pt-4 space-y-5">
              <CFORunningTasks />
              <CFOmemory />
            </div>
          </div>
        </div>
      )}

      {/* ─── Right Panel: Deliverables + Timeline ────────────────── */}
      {showDeliverables && (
        <div className="hidden lg:flex lg:w-72 shrink-0 flex-col border-l bg-card/30 overflow-y-auto">
          <div className="flex items-center justify-between px-4 py-2.5 border-b">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Output
            </span>
            <button
              type="button"
              onClick={() => setShowDeliverables(false)}
              className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground/30 hover:text-foreground hover:bg-muted transition-all"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-5">
            <CFOdeliverablesPanel />
            <div className="border-t pt-4">
              <CFOTimeline />
            </div>
          </div>
        </div>
      )}

      {/* ─── Toggle buttons when panels are hidden ────────────────── */}
      {!showContext && (
        <button
          type="button"
          onClick={() => setShowContext(true)}
          className="hidden lg:flex fixed left-[var(--sidebar-width,16rem)] top-1/2 z-10 h-8 w-5 items-center justify-center rounded-r-md border border-l-0 bg-card text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-all shadow-sm"
          title="Show workspace panel"
        >
          <ChevronLeft className="h-3 w-3" />
        </button>
      )}
      {!showDeliverables && (
        <button
          type="button"
          onClick={() => setShowDeliverables(true)}
          className="hidden lg:flex fixed right-4 top-1/2 z-10 h-8 w-5 items-center justify-center rounded-l-md border border-r-0 bg-card text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-all shadow-sm"
          title="Show deliverables panel"
        >
          <ChevronRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
