"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { ChevronDown, Check, Building2, Plus, X, Loader2 } from "lucide-react";

import { Button } from "@/components/ui";
import { useEntity } from "@/lib/entity-context";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import {
  useOtherEntityTasks,
  EntityTaskBadge,
} from "@/components/layout/entity-task-badge";

type Entity = {
  id: string;
  name: string;
  type?: string;
  role?: string;
  currency?: string;
};

export function EntitySwitcher() {
  const { entityId, setEntityId, isLoaded, entityCurrency } = useEntity();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [currentEntity, setCurrentEntity] = useState<Entity | null>(null);
  const [isSwitching, setIsSwitching] = useState(false);
  const switcherRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newEntityName, setNewEntityName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const utils = trpc.useUtils();

  // tRPC queries and mutations
  const listUserEntitiesQuery = trpc.organization.listUserEntities.useQuery(
    undefined,
    { enabled: isLoaded },
  );
  const listOrgsQuery = trpc.organization.list.useQuery(undefined, {
    enabled: isLoaded && showCreateDialog,
  });
  const createEntityMutation = trpc.organization.createEntity.useMutation();
  const createOrgMutation = trpc.organization.create.useMutation();

  // Fetch entities via tRPC
  useEffect(() => {
    if (listUserEntitiesQuery.data) {
      const result = listUserEntitiesQuery.data;
      if (Array.isArray(result)) {
        setEntities(result);
        // If no entity selected and we have entities, select the first one
        if (!entityId && result.length > 0) {
          setEntityId(result[0].id, result[0].role);
        }
      }
    }
  }, [listUserEntitiesQuery.data, entityId, setEntityId]);

  // Update current entity when entities or entityId changes
  useEffect(() => {
    if (entityId && entities.length > 0) {
      setCurrentEntity(entities.find((e) => e.id === entityId) ?? null);
    }
  }, [entityId, entities]);

  // Hover-open: same treatment as the avatar menu and notifications bell.
  // Opening is immediate; closing waits 150ms so the cursor can cross the gap
  // into the dropdown without flicker (re-entering cancels the pending close).
  // Click still toggles as a touch/keyboard fallback.
  useEffect(() => {
    return () => {
      if (closeTimer.current !== null) {
        window.clearTimeout(closeTimer.current);
      }
    };
  }, []);

  const openSwitcher = () => {
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
    setIsOpen(true);
  };

  const scheduleCloseSwitcher = () => {
    if (!isOpen) return;
    if (closeTimer.current !== null) {
      window.clearTimeout(closeTimer.current);
    }
    closeTimer.current = window.setTimeout(() => {
      setIsOpen(false);
      closeTimer.current = null;
    }, 150);
  };

  // Escape dismisses the hover-revealed menu without moving the pointer
  // (WCAG 1.4.13 — hover content should be dismissible).
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Handle entity selection with transition
  const handleSelect = useCallback(
    (entity: Entity) => {
      if (entity.id === entityId) {
        setIsOpen(false);
        return;
      }
      setIsSwitching(true);
      setEntityId(entity.id, entity.role);
      setIsOpen(false);
      // Brief transition feel — clear after data refetches
      const timer = setTimeout(() => setIsSwitching(false), 800);
      return () => clearTimeout(timer);
    },
    [setEntityId, entityId],
  );

  // Handle create entity using tRPC mutations
  const handleCreateEntity = useCallback(async () => {
    if (!newEntityName.trim()) return;

    setIsCreating(true);
    setCreateError(null);
    try {
      // Ensure the org list has resolved before deciding whether we need to
      // create a new organization (the query is only enabled once the dialog
      // is open, so it can still be loading on the very first submit).
      let orgs = listOrgsQuery.data;
      if (orgs === undefined && listOrgsQuery.isLoading) {
        orgs = await listOrgsQuery.refetch().then((r) => r.data);
      }
      let orgId: string;

      if (Array.isArray(orgs) && orgs.length > 0) {
        orgId = orgs[0].id;
      } else {
        // Create a new organization using tRPC mutation
        const org = await createOrgMutation.mutateAsync({
          name: "My Organization",
          slug: `org-${Date.now()}`,
          type: "business",
        });
        if (!org?.organization?.id) {
          throw new Error("Failed to create organization");
        }
        orgId = org.organization.id;
      }

      // Create the entity using tRPC mutation
      const entity = await createEntityMutation.mutateAsync({
        organizationId: orgId,
        name: newEntityName.trim(),
        type: "company",
        currency: "USD",
        country: "GM",
      });

      if (entity?.id) {
        // Refresh entities list
        await utils.organization.listUserEntities.invalidate();

        // Select the new entity
        setEntityId(entity.id, "admin");
        setShowCreateDialog(false);
        setNewEntityName("");
        setCreateError(null);
        setIsOpen(false);
      }
    } catch (error) {
      console.error("Failed to create entity:", error);
      let message = "Failed to create entity. Please try again.";
      if (error && typeof error === "object" && "message" in error) {
        const err = error as { message: string };
        if (err.message && !err.message.includes("unexpected error occurred")) {
          message = err.message;
        }
      } else if (typeof error === "string") {
        message = error;
      }
      setCreateError(message);
    } finally {
      setIsCreating(false);
    }
  }, [
    newEntityName,
    setEntityId,
    utils,
    createOrgMutation,
    createEntityMutation,
    listOrgsQuery,
  ]);

  const userRole = currentEntity?.role;
  const isOwnerOrAdmin = userRole === "owner" || userRole === "admin";
  const otherCounts = useOtherEntityTasks();

  // Loading state
  if (!isLoaded) {
    return (
      <Button variant="outline" size="sm" disabled className="min-w-[160px]">
        <Building2 className="mr-2 h-4 w-4" />
        Loading...
      </Button>
    );
  }

  // Empty state: the user has no entities yet. Instead of forcing them to
  // open a dropdown and pick "Create new entity", show a single, direct
  // create button right in the header — one click straight into the dialog.
  const hasNoEntities =
    entities.length === 0 && !listUserEntitiesQuery.isLoading;

  if (hasNoEntities) {
    return (
      <>
        <Button
          variant="default"
          size="sm"
          className="min-w-[180px]"
          data-testid="create-entity-empty-state"
          onClick={() => setShowCreateDialog(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Create entity
        </Button>

        {/* Create Entity Dialog */}
        {showCreateDialog && (
          <CreateEntityDialog
            isOpen={showCreateDialog}
            onClose={() => {
              setShowCreateDialog(false);
              setNewEntityName("");
              setCreateError(null);
            }}
            onCreate={handleCreateEntity}
            name={newEntityName}
            onNameChange={setNewEntityName}
            isCreating={isCreating}
            error={createError}
          />
        )}
      </>
    );
  }

  return (
    <>
      <div
        className="relative"
        ref={switcherRef}
        onMouseEnter={openSwitcher}
        onMouseLeave={scheduleCloseSwitcher}
      >
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "min-w-[180px] justify-between transition-all duration-200",
            isSwitching && "opacity-70",
          )}
          aria-expanded={isOpen}
          aria-haspopup="menu"
          onClick={() => setIsOpen(!isOpen)}
        >
          <span className="flex items-center gap-2 truncate">
            {isSwitching ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
            ) : (
              <Building2 className="h-4 w-4 shrink-0" />
            )}
            <span className="truncate text-sm font-medium">
              {currentEntity?.name ?? "Select entity"}
            </span>
            {entityCurrency && (
              <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[9px] font-bold tabular-nums text-muted-foreground">
                {entityCurrency}
              </span>
            )}
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
                <div key={entity.id} className="group relative">
                  <button
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
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-medium truncate">{entity.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                        {entity.type}
                        {entity.currency && (
                          <span className="rounded bg-muted px-1 py-0.5 text-[9px] font-bold tabular-nums">
                            {entity.currency}
                          </span>
                        )}
                        {entity.role && (
                          <span className="capitalize">
                            · {entity.role.replace(/_/g, " ")}
                          </span>
                        )}
                      </p>
                    </div>
                    <EntityTaskBadge
                      entityId={entity.id}
                      otherCounts={otherCounts}
                    />
                  </button>
                </div>
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
            setCreateError(null);
          }}
          onCreate={handleCreateEntity}
          name={newEntityName}
          onNameChange={setNewEntityName}
          isCreating={isCreating}
          error={createError}
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
  error,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: () => void;
  name: string;
  onNameChange: (value: string) => void;
  isCreating: boolean;
  error?: string | null;
}) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />

      {/* Dialog */}
      <div className="fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full max-w-md max-h-[85vh] overflow-y-auto">
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

          {/* Error message */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 mt-4">
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 mt-4">
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
              data-testid="create-entity-dialog-submit"
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
