"use client";

import { useState, useMemo } from "react";
import { useEntity } from "@/lib/entity-context";
import { trpc } from "@/lib/trpc/client";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui";
import { Badge } from "@/components/ui";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui";
import { Button } from "@/components/ui";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type Account = {
  id: string;
  code: string;
  name: string;
  type: string;
};

type AccountPickerProps = {
  value: string | null;
  onChange: (accountId: string | null) => void;
};

const typeBadgeClass: Record<string, string> = {
  asset: "bg-blue-100 text-blue-800",
  liability: "bg-red-100 text-red-800",
  equity: "bg-purple-100 text-purple-800",
  revenue: "bg-green-100 text-green-800",
  expense: "bg-orange-100 text-orange-800",
};

function flattenAccounts(accounts: Account[]): Account[] {
  const result: Account[] = [];
  for (const acct of accounts) {
    result.push(acct);
  }
  return result;
}

export function AccountPicker({ value, onChange }: AccountPickerProps) {
  const { entityId } = useEntity();
  const [open, setOpen] = useState(false);

  const { data: hierarchy, isLoading } = trpc.coa.listHierarchy.useQuery(
    undefined,
    {
      enabled: !!entityId,
    },
  );

  const flatAccounts = useMemo(() => {
    if (!hierarchy) return [];
    return flattenAccounts(hierarchy as Account[]);
  }, [hierarchy]);

  const selected = flatAccounts.find((a) => a.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          {selected ? (
            <span className="flex items-center gap-2">
              <span className="font-mono text-xs">{selected.code}</span>
              <span>{selected.name}</span>
            </span>
          ) : (
            "Select account..."
          )}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandInput placeholder="Search by code or name..." />
          <CommandList>
            <CommandEmpty>
              {isLoading ? "Loading accounts..." : "No accounts found"}
            </CommandEmpty>
            <CommandGroup>
              {flatAccounts.map((account) => (
                <CommandItem
                  key={account.id}
                  value={`${account.code} ${account.name}`}
                  onSelect={() => {
                    onChange(account.id === value ? null : account.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === account.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="mr-2 font-mono text-xs">{account.code}</span>
                  <span className="flex-1">{account.name}</span>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "ml-2 text-[10px]",
                      typeBadgeClass[account.type],
                    )}
                  >
                    {account.type}
                  </Badge>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
