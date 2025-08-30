"use client";

import { useState, useEffect } from "react";
import { Search, Filter, X } from "lucide-react";

interface AdminManagementFiltersProps {
  currentFilters: {
    search: string;
    role: string;
    status: string;
    sortBy: string;
    sortOrder: string;
  };
}

export default function AdminManagementFilters({
  currentFilters,
}: AdminManagementFiltersProps) {
  const [filters, setFilters] = useState(currentFilters);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setFilters(currentFilters);
  }, [currentFilters]);

  useEffect(() => {
    const hasChanges =
      filters.search !== currentFilters.search ||
      filters.role !== currentFilters.role ||
      filters.status !== currentFilters.status ||
      filters.sortBy !== currentFilters.sortBy ||
      filters.sortOrder !== currentFilters.sortOrder;

    setHasChanges(hasChanges);
  }, [filters, currentFilters]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        params.append(key, value);
      }
    });

    const url = `/admin/management${params.toString() ? `?${params.toString()}` : ""}`;
    window.location.href = url;
  };

  const handleClearFilters = () => {
    window.location.href = "/admin/management";
  };

  const hasActiveFilters = filters.search || filters.role || filters.status;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Search and Quick Actions */}
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleFilterChange("search", e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Search by email..."
            />
          </div>
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            <X className="h-4 w-4 mr-1" />
            Clear
          </button>
        )}
      </div>

      {/* Filter Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Role Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Role
          </label>
          <select
            value={filters.role}
            onChange={(e) => handleFilterChange("role", e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Status
          </label>
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange("status", e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        {/* Sort Options */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Sort By
          </label>
          <div className="flex space-x-2">
            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange("sortBy", e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="created_at">Created Date</option>
              <option value="email">Email</option>
              <option value="role">Role</option>
              <option value="last_login_at">Last Login</option>
            </select>
            <select
              value={filters.sortOrder}
              onChange={(e) => handleFilterChange("sortOrder", e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="desc">Desc</option>
              <option value="asc">Asc</option>
            </select>
          </div>
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
          <Filter className="h-4 w-4" />
          <span>Active filters:</span>
          {filters.search && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
              Search: {filters.search}
            </span>
          )}
          {filters.role && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200">
              Role: {filters.role === "super_admin" ? "Super Admin" : "Admin"}
            </span>
          )}
          {filters.status && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-200">
              Status: {filters.status === "active" ? "Active" : "Inactive"}
            </span>
          )}
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!hasChanges}
          className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
            hasChanges
              ? "bg-blue-600 text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              : "bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400"
          }`}
        >
          <Search className="h-4 w-4 mr-2" />
          {hasChanges ? "Apply Filters" : "No Changes"}
        </button>
      </div>
    </form>
  );
}
