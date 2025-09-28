"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Filter,
  Calendar,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export interface AttendanceFilterState {
  search: string;
  eventType: string;
  dateFrom: string;
  dateTo: string;
  province: string;
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface AttendanceFiltersProps {
  onFiltersChange: (filters: AttendanceFilterState) => void;
  onExport: (format: 'csv' | 'json') => void;
  exportLoading?: boolean;
  initialFilters?: Partial<AttendanceFilterState>;
  filterOptions?: {
    eventTypes: Array<{ name: string; business_rule_category: string }>;
    provinces: string[];
  };
}

export default function AttendanceFilters({ 
  onFiltersChange,
  onExport,
  exportLoading = false,
  initialFilters = {},
  filterOptions = { eventTypes: [], provinces: [] }
}: AttendanceFiltersProps) {
  
  const [filters, setFilters] = useState<AttendanceFilterState>({
    search: '',
    eventType: '',
    dateFrom: '',
    dateTo: '',
    province: '',
    page: 1,
    pageSize: 20,
    sortBy: 'checkin_time',
    sortOrder: 'desc',
    ...initialFilters
  });

  const [isExpanded, setIsExpanded] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // Update filters when initialFilters change
  useEffect(() => {
    setFilters(prev => ({ ...prev, ...initialFilters }));
  }, [initialFilters]);

  const updateFilters = (newFilters: Partial<AttendanceFilterState>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    onFiltersChange(updatedFilters);
  };

  const clearFilters = () => {
    const clearedFilters: AttendanceFilterState = {
      search: '',
      eventType: '',
      dateFrom: '',
      dateTo: '',
      province: '',
      page: 1,
      pageSize: 20,
      sortBy: 'checkin_time',
      sortOrder: 'desc'
    };
    setFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const handleExport = (format: 'csv' | 'json') => {
    onExport(format);
  };

  const hasActiveFilters = 
    filters.search ||
    filters.eventType ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.province;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
      {/* Compact Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-gray-500" />
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">Filters</h3>
          {hasActiveFilters && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              Active
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleExport('csv')}
            disabled={exportLoading}
            className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center space-x-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exportLoading ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-500"></div>
                <span>Exporting...</span>
              </>
            ) : (
              <span>Export CSV</span>
            )}
          </button>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center space-x-1"
            >
              <X className="h-3 w-3" />
              <span>Clear</span>
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 flex items-center space-x-1"
          >
            <span>Advanced</span>
            {isExpanded ? (
              <ChevronUp className="h-3 w-3" />
            ) : (
              <ChevronDown className="h-3 w-3" />
            )}
          </button>
        </div>
      </div>

      {/* Compact Search Bar */}
      <div className="px-4 py-3">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by name, email, company, or event..."
            value={filters.search}
            onChange={(e) => {
              const newSearchValue = e.target.value;
              setFilters((prev) => ({ ...prev, search: newSearchValue }));

              // Clear previous timeout
              if (searchTimeout) {
                clearTimeout(searchTimeout);
              }

              // Set new timeout for debounced search
              const timeoutId = setTimeout(() => {
                updateFilters({ search: newSearchValue });
              }, 500);

              setSearchTimeout(timeoutId);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                // Clear timeout and search immediately on Enter
                if (searchTimeout) {
                  clearTimeout(searchTimeout);
                }
                updateFilters({ search: e.currentTarget.value });
              }
            }}
            className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Advanced Filters */}
      {isExpanded && (
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Event Type Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Event Type
              </label>
              <select
                value={filters.eventType}
                onChange={(e) => updateFilters({ eventType: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Event Types</option>
                {filterOptions.eventTypes.map((eventType) => (
                  <option key={eventType.name} value={eventType.name}>
                    {eventType.name} ({eventType.business_rule_category})
                  </option>
                ))}
              </select>
            </div>

            {/* Province Filter */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Province
              </label>
              <select
                value={filters.province}
                onChange={(e) => updateFilters({ province: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">All Provinces</option>
                {filterOptions.provinces.map((province) => (
                  <option key={province} value={province}>
                    {province}
                  </option>
                ))}
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                From Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => updateFilters({ dateFrom: e.target.value })}
                  className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Date To */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                To Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => updateFilters({ dateTo: e.target.value })}
                  className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Sort Options */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sort By
              </label>
              <div className="flex space-x-1">
                <select
                  value={filters.sortBy}
                  onChange={(e) => updateFilters({ sortBy: e.target.value })}
                  className="flex-1 px-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="checkin_time">Time</option>
                  <option value="user_name">User</option>
                  <option value="event_name">Event</option>
                  <option value="location">Location</option>
                  <option value="status">Status</option>
                </select>
                <select
                  value={filters.sortOrder}
                  onChange={(e) => updateFilters({ sortOrder: e.target.value as 'asc' | 'desc' })}
                  className="px-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="desc">↓</option>
                  <option value="asc">↑</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}