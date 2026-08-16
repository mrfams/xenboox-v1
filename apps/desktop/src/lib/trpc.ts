import { createTRPCReact, httpBatchLink } from "@trpc/react-query";
import type { AppRouter } from "@xenboox/api/app-router";
import { getCurrentEntityId, getToken } from "./auth";
import { getApiUrl } from "./config";

export const trpc = createTRPCReact<AppRouter>();

export function createTRPCClient() {
  return trpc.createClient({
    links: [
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
