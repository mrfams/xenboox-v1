"use client"

import { useState } from "react"
import { SessionProvider } from "next-auth/react"
import { TRPCProvider } from "@/lib/trpc/provider"
import { EntityProvider } from "@/lib/entity-context"
import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { Toaster } from "sonner"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <SessionProvider>
      <TRPCProvider>
        <EntityProvider>
          <div className="flex h-screen overflow-hidden">
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <div className="flex flex-1 flex-col overflow-hidden">
              <TopNav onMenuClick={() => setSidebarOpen(true)} />
              <main className="flex-1 overflow-y-auto p-4 lg:p-6">
                {children}
              </main>
            </div>
          </div>
          <Toaster position="top-right" richColors closeButton />
        </EntityProvider>
      </TRPCProvider>
    </SessionProvider>
  )
}
