'use client'

import { useState, useEffect, useCallback } from 'react'
import { Input, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Button } from '@/components/ui'
import { Search, X } from 'lucide-react'

type FilterState = {
  search: string
  dateFrom: string
  dateTo: string
  status: string
  sort: string
}

type StatusOption = {
  value: string
  label: string
}

type SortOption = {
  value: string
  label: string
}

type FilterBarProps = {
  onFilterChange: (filters: FilterState) => void
  statusOptions?: StatusOption[]
  showDateRange?: boolean
  sortOptions?: SortOption[]
}

const defaultSortOptions: SortOption[] = [
  { value: 'date-desc', label: 'Date (newest first)' },
  { value: 'date-asc', label: 'Date (oldest first)' },
  { value: 'name-asc', label: 'Name (A–Z)' },
  { value: 'name-desc', label: 'Name (Z–A)' },
  { value: 'amount-desc', label: 'Amount (highest)' },
  { value: 'amount-asc', label: 'Amount (lowest)' },
]

export function FilterBar({
  onFilterChange,
  statusOptions,
  showDateRange = false,
  sortOptions,
}: FilterBarProps) {
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [status, setStatus] = useState('')
  const [sort, setSort] = useState('date-desc')

  const emit = useCallback(
    (overrides: Partial<FilterState>) => {
      onFilterChange({
        search,
        dateFrom,
        dateTo,
        status,
        sort,
        ...overrides,
      })
    },
    [search, dateFrom, dateTo, status, sort, onFilterChange]
  )

  useEffect(() => {
    const timer = setTimeout(() => emit({}), 300)
    return () => clearTimeout(timer)
  }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    emit({})
  }, [dateFrom, dateTo, status, sort]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleClear() {
    setSearch('')
    setDateFrom('')
    setDateTo('')
    setStatus('')
    setSort('date-desc')
    onFilterChange({
      search: '',
      dateFrom: '',
      dateTo: '',
      status: '',
      sort: 'date-desc',
    })
  }

  const hasFilters = search || dateFrom || dateTo || status
  const sorts = sortOptions ?? defaultSortOptions

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 sm:flex-row sm:items-end">
      <div className="flex-1 min-w-[200px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {showDateRange && (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-[150px]"
          />
          <span className="text-sm text-muted-foreground">to</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-[150px]"
          />
        </div>
      )}

      {statusOptions && statusOptions.length > 0 && (
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select value={sort} onValueChange={setSort}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Sort by" />
        </SelectTrigger>
        <SelectContent>
          {sorts.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={handleClear}>
          <X className="mr-1 h-3 w-3" />
          Clear
        </Button>
      )}
    </div>
  )
}

export type { FilterState }
