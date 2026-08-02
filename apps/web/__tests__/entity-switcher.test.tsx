import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import { EntitySwitcher } from "@/components/layout/entity-switcher";

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

describe("EntitySwitcher — create entity flow", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    entityCtx.setEntityId.mockReset();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("posts the tRPC v11 mutation body (no `json` wrapper) and switches to the new entity", async () => {
    // listUserEntities (empty) then organization.create (success)
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: { data: [] } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            data: {
              organization: { id: "org-1" },
              entity: { id: "entity-1", name: "My Business" },
            },
          },
        }),
      });

    render(<EntitySwitcher />);

    const createTrigger = await screen.findByRole("button", {
      name: /create entity/i,
    });
    fireEvent.click(createTrigger);

    const dialog = await screen.findByRole("dialog");
    const nameInput = within(dialog).getByPlaceholderText("My Business");
    fireEvent.change(nameInput, { target: { value: "My Business" } });

    const submit = within(dialog).getByRole("button", {
      name: /create entity/i,
    });
    fireEvent.click(submit);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    const [, init] = fetchMock.mock.calls[1];
    expect(init.method).toBe("POST");
    const body = JSON.parse(init.body as string);
    expect(body.json).toBeUndefined();
    expect(body.name).toBe("My Business");
    expect(body.type).toBe("business");
    expect(body.slug).toMatch(/^my-business-[a-z0-9]+$/);

    await waitFor(() => {
      expect(entityCtx.setEntityId).toHaveBeenCalledWith("entity-1", "owner");
    });
  });

  it("surfaces the server error message when creation fails", async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: { data: [] } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          error: { message: "Slug already taken", code: "CONFLICT" },
        }),
      });

    render(<EntitySwitcher />);

    const createTrigger = await screen.findByRole("button", {
      name: /create entity/i,
    });
    fireEvent.click(createTrigger);

    const dialog = await screen.findByRole("dialog");
    fireEvent.change(within(dialog).getByPlaceholderText("My Business"), {
      target: { value: "Duplicate" },
    });
    fireEvent.click(
      within(dialog).getByRole("button", { name: /create entity/i }),
    );

    await waitFor(() => {
      expect(screen.getByText("Slug already taken")).toBeInTheDocument();
    });
    expect(entityCtx.setEntityId).not.toHaveBeenCalled();
  });
});
