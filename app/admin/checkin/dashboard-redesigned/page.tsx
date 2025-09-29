"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BarChart3,
  Users,
  CheckCircle,
  Download,
  Calendar,
  UserCheck,
} from "lucide-react";
import AttendanceFilters, {
  AttendanceFilterState,
} from "../_components/AttendanceFilters";
import AttendanceDataTable from "../_components/AttendanceDataTable";
import AttendancePagination from "../_components/AttendancePagination";

interface AttendanceStats {
  total_approved_users: number;
  first_sight_badges_issued: number;
  unique_attendees: number;
  total_checkins: number;
  overall_attendance_rate: number;
  first_sight_attendance_rate: number;
  event_participation_rate: number;
  event_participation: Array<{
    event_type: string;
    checkin_count: number;
    unique_users: number;
    business_rule: string;
  }>;
  badge_distribution: {
    total_eligible: number;
    badges_issued: number;
    pending_issue: number;
    completion_rate: string;
  };
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

type TabType = "overview" | "attendance" | "events" | "reports";

export default function RedesignedCheckinDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get current tab from URL params
  const currentTab = (searchParams.get("tab") as TabType) || "overview";

  // State for overview stats
  const [overviewData, setOverviewData] = useState<AttendanceStats | null>(
    null,
  );
  const [overviewLoading, setOverviewLoading] = useState(true);

  // State for filtered data
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

  // Tab navigation
  const tabs = [
    {
      id: "overview" as TabType,
      label: "Overview",
      icon: BarChart3,
      description: "Key metrics and statistics",
    },
    {
      id: "attendance" as TabType,
      label: "Attendance Records",
      icon: Users,
      description: "Detailed check-in data with filtering",
    },
    {
      id: "events" as TabType,
      label: "Event Analysis",
      icon: Calendar,
      description: "Event participation breakdown",
    },
    {
      id: "reports" as TabType,
      label: "Reports",
      icon: Download,
      description: "Export and generate reports",
    },
  ];

  // Fetch overview statistics
  const fetchOverviewStats = async () => {
    try {
      setOverviewLoading(true);
      const response = await fetch("/api/admin/checkin/attendance");

      if (response.ok) {
        const data = await response.json();
        setOverviewData(data.stats);
      } else {
        console.error("Failed to fetch overview stats");
      }
    } catch (error) {
      console.error("Error fetching overview stats:", error);
    } finally {
      setOverviewLoading(false);
    }
  };

  // Fetch filtered attendance data
  const fetchFilteredData = async (currentFilters: AttendanceFilterState) => {
    try {
      setFilteredLoading(true);

      const params = new URLSearchParams();
      Object.entries(currentFilters).forEach(([key, value]) => {
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
    fetchFilteredData(newFilters);
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    const newFilters = { ...filters, page };
    setFilters(newFilters);
    fetchFilteredData(newFilters);
  };

  const handlePageSizeChange = (pageSize: number) => {
    const newFilters = { ...filters, pageSize, page: 1 };
    setFilters(newFilters);
    fetchFilteredData(newFilters);
  };

  // Handle sorting
  const handleSort = (sortBy: string, sortOrder: "asc" | "desc") => {
    const newFilters = { ...filters, sortBy, sortOrder, page: 1 };
    setFilters(newFilters);
    fetchFilteredData(newFilters);
  };

  // Tab change handler
  const handleTabChange = (tab: TabType) => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    router.push(url.pathname + url.search);
  };

  // Initial data fetch
  useEffect(() => {
    fetchOverviewStats();
    if (currentTab === "attendance") {
      fetchFilteredData(filters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTab]);

  // Render tab content
  const renderTabContent = () => {
    switch (currentTab) {
      case "overview":
        return <OverviewTab data={overviewData} loading={overviewLoading} />;
      case "attendance":
        return (
          <AttendanceTab
            data={filteredData}
            loading={filteredLoading}
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            onSort={handleSort}
          />
        );
      case "events":
        return <EventsTab data={overviewData} loading={overviewLoading} />;
      case "reports":
        return <ReportsTab data={overviewData} loading={overviewLoading} />;
      default:
        return <OverviewTab data={overviewData} loading={overviewLoading} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Attendance Dashboard
              </h1>
              <p className="text-gray-700 dark:text-gray-300">
                Monitor and manage user attendance and check-in statistics
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
            <UserCheck className="h-4 w-4" />
            <span>Admin Access</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav
            className="flex space-x-8 px-6"
            aria-label="Attendance Dashboard Tabs"
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    isActive
                      ? "border-blue-500 text-blue-600 dark:text-blue-400"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
        {renderTabContent()}
      </div>
    </div>
  );
}

// Overview Tab Component
function OverviewTab({
  data,
  loading,
}: {
  data: AttendanceStats | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 text-center">
        <div className="text-gray-400 text-4xl mb-2">📊</div>
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">
                Total Approved Users
              </p>
              <p className="text-3xl font-bold text-blue-900">
                {data.total_approved_users}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                3-dimension approval passed
              </p>
            </div>
            <div className="p-3 bg-blue-200 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-6 border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-yellow-600">
                First-Sight Badges
              </p>
              <p className="text-3xl font-bold text-yellow-900">
                {data.first_sight_badges_issued}
              </p>
              <p className="text-xs text-yellow-600 mt-1">
                New badge cards distributed
              </p>
            </div>
            <div className="p-3 bg-yellow-200 rounded-lg">
              <CheckCircle className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">
                Unique Attendees
              </p>
              <p className="text-3xl font-bold text-green-900">
                {data.unique_attendees}
              </p>
              <p className="text-xs text-green-600 mt-1">
                Distinct users checked in
              </p>
            </div>
            <div className="p-3 bg-green-200 rounded-lg">
              <UserCheck className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">
                Attendance Rate
              </p>
              <p className="text-3xl font-bold text-purple-900">
                {data.overall_attendance_rate}%
              </p>
              <p className="text-xs text-purple-600 mt-1">
                Overall participation
              </p>
            </div>
            <div className="p-3 bg-purple-200 rounded-lg">
              <BarChart3 className="h-6 w-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Badge Distribution Status */}
      <div className="bg-gray-50 rounded-xl p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Badge Distribution Status
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">
              {data.badge_distribution.total_eligible}
            </p>
            <p className="text-sm text-gray-600">Total Eligible</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {data.badge_distribution.badges_issued}
            </p>
            <p className="text-sm text-gray-600">Badges Issued</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-600">
              {data.badge_distribution.pending_issue}
            </p>
            <p className="text-sm text-gray-600">Pending Issue</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">
              {data.badge_distribution.completion_rate}%
            </p>
            <p className="text-sm text-gray-600">Completion Rate</p>
          </div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-blue-500 h-3 rounded-full transition-all duration-300"
            style={{ width: `${data.badge_distribution.completion_rate}%` }}
          ></div>
        </div>
      </div>

      {/* Event Participation */}
      {data.event_participation && data.event_participation.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Event Participation Breakdown
          </h3>
          <div className="space-y-3">
            {data.event_participation.map((event, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {event.event_type}
                    </p>
                    <p className="text-sm text-gray-600">
                      {event.business_rule}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    {event.checkin_count} check-ins
                  </p>
                  <p className="text-sm text-gray-600">
                    {event.unique_users} unique users
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Attendance Tab Component
function AttendanceTab({
  data,
  loading,
  filters,
  onFiltersChange,
  onPageChange,
  onPageSizeChange,
  onSort,
}: {
  data: FilteredAttendanceData | null;
  loading: boolean;
  filters: AttendanceFilterState;
  onFiltersChange: (filters: AttendanceFilterState) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onSort: (sortBy: string, sortOrder: "asc" | "desc") => void;
}) {
  return (
    <div className="p-6">
      {/* Filters */}
      <div className="mb-6">
        <AttendanceFilters
          onFiltersChange={onFiltersChange}
          onExport={(format) =>
            console.log(`Export ${format} not implemented yet`)
          }
          initialFilters={filters}
          filterOptions={data?.filters}
        />
      </div>

      {/* Data Table */}
      <div className="mb-6">
        <AttendanceDataTable
          checkins={data?.checkins || []}
          loading={loading}
          onSort={onSort}
          currentSort={{ sortBy: filters.sortBy, sortOrder: filters.sortOrder }}
        />
      </div>

      {/* Pagination */}
      {data?.pagination && (
        <AttendancePagination
          pagination={data.pagination}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </div>
  );
}

// Events Tab Component
function EventsTab({
  data,
  loading,
}: {
  data: AttendanceStats | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || !data.event_participation) {
    return (
      <div className="p-6 text-center">
        <div className="text-gray-400 text-4xl mb-2">📅</div>
        <p className="text-gray-500">No event data available</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">
        Event Analysis
      </h3>
      <div className="space-y-4">
        {data.event_participation.map((event, index) => (
          <div key={index} className="bg-gray-50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-lg font-medium text-gray-900">
                  {event.event_type}
                </h4>
                <p className="text-sm text-gray-600">{event.business_rule}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-gray-900">
                  {event.checkin_count}
                </p>
                <p className="text-sm text-gray-600">Total Check-ins</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Unique Users</p>
                <p className="text-xl font-semibold text-gray-900">
                  {event.unique_users}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Participation Rate</p>
                <p className="text-xl font-semibold text-gray-900">
                  {data.total_approved_users > 0
                    ? (
                        (event.unique_users / data.total_approved_users) *
                        100
                      ).toFixed(1)
                    : 0}
                  %
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Reports Tab Component
function ReportsTab({
  data: _data,
  loading,
}: {
  data: AttendanceStats | null;
  loading: boolean;
}) {
  const handleExport = (format: "csv" | "json") => {
    // Export functionality would be implemented here
    console.log(`Exporting data as ${format}`);
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">
        Generate Reports
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 rounded-lg p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-2">
            Attendance Summary
          </h4>
          <p className="text-sm text-gray-600 mb-4">
            Export comprehensive attendance data
          </p>
          <div className="flex space-x-3">
            <button
              onClick={() => handleExport("csv")}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Export CSV
            </button>
            <button
              onClick={() => handleExport("json")}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Export JSON
            </button>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-2">
            Badge Distribution
          </h4>
          <p className="text-sm text-gray-600 mb-4">
            Export badge issuance reports
          </p>
          <div className="flex space-x-3">
            <button
              onClick={() => handleExport("csv")}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Export CSV
            </button>
            <button
              onClick={() => handleExport("json")}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              Export JSON
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
