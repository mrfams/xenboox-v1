"use client";

import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type KeyboardEvent,
} from "react";
import { ChevronDown, X, Plus, Loader2, User } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────

type Customer = { id: string; name: string };

export interface CreatableComboboxProps {
  /** Currently selected item ID (empty string = none) */
  value: string;
  /** Called when an item is selected or cleared */
  onChange: (id: string) => void;
  /** List of existing items to search against */
  items: Customer[];
  /** Async function to create a new item from just a name. Returns the created item. */
  onCreate: (name: string) => Promise<Customer>;
  /** Placeholder text when no item is selected */
  placeholder?: string;
  /** Label shown in the "Create new" option (e.g. "customer", "vendor") */
  entityLabel?: string;
  /** Empty state message when no items exist at all */
  emptyMessage?: string;
  /** Disable the entire combobox */
  disabled?: boolean;
  /** Additional CSS classes for the outer wrapper */
  className?: string;
}

// ─── Component ─────────────────────────────────────────────────────────────

export function CreatableCombobox({
  value,
  onChange,
  items,
  onCreate,
  placeholder = "Search or type a name...",
  entityLabel = "item",
  emptyMessage,
  disabled = false,
  className,
}: CreatableComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // ── Selected customer name ──────────────────────────────────────────
  const selectedItem = items.find((c) => c.id === value);
  const displayValue = open ? query : (selectedItem?.name ?? "");

  // ── Filtered list ───────────────────────────────────────────────────
  const filtered = query.trim()
    ? items.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    : items;

  const showCreateOption =
    query.trim().length > 0 &&
    !items.some((c) => c.name.toLowerCase() === query.trim().toLowerCase());

  const totalOptions = filtered.length + (showCreateOption ? 1 : 0);

  // ── Close on outside click ──────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // ── Reset highlighted index when results change ─────────────────────
  useEffect(() => {
    setHighlightedIndex(0);
  }, [query, open]);

  // ── Scroll highlighted item into view ───────────────────────────────
  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    if (!list) return;
    const item = list.children[highlightedIndex] as HTMLElement | undefined;
    item?.scrollIntoView({ block: "nearest" });
  }, [highlightedIndex, open]);

  // ── Handlers ────────────────────────────────────────────────────────
  const handleOpen = useCallback(() => {
    if (disabled) return;
    setOpen(true);
    setQuery("");
    setHighlightedIndex(0);
    // Focus input after render
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [disabled]);

  const handleSelect = useCallback(
    (customerId: string) => {
      onChange(customerId);
      setOpen(false);
      setQuery("");
      inputRef.current?.blur();
    },
    [onChange],
  );

  const handleCreate = useCallback(
    async (name: string) => {
      setCreating(true);
      try {
        const created = await onCreate(name.trim());
        onChange(created.id);
        setOpen(false);
        setQuery("");
        inputRef.current?.blur();
      } catch {
        // Creation failed — keep open so user can retry or cancel
      } finally {
        setCreating(false);
      }
    },
    [onCreate, onChange],
  );

  const handleClear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onChange("");
      setQuery("");
      inputRef.current?.focus();
    },
    [onChange],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (!open) {
        if (e.key === "ArrowDown" || e.key === "Enter") {
          e.preventDefault();
          handleOpen();
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev < totalOptions - 1 ? prev + 1 : 0,
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : totalOptions - 1,
          );
          break;
        case "Enter":
          e.preventDefault();
          if (showCreateOption && highlightedIndex === filtered.length) {
            handleCreate(query);
          } else if (filtered[highlightedIndex]) {
            handleSelect(filtered[highlightedIndex].id);
          }
          break;
        case "Escape":
          e.preventDefault();
          setOpen(false);
          setQuery("");
          inputRef.current?.blur();
          break;
        case "Tab":
          setOpen(false);
          setQuery("");
          break;
      }
    },
    [
      open,
      totalOptions,
      highlightedIndex,
      filtered,
      showCreateOption,
      query,
      handleOpen,
      handleSelect,
      handleCreate,
    ],
  );

  // ── Render ──────────────────────────────────────────────────────────
  // Backwards-compatible alias: <CustomerCombobox> → <CreatableCombobox>
  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      {/* Input trigger */}
      <div
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={handleOpen}
        className={cn(
          "flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm transition-colors cursor-pointer",
          open
            ? "border-indigo-500 ring-2 ring-indigo-500/20"
            : "border-slate-200 hover:border-slate-300",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      >
        {/* Icon or selected indicator */}
        {!open && selectedItem && (
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-indigo-100">
            <User className="h-3 w-3 text-indigo-600" />
          </div>
        )}

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
          onFocus={() => {
            if (!disabled) handleOpen();
          }}
          onKeyDown={handleKeyDown}
          placeholder={selectedItem && !open ? selectedItem.name : placeholder}
          disabled={disabled}
          aria-label="Customer"
          aria-autocomplete="list"
          className="flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none disabled:cursor-not-allowed"
        />

        {/* Clear button */}
        {selectedItem && !open && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="rounded p-0.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Clear selection"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Chevron */}
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-slate-400 transition-transform",
            open && "rotate-180",
          )}
        />
      </div>

      {/* Dropdown */}
      {open && (
        <div
          ref={listRef}
          role="listbox"
          aria-label="Options"
          className="absolute z-50 mt-1 w-full max-h-60 overflow-auto rounded-xl border border-slate-200 bg-white shadow-lg"
        >
          {/* Empty state */}
          {totalOptions === 0 && !showCreateOption && (
            <div className="px-4 py-6 text-center">
              <User className="mx-auto h-8 w-8 text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">
                {emptyMessage ?? `No ${entityLabel}s found`}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Type a name to create one
              </p>
            </div>
          )}

          {/* Filtered customer list */}
          {filtered.map((customer, index) => (
            <div
              key={customer.id}
              role="option"
              aria-selected={customer.id === value}
              onClick={() => handleSelect(customer.id)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors",
                customer.id === value
                  ? "bg-indigo-50 text-indigo-900"
                  : highlightedIndex === index
                    ? "bg-slate-50"
                    : "hover:bg-slate-50",
              )}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-xs font-bold text-indigo-600">
                {customer.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium text-slate-900 truncate">
                {customer.name}
              </span>
              {customer.id === value && (
                <span className="ml-auto text-xs text-indigo-600 font-medium shrink-0">
                  Selected
                </span>
              )}
            </div>
          ))}

          {/* Create new option */}
          {showCreateOption && (
            <div
              role="option"
              onClick={() => handleCreate(query)}
              onMouseEnter={() => setHighlightedIndex(filtered.length)}
              className={cn(
                "flex items-center gap-3 border-t border-slate-100 px-3 py-2.5 cursor-pointer transition-colors",
                highlightedIndex === filtered.length
                  ? "bg-indigo-50"
                  : "hover:bg-indigo-50",
              )}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-600">
                {creating ? (
                  <Loader2 className="h-3.5 w-3.5 text-white animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5 text-white" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-indigo-900">
                  {creating
                    ? `Creating "${query.trim()}"...`
                    : `Create "${query.trim()}"`}
                </p>
                <p className="text-[11px] text-indigo-500">
                  New {entityLabel} — add details later
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Convenience alias ─────────────────────────────────────────────────────
// Pre-configured for customer selection with sensible defaults.
// Usage: <CustomerCombobox value={id} onChange={setId} items={customers} onCreate={create} />
export function CustomerCombobox(
  props: Omit<CreatableComboboxProps, "entityLabel" | "emptyMessage">,
) {
  return (
    <CreatableCombobox
      {...props}
      entityLabel="customer"
      emptyMessage="No customers yet"
    />
  );
}
