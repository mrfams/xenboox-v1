"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ChevronDown,
  Check,
  Building2,
  Plus,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@xenboox/ui";
import { useEntity } from "@/lib/entity-context";
import { cn } from "@/lib/utils";

function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "entity"
  );
}

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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [entityName, setEntityName] = useState("");
  const [entityType, setEntityType] = useState("business");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

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

  // Defined before early returns so it's available in all code paths
  const handleCreateEntity = useCallback(async () => {
    if (!entityName.trim()) return;
    setCreating(true);
    setError("");

    try {
      const slug = slugify(entityName) + "-" + Date.now().toString(36);
      const response = await fetch("/api/trpc/organization.create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: entityName.trim(),
          slug,
          type: entityType,
        }),
      });
      const data = await response.json();
      if (data?.error) {
        setError(data.error.message || "Failed to create entity");
        return;
      }
      const entity = data?.result?.data?.entity;
      if (entity) {
        setEntityId(entity.id, "owner");
        setDialogOpen(false);
        setEntityName("");
        setEntityType("business");
      } else {
        setError("Unexpected response from server");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setCreating(false);
    }
  }, [entityName, entityType, setEntityId]);

  const handleSelect = useCallback(
    (entity: Entity) => {
      setEntityId(entity.id, entity.role);
      setIsOpen(false);
    },
    [setEntityId],
  );

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
      <>
        <Button
          variant="outline"
          size="sm"
          className="min-w-[160px]"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Entity
        </Button>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create your first entity</DialogTitle>
              <DialogDescription>
                An entity is your business, company, or organization in Xenboox.
                All your financial data lives under an entity.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Entity name</label>
                <input
                  type="text"
                  value={entityName}
                  onChange={(e) => setEntityName(e.target.value)}
                  placeholder="My Business"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Entity type</label>
                <select
                  value={entityType}
                  onChange={(e) => setEntityType(e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-shadow"
                >
                  <option value="business">Business</option>
                  <option value="nonprofit">Nonprofit</option>
                  <option value="government">Government</option>
                  <option value="accounting_firm">Accounting Firm</option>
                </select>
              </div>

              {entityName.trim() && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-muted-foreground">
                    Slug (auto-generated)
                  </label>
                  <p className="text-xs text-muted-foreground break-all">
                    {slugify(entityName)}-{Date.now().toString(36)}
                  </p>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateEntity}
                disabled={!entityName.trim() || creating}
              >
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {creating ? "Creating..." : "Create Entity"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

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
