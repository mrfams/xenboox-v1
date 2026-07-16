const ENTITY_KEY = "xenboox_entity_id"

async function invokeSafe<T>(cmd: string, args?: Record<string, unknown>): Promise<T | null> {
  try {
    const { invoke } = await import("@tauri-apps/api/core")
    return await invoke<T>(cmd, args)
  } catch {
    return null
  }
}

export async function getToken(): Promise<string | null> {
  const token = await invokeSafe<string>("get_auth_token")
  if (token) return token
  return localStorage.getItem("xenboox_auth_token")
}

export async function setToken(token: string): Promise<void> {
  localStorage.setItem("xenboox_auth_token", token)
  await invokeSafe("set_auth_token", { token })
}

export async function removeToken(): Promise<void> {
  localStorage.removeItem("xenboox_auth_token")
}

export async function getCurrentEntityId(): Promise<string | null> {
  const entity = await invokeSafe<{ id: string }>("get_current_entity")
  if (entity) return entity.id
  return localStorage.getItem(ENTITY_KEY)
}

export async function setCurrentEntityId(entityId: string): Promise<void> {
  localStorage.setItem(ENTITY_KEY, entityId)
  await invokeSafe("switch_entity", { entityId })
}

export async function removeCurrentEntityId(): Promise<void> {
  localStorage.removeItem(ENTITY_KEY)
}

export async function clearAuth(): Promise<void> {
  localStorage.removeItem("xenboox_auth_token")
  localStorage.removeItem(ENTITY_KEY)
  await invokeSafe("clear_auth_token")
}
