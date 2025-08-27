"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Download, Activity } from "lucide-react";
import SummaryCards from "./SummaryCards";
import Filters, { FilterState } from "./Filters";
import ResultsTable from "./ResultsTable";
import DetailsDrawer from "./DetailsDrawer";
import type { Registration } from "../../types/database";

interface AdminDashboardProps {
  initialRegistrations: Registration[];
  initialTotalCount: number;
  initialStatusCounts: {
    total: number;
    pending: number;
    waiting_for_review: number;
    approved: number;
    rejected: number;
  };
  initialProvinces: string[];
}

export default function AdminDashboard({
  initialRegistrations,
  initialTotalCount,
  initialStatusCounts,
  initialProvinces,
}: AdminDashboardProps) {
  const searchParams = useSearchParams();

  // Use state to store the data, but update it when props change
  const [registrations, setRegistrations] = useState(initialRegistrations);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [statusCounts, setStatusCounts] = useState(initialStatusCounts);
  const [provinces] = useState(initialProvinces);
  const [selectedRegistration, setSelectedRegistration] =
    useState<Registration | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Update state when props change
  useEffect(() => {
    setRegistrations(initialRegistrations);
    setTotalCount(initialTotalCount);
    setStatusCounts(initialStatusCounts);
  }, [initialRegistrations, initialTotalCount, initialStatusCounts]);

  // Parse current URL params
  const currentPage = parseInt(searchParams.get("page") || "1");
  const pageSize = 20;
  const sortColumn = searchParams.get("sortColumn") || "created_at";
  const sortDirection =
    (searchParams.get("sortDirection") as "asc" | "desc") || "desc";

  const currentFilters: FilterState = {
    status: searchParams.get("status")?.split(",").filter(Boolean) || [],
    provinces: searchParams.get("provinces")?.split(",").filter(Boolean) || [],
    search: searchParams.get("search") || "",
    dateFrom: searchParams.get("dateFrom") || "",
    dateTo: searchParams.get("dateTo") || "",
  };

  // Update URL with current state
  const updateURL = useCallback(
    (newParams: Record<string, string | number | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(newParams).forEach(([key, value]) => {
        if (value === undefined || value === "") {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      });
      const newUrl = params.toString() ? `?${params.toString()}` : "/admin";
      window.history.pushState({}, "", newUrl);
    },
    [searchParams],
  );

  const handlePageChange = useCallback(
    (page: number) => {
      updateURL({ page: page > 1 ? page : undefined });
    },
    [updateURL],
  );

  const handleSort = useCallback(
    (column: string, direction: "asc" | "desc") => {
      updateURL({
        sortColumn: column !== "created_at" ? column : undefined,
        sortDirection: direction !== "desc" ? direction : undefined,
      });
    },
    [updateURL],
  );

  const handleRowClick = useCallback((registration: Registration) => {
    setSelectedRegistration(registration);
    setIsDrawerOpen(true);
  }, []);

  const handleActionComplete = useCallback(() => {
    // Refresh the page to get updated data
    window.location.reload();
  }, []);

  const handleExportCSV = async () => {
    try {
      // Build the export URL with current filters
      const params = new URLSearchParams();
      if (currentFilters.status.length > 0) {
        params.set("status", currentFilters.status.join(","));
      }
      if (currentFilters.provinces.length > 0) {
        params.set("provinces", currentFilters.provinces.join(","));
      }
      if (currentFilters.search) {
        params.set("search", currentFilters.search);
      }
      if (currentFilters.dateFrom) {
        params.set("dateFrom", currentFilters.dateFrom);
      }
      if (currentFilters.dateTo) {
        params.set("dateTo", currentFilters.dateTo);
      }

      const exportUrl = `/api/admin/export-csv?${params.toString()}`;
      window.open(exportUrl, "_blank");
    } catch (error) {
      console.error("Export failed:", error);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in-up relative">
      {/* Light overlay for content readability */}
      <div className="absolute inset-0 bg-white/3 rounded-3xl"></div>

      {/* Welcome Section */}
      <div className="text-center space-y-4 relative z-10">
        <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-100/80 to-blue-200/80 border border-blue-300/50 backdrop-blur-sm shadow-lg">
          <Activity className="h-4 w-4 text-yec-primary animate-pulse-soft" />
          <span className="text-sm font-medium text-yec-primary font-semibold">
            Live Dashboard
          </span>
        </div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-100 to-gray-200 bg-clip-text text-transparent drop-shadow-lg">
          Registration Management
        </h1>
        <p className="text-gray-100 max-w-2xl mx-auto font-medium drop-shadow-lg">
          Monitor and manage all YEC Day registrations with real-time updates
          and advanced filtering capabilities.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="relative z-10">
        <SummaryCards
          totalRegistrations={statusCounts.total}
          pendingCount={statusCounts.pending}
          waitingForReviewCount={statusCounts.waiting_for_review}
          approvedCount={statusCounts.approved}
          rejectedCount={statusCounts.rejected}
          filteredTotal={totalCount}
        />
      </div>

      {/* Filters */}
      <div className="relative z-10">
        <Filters provinces={provinces} />
      </div>

      {/* Export Button */}
      <div className="flex justify-end relative z-10">
        <button
          onClick={handleExportCSV}
          className="group flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-yec-primary to-yec-accent text-white rounded-xl hover:from-yec-accent hover:to-yec-primary transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl backdrop-blur-sm"
        >
          <Download className="h-4 w-4 group-hover:animate-bounce" />
          <span className="font-semibold">Export CSV</span>
        </button>
      </div>

      {/* Results Table */}
      <div className="relative z-10">
        <ResultsTable
          registrations={registrations}
          totalCount={totalCount}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onSort={handleSort}
          currentSort={{ column: sortColumn, direction: sortDirection }}
          onRowClick={handleRowClick}
          onActionComplete={handleActionComplete}
        />
      </div>

      {/* Details Drawer */}
      <DetailsDrawer
        registration={selectedRegistration}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedRegistration(null);
        }}
        onActionComplete={handleActionComplete}
      />
    </div>
  );
}
