"use client";

import { useState, useEffect } from "react";
import {
  Search,
  Filter,
  X,
  ChevronDown,
  Calendar,
  MapPin,
  Building,
  CreditCard,
  Users,
} from "lucide-react";

interface FilterState {
  search: string;
  provinces: string[];
  hotels: string[];
  events: string[];
  paymentStatus: string[];
  dateFrom: string;
  dateTo: string;
}

interface FiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  provinces: string[];
  hotels: string[];
  events: string[];
  loading?: boolean;
}

const PAYMENT_STATUS_OPTIONS = [
  { value: "ชำระแล้ว", label: "Paid" },
  { value: "ยังไม่ได้ชำระเงิน", label: "Unpaid" },
  { value: "ฟรี", label: "Free" },
];

export default function Filters({
  filters,
  onFiltersChange,
  provinces,
  hotels,
  events,
  loading: _loading = false,
}: FiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleMultiSelectChange = (
    key: "provinces" | "hotels" | "events" | "paymentStatus",
    value: string,
    checked: boolean,
  ) => {
    const currentValues = localFilters[key] as string[];
    const newValues = checked
      ? [...currentValues, value]
      : currentValues.filter((v) => v !== value);

    handleFilterChange(key, newValues);
  };

  const clearAllFilters = () => {
    const clearedFilters: FilterState = {
      search: "",
      provinces: [],
      hotels: [],
      events: [],
      paymentStatus: [],
      dateFrom: "",
      dateTo: "",
    };
    setLocalFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (localFilters.search) count++;
    if (localFilters.provinces.length > 0) count++;
    if (localFilters.hotels.length > 0) count++;
    if (localFilters.events.length > 0) count++;
    if (localFilters.paymentStatus.length > 0) count++;
    if (localFilters.dateFrom || localFilters.dateTo) count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      {/* Filter Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Filters
            </h3>
            {activeFilterCount > 0 && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                {activeFilterCount} active
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 flex items-center gap-1"
              >
                <X className="h-4 w-4" />
                Clear all
              </button>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              <ChevronDown
                className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Filter Content */}
      {isExpanded && (
        <div className="p-4 space-y-6">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Search className="h-4 w-4 inline mr-1" />
              Search
            </label>
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={localFilters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Province Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <MapPin className="h-4 w-4 inline mr-1" />
              Province
            </label>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-32 overflow-y-auto">
              {provinces.map((province) => (
                <label
                  key={province}
                  className="flex items-center space-x-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={localFilters.provinces.includes(province)}
                    onChange={(e) =>
                      handleMultiSelectChange(
                        "provinces",
                        province,
                        e.target.checked,
                      )
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-gray-700 dark:text-gray-300">
                    {province}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Hotel Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Building className="h-4 w-4 inline mr-1" />
              Hotel
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-32 overflow-y-auto">
              {hotels.map((hotel) => (
                <label
                  key={hotel}
                  className="flex items-center space-x-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={localFilters.hotels.includes(hotel)}
                    onChange={(e) =>
                      handleMultiSelectChange("hotels", hotel, e.target.checked)
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-gray-700 dark:text-gray-300">
                    {hotel}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Event Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Users className="h-4 w-4 inline mr-1" />
              Events
            </label>
            <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
              {events.map((event) => (
                <label
                  key={event}
                  className="flex items-center space-x-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={localFilters.events.includes(event)}
                    onChange={(e) =>
                      handleMultiSelectChange("events", event, e.target.checked)
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-gray-700 dark:text-gray-300">
                    {event}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Payment Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <CreditCard className="h-4 w-4 inline mr-1" />
              Payment Status
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {PAYMENT_STATUS_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center space-x-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={localFilters.paymentStatus.includes(option.value)}
                    onChange={(e) =>
                      handleMultiSelectChange(
                        "paymentStatus",
                        option.value,
                        e.target.checked,
                      )
                    }
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="text-gray-700 dark:text-gray-300">
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Date Range Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Calendar className="h-4 w-4 inline mr-1" />
              Accommodation Date Range
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={localFilters.dateFrom}
                  onChange={(e) =>
                    handleFilterChange("dateFrom", e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={localFilters.dateTo}
                  onChange={(e) => handleFilterChange("dateTo", e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Active Filters Summary */}
          {activeFilterCount > 0 && (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex flex-wrap gap-2">
                {localFilters.search && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                    Search: {localFilters.search}
                    <button
                      onClick={() => handleFilterChange("search", "")}
                      className="ml-1 hover:text-blue-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {localFilters.provinces.map((province) => (
                  <span
                    key={province}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                  >
                    {province}
                    <button
                      onClick={() =>
                        handleMultiSelectChange("provinces", province, false)
                      }
                      className="ml-1 hover:text-green-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {localFilters.hotels.map((hotel) => (
                  <span
                    key={hotel}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400"
                  >
                    {hotel}
                    <button
                      onClick={() =>
                        handleMultiSelectChange("hotels", hotel, false)
                      }
                      className="ml-1 hover:text-purple-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {localFilters.events.map((event) => (
                  <span
                    key={event}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400"
                  >
                    {event}
                    <button
                      onClick={() =>
                        handleMultiSelectChange("events", event, false)
                      }
                      className="ml-1 hover:text-orange-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {localFilters.paymentStatus.map((status) => (
                  <span
                    key={status}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
                  >
                    {PAYMENT_STATUS_OPTIONS.find((opt) => opt.value === status)
                      ?.label || status}
                    <button
                      onClick={() =>
                        handleMultiSelectChange("paymentStatus", status, false)
                      }
                      className="ml-1 hover:text-yellow-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {(localFilters.dateFrom || localFilters.dateTo) && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400">
                    {localFilters.dateFrom || "Any"} -{" "}
                    {localFilters.dateTo || "Any"}
                    <button
                      onClick={() => {
                        handleFilterChange("dateFrom", "");
                        handleFilterChange("dateTo", "");
                      }}
                      className="ml-1 hover:text-indigo-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
