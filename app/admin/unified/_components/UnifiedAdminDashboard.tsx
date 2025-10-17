"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Download, Activity, Users, CheckCircle, Clock } from "lucide-react";
import UnifiedFilters from "../../_components/UnifiedFilters";
import UnifiedRegistrationTable from "../../_components/UnifiedRegistrationTable";
import type { UnifiedRegistration } from "../../../lib/admin/unifiedRegistrationService";

interface FormType {
  form_key: string;
  name: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}

interface RegistrationStats {
  total_registrations: number;
  by_status: Record<string, number>;
  by_form_type: Record<string, number>;
  recent_registrations: number;
}

interface UnifiedAdminDashboardProps {
  initialRegistrations: UnifiedRegistration[];
  initialPagination: PaginationInfo;
  initialFormTypes: FormType[];
  initialStats: RegistrationStats;
  initialFilters: {
    form_filter: string;
    status_filter: string;
    search: string;
    page: number;
  };
}

export default function UnifiedAdminDashboard({
  initialRegistrations,
  initialPagination,
  initialFormTypes,
  initialStats,
  initialFilters,
}: UnifiedAdminDashboardProps) {
  const router = useRouter();
  const [registrations, setRegistrations] = useState(initialRegistrations);
  const [pagination, setPagination] = useState(initialPagination);
  const [formTypes] = useState(initialFormTypes);
  const [stats, setStats] = useState(initialStats);
  const [loading, setLoading] = useState(false);
  const [selectedRegistration, setSelectedRegistration] =
    useState<UnifiedRegistration | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Update state when props change
  useEffect(() => {
    setRegistrations(initialRegistrations);
    setPagination(initialPagination);
    setStats(initialStats);
  }, [initialRegistrations, initialPagination, initialStats]);

  const handleFiltersChange = async (filters: {
    form_filter: string;
    status_filter: string;
    search: string;
    page: number;
  }) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        form_filter: filters.form_filter,
        status_filter: filters.status_filter,
        search: filters.search,
        page: filters.page.toString(),
        limit: "50",
      });

      const response = await fetch(
        `/api/admin/registrations-unified?${params}`,
      );
      if (response.ok) {
        const data = await response.json();
        setRegistrations(data.registrations);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Error fetching registrations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegistrationSelect = (registration: UnifiedRegistration) => {
    setSelectedRegistration(registration);
    setShowDetails(true);
  };

  const handleCloseDetails = () => {
    setSelectedRegistration(null);
    setShowDetails(false);
  };

  const handlePageChange = (newPage: number) => {
    const newFilters = {
      ...initialFilters,
      page: newPage,
    };
    handleFiltersChange(newFilters);
  };

  const getStatusCount = (status: string) => {
    return stats.by_status[status] || 0;
  };

  const _getFormTypeCount = (formType: string) => {
    return stats.by_form_type[formType] || 0;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Unified Registration Dashboard
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                Manage all registrations from traditional and new forms
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center">
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>
              <button
                onClick={() => router.push("/admin")}
                className="px-4 py-2 bg-yec-primary text-white rounded-lg hover:bg-yec-accent transition-colors"
              >
                Traditional View
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Registrations
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.total_registrations.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Pending Review
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {getStatusCount("waiting_for_review").toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Approved
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {getStatusCount("approved").toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Activity className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Recent (7 days)
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.recent_registrations.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Type Breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Registrations by Form Type
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(stats.by_form_type).map(([formType, count]) => (
              <div
                key={formType}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {formType === "traditional"
                    ? "YEC Day (Traditional)"
                    : formType}
                </span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">
                  {count.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Filters */}
        <UnifiedFilters
          formTypes={formTypes}
          onFiltersChange={handleFiltersChange}
        />

        {/* Registration Table */}
        <div className="mt-8">
          <UnifiedRegistrationTable
            registrations={registrations}
            loading={loading}
            onRegistrationSelect={handleRegistrationSelect}
          />
        </div>

        {/* Pagination */}
        {pagination.total_pages > 1 && (
          <div className="mt-8 flex items-center justify-between">
            <div className="text-sm text-gray-700 dark:text-gray-300">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
              of {pagination.total.toLocaleString()} results
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Previous
              </button>
              <span className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
                Page {pagination.page} of {pagination.total_pages}
              </span>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.total_pages}
                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Registration Details Modal */}
        {showDetails && selectedRegistration && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Registration Details
                  </h2>
                  <button
                    onClick={handleCloseDetails}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      Basic Information
                    </h3>
                    <dl className="space-y-2">
                      <div>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Name
                        </dt>
                        <dd className="text-sm text-gray-900 dark:text-white">
                          {selectedRegistration.name}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Email
                        </dt>
                        <dd className="text-sm text-gray-900 dark:text-white">
                          {selectedRegistration.email}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Phone
                        </dt>
                        <dd className="text-sm text-gray-900 dark:text-white">
                          {selectedRegistration.phone}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Tracking ID
                        </dt>
                        <dd className="text-sm text-gray-900 dark:text-white font-mono">
                          {selectedRegistration.tracking_id}
                        </dd>
                      </div>
                    </dl>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                      Registration Details
                    </h3>
                    <dl className="space-y-2">
                      <div>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Form Type
                        </dt>
                        <dd className="text-sm text-gray-900 dark:text-white">
                          {selectedRegistration.form_name}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Status
                        </dt>
                        <dd className="text-sm text-gray-900 dark:text-white">
                          {selectedRegistration.status}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Created
                        </dt>
                        <dd className="text-sm text-gray-900 dark:text-white">
                          {new Date(
                            selectedRegistration.created_at,
                          ).toLocaleString()}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                          Updated
                        </dt>
                        <dd className="text-sm text-gray-900 dark:text-white">
                          {new Date(
                            selectedRegistration.updated_at,
                          ).toLocaleString()}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Form Data
                  </h3>
                  <pre className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg text-sm text-gray-900 dark:text-white overflow-x-auto">
                    {JSON.stringify(selectedRegistration.core_data, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
