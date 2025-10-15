"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Filter, X } from "lucide-react";

interface FormType {
  form_key: string;
  name: string;
}

interface UnifiedFiltersProps {
  formTypes: FormType[];
  onFiltersChange: (filters: {
    form_filter: string;
    status_filter: string;
    search: string;
    page: number;
  }) => void;
}

export default function UnifiedFilters({
  formTypes,
  onFiltersChange,
}: UnifiedFiltersProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [formFilter, setFormFilter] = useState(
    searchParams.get("form_filter") || "all"
  );
  const [statusFilter, setStatusFilter] = useState(
    searchParams.get("status_filter") || "all"
  );
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const statusOptions = [
    { value: "all", label: "All Statuses" },
    { value: "pending", label: "Pending" },
    { value: "waiting_for_review", label: "Waiting for Review" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
  ];

  const updateFilters = (newFilters: Partial<{
    form_filter: string;
    status_filter: string;
    search: string;
    page: number;
  }>) => {
    const updatedFilters = {
      form_filter: newFilters.form_filter ?? formFilter,
      status_filter: newFilters.status_filter ?? statusFilter,
      search: newFilters.search ?? search,
      page: newFilters.page ?? 1,
    };

    // Update URL params
    const params = new URLSearchParams(searchParams.toString());
    
    if (updatedFilters.form_filter !== "all") {
      params.set("form_filter", updatedFilters.form_filter);
    } else {
      params.delete("form_filter");
    }

    if (updatedFilters.status_filter !== "all") {
      params.set("status_filter", updatedFilters.status_filter);
    } else {
      params.delete("status_filter");
    }

    if (updatedFilters.search) {
      params.set("search", updatedFilters.search);
    } else {
      params.delete("search");
    }

    if (updatedFilters.page > 1) {
      params.set("page", updatedFilters.page.toString());
    } else {
      params.delete("page");
    }

    router.push(`/admin?${params.toString()}`);
    onFiltersChange(updatedFilters);
  };

  const handleFormFilterChange = (value: string) => {
    setFormFilter(value);
    updateFilters({ form_filter: value, page: 1 });
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    updateFilters({ status_filter: value, page: 1 });
  };

  const handleSearchChange = (value: string) => {
    setSearch(value);
    // Debounce search
    const timeoutId = setTimeout(() => {
      updateFilters({ search: value, page: 1 });
    }, 500);
    return () => clearTimeout(timeoutId);
  };

  const clearFilters = () => {
    setFormFilter("all");
    setStatusFilter("all");
    setSearch("");
    updateFilters({
      form_filter: "all",
      status_filter: "all",
      search: "",
      page: 1,
    });
  };

  const hasActiveFilters = formFilter !== "all" || statusFilter !== "all" || search;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Filters
        </h3>
        <div className="flex items-center space-x-2">
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 flex items-center"
            >
              <X className="w-4 h-4 mr-1" />
              Clear Filters
            </button>
          )}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-yec-primary hover:text-yec-accent flex items-center"
          >
            <Filter className="w-4 h-4 mr-1" />
            {showAdvanced ? "Hide" : "Show"} Advanced
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search by name, email, or tracking ID..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-yec-primary focus:border-transparent"
          />
        </div>

        {/* Form Type Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Form Type
          </label>
          <select
            value={formFilter}
            onChange={(e) => handleFormFilterChange(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-yec-primary focus:border-transparent"
          >
            <option value="all">All Forms</option>
            {formTypes.map((formType) => (
              <option key={formType.form_key} value={formType.form_key}>
                {formType.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilterChange(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-yec-primary focus:border-transparent"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Quick Actions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Quick Actions
          </label>
          <div className="flex space-x-2">
            <button
              onClick={() => handleStatusFilterChange("waiting_for_review")}
              className={`px-3 py-2 text-xs rounded-lg transition-colors ${
                statusFilter === "waiting_for_review"
                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                  : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              Review Queue
            </button>
            <button
              onClick={() => handleStatusFilterChange("approved")}
              className={`px-3 py-2 text-xs rounded-lg transition-colors ${
                statusFilter === "approved"
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              Approved
            </button>
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Date Range
              </label>
              <div className="flex space-x-2">
                <input
                  type="date"
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-yec-primary focus:border-transparent"
                  placeholder="From"
                />
                <input
                  type="date"
                  className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-yec-primary focus:border-transparent"
                  placeholder="To"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sort By
              </label>
              <select className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-yec-primary focus:border-transparent">
                <option value="created_at_desc">Newest First</option>
                <option value="created_at_asc">Oldest First</option>
                <option value="name_asc">Name A-Z</option>
                <option value="name_desc">Name Z-A</option>
                <option value="status_asc">Status</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Results Per Page
              </label>
              <select className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-yec-primary focus:border-transparent">
                <option value="20">20 per page</option>
                <option value="50">50 per page</option>
                <option value="100">100 per page</option>
              </select>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
