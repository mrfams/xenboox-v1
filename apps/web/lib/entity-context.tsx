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
};

const EntityContext = createContext<EntityContextValue>({
  entityId: null,
  setEntityId: (_id: string, _role?: string) => {},
  clearEntityId: () => {},
  isLoaded: false,
  entityRole: null,
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
  const [isLoaded, setIsLoaded] = useState(false);
  const { data: session, status } = useSession();
  const hasInitialized = useRef(false);
  const utils = trpc.useUtils();

  const setLastUsedEntityMutation =
    trpc.organization.setLastUsedEntity.useMutation();

  useEffect(() => {
    // Wait for the session to actually load before initializing. Initializing
    // while `session` is still undefined (auth loading) would permanently
    // skip the server-side lastUsedEntityId fallback (hasInitialized guard).
    if (hasInitialized.current) return;
    if (status === "loading" || session === undefined) return;
    hasInitialized.current = true;

    const stored = localStorage.getItem("currentEntityId");
    const storedRole = localStorage.getItem("currentEntityRole");

    if (stored) {
      setEntityIdState(stored);
      if (storedRole) setEntityRole(storedRole);
      setIsLoaded(true);
    } else {
      // Fallback to server-side lastUsedEntityId from session
      const serverEntityId = (session as unknown as Record<string, unknown>)
        ?.lastUsedEntityId as string | null;
      if (serverEntityId) {
        localStorage.setItem("currentEntityId", serverEntityId);
        setEntityIdState(serverEntityId);
      }
      setIsLoaded(true);
    }
  }, [session, status]);

  const setEntityId = useCallback(
    (id: string, role?: string) => {
      localStorage.setItem("currentEntityId", id);
      if (role) {
        localStorage.setItem("currentEntityRole", role);
        setEntityRole(role);
      }
      setEntityIdState(id);
      // Persist to server for cross-device sync
      setLastUsedEntityMutation.mutate({ entityId: id });
    },
    [setLastUsedEntityMutation],
  );

  const clearEntityId = useCallback(() => {
    localStorage.removeItem("currentEntityId");
    localStorage.removeItem("currentEntityRole");
    setEntityIdState(null);
    setEntityRole(null);
  }, []);

  return (
    <EntityContext.Provider
      value={{ entityId, setEntityId, clearEntityId, isLoaded, entityRole }}
    >
      {children}
    </EntityContext.Provider>
  );
}
