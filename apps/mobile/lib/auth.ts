import * as SecureStore from "expo-secure-store"

const TOKEN_KEY = "xenboox_auth_token"
const TOKEN_EXPIRY_KEY = "xenboox_token_expiry"
const ENTITY_KEY = "xenboox_entity_id"

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000 // 30 days

export async function getToken(): Promise<string | null> {
  const token = await SecureStore.getItemAsync(TOKEN_KEY)
  if (!token) return null

  const expiry = await SecureStore.getItemAsync(TOKEN_EXPIRY_KEY)
  if (expiry && Date.now() > parseInt(expiry, 10)) {
    await clearAuth()
    return null
  }

  return token
}

export async function setToken(token: string): Promise<void> {
  await Promise.all([
    SecureStore.setItemAsync(TOKEN_KEY, token),
    SecureStore.setItemAsync(TOKEN_EXPIRY_KEY, String(Date.now() + TOKEN_TTL_MS)),
  ])
}

export async function removeToken(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    SecureStore.deleteItemAsync(TOKEN_EXPIRY_KEY),
  ])
}

export async function getCurrentEntityId(): Promise<string | null> {
  return SecureStore.getItemAsync(ENTITY_KEY)
}

export async function setCurrentEntityId(entityId: string): Promise<void> {
  await SecureStore.setItemAsync(ENTITY_KEY, entityId)
}

export async function removeCurrentEntityId(): Promise<void> {
  await SecureStore.deleteItemAsync(ENTITY_KEY)
}

export async function clearAuth(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(TOKEN_KEY),
    SecureStore.deleteItemAsync(TOKEN_EXPIRY_KEY),
    SecureStore.deleteItemAsync(ENTITY_KEY),
  ])
}
