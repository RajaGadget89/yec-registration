"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AttendanceFilters, {
  AttendanceFilterState,
} from "../_components/AttendanceFilters";
import AttendanceDataTable from "../_components/AttendanceDataTable";
import AttendancePagination from "../_components/AttendancePagination";

interface AttendanceStats {
  // Core metrics
  total_approved_users: number;
  first_sight_badges_issued: number;
  unique_attendees: number;
  total_checkins: number;
  overall_attendance_rate: number;
  first_sight_attendance_rate: number;
  event_participation_rate: number;
  // Event breakdown
  event_participation: Array<{
    event_type: string;
    checkin_count: number;
    unique_users: number;
    business_rule: string;
  }>;
  // Badge distribution
  badge_distribution: {
    total_eligible: number;
    badges_issued: number;
    pending_issue: number;
    completion_rate: string;
  };
}

interface RecentCheckin {
  id: string;
  user_name: string;
  user_email: string;
  event_name: string;
  checkin_time: string;
  location: string;
  notes: string;
  checked_by: string;
}

interface CheckinRecord {
  id: string;
  checkin_time: string;
  location: string;
  notes: string;
  user_name: string;
  user_email: string;
  user_phone: string;
  company_name: string;
  province: string;
  status: string;
  event_name: string;
  event_type: string;
  business_rule: string;
  checked_by: string;
}

interface FilteredAttendanceData {
  checkins: CheckinRecord[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  filters: {
    eventTypes: Array<{ name: string; business_rule_category: string }>;
    provinces: string[];
    statusOptions: Array<{ value: string; label: string }>;
  };
}

interface AttendanceData {
  stats: AttendanceStats;
  recent_checkins: RecentCheckin[];
  utility_stats: any;
}

export default function CheckinDashboard() {
  const [data, setData] = useState<AttendanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exportLoading, setExportLoading] = useState(false);

  // Filtered data state
  const [filteredData, setFilteredData] =
    useState<FilteredAttendanceData | null>(null);
  const [filteredLoading, setFilteredLoading] = useState(false);

  // Filter state
  const [filters, setFilters] = useState<AttendanceFilterState>({
    search: "",
    eventType: "",
    dateFrom: "",
    dateTo: "",
    status: "",
    province: "",
    page: 1,
    pageSize: 20,
    sortBy: "checkin_time",
    sortOrder: "desc",
  });

  const _router = useRouter();

  useEffect(() => {
    loadAttendanceData();
    loadFilteredData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch filtered attendance data
  const loadFilteredData = async (currentFilters?: AttendanceFilterState) => {
    try {
      setFilteredLoading(true);

      const params = new URLSearchParams();
      const filtersToUse = currentFilters || filters;
      Object.entries(filtersToUse).forEach(([key, value]) => {
        if (value && value !== "") {
          params.set(key, value.toString());
        }
      });

      const response = await fetch(
        `/api/admin/checkin/attendance-filtered?${params}`,
      );

      if (response.ok) {
        const data = await response.json();
        setFilteredData(data);
      } else {
        console.error("Failed to fetch filtered data");
      }
    } catch (error) {
      console.error("Error fetching filtered data:", error);
    } finally {
      setFilteredLoading(false);
    }
  };

  // Handle filter changes
  const handleFiltersChange = (newFilters: AttendanceFilterState) => {
    setFilters(newFilters);
    loadFilteredData(newFilters);
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    const newFilters = { ...filters, page };
    setFilters(newFilters);
    loadFilteredData(newFilters);
  };

  const handlePageSizeChange = (pageSize: number) => {
    const newFilters = { ...filters, pageSize, page: 1 };
    setFilters(newFilters);
    loadFilteredData(newFilters);
  };

  // Handle sorting
  const handleSort = (sortBy: string, sortOrder: "asc" | "desc") => {
    const newFilters = { ...filters, sortBy, sortOrder, page: 1 };
    setFilters(newFilters);
    loadFilteredData(newFilters);
  };

  // Handle export
  const handleExport = async (format: "csv" | "json") => {
    try {
      setExportLoading(true);

      // Build query parameters from current filters
      const params = new URLSearchParams();
      params.set("format", format);

      // Add all current filter values
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== "" && key !== "page" && key !== "pageSize") {
          params.set(key, value.toString());
        }
      });

      const response = await fetch(`/api/admin/checkin/export?${params}`);

      if (!response.ok) {
        throw new Error("Export failed");
      }

      // Handle the download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      // Get filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = `attendance_export_${new Date().toISOString().split("T")[0]}.${format}`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Export error:", error);
      setError("Export failed. Please try again.");
    } finally {
      setExportLoading(false);
    }
  };

  const loadAttendanceData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/checkin/attendance");

      if (!response.ok) {
        throw new Error("Failed to load attendance data");
      }

      const attendanceData = await response.json();
      setData(attendanceData);
    } catch (error) {
      console.error("Error loading attendance data:", error);
      setError("Failed to load attendance data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const _formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yec-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Attendance Dashboard
              </h1>
              <p className="text-sm text-gray-600">
                Overview of user attendance and check-in statistics
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
            <button
              onClick={() => setError("")}
              className="ml-4 text-sm underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {data && (
          <>
            {/* Enhanced Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Total Approved Users */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm font-bold">👥</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Total Approved Users
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {data.stats.total_approved_users}
                        </dd>
                        <dd className="text-xs text-gray-500">
                          3-dimension approval passed
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              {/* First-Sight Badges Issued */}
              <div className="bg-white overflow-hidden shadow rounded-lg border-2 border-yec-primary">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-yec-primary rounded-md flex items-center justify-center">
                        <span className="text-white text-sm font-bold">🎫</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          First-Sight Badges Issued
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {data.stats.first_sight_badges_issued}
                        </dd>
                        <dd className="text-xs text-gray-500">
                          New badge cards distributed
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              {/* Unique Attendees */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm font-bold">✅</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Unique Attendees
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {data.stats.unique_attendees}
                        </dd>
                        <dd className="text-xs text-gray-500">
                          Distinct users checked in
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              {/* Overall Attendance Rate */}
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                        <span className="text-white text-sm font-bold">📊</span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Attendance Rate
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          {data.stats.overall_attendance_rate.toFixed(1)}%
                        </dd>
                        <dd className="text-xs text-gray-500">
                          Overall participation
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Event Type Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">
                    Event Participation Breakdown
                  </h3>
                </div>
                <div className="p-6">
                  {data.stats.event_participation &&
                  data.stats.event_participation.length > 0 ? (
                    <div className="space-y-4">
                      {data.stats.event_participation.map((item, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between"
                        >
                          <div className="flex items-center">
                            <div
                              className={`w-3 h-3 rounded-full mr-3 ${
                                item.business_rule === "ONE_TIME_ONLY"
                                  ? "bg-yec-primary"
                                  : "bg-gray-400"
                              }`}
                            ></div>
                            <div>
                              <span className="text-sm font-medium text-gray-900">
                                {item.event_type}
                              </span>
                              <div className="text-xs text-gray-500">
                                {item.business_rule === "ONE_TIME_ONLY"
                                  ? "Badge Distribution"
                                  : "Multiple Allowed"}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900">
                              {item.checkin_count} check-ins
                            </div>
                            <div className="text-xs text-gray-500">
                              {item.unique_users} unique users
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">
                      No attendance data available
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-white shadow rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900">
                    Badge Distribution Status
                  </h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        Total Eligible
                      </span>
                      <span className="text-sm font-bold text-gray-900">
                        {data.stats.badge_distribution?.total_eligible || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        Badges Issued
                      </span>
                      <span className="text-sm font-bold text-yec-primary">
                        {data.stats.badge_distribution?.badges_issued || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        Pending Issue
                      </span>
                      <span className="text-sm font-bold text-orange-600">
                        {data.stats.badge_distribution?.pending_issue || 0}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        Completion Rate
                      </span>
                      <span className="text-sm font-bold text-green-600">
                        {data.stats.badge_distribution?.completion_rate || 0}%
                      </span>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-yec-primary h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${data.stats.badge_distribution?.completion_rate || 0}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters Section */}
            <div className="mb-6">
              <AttendanceFilters
                onFiltersChange={handleFiltersChange}
                onExport={handleExport}
                exportLoading={exportLoading}
                initialFilters={filters}
                filterOptions={filteredData?.filters}
              />
            </div>

            {/* Attendance Records Table */}
            <div className="mb-6">
              <AttendanceDataTable
                checkins={filteredData?.checkins || []}
                loading={filteredLoading}
                onSort={handleSort}
                currentSort={{
                  sortBy: filters.sortBy,
                  sortOrder: filters.sortOrder,
                }}
              />
            </div>

            {/* Pagination */}
            {filteredData?.pagination && (
              <div className="mb-8">
                <AttendancePagination
                  pagination={filteredData.pagination}
                  onPageChange={handlePageChange}
                  onPageSizeChange={handlePageSizeChange}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
