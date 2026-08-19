"use client";

import { useState, useCallback } from "react";
import { Bot, PanelRightOpen } from "lucide-react";
import { usePathname } from "next/navigation";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";

import { EntityProvider, useEntity } from "@/lib/entity-context";
import { PermissionProvider, serializePermissions } from "@/lib/permissions";
import { SimulationProvider } from "@/lib/ai-ux/simulation-provider";
import { AISidebar } from "@/components/layout/ai-sidebar";
import { TopNav } from "@/components/layout/top-nav";
import { ChatPanel } from "@/components/layout/chat-panel";
import { WhiteLabelProvider } from "@/components/layout/white-label-provider";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { DataAwareContextMenu } from "@/components/shared/data-aware-context-menu";

function PermissionAwareLayout({ children }: { children: React.ReactNode }) {
  const { entityRole } = useEntity();
  const { data: perms } = trpc.permissionsAdmin.myPermissions.useQuery(
    undefined,
    {
      enabled: !!entityRole,
      staleTime: 5 * 60_000, // 5 minutes - permissions don't change often
      refetchOnWindowFocus: false,
      refetchOnMount: false,
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
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // The CFO Agent panel stays closed until the user explicitly opens it
  // (toggle in the header, the floating CFO Agent button, or the edge tab).
  const [chatOpen, setChatOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [panelWidth, setPanelWidth] = useState(400);

  // Routes that need full-width padding (no card container)
  const PAGE_PADDING_ROUTES = new Set([
    "/dashboard/settings",
    "/dashboard/help",
  ]);

  const isPaddedPage = pathname ? PAGE_PADDING_ROUTES.has(pathname) : false;
  const ____isDashboardHome = pathname === "/dashboard";

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
            <SimulationProvider>
              {/* Data-aware context menu — appears on text selection across all pages */}
              <DataAwareContextMenu
                onOpenCopilot={(prompt) => {
                  // Navigate to chat page with the prompt as a search param.
                  // The chat page reads it and sends it to the AI.
                  window.location.href = `/dashboard/chat?prompt=${encodeURIComponent(prompt)}`;
                }}
              />

              {/* Skip link — first tab stop jumps past the sidebar/top-nav to content */}
              <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg"
              >
                Skip to content
              </a>
              <div data-dashboard className="flex h-screen overflow-hidden">
                {/* Left Sidebar */}
                <AISidebar
                  isOpen={sidebarOpen}
                  onClose={() => setSidebarOpen(false)}
                />

                {/* Main Content + Right Panel Container */}
                <div className="flex flex-1 overflow-hidden md:pl-16 lg:pl-[var(--sidebar-width)]">
                  {/* Main Content */}
                  <div
                    className={cn(
                      "flex flex-col overflow-hidden transition-all duration-300 flex-1",
                      chatOpen ? "flex-1" : "flex-1",
                    )}
                  >
                    <TopNav
                      onMenuClick={() => setSidebarOpen(true)}
                      onChatToggle={() => setChatOpen(!chatOpen)}
                      chatOpen={chatOpen}
                    />
                    <main
                      id="main-content"
                      tabIndex={-1}
                      className={cn(
                        "flex-1 overflow-y-auto focus:outline-none",
                        isPaddedPage && "p-6",
                      )}
                    >
                      {children}
                    </main>
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
            </SimulationProvider>
          </PermissionAwareLayout>
        </WhiteLabelProvider>
      </EntityProvider>
    </SessionProvider>
  );
}
