import { createTRPCReact, httpBatchLink } from "@trpc/react-query";
import type { AppRouter } from "@xenboox/api/app-router";
import { getApiUrl } from "@/constants/config";
import { getToken, getCurrentEntityId } from "./auth";
import { readCacheLink } from "./read-cache-link";

export const trpc = createTRPCReact<AppRouter>();

export function createTRPCClient() {
  return trpc.createClient({
    links: [
      readCacheLink,
      httpBatchLink({
        url: `${getApiUrl()}/api/trpc`,
        async headers() {
          const token = await getToken();
          const entityId = await getCurrentEntityId();

          return {
            Authorization: token ? `Bearer ${token}` : "",
            "x-entity-id": entityId || "",
          };
        },
      }),
    ],
  });
}
