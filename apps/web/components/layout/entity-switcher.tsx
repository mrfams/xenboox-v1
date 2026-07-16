"use client"

import { useEffect, useState } from "react"
import { ChevronDown, Check, Building2 } from "lucide-react"
import { Button } from "@/components/ui"
import { useEntity } from "@/lib/entity-context"
import { cn } from "@/lib/utils"

type Entity = {
  id: string
  name: string
  type: string
}

export function EntitySwitcher() {
  const { entityId, setEntityId, isLoaded } = useEntity()
  const [entities, setEntities] = useState<Entity[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [currentEntity, setCurrentEntity] = useState<Entity | null>(null)

  useEffect(() => {
    async function fetchEntities() {
      try {
        const response = await fetch("/api/trpc/organization.listEntities", {
          headers: {
            "x-entity-id": entityId || "",
          },
        })
        const data = await response.json()
        const result = data?.result?.data
        if (Array.isArray(result)) {
          setEntities(result)
          if (!entityId && result.length > 0) {
            setEntityId(result[0].id)
          }
        }
      } catch {
        // Silently fail — entities will load on next interaction
      }
    }

    if (isLoaded) fetchEntities()
  }, [isLoaded, entityId, setEntityId])

  useEffect(() => {
    if (entityId && entities.length > 0) {
      setCurrentEntity(entities.find((e) => e.id === entityId) ?? null)
    }
  }, [entityId, entities])

  if (!isLoaded) {
    return (
      <Button variant="outline" size="sm" disabled className="min-w-[160px]">
        <Building2 className="mr-2 h-4 w-4" />
        Loading...
      </Button>
    )
  }

  if (entities.length === 0) {
    return (
      <Button variant="outline" size="sm" disabled className="min-w-[160px]">
        <Building2 className="mr-2 h-4 w-4" />
        No entities
      </Button>
    )
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        className="min-w-[160px] justify-between"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="flex items-center gap-2 truncate">
          <Building2 className="h-4 w-4 shrink-0" />
          <span className="truncate">{currentEntity?.name ?? "Select entity"}</span>
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", isOpen && "rotate-180")} />
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 w-56 rounded-md border bg-popover p-1 shadow-md">
            {entities.map((entity) => (
              <button
                key={entity.id}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent",
                  entityId === entity.id && "bg-accent"
                )}
                onClick={() => {
                  setEntityId(entity.id)
                  setIsOpen(false)
                }}
              >
                <Check
                  className={cn(
                    "h-4 w-4 shrink-0",
                    entityId === entity.id ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex-1 text-left">
                  <p className="font-medium">{entity.name}</p>
                  <p className="text-xs text-muted-foreground">{entity.type}</p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
