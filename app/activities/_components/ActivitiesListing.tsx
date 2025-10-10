"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Calendar,
  Globe,
  Hash,
  ExternalLink,
  Search,
  Grid3X3,
  List,
  Maximize2,
  ChevronDown,
  Clock,
  MapPin,
} from "lucide-react";

interface Activity {
  id: string;
  card_slug: string;
  title: string;
  description: string;
  summary?: string;
  content?: string;
  image_url?: string;
  icon_emoji?: string;
  language: string;
  is_active: boolean;
  published_at?: string;
  scheduled_at?: string;
  ends_at?: string;
  created_at: string;
  hashtags?: string[];
  external_links?: Array<{
    title: string;
    url: string;
    description?: string;
  }>;
}

interface ActivitiesListingProps {
  activities: Activity[];
  currentPage: number;
  totalPages: number;
  totalCount: number;
  limit: number;
  searchParams: {
    page?: string;
    limit?: string;
    search?: string;
    language?: string;
    sort?: string;
  };
}

export default function ActivitiesListing({
  activities,
  currentPage,
  totalPages,
  totalCount,
  limit,
  searchParams,
}: ActivitiesListingProps) {
  const [searchTerm, setSearchTerm] = useState(searchParams.search || "");
  const [filterLanguage, setFilterLanguage] = useState(
    searchParams.language || "all",
  );
  const [sortBy, setSortBy] = useState(searchParams.sort || "newest");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [pageSize, setPageSize] = useState(limit.toString());

  // Navigation function to update URL with new parameters
  const updateURL = (newParams: Record<string, string>) => {
    const url = new URL(window.location.href);
    Object.entries(newParams).forEach(([key, value]) => {
      if (value) {
        url.searchParams.set(key, value);
      } else {
        url.searchParams.delete(key);
      }
    });
    window.location.href = url.toString();
  };

  // Handle search
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    updateURL({
      search: value,
      page: "1", // Reset to first page when searching
    });
  };

  // Handle filter change
  const handleFilterChange = (value: string) => {
    setFilterLanguage(value);
    updateURL({
      language: value,
      page: "1", // Reset to first page when filtering
    });
  };

  // Handle sort change
  const handleSortChange = (value: string) => {
    setSortBy(value);
    updateURL({
      sort: value,
      page: "1", // Reset to first page when sorting
    });
  };

  // Handle page size change
  const handlePageSizeChange = (value: string) => {
    setPageSize(value);
    updateURL({
      limit: value,
      page: "1", // Reset to first page when changing page size
    });
  };

  // Helper function to determine activity status
  const getActivityStatus = (activity: Activity) => {
    const now = new Date();
    const start = activity.scheduled_at
      ? new Date(activity.scheduled_at)
      : null;
    const end = activity.ends_at ? new Date(activity.ends_at) : null;

    if (start && start > now)
      return { status: "upcoming", color: "bg-blue-100 text-blue-800" };
    if (start && start <= now && (!end || end >= now))
      return { status: "live", color: "bg-green-100 text-green-800" };
    if (end && end < now)
      return { status: "past", color: "bg-gray-100 text-gray-800" };
    return { status: "published", color: "bg-purple-100 text-purple-800" };
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Activities
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Discover and participate in exciting activities and events
          </p>
        </div>

        {/* Enhanced Controls Bar */}
        <div className="mb-8 bg-blue-600 rounded-lg p-4">
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            {/* Search Input */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search activities..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Filter Dropdown */}
            <div className="flex items-center gap-2">
              <select
                value={filterLanguage}
                onChange={(e) => handleFilterChange(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none pr-8"
              >
                <option value="all">All Types</option>
                <option value="en">English</option>
                <option value="th">Thai</option>
              </select>
              <ChevronDown className="h-4 w-4 text-gray-400 -ml-6 pointer-events-none" />
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => handleSortChange(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none pr-8"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="alphabetical">A-Z</option>
                <option value="reverse-alphabetical">Z-A</option>
                <option value="display_order">Display Order</option>
              </select>
              <ChevronDown className="h-4 w-4 text-gray-400 -ml-6 pointer-events-none" />
            </div>

            {/* Page Size Selector */}
            <div className="flex items-center gap-2">
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none pr-8"
              >
                <option value="10">10 per page</option>
                <option value="20">20 per page</option>
                <option value="50">50 per page</option>
                <option value="100">100 per page</option>
              </select>
              <ChevronDown className="h-4 w-4 text-gray-400 -ml-6 pointer-events-none" />
            </div>

            {/* View Options */}
            <div className="flex items-center bg-white rounded-lg p-1">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === "grid"
                    ? "bg-blue-100 text-blue-600"
                    : "text-gray-400 hover:text-gray-600"
                }`}
                title="Grid View"
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === "list"
                    ? "bg-blue-100 text-blue-600"
                    : "text-gray-400 hover:text-gray-600"
                }`}
                title="List View"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                className="p-2 rounded-md text-gray-400 hover:text-gray-600 transition-colors"
                title="Fullscreen"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Results Info */}
        <div className="mb-6 text-sm text-gray-600 dark:text-gray-400">
          Showing {(currentPage - 1) * limit + 1} to{" "}
          {Math.min(currentPage * limit, totalCount)} of {totalCount} activities
        </div>

        {/* Activities Grid/List */}
        {activities.length > 0 ? (
          <div
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                : "space-y-6"
            }
          >
            {activities.map((activity) => {
              const activityStatus = getActivityStatus(activity);
              return (
                <Link
                  key={activity.id}
                  href={`/activities/${activity.card_slug}`}
                  className={`group bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-shadow duration-300 ${
                    viewMode === "list" ? "flex" : ""
                  }`}
                >
                  {activity.image_url && (
                    <div
                      className={
                        viewMode === "list" ? "w-48 flex-shrink-0" : "w-full"
                      }
                    >
                      <Image
                        src={activity.image_url}
                        alt={activity.title}
                        width={viewMode === "list" ? 192 : 400}
                        height={viewMode === "list" ? 128 : 192}
                        className={`${viewMode === "list" ? "w-full h-32" : "w-full h-48"} object-cover group-hover:scale-105 transition-transform duration-300`}
                      />
                    </div>
                  )}
                  <div className={`${viewMode === "list" ? "flex-1" : ""} p-6`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${activityStatus.color}`}
                        >
                          {activityStatus.status === "upcoming" && (
                            <Clock className="h-3 w-3 mr-1" />
                          )}
                          {activityStatus.status === "live" && (
                            <MapPin className="h-3 w-3 mr-1" />
                          )}
                          {activityStatus.status === "past" && (
                            <Calendar className="h-3 w-3 mr-1" />
                          )}
                          {activityStatus.status === "published" && (
                            <Globe className="h-3 w-3 mr-1" />
                          )}
                          {activityStatus.status.charAt(0).toUpperCase() +
                            activityStatus.status.slice(1)}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                          <Globe className="h-3 w-3 mr-1" />
                          {activity.language.toUpperCase()}
                        </span>
                      </div>
                      {activity.published_at && (
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <Calendar className="h-4 w-4 mr-1" />
                          {new Date(activity.published_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3 group-hover:text-yec-primary transition-colors duration-200">
                      {activity.icon_emoji && (
                        <span className="mr-2">{activity.icon_emoji}</span>
                      )}
                      {activity.title}
                    </h3>

                    <p className="text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
                      {activity.summary ||
                        activity.description ||
                        (activity.content
                          ? activity.content.substring(0, 150) + "..."
                          : "")}
                    </p>

                    {activity.hashtags && activity.hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {activity.hashtags.slice(0, 3).map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                          >
                            <Hash className="h-3 w-3 mr-1" />
                            {tag}
                          </span>
                        ))}
                        {activity.hashtags.length > 3 && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            +{activity.hashtags.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex items-center text-yec-primary group-hover:text-yec-accent transition-colors duration-200">
                      <span className="text-sm font-medium">Learn more</span>
                      <ExternalLink className="h-4 w-4 ml-1" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <Globe className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">
              No activities found
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Page Info */}
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Page {currentPage} of {totalPages}
            </div>

            {/* Pagination Buttons */}
            <div className="flex items-center gap-2">
              {/* Previous Button */}
              <button
                onClick={() =>
                  updateURL({ page: (currentPage - 1).toString() })
                }
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>

              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => updateURL({ page: pageNum.toString() })}
                      className={`px-3 py-2 text-sm font-medium rounded-md ${
                        currentPage === pageNum
                          ? "bg-blue-600 text-white"
                          : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              {/* Next Button */}
              <button
                onClick={() =>
                  updateURL({ page: (currentPage + 1).toString() })
                }
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
