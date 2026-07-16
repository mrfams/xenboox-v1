const ENTITY_KEY = "xenboox_entity_id"

export async function getToken(): Promise<string | null> {
  return localStorage.getItem("xenboox_auth_token")
}

export async function setToken(token: string): Promise<void> {
  localStorage.setItem("xenboox_auth_token", token)
}

export async function removeToken(): Promise<void> {
  localStorage.removeItem("xenboox_auth_token")
}

export async function getCurrentEntityId(): Promise<string | null> {
  return localStorage.getItem(ENTITY_KEY)
}

export async function setCurrentEntityId(entityId: string): Promise<void> {
  localStorage.setItem(ENTITY_KEY, entityId)
}

export async function removeCurrentEntityId(): Promise<void> {
  localStorage.removeItem(ENTITY_KEY)
}

export async function clearAuth(): Promise<void> {
  localStorage.removeItem("xenboox_auth_token")
  localStorage.removeItem(ENTITY_KEY)
}
