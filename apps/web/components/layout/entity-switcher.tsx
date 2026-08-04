"use client";

import { useEffect, useState, useCallback } from "react";
import { ChevronDown, Check, Building2, Plus, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui";
import { useEntity } from "@/lib/entity-context";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";

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
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newEntityName, setNewEntityName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const utils = trpc.useUtils();

  // Fetch entities
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
        // Silently fail
      }
    }

    if (isLoaded) fetchEntities();
  }, [isLoaded, entityId, setEntityId]);

  // Update current entity when entities or entityId changes
  useEffect(() => {
    if (entityId && entities.length > 0) {
      setCurrentEntity(entities.find((e) => e.id === entityId) ?? null);
    }
  }, [entityId, entities]);

  // Handle entity selection
  const handleSelect = useCallback(
    (entity: Entity) => {
      setEntityId(entity.id, entity.role);
      setIsOpen(false);
    },
    [setEntityId],
  );

  // Handle create entity
  const handleCreateEntity = useCallback(async () => {
    if (!newEntityName.trim()) return;

    setIsCreating(true);
    try {
      // First, get or create an organization
      const orgResponse = await fetch("/api/trpc/organization.list", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const orgData = await orgResponse.json();
      const orgs = orgData?.result?.data;

      let orgId: string;

      if (Array.isArray(orgs) && orgs.length > 0) {
        // Use existing organization
        orgId = orgs[0].id;
      } else {
        // Create a new organization
        const createOrgResponse = await fetch("/api/trpc/organization.create", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            0: {
              json: {
                name: "My Organization",
                slug: `org-${Date.now()}`,
                type: "business",
              },
            },
          }),
        });
        const createOrgData = await createOrgResponse.json();
        const org = createOrgData?.result?.data?.json;
        if (!org?.organization?.id) {
          throw new Error("Failed to create organization");
        }
        orgId = org.organization.id;
      }

      // Create the entity
      const createEntityResponse = await fetch(
        "/api/trpc/organization.createEntity",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            0: {
              json: {
                organizationId: orgId,
                name: newEntityName.trim(),
                type: "company",
                currency: "GMD",
                country: "GM",
              },
            },
          }),
        },
      );

      const createEntityData = await createEntityResponse.json();
      const entity = createEntityData?.result?.data?.json;

      if (entity?.id) {
        // Refresh entities list
        await utils.organization.listUserEntities.invalidate();

        // Select the new entity
        setEntityId(entity.id, "owner");
        setShowCreateDialog(false);
        setNewEntityName("");
        setIsOpen(false);
      }
    } catch (error) {
      console.error("Failed to create entity:", error);
    } finally {
      setIsCreating(false);
    }
  }, [newEntityName, setEntityId, utils]);

  // Loading state
  if (!isLoaded) {
    return (
      <Button variant="outline" size="sm" disabled className="min-w-[160px]">
        <Building2 className="mr-2 h-4 w-4" />
        Loading...
      </Button>
    );
  }

  // No entities - show create button
  if (entities.length === 0) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          className="min-w-[160px] justify-between"
          onClick={() => setShowCreateDialog(true)}
        >
          <span className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            <span className="text-sm">Create Entity</span>
          </span>
        </Button>

        {/* Create Entity Dialog */}
        {showCreateDialog && (
          <CreateEntityDialog
            isOpen={showCreateDialog}
            onClose={() => {
              setShowCreateDialog(false);
              setNewEntityName("");
            }}
            onCreate={handleCreateEntity}
            name={newEntityName}
            onNameChange={setNewEntityName}
            isCreating={isCreating}
          />
        )}
      </>
    );
  }

  // Has entities - show switcher
  return (
    <>
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
              {/* Entity list */}
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

              {/* Create new entity button */}
              <div className="border-t mt-1 pt-1">
                <button
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-sm outline-none hover:bg-accent text-primary"
                  onClick={() => {
                    setIsOpen(false);
                    setShowCreateDialog(true);
                  }}
                >
                  <Plus className="h-4 w-4 shrink-0" />
                  <span className="font-medium">Create new entity</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Create Entity Dialog */}
      {showCreateDialog && (
        <CreateEntityDialog
          isOpen={showCreateDialog}
          onClose={() => {
            setShowCreateDialog(false);
            setNewEntityName("");
          }}
          onCreate={handleCreateEntity}
          name={newEntityName}
          onNameChange={setNewEntityName}
          isCreating={isCreating}
        />
      )}
    </>
  );
}

// ─── Create Entity Dialog ───────────────────────────────────────────────

function CreateEntityDialog({
  isOpen,
  onClose,
  onCreate,
  name,
  onNameChange,
  isCreating,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: () => void;
  name: string;
  onNameChange: (value: string) => void;
  isCreating: boolean;
}) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />

      {/* Dialog */}
      <div className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md">
        <div className="rounded-xl border bg-card p-6 shadow-lg">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              <h2 className="text-sm font-semibold text-foreground">
                Create New Entity
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-accent transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Description */}
          <p className="text-xs text-muted-foreground mb-4">
            An entity represents a company, branch, or department with its own
            independent set of books.
          </p>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label
                htmlFor="entity-name"
                className="block text-xs font-medium text-foreground mb-1.5"
              >
                Entity Name *
              </label>
              <input
                id="entity-name"
                type="text"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="e.g., Acme Corp, Branch Office"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/30"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && name.trim()) {
                    onCreate();
                  }
                }}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={onCreate}
              disabled={!name.trim() || isCreating}
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Entity"
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
