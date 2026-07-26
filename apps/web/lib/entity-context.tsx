"use client";

import {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
  type ReactNode,
} from "react";

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

  useEffect(() => {
    const stored = localStorage.getItem("currentEntityId");
    const storedRole = localStorage.getItem("currentEntityRole");
    if (stored) setEntityIdState(stored);
    if (storedRole) setEntityRole(storedRole);
    setIsLoaded(true);
  }, []);

  const setEntityId = useCallback((id: string, role?: string) => {
    localStorage.setItem("currentEntityId", id);
    if (role) {
      localStorage.setItem("currentEntityRole", role);
      setEntityRole(role);
    }
    setEntityIdState(id);
  }, []);

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
