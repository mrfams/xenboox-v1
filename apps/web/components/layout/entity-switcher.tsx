"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronDown, Check, Building2 } from "lucide-react";
import { Button } from "@/components/ui";
import { useEntity } from "@/lib/entity-context";
import { cn } from "@/lib/utils";

type Entity = {
  id: string;
  name: string;
  type: string;
  role?: string;
};

export function EntitySwitcher() {
  const { entityId, setEntityId, isLoaded } = useEntity();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [currentEntity, setCurrentEntity] = useState<Entity | null>(null);

  useEffect(() => {
    async function fetchEntities() {
      try {
        const response = await fetch(
          "/api/trpc/organization.listUserEntities",
          {
            headers: {
              "x-entity-id": entityId || "",
            },
          },
        );
        const data = await response.json();
        const result = data?.result?.data;
        if (Array.isArray(result)) {
          setEntities(result);
          if (!entityId && result.length > 0) {
            setEntityId(result[0].id, result[0].role);
          }
        }
      } catch {
        // Silently fail — entities will load on next interaction
      }
    }

    if (isLoaded) fetchEntities();
  }, [isLoaded, entityId, setEntityId]);

  useEffect(() => {
    if (entityId && entities.length > 0) {
      setCurrentEntity(entities.find((e) => e.id === entityId) ?? null);
    }
  }, [entityId, entities]);

  if (!isLoaded) {
    return (
      <Button variant="outline" size="sm" disabled className="min-w-[160px]">
        <Building2 className="mr-2 h-4 w-4" />
        Loading...
      </Button>
    );
  }

  if (entities.length === 0) {
    return (
      <Button variant="outline" size="sm" disabled className="min-w-[160px]">
        <Building2 className="mr-2 h-4 w-4" />
        No entities
      </Button>
    );
  }

  const handleSelect = useCallback(
    (entity: Entity) => {
      setEntityId(entity.id, entity.role);
      setIsOpen(false);
    },
    [setEntityId],
  );

  return (
    <div className="relative">
      <Button
        variant="outline"
        size="sm"
        className="min-w-[180px] justify-between"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="flex items-center gap-2 truncate">
          <Building2 className="h-4 w-4 shrink-0" />
          <span className="truncate text-sm font-medium">
            {currentEntity?.name ?? "Select entity"}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 transition-transform",
            isOpen && "rotate-180",
          )}
        />
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 left-0 top-full z-50 mt-1 w-full rounded-md border bg-popover p-1 shadow-md">
            {entities.map((entity) => (
              <button
                key={entity.id}
                className={cn(
                  "flex w-full items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none hover:bg-accent",
                  entityId === entity.id && "bg-accent",
                )}
                onClick={() => handleSelect(entity)}
              >
                <Check
                  className={cn(
                    "h-4 w-4 shrink-0",
                    entityId === entity.id ? "opacity-100" : "opacity-0",
                  )}
                />
                <div className="flex-1 text-left">
                  <p className="font-medium truncate">{entity.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    {entity.type}
                    {entity.role && (
                      <span className="capitalize">
                        · {entity.role.replace(/_/g, " ")}
                      </span>
                    )}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
