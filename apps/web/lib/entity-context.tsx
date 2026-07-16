"use client"

import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from "react"

type EntityContextValue = {
  entityId: string | null
  setEntityId: (id: string) => void
  clearEntityId: () => void
  isLoaded: boolean
}

const EntityContext = createContext<EntityContextValue>({
  entityId: null,
  setEntityId: () => {},
  clearEntityId: () => {},
  isLoaded: false,
})

export function useEntity() {
  const context = useContext(EntityContext)
  if (!context) {
    throw new Error("useEntity must be used within an EntityProvider")
  }
  return context
}

export function EntityProvider({ children }: { children: ReactNode }) {
  const [entityId, setEntityIdState] = useState<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem("currentEntityId")
    if (stored) setEntityIdState(stored)
    setIsLoaded(true)
  }, [])

  const setEntityId = useCallback((id: string) => {
    localStorage.setItem("currentEntityId", id)
    setEntityIdState(id)
  }, [])

  const clearEntityId = useCallback(() => {
    localStorage.removeItem("currentEntityId")
    setEntityIdState(null)
  }, [])

  return (
    <EntityContext.Provider value={{ entityId, setEntityId, clearEntityId, isLoaded }}>
      {children}
    </EntityContext.Provider>
  )
}
