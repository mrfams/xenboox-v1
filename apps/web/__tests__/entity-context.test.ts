import { describe, it, expect } from "vitest";

import { resolveInitialEntityId } from "@/lib/entity-context";

const accessible = [
  { id: "entity-1", role: "owner" },
  { id: "entity-2", role: "admin" },
];

describe("resolveInitialEntityId", () => {
  it("uses the stored id when it is still accessible", () => {
    expect(
      resolveInitialEntityId("entity-2", "admin", "entity-1", accessible),
    ).toEqual({ id: "entity-2", role: "admin" });
  });

  it("falls back to storedRole when the matched entity has no role", () => {
    expect(
      resolveInitialEntityId("entity-2", "accountant", null, [
        { id: "entity-2" },
      ]),
    ).toEqual({ id: "entity-2", role: "accountant" });
  });

  it("REJECTS a stale stored id that is no longer accessible — the core bug fix", () => {
    // A deleted entity / revoked access id must never be selected, because
    // every entity-scoped query would then 403.
    const result = resolveInitialEntityId(
      "ghost-entity",
      "owner",
      null,
      accessible,
    );
    expect(result).not.toBeNull();
    expect(result!.id).toBe("entity-1");
    expect(result!.role).toBe("owner");
  });

  it("prefers the valid server lastUsedEntityId over a stale stored id", () => {
    const result = resolveInitialEntityId(
      "ghost-entity",
      "owner",
      "entity-2",
      accessible,
    );
    expect(result!.id).toBe("entity-2");
    expect(result!.role).toBe("admin");
  });

  it("falls back to the first accessible entity when both are invalid", () => {
    const result = resolveInitialEntityId(
      "ghost-entity",
      "owner",
      "ghost-server",
      accessible,
    );
    expect(result!.id).toBe("entity-1");
  });

  it("returns null when the user has no accessible entities", () => {
    expect(
      resolveInitialEntityId("ghost-entity", "owner", "ghost-server", []),
    ).toBeNull();
  });

  it("returns null when stored and server ids are both null and nothing is accessible", () => {
    expect(resolveInitialEntityId(null, null, null, [])).toBeNull();
  });

  it("handles non-array accessible input defensively", () => {
    const result = resolveInitialEntityId(
      "ghost-entity",
      null,
      null,
      undefined as unknown as typeof accessible,
    );
    expect(result).toBeNull();
  });
});
