import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getCurrentEntityId, setCurrentEntityId } from "./auth";

type Entity = {
  id: string;
  name: string;
  type: string;
};

type EntityContextValue = {
  entityId: string | null;
  setEntityId: (id: string) => void;
  clearEntityId: () => void;
  isLoaded: boolean;
  entities: Entity[];
  currentEntity: Entity | null;
};

const EntityContext = createContext<EntityContextValue>({
  entityId: null,
  setEntityId: () => {},
  clearEntityId: () => {},
  isLoaded: false,
  entities: [],
  currentEntity: null,
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
  const [entities, setEntities] = useState<Entity[]>([]);
  const [currentEntity, setCurrentEntity] = useState<Entity | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    async function init() {
      const id = await getCurrentEntityId();
      setEntityIdState(id);
      setIsLoaded(true);
    }
    init();
  }, []);

  useEffect(() => {
    async function fetchEntities() {
      if (!isLoaded) return;
      try {
        const token = await (await import("./auth")).getToken();
        const { getApiUrl } = await import("./config");
        const response = await fetch(
          `${getApiUrl()}/api/trpc/organization.listEntities`,
          {
            headers: {
              Authorization: token ? `Bearer ${token}` : "",
              "x-entity-id": entityId || "",
            },
          },
        );
        const data = await response.json();
        const result = data?.result?.data;
        if (Array.isArray(result)) {
          setEntities(result);
          if (!entityId && result.length > 0) {
            setEntityId(result[0].id);
          }
        }
      } catch {
        // Silently fail
      }
    }
    fetchEntities();
  }, [isLoaded, entityId]);

  useEffect(() => {
    if (entityId && entities.length > 0) {
      setCurrentEntity(entities.find((e) => e.id === entityId) ?? null);
    }
  }, [entityId, entities]);

  const setEntityId = (id: string) => {
    setEntityIdState(id);
  };

  const clearEntityId = () => {
    setEntityIdState(null);
    setCurrentEntity(null);
  };

  return (
    <EntityContext.Provider
      value={{
        entityId,
        setEntityId,
        clearEntityId,
        isLoaded,
        entities,
        currentEntity,
      }}
    >
      {children}
    </EntityContext.Provider>
  );
}
