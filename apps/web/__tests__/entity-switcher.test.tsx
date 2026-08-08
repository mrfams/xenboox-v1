import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import { EntitySwitcher } from "@/components/layout/entity-switcher";
import { TRPCProvider } from "@/lib/trpc/provider";

const entityCtx = { setEntityId: vi.fn() };

vi.mock("@/lib/entity-context", () => ({
  useEntity: () => ({
    entityId: null,
    setEntityId: entityCtx.setEntityId,
    clearEntityId: vi.fn(),
    isLoaded: true,
    entityRole: null,
  }),
}));

// EntitySwitcher reads the auth session for its greeting — stub it so the
// component can render without a SessionProvider in unit tests.
vi.mock("next-auth/react", () => ({
  useSession: () => ({
    data: { user: { name: "Test User" } },
    status: "authenticated",
  }),
  signOut: vi.fn(),
}));

/**
 * Mock global fetch to serve the tRPC v11 endpoints EntitySwitcher calls:
 *   - organization.listUserEntities (GET, query)
 *   - organization.list (GET, query — enabled when the dialog opens)
 *   - organization.create (POST mutation → org + default entity)
 *   - organization.createEntity (POST mutation → new entity)
 *
 * Queries resolve to empty lists; mutations resolve to the payloads below.
 * Records every (url, init) pair so tests can assert the wire format.
 */
function makeFetchMock() {
  const calls: Array<{ url: string; method: string; body?: unknown }> = [];
  const fetchMock = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      calls.push({
        url,
        method,
        body: init?.body ? JSON.parse(String(init.body)) : undefined,
      });

      // tRPC v11 httpBatchLink sends batch=1 and expects an ARRAY of results:
      // [{ result: { data } }]. Queries resolve to empty data.
      const empty = {
        ok: true,
        json: async () => [{ result: { data: [] } }],
      };

      if (method === "GET") return empty;

      // Mutations: route by procedure name embedded in the URL.
      // NOTE: check createEntity BEFORE the broader `organization.create`
      // substring, since "organization.createEntity" contains it.
      if (url.includes("organization.createEntity")) {
        return {
          ok: true,
          json: async () => [
            {
              result: {
                data: { id: "entity-1", name: "My Business", type: "company" },
              },
            },
          ],
        };
      }
      if (url.includes("organization.create")) {
        return {
          ok: true,
          json: async () => [
            {
              result: {
                data: {
                  organization: { id: "org-1", name: "My Organization" },
                  entity: { id: "entity-0", name: "My Organization" },
                },
              },
            },
          ],
        };
      }
      return empty;
    },
  );
  return { fetchMock, calls };
}

describe("EntitySwitcher — create entity flow", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let calls: Array<{ url: string; method: string; body?: unknown }>;

  beforeEach(() => {
    entityCtx.setEntityId.mockReset();
    const mock = makeFetchMock();
    fetchMock = mock.fetchMock;
    calls = mock.calls;
    vi.stubGlobal("fetch", fetchMock);
  });

  it("shows a DIRECT create button (no dropdown) when the user has no entities", async () => {
    render(
      <TRPCProvider>
        <EntitySwitcher />
      </TRPCProvider>,
    );

    // Zero entities → the header must NOT render a "Select entity" dropdown
    // trigger. It shows one prominent "Create entity" button instead.
    const directCreate = await screen.findByRole("button", {
      name: /create entity/i,
    });
    expect(directCreate).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /select entity/i }),
    ).not.toBeInTheDocument();

    // Clicking it opens the create dialog immediately — no dropdown hop.
    fireEvent.click(directCreate);
    expect(
      await screen.findByPlaceholderText(/acme corp/i),
    ).toBeInTheDocument();
  });

  it("renders the dropdown switcher when entities exist", async () => {
    // Override the GET response so listUserEntities returns one entity.
    fetchMock.mockImplementation(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        if (init?.method !== "POST") {
          return {
            ok: true,
            json: async () => [
              {
                result: {
                  data: [{ id: "entity-1", name: "Kerr Jula", role: "owner" }],
                },
              },
            ],
          };
        }
        if (url.includes("organization.createEntity")) {
          return {
            ok: true,
            json: async () => [
              {
                result: {
                  data: { id: "entity-2", name: "Branch" },
                },
              },
            ],
          };
        }
        if (url.includes("organization.create")) {
          return {
            ok: true,
            json: async () => [
              {
                result: {
                  data: {
                    organization: { id: "org-1" },
                    entity: { id: "entity-0" },
                  },
                },
              },
            ],
          };
        }
        return { ok: true, json: async () => [{ result: { data: [] } }] };
      },
    );

    render(
      <TRPCProvider>
        <EntitySwitcher />
      </TRPCProvider>,
    );

    // With entities present, the switcher dropdown renders (the trigger shows
    // the current entity name when one is selected; the test mock leaves
    // entityId null, so it falls back to "Select entity"). The entity itself
    // and the "Create new entity" action live inside the dropdown.
    const trigger = await screen.findByRole("button", {
      name: /select entity/i,
    });
    fireEvent.click(trigger);
    expect(
      await screen.findByRole("button", { name: /create new entity/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Kerr Jula")).toBeInTheDocument();
  });

  it("creates the entity through the tRPC v11 client and switches to it", async () => {
    render(
      <TRPCProvider>
        <EntitySwitcher />
      </TRPCProvider>,
    );

    // No entities → direct create button in the header, no dropdown hop.
    const directCreate = await screen.findByRole("button", {
      name: /create entity/i,
    });
    fireEvent.click(directCreate);

    const nameInput = await screen.findByPlaceholderText(/acme corp/i);
    fireEvent.change(nameInput, { target: { value: "My Business" } });
    fireEvent.click(screen.getByTestId("create-entity-dialog-submit"));

    await waitFor(() => {
      expect(entityCtx.setEntityId).toHaveBeenCalledWith("entity-1", "admin");
    });

    // A POST mutation went out for organization.createEntity
    const mutation = calls.find((c) =>
      c.url.includes("organization.createEntity"),
    );
    expect(mutation).toBeDefined();
    expect(mutation!.method).toBe("POST");

    // tRPC v11 httpBatchLink envelope: {"0":{...}} — with the server's
    // `transformer: undefined`, the mutation input sits DIRECTLY under the
    // batch key with NO `json` wrapper, carrying the typed fields.
    const envelope = mutation!.body as Record<string, Record<string, unknown>>;
    expect(Object.keys(envelope).length).toBeGreaterThan(0);
    const payload = Object.values(envelope)[0];
    expect(payload.name).toBe("My Business");
    expect(payload.type).toBe("company");
    expect(payload.organizationId).toBe("org-1");
  });

  it("surfaces the server error message when creation fails", async () => {
    fetchMock.mockImplementation(
      async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? "GET";
        if (method === "GET") {
          return { ok: true, json: async () => [{ result: { data: [] } }] };
        }
        if (url.includes("organization.createEntity")) {
          // tRPC v11 wire error shape: message + NUMERIC JSONRPC2 code
          // (CONFLICT = 2009) + data { code key, httpStatus }. transformResult
          // rejects non-numeric `error.code`.
          return {
            ok: true,
            json: async () => [
              {
                error: {
                  message: "Slug already taken",
                  code: 2009,
                  data: { code: "CONFLICT", httpStatus: 409 },
                },
              },
            ],
          };
        }
        if (url.includes("organization.create")) {
          // Org creation succeeds — the FAILURE happens on createEntity.
          return {
            ok: true,
            json: async () => [
              {
                result: {
                  data: {
                    organization: { id: "org-1", name: "My Organization" },
                    entity: { id: "entity-0", name: "My Organization" },
                  },
                },
              },
            ],
          };
        }
        return { ok: true, json: async () => [{ result: { data: {} } }] };
      },
    );

    render(
      <TRPCProvider>
        <EntitySwitcher />
      </TRPCProvider>,
    );

    // Empty state → direct create button opens the dialog immediately.
    const directCreate = await screen.findByRole("button", {
      name: /create entity/i,
    });
    fireEvent.click(directCreate);

    const nameInput = await screen.findByPlaceholderText(/acme corp/i);
    fireEvent.change(nameInput, { target: { value: "Duplicate" } });
    fireEvent.click(screen.getByTestId("create-entity-dialog-submit"));

    await waitFor(() => {
      expect(screen.getByText("Slug already taken")).toBeInTheDocument();
    });
    expect(entityCtx.setEntityId).not.toHaveBeenCalled();
  });
});
