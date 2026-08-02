"use client";

import { useState } from "react";
import { SessionProvider } from "next-auth/react";
import { EntityProvider, useEntity } from "@/lib/entity-context";
import { PermissionProvider, serializePermissions } from "@/lib/permissions";
import { Sidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/top-nav";
import { ChatPanel } from "@/components/layout/chat-panel";
import { WhiteLabelProvider } from "@/components/layout/white-label-provider";
import { Toaster } from "sonner";
import { trpc } from "@/lib/trpc/client";

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
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <SessionProvider>
      <EntityProvider>
        <WhiteLabelProvider>
          <PermissionAwareLayout>
            <div className="flex h-screen overflow-hidden">
              <Sidebar
                isOpen={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
              />

              <div className="flex flex-1 flex-col overflow-hidden">
                <TopNav
                  onMenuClick={() => setSidebarOpen(true)}
                  onChatToggle={() => setChatOpen(!chatOpen)}
                  chatOpen={chatOpen}
                />
                <main className="flex-1 overflow-y-auto p-2 sm:p-4 lg:p-6">
                  {children}
                </main>
              </div>

              <ChatPanel open={chatOpen} onClose={() => setChatOpen(false)} />
            </div>
            <Toaster position="top-right" richColors closeButton />
          </PermissionAwareLayout>
        </WhiteLabelProvider>
      </EntityProvider>
    </SessionProvider>
  );
}
