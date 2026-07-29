"use client";

import React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Search, FileText, ArrowRight, X } from "lucide-react";

type SearchResult = {
  id: string;
  title: string;
  excerpt: string;
};

const EXAMPLE_QUERIES = [
  "Which contracts renew in the next 90 days?",
  "Find all invoices above $10,000 from last month",
  "Show me expenses without receipts",
  "Find the contract with our biggest supplier",
];

const MOCK_RESULTS: SearchResult[] = [
  {
    id: "r1",
    title: "Microsoft Enterprise Agreement",
    excerpt:
      "Renewal: August 12 | Value: $48,000/year | Auto-renewal clause applies",
  },
  {
    id: "r2",
    title: "AWS Service Contract",
    excerpt: "Renewal: September 5 | Value: $82,000/year | Usage-based pricing",
  },
  {
    id: "r3",
    title: "Office Lease Agreement",
    excerpt:
      "Renewal: November 1 | Value: $120,000/year | 5-year term with 3% annual increase",
  },
  {
    id: "r4",
    title: "Zoom Enterprise Subscription",
    excerpt: "Renewal: October 15 | Value: $24,000/year | 500 licensed users",
  },
  {
    id: "r5",
    title: "Google Workspace Agreement",
    excerpt: "Renewal: December 31 | Value: $36,000/year | 200 users",
  },
];

export function KnowledgeUniversalSearch() {
  const [query, setQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = (value: string) => {
    setQuery(value);
    if (value.length > 3) {
      setHasSearched(true);
    } else {
      setHasSearched(false);
    }
  };

  const handleExampleClick = (example: string) => {
    setQuery(example);
    setHasSearched(true);
  };

  const clearSearch = () => {
    setQuery("");
    setHasSearched(false);
  };

  return (
    <div className="rounded-lg border bg-card">
      <div className="p-4">
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search your business..."
            className="w-full rounded-lg border bg-background pl-9 pr-8 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-signal-indigo/30"
          />
          {query && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        {/* Example queries (when no search) */}
        {!hasSearched && (
          <div className="mt-3">
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-2">
              Try asking
            </p>
            <div className="flex flex-wrap gap-1.5">
              {EXAMPLE_QUERIES.map((example) => (
                <button
                  key={example}
                  onClick={() => handleExampleClick(example)}
                  className="rounded-lg border bg-accent/30 px-2.5 py-1 text-[10px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Search results */}
      {hasSearched && (
        <div className="border-t">
          <div className="px-4 py-2 text-[10px] text-muted-foreground">
            AI found 12 results
          </div>
          <div className="divide-y">
            {MOCK_RESULTS.slice(0, 3).map((result) => (
              <div
                key={result.id}
                className="px-4 py-2.5 transition-colors hover:bg-accent/30"
              >
                <div className="flex items-start gap-2">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium text-foreground">
                      {result.title}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {result.excerpt}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button className="flex w-full items-center justify-center border-t px-4 py-2 text-[10px] font-medium text-signal-indigo hover:bg-accent/50 transition-colors">
            View all 12 results <ArrowRight className="h-2.5 w-2.5 ml-1" />
          </button>
        </div>
      )}
    </div>
  );
}
