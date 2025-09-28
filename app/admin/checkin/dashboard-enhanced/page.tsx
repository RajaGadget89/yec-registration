'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AttendanceFilters, { AttendanceFilterState } from '../_components/AttendanceFilters';
import AttendanceDataTable from '../_components/AttendanceDataTable';
import AttendancePagination from '../_components/AttendancePagination';

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

export default function EnhancedCheckinDashboard() {
  const router = useRouter();
  
  // State for overview stats
  const [overviewData, setOverviewData] = useState<AttendanceStats | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  
  // State for filtered data
  const [filteredData, setFilteredData] = useState<FilteredAttendanceData | null>(null);
  const [filteredLoading, setFilteredLoading] = useState(false);
  
  // Filter state
  const [filters, setFilters] = useState<AttendanceFilterState>({
    search: '',
    eventType: '',
    dateFrom: '',
    dateTo: '',
    status: '',
    province: '',
    page: 1,
    pageSize: 20,
    sortBy: 'checkin_time',
    sortOrder: 'desc'
  });

  // Fetch overview statistics
  const fetchOverviewStats = async () => {
    try {
      setOverviewLoading(true);
      const response = await fetch('/api/admin/checkin/attendance');
      
      if (response.ok) {
        const data = await response.json();
        setOverviewData(data.stats);
      } else {
        console.error('Failed to fetch overview stats');
      }
    } catch (error) {
      console.error('Error fetching overview stats:', error);
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
        if (value && value !== '') {
          params.set(key, value.toString());
        }
      });

      const response = await fetch(`/api/admin/checkin/attendance-filtered?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        setFilteredData(data);
      } else {
        console.error('Failed to fetch filtered data');
      }
    } catch (error) {
      console.error('Error fetching filtered data:', error);
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
  const handleSort = (sortBy: string, sortOrder: 'asc' | 'desc') => {
    const newFilters = { ...filters, sortBy, sortOrder, page: 1 };
    setFilters(newFilters);
    fetchFilteredData(newFilters);
  };

  // Initial data fetch
  useEffect(() => {
    fetchOverviewStats();
    fetchFilteredData(filters);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Attendance Dashboard</h1>
          <p className="mt-2 text-gray-600">
            Comprehensive overview of user attendance and check-in statistics with advanced filtering
          </p>
        </div>

        {/* Overview Stats */}
        {overviewLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : overviewData ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Approved Users */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Approved Users</p>
                  <p className="text-2xl font-bold text-gray-900">{overviewData.total_approved_users}</p>
                  <p className="text-xs text-gray-500">3-dimension approval passed</p>
                </div>
              </div>
            </div>

            {/* First-Sight Badges Issued */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-100 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">First-Sight Badges Issued</p>
                  <p className="text-2xl font-bold text-gray-900">{overviewData.first_sight_badges_issued}</p>
                  <p className="text-xs text-gray-500">New badge cards distributed</p>
                </div>
              </div>
            </div>

            {/* Unique Attendees */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Unique Attendees</p>
                  <p className="text-2xl font-bold text-gray-900">{overviewData.unique_attendees}</p>
                  <p className="text-xs text-gray-500">Distinct users checked in</p>
                </div>
              </div>
            </div>

            {/* Overall Attendance Rate */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Overall Attendance Rate</p>
                  <p className="text-2xl font-bold text-gray-900">{overviewData.overall_attendance_rate}%</p>
                  <p className="text-xs text-gray-500">Overall participation</p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Filters */}
        <div className="mb-6">
          <AttendanceFilters
            onFiltersChange={handleFiltersChange}
            initialFilters={filters}
            filterOptions={filteredData?.filters}
          />
        </div>

        {/* Data Table */}
        <div className="mb-6">
          <AttendanceDataTable
            checkins={filteredData?.checkins || []}
            loading={filteredLoading}
            onSort={handleSort}
            currentSort={{ sortBy: filters.sortBy, sortOrder: filters.sortOrder }}
          />
        </div>

        {/* Pagination */}
        {filteredData?.pagination && (
          <AttendancePagination
            pagination={filteredData.pagination}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        )}

        {/* Quick Actions */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => router.push('/admin/checkin/dashboard')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              📊 Overview Dashboard
            </button>
            <button
              onClick={() => fetchOverviewStats()}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              🔄 Refresh Stats
            </button>
            <button
              onClick={() => fetchFilteredData(filters)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              🔄 Refresh Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
