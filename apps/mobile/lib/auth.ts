import * as SecureStore from "expo-secure-store"

const TOKEN_KEY = "xenboox_auth_token"
const ENTITY_KEY = "xenboox_entity_id"

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY)
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token)
}

export async function removeToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY)
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
  await Promise.all([removeToken(), removeCurrentEntityId()])
}
