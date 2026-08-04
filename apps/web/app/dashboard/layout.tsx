"use client";

import { useState, useCallback } from "react";
import { Bot, PanelRightOpen, PanelRightClose } from "lucide-react";
import { SessionProvider } from "next-auth/react";
import { EntityProvider, useEntity } from "@/lib/entity-context";
import { PermissionProvider, serializePermissions } from "@/lib/permissions";
import { AISidebar } from "@/components/layout/ai-sidebar";
import { TopNav } from "@/components/layout/top-nav";
import { ChatPanel } from "@/components/layout/chat-panel";
import { WhiteLabelProvider } from "@/components/layout/white-label-provider";
import { Toaster } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

function PermissionAwareLayout({ children }: { children: React.ReactNode }) {
  const { entityRole } = useEntity();
  const { data: perms } = trpc.permissionsAdmin.myPermissions.useQuery(
    undefined,
    {
      enabled: !!entityRole,
      staleTime: 60_000,
      retry: false,
    },
  );

  const permMap = perms ? serializePermissions(perms) : null;

  return (
    <PermissionProvider permissions={permMap} role={entityRole}>
      {children}
    </PermissionProvider>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [panelWidth, setPanelWidth] = useState(400);

  const handleDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const newWidth = window.innerWidth - e.clientX;
      const clampedWidth = Math.min(Math.max(newWidth, 320), 600);
      setPanelWidth(clampedWidth);
    },
    [isDragging],
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add global mouse events for dragging
  useState(() => {
    if (typeof window !== "undefined") {
      window.addEventListener("mousemove", handleDragMove);
      window.addEventListener("mouseup", handleDragEnd);
      return () => {
        window.removeEventListener("mousemove", handleDragMove);
        window.removeEventListener("mouseup", handleDragEnd);
      };
    }
  });

  return (
    <SessionProvider>
      <EntityProvider>
        <WhiteLabelProvider>
          <PermissionAwareLayout>
            <div data-dashboard className="flex h-screen overflow-hidden">
              {/* Left Sidebar */}
              <AISidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
              />

              {/* Main Content + Right Panel Container */}
              <div className="flex flex-1 overflow-hidden lg:pl-[4.25rem]">
                {/* Main Content */}
                <div
                  className={cn(
                    "flex flex-col overflow-hidden transition-all duration-300",
                    chatOpen ? "flex-1" : "flex-1",
                  )}
                >
                  <TopNav
                    onMenuClick={() => setSidebarOpen(true)}
                    onChatToggle={() => setChatOpen(!chatOpen)}
                    chatOpen={chatOpen}
                  />
                  <main className="flex-1 overflow-y-auto">{children}</main>
                </div>

                {/* Right Panel Toggle Button (when closed) */}
                {!chatOpen && (
                  <button
                    type="button"
                    onClick={() => setChatOpen(true)}
                    className="fixed right-0 top-1/2 -translate-y-1/2 z-30 flex items-center gap-1 rounded-l-lg bg-card border border-r-0 border-border px-2 py-3 shadow-lg hover:bg-accent transition-colors"
                    title="Open AI Assistant"
                  >
                    <PanelRightOpen className="h-4 w-4 text-muted-foreground" />
                    <span className="text-[10px] font-medium text-muted-foreground writing-vertical-rl">
                      AI Agent
                    </span>
                  </button>
                )}

                {/* Right Panel */}
                {chatOpen && (
                  <>
                    {/* Drag Handle */}
                    <div
                      onMouseDown={handleDragStart}
                      className={cn(
                        "w-1.5 cursor-col-resize bg-border hover:bg-primary/30 transition-colors flex-shrink-0 relative group",
                        isDragging && "bg-primary/40",
                      )}
                    >
                      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-1 h-8 rounded-full bg-muted-foreground/30" />
                      </div>
                    </div>

                    {/* Chat Panel */}
                    <div
                      className="flex-shrink-0 border-l bg-card h-full overflow-hidden"
                      style={{ width: `${panelWidth}px` }}
                    >
                      <ChatPanel
                        open={chatOpen}
                        onClose={() => setChatOpen(false)}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Floating CFO Agent button (when panel is closed) */}
            {!chatOpen && (
              <button
                type="button"
                onClick={() => setChatOpen(true)}
                aria-label="Open CFO Agent chat"
                className="fixed bottom-5 right-5 z-30 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
              >
                <Bot className="h-5 w-5" />
                <span className="hidden sm:inline text-sm font-medium">
                  CFO Agent
                </span>
              </button>
            )}

            <Toaster position="top-right" richColors closeButton />
          </PermissionAwareLayout>
        </WhiteLabelProvider>
      </EntityProvider>
    </SessionProvider>
  );
}
