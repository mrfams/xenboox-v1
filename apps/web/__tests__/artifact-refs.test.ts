import { describe, it, expect } from "vitest";

import { parseChatArtifacts, formatFileSize } from "@/lib/chat/artifact-types";

describe("parseChatArtifacts", () => {
  const ref = {
    artifactId: "art-1",
    name: "Profit & Loss - 2026-07.csv",
    docType: "Export",
    mimeType: "text/csv",
    sizeBytes: 512,
  };

  it("extracts artifacts from an object metadata (new jsonb shape)", () => {
    expect(parseChatArtifacts({ durationMs: 5, artifacts: [ref] })).toEqual([
      ref,
    ]);
  });

  it("extracts artifacts from a stringified metadata (legacy double-encoded rows)", () => {
    expect(
      parseChatArtifacts(JSON.stringify({ durationMs: 5, artifacts: [ref] })),
    ).toEqual([ref]);
  });

  it("returns an empty array for missing or malformed metadata", () => {
    expect(parseChatArtifacts(null)).toEqual([]);
    expect(parseChatArtifacts(undefined)).toEqual([]);
    expect(parseChatArtifacts({})).toEqual([]);
    expect(parseChatArtifacts("not json")).toEqual([]);
    expect(parseChatArtifacts({ artifacts: "nope" })).toEqual([]);
  });

  it("filters out malformed entries", () => {
    const result = parseChatArtifacts({
      artifacts: [ref, { artifactId: "x" }, null, 42],
    });
    expect(result).toEqual([ref]);
  });
});

describe("formatFileSize", () => {
  it("formats bytes, KB, and MB", () => {
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(12 * 1024)).toBe("12.0 KB");
    expect(formatFileSize(3 * 1024 * 1024)).toBe("3.0 MB");
  });

  it("returns an empty string for missing sizes", () => {
    expect(formatFileSize(undefined)).toBe("");
    expect(formatFileSize(null)).toBe("");
    expect(formatFileSize(0)).toBe("");
  });
});
