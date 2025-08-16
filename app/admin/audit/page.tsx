import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Shield, Activity, Search, Filter, Download } from "lucide-react";
import { getCurrentUser } from "../../lib/auth-utils.server";
import {
  getAuditAccessLogs,
  getAuditEventLogs,
  type AuditFilters,
  type AuditAccessLog,
  type AuditEventLog,
} from "../../lib/supabaseAdminAudit";
import AuditTable from "../_components/AuditTable";
import QuickFilters from "../_components/QuickFilters";

// Force Node runtime for server-side operations
export const runtime = "nodejs";

// Force dynamic rendering for real-time data
export const dynamic = "force-dynamic";

interface AuditPageProps {
  searchParams?: Promise<{
    request_id?: string;
    correlation_id?: string;
    action?: string;
    resource?: string;
    date_from?: string;
    date_to?: string;
  }>;
}

export default async function AuditPage({ searchParams }: AuditPageProps) {
  // Check admin authentication
  const user = await getCurrentUser();
  if (!user || !user.is_active) {
    redirect("/admin/login");
  }

  const params = (await searchParams) ?? {};

  // Build filters from URL params
  const filters: AuditFilters = {
    request_id: params.request_id,
    correlation_id: params.correlation_id,
    action: params.action,
    resource: params.resource,
    date_from: params.date_from,
    date_to: params.date_to,
  };

  // If request_id is provided, map it to correlation_id for event logs
  if (params.request_id && !params.correlation_id) {
    filters.correlation_id = params.request_id;
  }

  // Set default time window to last 24h if no dates provided
  if (!filters.date_from && !filters.date_to) {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    filters.date_from = yesterday.toISOString();
    filters.date_to = now.toISOString();
  }

  // Fetch audit data with error handling
  let accessLogs: AuditAccessLog[] = [];
  let eventLogs: AuditEventLog[] = [];

  try {
    [accessLogs, eventLogs] = await Promise.all([
      getAuditAccessLogs(filters, 100),
      getAuditEventLogs(filters, 100),
    ]);
  } catch (error) {
    console.error("Error fetching audit data:", error);
    // Continue with empty arrays for better UX
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
              <Shield className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Audit Dashboard
              </h1>
              <p className="text-gray-700 dark:text-gray-300">
                Monitor system access and events
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
            <Activity className="h-4 w-4" />
            <span>Real-time logs</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Filters
          </h2>
        </div>

        <form method="GET" className="space-y-4">
          {/* Quick Filters */}
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-800 dark:text-gray-200">
              Quick Filters:
            </label>
            <QuickFilters currentAction={params.action} />
          </div>

          {/* Main Filters */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <div>
              <label
                htmlFor="request_id"
                className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1"
              >
                Request ID
              </label>
              <input
                type="text"
                id="request_id"
                name="request_id"
                defaultValue={params.request_id}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Filter by request ID"
              />
            </div>

            <div>
              <label
                htmlFor="action"
                className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1"
              >
                Action
              </label>
              <input
                type="text"
                id="action"
                name="action"
                defaultValue={params.action}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Filter by action"
              />
            </div>

            <div>
              <label
                htmlFor="resource"
                className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1"
              >
                Resource
              </label>
              <input
                type="text"
                id="resource"
                name="resource"
                defaultValue={params.resource}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Filter by resource"
              />
            </div>

            <div>
              <label
                htmlFor="date_from"
                className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1"
              >
                Date From
              </label>
              <input
                type="datetime-local"
                id="date_from"
                name="date_from"
                defaultValue={
                  params.date_from ? params.date_from.slice(0, 16) : ""
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label
                htmlFor="date_to"
                className="block text-sm font-medium text-gray-800 dark:text-gray-200 mb-1"
              >
                Date To
              </label>
              <input
                type="datetime-local"
                id="date_to"
                name="date_to"
                defaultValue={params.date_to ? params.date_to.slice(0, 16) : ""}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium rounded-lg hover:from-blue-600 hover:to-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 flex items-center justify-center space-x-2"
              >
                <Search className="h-4 w-4" />
                <span>Search</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <div className="flex items-center space-x-2 py-4 px-1 border-b-2 border-blue-500 text-blue-600 dark:text-blue-400">
              <Activity className="h-5 w-5" />
              <span className="font-medium">Access Logs</span>
              <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-medium px-2 py-1 rounded-full">
                {accessLogs.length}
              </span>
            </div>
            <div className="flex items-center space-x-2 py-4 px-1 border-b-2 border-transparent text-gray-600 dark:text-gray-300">
              <Shield className="h-5 w-5" />
              <span className="font-medium">Event Logs</span>
              <span className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-medium px-2 py-1 rounded-full">
                {eventLogs.length}
              </span>
            </div>
          </nav>
        </div>

        {/* Audit System Status */}
        {accessLogs.length === 0 && eventLogs.length === 0 && (
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Shield className="h-5 w-5 text-yellow-400" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Audit System Status
                  </h3>
                  <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                    <p>No audit logs found. This could mean:</p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>The audit schema hasn&apos;t been created yet</li>
                      <li>No audit events have been logged recently</li>
                      <li>There might be a configuration issue</li>
                    </ul>
                    <p className="mt-2">
                      <strong>To set up audit logging:</strong> Run the audit
                      schema creation scripts in the{" "}
                      <code className="bg-yellow-100 dark:bg-yellow-900 px-1 rounded">
                        scripts/
                      </code>{" "}
                      folder.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="p-6">
          <Suspense
            fallback={
              <div className="space-y-4">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
                  <div className="space-y-3">
                    {[
                      "skeleton-1",
                      "skeleton-2",
                      "skeleton-3",
                      "skeleton-4",
                      "skeleton-5",
                    ].map((key) => (
                      <div
                        key={key}
                        className="h-12 bg-gray-200 dark:bg-gray-700 rounded"
                      ></div>
                    ))}
                  </div>
                </div>
              </div>
            }
          >
            {/* Access Logs Tab */}
            <div>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Access Logs
                  </h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    HTTP requests and API access logs
                  </p>
                </div>
                <a
                  href={`/admin/audit/export?type=access&${new URLSearchParams(params).toString()}`}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </a>
              </div>
              <AuditTable data={accessLogs} type="access" />
            </div>

            {/* Event Logs Tab */}
            <div className="mt-8">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Event Logs
                  </h3>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Business events and system activities
                  </p>
                </div>
                <a
                  href={`/admin/audit/export?type=event&${new URLSearchParams(params).toString()}`}
                  className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </a>
              </div>
              <AuditTable data={eventLogs} type="event" />
            </div>
          </Suspense>
        </div>
      </div>
    </div>
  );
}
