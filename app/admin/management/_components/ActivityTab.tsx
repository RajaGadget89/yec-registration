"use client";

import { useState, useEffect } from "react";
import { Activity, Search, Filter, Copy, CheckCircle, Loader2 } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface AuditEntry {
  id: string;
  occurred_at_utc: string;
  action: string;
  resource: string;
  resource_id?: string;
  actor_id?: string;
  actor_role: string;
  result: string;
  reason?: string;
  correlation_id: string;
  meta?: Record<string, any>;
}

interface Filters {
  search: string;
  role: string;
  status: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
  page: number;
  size: number;
}

interface ActivityTabProps {
  filters: Filters;
}

export default function ActivityTab({ filters }: ActivityTabProps) {
  const [activities, setActivities] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [correlationFilter, setCorrelationFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchActivities();
  }, [correlationFilter, actionFilter]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        ...(correlationFilter && { correlation_id: correlationFilter }),
        ...(actionFilter && { action: actionFilter }),
        limit: "50",
      });

      const response = await fetch(`/api/admin/management/activity?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities || []);
      } else {
        setError("Failed to load activity data");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCorrelationId = async (correlationId: string) => {
    try {
      await navigator.clipboard.writeText(correlationId);
      setCopiedId(correlationId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = correlationId;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopiedId(correlationId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const formatTime = (utcTime: string) => {
    try {
      const date = new Date(utcTime);
      return {
        formatted: format(date, "yyyy-MM-dd HH:mm:ss"),
        timeAgo: formatDistanceToNow(date, { addSuffix: true }),
      };
    } catch {
      return { formatted: utcTime, timeAgo: "" };
    }
  };

  const getActionBadge = (action: string) => {
    const actionColors: Record<string, string> = {
      "admin.invitation.created": "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200",
      "admin.invitation.resent": "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200",
      "admin.invitation.cancelled": "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200",
      "admin.invitation.accepted": "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-200",
      "admin.role.updated": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200",
      "admin.status.updated": "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-200",
    };

    const colorClass = actionColors[action] || "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-200";

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
        {action.replace("admin.", "").replace(".", " ")}
      </span>
    );
  };

  const getResultBadge = (result: string) => {
    if (result === "success") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200">
          Success
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200">
        Failed
      </span>
    );
  };

  const formatMeta = (meta: Record<string, any> | undefined) => {
    if (!meta) return "No additional details";
    
    try {
      return JSON.stringify(meta, null, 2);
    } catch {
      return "Invalid metadata format";
    }
  };

  if (loading && activities.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-600 dark:text-gray-300">
          <Activity className="h-12 w-12 mx-auto mb-4 text-gray-400 animate-pulse" />
          <div className="text-lg font-medium mb-2">Loading activity data...</div>
          <div className="text-sm">Please wait while we fetch the audit logs</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex items-center">
          <span className="text-sm text-red-700 dark:text-red-400">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/20">
          <Activity className="h-5 w-5 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Admin Activity Log
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Recent admin management activities and audit trail
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Filter className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Filters
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Correlation ID Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Correlation ID
            </label>
            <input
              type="text"
              value={correlationFilter}
              onChange={(e) => setCorrelationFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Filter by correlation ID..."
            />
          </div>

          {/* Action Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Action Type
            </label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">All Actions</option>
              <option value="admin.invitation.created">Invitation Created</option>
              <option value="admin.invitation.resent">Invitation Resent</option>
              <option value="admin.invitation.cancelled">Invitation Cancelled</option>
              <option value="admin.invitation.accepted">Invitation Accepted</option>
              <option value="admin.role.updated">Role Updated</option>
              <option value="admin.status.updated">Status Updated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Activity Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700" data-testid="activity-table">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Actor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Target
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Correlation ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Result
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {activities.map((activity) => (
                <tr key={activity.id} className="hover:bg-gray-50 dark:hover:bg-gray-800" data-testid={`activity-row-${activity.id}`}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    <div>
                      <div>{formatTime(activity.occurred_at_utc).formatted}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {formatTime(activity.occurred_at_utc).timeAgo}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {activity.actor_id || "System"}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {activity.actor_role}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getActionBadge(activity.action)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {activity.resource}
                    </div>
                    {activity.resource_id && (
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        ID: {activity.resource_id.slice(0, 8)}...
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-mono text-gray-900 dark:text-white">
                        {activity.correlation_id.slice(0, 12)}...
                      </span>
                      <button
                        onClick={() => handleCopyCorrelationId(activity.correlation_id)}
                        className="inline-flex items-center p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                        title="Copy correlation ID"
                      >
                        {copiedId === activity.correlation_id ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getResultBadge(activity.result)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {activity.reason && (
                        <div className="mb-1">
                          <span className="font-medium">Reason:</span> {activity.reason}
                        </div>
                      )}
                      {activity.meta && Object.keys(activity.meta).length > 0 && (
                        <details className="mt-1">
                          <summary className="cursor-pointer text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300">
                            View Details
                          </summary>
                          <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded overflow-x-auto">
                            {formatMeta(activity.meta)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {activities.length === 0 && !loading && (
          <div className="text-center py-12">
            <div className="text-gray-600 dark:text-gray-300">
              <Activity className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <div className="text-lg font-medium mb-2">No activity found</div>
              <div className="text-sm">
                No admin management activities match your current filters
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
