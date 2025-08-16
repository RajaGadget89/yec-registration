"use client";

import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import StatusBadge from "./StatusBadge";
import ActionButtons from "./ActionButtons";
import type { Registration } from "../../types/database";
import { formatDate } from "../../lib/datetime";

interface ResultsTableProps {
  registrations: Registration[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onSort: (column: string, direction: "asc" | "desc") => void;
  currentSort: { column: string; direction: "asc" | "desc" };
  onRowClick: (registration: Registration) => void;
  onActionComplete?: (registrationId: string, newStatus: string) => void;
}

export default function ResultsTable({
  registrations,
  totalCount,
  currentPage,
  pageSize,
  onPageChange,
  onSort,
  currentSort,
  onRowClick,
  onActionComplete,
}: ResultsTableProps) {
  const totalPages = Math.ceil(totalCount / pageSize);
  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalCount);

  const handleSort = (column: string) => {
    const direction =
      currentSort.column === column && currentSort.direction === "asc"
        ? "desc"
        : "asc";
    onSort(column, direction);
  };

  const SortIcon = ({
    column,
    className,
  }: {
    column: string;
    className?: string;
  }) => {
    if (currentSort.column !== column) {
      return <ChevronDown className={className || "h-4 w-4 text-gray-400"} />;
    }
    return currentSort.direction === "asc" ? (
      <ChevronUp className={className || "h-4 w-4 text-yec-primary"} />
    ) : (
      <ChevronDown className={className || "h-4 w-4 text-yec-primary"} />
    );
  };

  // Column definitions for reference (used in table structure)
  // Note: columns array is defined for documentation purposes
  // but not currently used in the component logic

  const pageNumbers = Array.from(
    { length: Math.min(5, totalPages) },
    (_, i) => {
      const page = Math.max(1, Math.min(totalPages - 4, currentPage - 2)) + i;
      return page;
    },
  );

  return (
    <div
      className="card-modern dark:card-modern-dark rounded-2xl overflow-hidden animate-fade-in-up backdrop-blur-sm bg-white/90 dark:bg-gray-800/90 border border-white/20 dark:border-gray-700/20 relative"
      style={{ animationDelay: "600ms" }}
    >
      {/* Light overlay for better readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 to-blue-100/10"></div>

      {/* Table Header */}
      <div className="px-6 py-6 border-b border-gray-200/50 dark:border-gray-600/50 bg-gradient-to-r from-gray-50/80 to-gray-100/80 dark:from-gray-800/80 dark:to-gray-700/80 backdrop-blur-sm relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent drop-shadow-sm">
              Registrations
            </h2>
            <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-yec-primary/10 to-yec-accent/10 border border-yec-primary/20 backdrop-blur-sm">
              <div className="w-2 h-2 rounded-full bg-yec-accent animate-pulse-soft"></div>
              <span className="text-sm font-medium text-yec-primary">
                {totalCount.toLocaleString()} total
              </span>
            </div>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
            Showing {startIndex}-{endIndex} of {totalCount.toLocaleString()}{" "}
            results
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="relative z-10">
        <table className="w-full table-fixed">
          <thead className="bg-gradient-to-r from-gray-50/60 to-gray-100/60 dark:from-gray-800/60 dark:to-gray-700/60 backdrop-blur-sm">
            <tr>
              <th className="px-4 py-4 text-left w-[12%]">
                <button
                  onClick={() => handleSort("status")}
                  className="flex items-center space-x-2 font-semibold text-gray-700 dark:text-gray-300 hover:text-yec-primary dark:hover:text-yec-accent transition-colors group"
                >
                  <span>Status</span>
                  <SortIcon
                    column="status"
                    className="w-4 h-4 text-gray-400 group-hover:text-yec-primary transition-colors flex-shrink-0"
                  />
                </button>
              </th>
              <th className="px-4 py-4 text-left w-[20%]">
                <button
                  onClick={() => handleSort("name")}
                  className="flex items-center space-x-2 font-semibold text-gray-700 dark:text-gray-300 hover:text-yec-primary dark:hover:text-yec-accent transition-colors group"
                >
                  <span>Name</span>
                  <SortIcon
                    column="name"
                    className="w-4 h-4 text-gray-400 group-hover:text-yec-primary transition-colors flex-shrink-0"
                  />
                </button>
              </th>
              <th className="px-4 py-4 text-left w-[10%]">
                <button
                  onClick={() => handleSort("yec_province")}
                  className="flex items-center space-x-2 font-semibold text-gray-700 dark:text-gray-300 hover:text-yec-primary dark:hover:text-yec-accent transition-colors group"
                >
                  <span>Province</span>
                  <SortIcon
                    column="yec_province"
                    className="w-4 h-4 text-gray-400 group-hover:text-yec-primary transition-colors flex-shrink-0"
                  />
                </button>
              </th>
              <th className="px-4 py-4 text-left w-[12%]">
                <button
                  onClick={() => handleSort("created_at")}
                  className="flex items-center space-x-2 font-semibold text-gray-700 dark:text-gray-300 hover:text-yec-primary dark:hover:text-yec-accent transition-colors group"
                >
                  <span>Created At</span>
                  <SortIcon
                    column="created_at"
                    className="w-4 h-4 text-gray-400 group-hover:text-yec-primary transition-colors flex-shrink-0"
                  />
                </button>
              </th>
              <th className="px-4 py-4 text-left w-[18%]">
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  Email
                </span>
              </th>
              <th className="px-4 py-4 text-left w-[10%]">
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  Phone
                </span>
              </th>
              <th className="px-4 py-4 text-left w-[18%]">
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  Actions
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200/50 dark:divide-gray-600/50">
            {registrations.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="w-16 h-16 bg-gray-100/80 dark:bg-gray-700/80 rounded-full flex items-center justify-center backdrop-blur-sm">
                      <Search className="w-8 h-8 text-gray-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        No registrations found
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        Try adjusting your search criteria or filters
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              registrations.map((registration, index) => (
                <tr
                  key={registration.registration_id}
                  className="group hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-blue-100/50 dark:hover:from-blue-900/20 dark:hover:to-blue-800/20 transition-all duration-300 backdrop-blur-sm"
                  style={{ animationDelay: `${700 + index * 50}ms` }}
                >
                  <td
                    className="px-4 py-4 cursor-pointer"
                    onClick={() => onRowClick?.(registration)}
                  >
                    <StatusBadge
                      status={
                        registration.status as
                          | "pending"
                          | "waiting_for_review"
                          | "approved"
                          | "rejected"
                      }
                    />
                  </td>
                  <td
                    className="px-4 py-4 cursor-pointer"
                    onClick={() => onRowClick?.(registration)}
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-gray-900 dark:text-gray-100 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors drop-shadow-sm break-words leading-relaxed">
                        {registration.title} {registration.first_name}{" "}
                        {registration.last_name}
                      </div>
                      {registration.nickname && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 break-words mt-1">
                          ({registration.nickname})
                        </div>
                      )}
                    </div>
                  </td>
                  <td
                    className="px-4 py-4 cursor-pointer"
                    onClick={() => onRowClick?.(registration)}
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300 capitalize drop-shadow-sm break-words">
                      {registration.yec_province?.replace(/-/g, " ")}
                    </span>
                  </td>
                  <td
                    className="px-4 py-4 cursor-pointer"
                    onClick={() => onRowClick?.(registration)}
                  >
                    <div className="text-sm text-gray-600 dark:text-gray-400 drop-shadow-sm">
                      <time
                        dateTime={registration.created_at}
                        suppressHydrationWarning
                      >
                        {formatDate(registration.created_at)}
                      </time>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-500">
                      <time
                        dateTime={registration.created_at}
                        suppressHydrationWarning
                      >
                        {formatDate(registration.created_at, true)}
                      </time>
                    </div>
                  </td>
                  <td
                    className="px-4 py-4 cursor-pointer"
                    onClick={() => onRowClick?.(registration)}
                  >
                    <div className="text-sm text-gray-600 dark:text-gray-400 drop-shadow-sm break-all">
                      {registration.email}
                    </div>
                  </td>
                  <td
                    className="px-4 py-4 cursor-pointer"
                    onClick={() => onRowClick?.(registration)}
                  >
                    <div className="text-sm text-gray-600 dark:text-gray-400 drop-shadow-sm break-all">
                      {registration.phone}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <ActionButtons
                      registration={registration}
                      onActionComplete={onActionComplete}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200/50 dark:border-gray-600/50 bg-gradient-to-r from-gray-50/60 to-gray-100/60 dark:from-gray-800/60 dark:to-gray-700/60 backdrop-blur-sm relative z-10">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:bg-white/60 dark:hover:bg-gray-700/60 rounded-lg backdrop-blur-sm"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous</span>
              </button>

              {pageNumbers.map((page) => (
                <button
                  key={page}
                  onClick={() => onPageChange(page)}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-300 backdrop-blur-sm ${
                    page === currentPage
                      ? "bg-gradient-to-r from-yec-primary to-yec-accent text-white shadow-lg"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-white/60 dark:hover:bg-gray-700/60"
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 hover:bg-white/60 dark:hover:bg-gray-700/60 rounded-lg backdrop-blur-sm"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
