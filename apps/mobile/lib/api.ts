import { getApiUrl } from "@/constants/config"
import { getToken, getCurrentEntityId } from "./auth"

export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getToken()
  const entityId = await getCurrentEntityId()
  const baseUrl = getApiUrl()

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>)
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  if (entityId) {
    headers["x-entity-id"] = entityId
  }

  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers
  })
}
