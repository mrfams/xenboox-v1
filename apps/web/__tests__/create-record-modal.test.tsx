import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FileText } from "lucide-react";

import { CreateRecordModal } from "@/components/dashboard/create-record-modal";

const storage = new Map<string, string>();
const localStorageMock: Storage = {
  getItem: (k) => storage.get(k) ?? null,
  setItem: (k, v) => {
    storage.set(k, String(v));
  },
  removeItem: (k) => {
    storage.delete(k);
  },
  clear: () => {
    storage.clear();
  },
  key: (i) => [...storage.keys()][i] ?? null,
  get length() {
    return storage.size;
  },
};

beforeEach(() => {
  vi.stubGlobal("localStorage", localStorageMock);
  storage.clear();
});

describe("CreateRecordModal", () => {
  it("renders the title, subtitle and children", () => {
    render(
      <CreateRecordModal
        title="New vendor"
        subtitle="Add a supplier to your books"
        icon={<FileText className="h-4 w-4" />}
        onClose={() => {}}
      >
        <p>Modal body content</p>
      </CreateRecordModal>,
    );

    expect(screen.getByText("New vendor")).toBeTruthy();
    expect(screen.getByText("Add a supplier to your books")).toBeTruthy();
    expect(screen.getByText("Modal body content")).toBeTruthy();
  });

  it("locks body scroll while open and restores it on close", () => {
    const { unmount } = render(
      <CreateRecordModal
        title="New vendor"
        icon={<FileText className="h-4 w-4" />}
        onClose={() => {}}
      >
        <p>Body</p>
      </CreateRecordModal>,
    );

    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).toBe("");
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    render(
      <CreateRecordModal
        title="New vendor"
        icon={<FileText className="h-4 w-4" />}
        onClose={onClose}
      >
        <p>Body</p>
      </CreateRecordModal>,
    );

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders the footer actions when provided", () => {
    render(
      <CreateRecordModal
        title="New vendor"
        icon={<FileText className="h-4 w-4" />}
        onClose={() => {}}
        footer={<button type="button">Create vendor</button>}
      >
        <p>Body</p>
      </CreateRecordModal>,
    );

    expect(screen.getByRole("button", { name: "Create vendor" })).toBeTruthy();
  });
});
