"use client";

import { useMemo, useState } from "react";
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@xenboox/ui";
import { ChevronsUpDown } from "lucide-react";

import { COUNTRIES, countryFlag, getCountry } from "@/lib/accounting/countries";

/**
 * Searchable ISO 3166-1 country picker (flag + name + code + currency search).
 * Used by Settings → Taxes (pack install) and the onboarding wizard (tax pack
 * pre-install for the workspace's country).
 */
export function CountryPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (code: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.currency.toLowerCase().includes(q),
    ).slice(0, 60);
  }, [query]);

  const current = getCountry(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="mt-1 w-full justify-between font-normal"
        >
          <span className="flex items-center gap-2">
            <span aria-hidden>{countryFlag(value)}</span>
            <span>
              {current ? `${current.name} (${value})` : `Custom: ${value}`}
            </span>
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[320px] p-0">
        <Command>
          <CommandInput
            placeholder="Search 190+ countries…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            <CommandEmpty>
              Type any 2-letter ISO code (e.g. &ldquo;ID&rdquo; for Indonesia)
            </CommandEmpty>
            <CommandGroup heading="Countries">
              {filtered.map((c) => (
                <CommandItem
                  key={c.code}
                  value={`${c.name} ${c.code} ${c.currency}`}
                  onSelect={() => {
                    onChange(c.code);
                    setOpen(false);
                  }}
                >
                  <span aria-hidden className="mr-2">
                    {countryFlag(c.code)}
                  </span>
                  <span className="flex-1">{c.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {c.code}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
