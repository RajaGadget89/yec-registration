"use client";

import { useState, useEffect } from "react";
import { Button } from "../../components/ui/button";

import {
  Loader2,
  Mail,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  X,
  RefreshCw,
} from "lucide-react";
// import { toast } from 'sonner'; // Removed - not available

interface OutboxStats {
  total_pending: number;
  total_sent: number;
  total_error: number;
  oldest_pending: string | null;
}

interface EmailOutboxTrendsPoint {
  ts: string;
  queued: number;
  sent: number;
  failed: number;
  pending_snapshot?: number;
}

interface EmailOutboxTrends24h {
  window: "24h";
  buckets: EmailOutboxTrendsPoint[];
  summary: {
    total_queued: number;
    total_sent: number;
    total_failed: number;
    oldest_pending: string | null;
    current_pending: number;
    success_rate_24h: number;
  };
}

interface EmailOutboxAlert {
  ok: boolean;
  reasons: Array<"PENDING_HIGH" | "OLDEST_PENDING_AGE" | "FAILURE_SPIKE">;
  details: Record<string, unknown>;
  severity: "warning" | "critical";
}

export function EmailOutboxWidget() {
  const [stats, setStats] = useState<OutboxStats | null>(null);
  const [trends, setTrends] = useState<EmailOutboxTrends24h | null>(null);
  const [alert, setAlert] = useState<EmailOutboxAlert | null>(null);
  const [loading, setLoading] = useState(false);
  const [trendsLoading, setTrendsLoading] = useState(false);
  const [dispatching, setDispatching] = useState(false);

  const [authError, setAuthError] = useState<string | null>(null);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(
    new Set(),
  );

  // Fetch outbox statistics
  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/email-outbox-stats");
      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `Failed to fetch outbox stats: ${response.status} - ${errorText}`,
        );
        throw new Error(`Failed to fetch outbox stats: ${response.status}`);
      }
      const data = await response.json();
      if (data.ok && data.stats) {
        setStats(data.stats);
        setAuthError(null); // Clear any previous auth errors
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error("Failed to fetch outbox stats:", error);
      // Check if it's an auth error
      if (error instanceof Error && error.message.includes("401")) {
        setAuthError("Admin access required");
      }
      // Don't throw - just log the error and continue
    } finally {
      setLoading(false);
    }
  };

  // Fetch outbox trends
  const fetchTrends = async () => {
    try {
      setTrendsLoading(true);
      const response = await fetch("/api/admin/email-outbox-trends");
      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `Failed to fetch outbox trends: ${response.status} - ${errorText}`,
        );
        throw new Error(`Failed to fetch outbox trends: ${response.status}`);
      }
      const data = await response.json();
      if (data.ok && data.trends) {
        setTrends(data.trends);
        setAlert(data.alert || null);
      } else {
        throw new Error("Invalid trends response format");
      }
    } catch (error) {
      console.error("Failed to fetch outbox trends:", error);
      // Don't throw - just log the error and continue
    } finally {
      setTrendsLoading(false);
    }
  };

  // Dispatch emails
  const dispatchEmails = async () => {
    try {
      setDispatching(true);
      const response = await fetch("/api/admin/dispatch-emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `Failed to dispatch emails: ${response.status} - ${errorText}`,
        );
        throw new Error(`Failed to dispatch emails: ${response.status}`);
      }

      const data = await response.json();
      if (data.ok) {
        // Refresh stats after dispatch
        await fetchStats();

        // Show success/error messages
        if (data.sent > 0) {
          console.log(`Successfully sent ${data.sent} emails`);
        }
        if (data.errors > 0) {
          console.error(`${data.errors} emails failed to send`);
        }
        if (data.sent === 0 && data.errors === 0) {
          console.log("No emails to dispatch");
        }
      } else {
        throw new Error("Invalid dispatch response format");
      }
    } catch (error) {
      console.error("Failed to dispatch emails:", error);
      // Don't throw - just log the error and continue
    } finally {
      setDispatching(false);
    }
  };

  // Load stats and trends on component mount
  useEffect(() => {
    fetchStats();
    fetchTrends();
  }, []);

  // Auto-refresh stats and trends every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStats();
      fetchTrends();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Dismiss alert
  const dismissAlert = (alertKey: string) => {
    setDismissedAlerts((prev) => new Set([...prev, alertKey]));
  };

  // Generate alert key for dismissal tracking
  const getAlertKey = (alert: EmailOutboxAlert): string => {
    return alert.reasons.sort().join(",");
  };

  const formatOldestPending = (timestamp: string | null) => {
    if (!timestamp) return "N/A";
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) return "< 1 hour ago";
    if (diffHours < 24) return `${diffHours} hours ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days ago`;
  };

  const calculateSuccessRate = () => {
    if (!stats) return 0;
    const total = stats.total_sent + stats.total_error;
    return total > 0
      ? Math.round((stats.total_sent / total) * 100 * 10) / 10
      : 100;
  };

  if (loading && !stats) {
    return (
      <div className="card-modern dark:card-modern-dark rounded-2xl p-6 animate-fade-in-up backdrop-blur-sm bg-white/90 dark:bg-gray-800/90 border border-white/20 dark:border-gray-700/20">
        {/* Light overlay for better readability */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 to-blue-100/10 rounded-2xl"></div>

        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 drop-shadow-sm">
                Email Outbox
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Manage queued emails and manual dispatch
              </p>
            </div>

            {/* Icon */}
            <div className="relative p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
              <Mail className="h-6 w-6 text-white" />
            </div>
          </div>

          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading outbox statistics...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card-modern dark:card-modern-dark rounded-2xl p-6 animate-fade-in-up backdrop-blur-sm bg-white/90 dark:bg-gray-800/90 border border-white/20 dark:border-gray-700/20">
      {/* Light overlay for better readability */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 to-blue-100/10 rounded-2xl"></div>

      {/* Content */}
      <div className="relative z-10 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 drop-shadow-sm">
              Email Outbox
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Manage queued emails and manual dispatch
            </p>
          </div>

          {/* Icon */}
          <div className="relative p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
            <Mail className="h-6 w-6 text-white" />
          </div>
        </div>

        {/* Alert Banner */}
        {alert && !dismissedAlerts.has(getAlertKey(alert)) && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg dark:bg-yellow-900/20 dark:border-yellow-800">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Email Outbox Alert
              </span>
              <button
                onClick={() => dismissAlert(getAlertKey(alert))}
                className="ml-auto p-1 hover:bg-yellow-100 dark:hover:bg-yellow-800/50 rounded"
              >
                <X className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />
              </button>
            </div>
            <div className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
              {alert.reasons.includes("PENDING_HIGH") && (
                <div>High number of pending emails detected</div>
              )}
              {alert.reasons.includes("OLDEST_PENDING_AGE") && (
                <div>Old pending emails may need attention</div>
              )}
              {alert.reasons.includes("FAILURE_SPIKE") && (
                <div>Recent email failures detected</div>
              )}
            </div>
          </div>
        )}

        {/* Auth Error Banner */}
        {authError && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg dark:bg-yellow-900/20 dark:border-yellow-800">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Admin Access Required
              </span>
            </div>
            <div className="text-sm text-yellow-700 dark:text-yellow-300 space-y-1">
              <div>
                Admin access required (dev): add your email to ADMIN_EMAILS in
                .env.local or enable DEV_ADMIN_BYPASS. Then restart the dev
                server.
              </div>
            </div>
          </div>
        )}

        {/* Statistics Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center p-3 rounded-lg bg-gray-50/50 dark:bg-gray-700/50 backdrop-blur-sm border border-gray-100 dark:border-gray-600">
            <div className="flex items-center justify-center gap-1.5 mb-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Pending
              </span>
            </div>
            <div className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
              {stats?.total_pending || 0}
            </div>
          </div>

          <div className="text-center p-3 rounded-lg bg-gray-50/50 dark:bg-gray-700/50 backdrop-blur-sm border border-gray-100 dark:border-gray-600">
            <div className="flex items-center justify-center gap-1.5 mb-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Sent
              </span>
            </div>
            <div className="text-xl font-bold text-green-600 dark:text-green-400">
              {stats?.total_sent || 0}
            </div>
          </div>

          <div className="text-center p-3 rounded-lg bg-gray-50/50 dark:bg-gray-700/50 backdrop-blur-sm border border-gray-100 dark:border-gray-600">
            <div className="flex items-center justify-center gap-1.5 mb-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Errors
              </span>
            </div>
            <div className="text-xl font-bold text-red-600 dark:text-red-400">
              {stats?.total_error || 0}
            </div>
          </div>

          <div className="text-center p-3 rounded-lg bg-gray-50/50 dark:bg-gray-700/50 backdrop-blur-sm border border-gray-100 dark:border-gray-600">
            <div className="flex items-center justify-center gap-1.5 mb-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Oldest
              </span>
            </div>
            <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
              {formatOldestPending(stats?.oldest_pending || null)}
            </div>
          </div>

          <div className="text-center p-3 rounded-lg bg-gray-50/50 dark:bg-gray-700/50 backdrop-blur-sm border border-gray-100 dark:border-gray-600">
            <div className="flex items-center justify-center gap-1.5 mb-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Success Rate
              </span>
            </div>
            <div className="text-xl font-bold text-green-600 dark:text-green-400">
              {calculateSuccessRate()}%
            </div>
          </div>
        </div>

        {/* 24h Activity Chart */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              24h Activity
            </h4>
            {trendsLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>

          {trends ? (
            <div className="h-32 bg-gray-50/50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600 p-4">
              <div className="flex items-center justify-center h-full text-sm text-gray-500 dark:text-gray-400">
                Chart visualization would go here
              </div>
            </div>
          ) : (
            <div className="h-32 bg-gray-50/50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600 p-4">
              <div className="flex items-center justify-center h-full text-sm text-gray-500 dark:text-gray-400">
                No activity data available
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStats}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            onClick={dispatchEmails}
            disabled={dispatching || (stats?.total_pending || 0) === 0}
            className="flex items-center gap-2 ml-auto"
          >
            {dispatching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            Dispatch Now ({stats?.total_pending || 0})
          </Button>
        </div>
      </div>
    </div>
  );
}
