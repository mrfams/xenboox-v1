'use client'

import { type ReactNode } from 'react'
import { Button } from '@/components/ui'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

type TabItem = {
  value: string
  label: string
  content: ReactNode
}

type DetailShellProps = {
  title: string
  description?: string
  backHref?: string
  actions?: ReactNode
  children?: ReactNode
  tabs?: TabItem[]
}

export function DetailShell({
  title,
  description,
  backHref,
  actions,
  children,
  tabs,
}: DetailShellProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          {backHref && (
            <Link
              href={backHref}
              className="mt-1 inline-flex items-center justify-center rounded-md p-1 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
          )}
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {tabs ? (
        <Tabs defaultValue={tabs[0]?.value}>
          <TabsList>
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value}>
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {tabs.map((tab) => (
            <TabsContent key={tab.value} value={tab.value}>
              {tab.content}
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        children
      )}
    </div>
  )
}
