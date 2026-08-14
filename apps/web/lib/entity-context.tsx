"use client";

import {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
  useRef,
  type ReactNode,
} from "react";
import { useSession } from "next-auth/react";

import { trpc } from "@/lib/trpc/client";

type EntityContextValue = {
  entityId: string | null;
  setEntityId: (id: string, role?: string) => void;
  clearEntityId: () => void;
  isLoaded: boolean;
  entityRole: string | null;
  /** ISO currency code of the active entity (e.g. "GMD") — drives form defaults */
  entityCurrency: string | null;
};

type AccessibleEntity = { id: string; role?: string };

/**
 * Resolves the initial entity for a user — pure, unit-testable.
 *
 * Order of preference (all validated against the user's CURRENTLY
 * accessible entities so a stale localStorage id can never lock the
 * dashboard out of its data):
 *
 *   1. localStorage `currentEntityId` — but ONLY if it is still in the
 *      accessible list. A stale id (deleted entity, revoked access, or
 *      an id from a different account/DB) is rejected here.
 *   2. Server `lastUsedEntityId` from the session — again validated.
 *   3. First accessible entity.
 *   4. null (no accessible entities).
 *
 * Returns the resolved id + role, or null when nothing is usable.
 */
export function resolveInitialEntityId(
  storedId: string | null,
  storedRole: string | null,
  serverEntityId: string | null,
  accessible: AccessibleEntity[],
): { id: string; role: string | null } | null {
  if (!Array.isArray(accessible)) accessible = [];
  const byId = new Map(accessible.map((e) => [e.id, e]));

  if (storedId && byId.has(storedId)) {
    const match = byId.get(storedId)!;
    return { id: storedId, role: storedRole ?? match.role ?? null };
  }

  if (serverEntityId && byId.has(serverEntityId)) {
    const match = byId.get(serverEntityId)!;
    return { id: serverEntityId, role: match.role ?? null };
  }

  if (accessible.length > 0) {
    return { id: accessible[0].id, role: accessible[0].role ?? null };
  }

  return null;
}

const EntityContext = createContext<EntityContextValue>({
  entityId: null,
  setEntityId: (_id: string, _role?: string) => {},
  clearEntityId: () => {},
  isLoaded: false,
  entityRole: null,
  entityCurrency: null,
});

export function useEntity() {
  const context = useContext(EntityContext);
  if (!context) {
    throw new Error("useEntity must be used within an EntityProvider");
  }
  return context;
}

export function EntityProvider({ children }: { children: ReactNode }) {
  const [entityId, setEntityIdState] = useState<string | null>(null);
  const [entityRole, setEntityRole] = useState<string | null>(null);
  const [entityCurrency, setEntityCurrency] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const { data: session, status } = useSession();
  const hasInitialized = useRef(false);

  const setLastUsedEntityMutation =
    trpc.organization.setLastUsedEntity.useMutation();

  // The user's CURRENTLY accessible entities — used to validate the
  // stored entity id so a stale localStorage id can never 403 every
  // entity-scoped query on the dashboard (see resolveInitialEntityId).
  // `listUserEntities` is an authProcedure, so it works BEFORE any entity
  // is selected (no chicken-and-egg).
  const listEntitiesQuery = trpc.organization.listUserEntities.useQuery(
    undefined,
    {
      enabled: status === "authenticated",
      staleTime: 60_000,
      retry: 1,
    },
  );

  useEffect(() => {
    // Wait for the session to actually load before initializing. Initializing
    // while `session` is still undefined (auth loading) would permanently
    // skip the server-side lastUsedEntityId fallback (hasInitialized guard).
    if (hasInitialized.current) return;
    if (status === "loading" || session === undefined) return;

    // If the user is authenticated but their entity list hasn't resolved
    // yet (first paint / slow network), wait for it so we never pick a
    // stale id. The query is enabled only when authenticated, so this
    // settles quickly. Unauthenticated users fall straight through.
    if (status === "authenticated" && listEntitiesQuery.isLoading) return;
    hasInitialized.current = true;

    const stored = localStorage.getItem("currentEntityId");
    const storedRole = localStorage.getItem("currentEntityRole");
    const serverEntityId = (session as unknown as Record<string, unknown>)
      ?.lastUsedEntityId as string | null;

    // If the accessibility query itself failed (offline / server error),
    // fall back to the server-side lastUsedEntityId — it was validated at
    // sign-in by ensureLastUsedEntity — rather than locking the user out.
    let resolved: ReturnType<typeof resolveInitialEntityId>;
    if (listEntitiesQuery.isError) {
      resolved = serverEntityId
        ? { id: serverEntityId, role: storedRole }
        : stored
          ? { id: stored, role: storedRole }
          : null;
    } else {
      resolved = resolveInitialEntityId(
        stored,
        storedRole,
        serverEntityId,
        listEntitiesQuery.data ?? [],
      );
    }

    if (resolved) {
      localStorage.setItem("currentEntityId", resolved.id);
      if (resolved.role) {
        localStorage.setItem("currentEntityRole", resolved.role);
        setEntityRole(resolved.role);
      }
      setEntityIdState(resolved.id);
      // Resolve the active entity's currency for form defaults (§6.3).
      const active = (listEntitiesQuery.data ?? []).find(
        (e: { id: string }) => e.id === resolved.id,
      );
      setEntityCurrency(
        (active as { currency?: string } | undefined)?.currency ?? null,
      );
    } else {
      // No accessible entity — clear any stale selection so downstream
      // entity-scoped queries fail cleanly instead of 403ing on a ghost id.
      localStorage.removeItem("currentEntityId");
      localStorage.removeItem("currentEntityRole");
      setEntityIdState(null);
      setEntityRole(null);
      setEntityCurrency(null);
    }
    setIsLoaded(true);
  }, [
    session,
    status,
    listEntitiesQuery.data,
    listEntitiesQuery.isLoading,
    listEntitiesQuery.isError,
  ]);

  const setEntityId = useCallback(
    (id: string, role?: string) => {
      if (!id) {
        // Empty id = "no entity selected". Mirror clearEntityId semantics
        // without touching localStorage keys other callers may rely on.
        localStorage.removeItem("currentEntityId");
        localStorage.removeItem("currentEntityRole");
        setEntityIdState(null);
        setEntityRole(null);
        return;
      }
      localStorage.setItem("currentEntityId", id);
      if (role) {
        localStorage.setItem("currentEntityRole", role);
        setEntityRole(role);
      }
      setEntityIdState(id);
      // Resolve the active entity's currency for form defaults (§6.3).
      const active = (listEntitiesQuery.data ?? []).find(
        (e: { id: string }) => e.id === id,
      );
      setEntityCurrency(
        (active as { currency?: string } | undefined)?.currency ?? null,
      );
      // Persist to server for cross-device sync
      setLastUsedEntityMutation.mutate({ entityId: id });
    },
    [setLastUsedEntityMutation, listEntitiesQuery.data],
  );

  const clearEntityId = useCallback(() => {
    localStorage.removeItem("currentEntityId");
    localStorage.removeItem("currentEntityRole");
    setEntityIdState(null);
    setEntityRole(null);
    setEntityCurrency(null);
  }, []);

  return (
    <EntityContext.Provider
      value={{
        entityId,
        setEntityId,
        clearEntityId,
        isLoaded,
        entityRole,
        entityCurrency,
      }}
    >
      {children}
    </EntityContext.Provider>
  );
}
