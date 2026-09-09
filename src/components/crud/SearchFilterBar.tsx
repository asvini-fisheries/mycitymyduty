"use client";

import { useState } from "react";
import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import type { FilterableColumn } from "@/lib/crud-filters";
import { getActiveFilterChips } from "@/lib/crud-filters";
import { cn } from "@/lib/utils";

interface SearchFilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  columnFilters: Record<string, string>;
  onColumnFilterChange: (key: string, value: string) => void;
  onClearAll: () => void;
  onRemoveChip: (id: string) => void;
  filterableColumns: FilterableColumn[];
  filteredCount: number;
  totalCount: number;
}

const compactSelectClass =
  "rounded-md border border-civic-200 bg-white px-2 py-1.5 text-xs text-civic-900 focus:border-civic-500 focus:outline-none focus:ring-1 focus:ring-civic-200";

const compactInputClass =
  "rounded-md border border-civic-200 px-2 py-1.5 text-xs text-civic-900 placeholder:text-civic-400 focus:border-civic-500 focus:outline-none focus:ring-1 focus:ring-civic-200";

export function SearchFilterBar({
  searchQuery,
  onSearchChange,
  columnFilters,
  onColumnFilterChange,
  onClearAll,
  onRemoveChip,
  filterableColumns,
  filteredCount,
  totalCount,
}: SearchFilterBarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const chips = getActiveFilterChips(searchQuery, columnFilters, filterableColumns);
  const columnChipCount = chips.filter((chip) => chip.id !== "__search__").length;
  const hasActiveFilters = chips.length > 0;

  const selectAndBoolean = filterableColumns.filter(
    (c) => c.type === "select" || c.type === "boolean"
  );
  const textFilters = filterableColumns.filter((c) => c.type === "text");
  const hasColumnFilters = selectAndBoolean.length > 0 || textFilters.length > 0;

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-civic-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search records..."
            className={cn(compactInputClass, "w-full pl-8")}
            aria-label="Search records"
          />
        </div>
        {hasColumnFilters && (
          <button
            type="button"
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium",
              filtersOpen || columnChipCount > 0
                ? "border-civic-300 bg-civic-50 text-civic-800"
                : "border-civic-200 bg-white text-civic-700 hover:bg-civic-50"
            )}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            {filtersOpen ? "Hide filters" : "Show filters"}
            {columnChipCount > 0 && (
              <span className="rounded-full bg-civic-700 px-1.5 py-0.5 text-[10px] leading-none text-white">
                {columnChipCount}
              </span>
            )}
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 text-civic-500 transition-transform",
                filtersOpen && "rotate-180"
              )}
            />
          </button>
        )}
        <p className="shrink-0 text-xs text-civic-600 sm:ml-auto">
          Showing <span className="font-semibold text-civic-800">{filteredCount}</span> of{" "}
          <span className="font-semibold text-civic-800">{totalCount}</span> records
        </p>
      </div>

      {filtersOpen && hasColumnFilters && (
        <div className="flex flex-wrap items-end gap-2 rounded-lg border border-civic-100 bg-civic-50/60 px-3 py-2.5">
          {selectAndBoolean.map((col) => (
            <label key={col.key} className="flex flex-col gap-0.5">
              <span className="text-[10px] font-medium uppercase tracking-wide text-civic-500">
                {col.label}
              </span>
              <select
                value={columnFilters[col.key] ?? (col.type === "boolean" ? "all" : "")}
                onChange={(e) => onColumnFilterChange(col.key, e.target.value)}
                className={cn(compactSelectClass, "min-w-[7rem] max-w-[12rem]")}
                aria-label={`Filter by ${col.label}`}
              >
                {col.type === "boolean" ? (
                  col.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="">All</option>
                    {col.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </label>
          ))}

          {textFilters.map((col) => (
            <label key={col.key} className="flex flex-col gap-0.5">
              <span className="text-[10px] font-medium uppercase tracking-wide text-civic-500">
                {col.label}
              </span>
              <input
                type="text"
                value={columnFilters[col.key] ?? ""}
                onChange={(e) => onColumnFilterChange(col.key, e.target.value)}
                placeholder="Contains…"
                className={cn(compactInputClass, "min-w-[6rem] max-w-[10rem]")}
                aria-label={`Filter ${col.label}`}
              />
            </label>
          ))}
        </div>
      )}

      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-1.5">
          {chips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => onRemoveChip(chip.id)}
              className="inline-flex items-center gap-1 rounded-full border border-civic-200 bg-white px-2 py-0.5 text-xs text-civic-700 hover:bg-civic-100"
            >
              {chip.label}
              <X className="h-3 w-3 shrink-0" />
            </button>
          ))}
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs font-medium text-civic-600 underline-offset-2 hover:text-civic-800 hover:underline"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
