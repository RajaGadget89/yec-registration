"use client";

import { useState, useEffect } from "react";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Loader2, Mail, AlertCircle, ChevronDown, X } from "lucide-react";
import Link from "next/link";

interface OutboxStats {
  total_pending: number;
  total_sent: number;
  total_error: number;
  oldest_pending: string | null;
}

interface EmailOutboxAlert {
  ok: boolean;
  reasons: Array<"PENDING_HIGH" | "OLDEST_PENDING_AGE" | "FAILURE_SPIKE">;
  details: Record<string, unknown>;
  severity: "warning" | "critical";
}

export function EmailOutboxNavWidget() {
  const [stats, setStats] = useState<OutboxStats | null>(null);
  const [alert, setAlert] = useState<EmailOutboxAlert | null>(null);
  const [loading, setLoading] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Fetch outbox statistics
  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/email-outbox-stats");
      if (!response.ok) {
        throw new Error(`Failed to fetch outbox stats: ${response.status}`);
      }
      const data = await response.json();
      if (data.ok && data.stats) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Failed to fetch outbox stats:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch outbox trends and alerts
  const fetchTrends = async () => {
    try {
      const response = await fetch("/api/admin/email-outbox-trends");
      if (!response.ok) {
        throw new Error(`Failed to fetch outbox trends: ${response.status}`);
      }
      const data = await response.json();
      if (data.ok && data.trends) {
        setAlert(data.alert || null);
      }
    } catch (error) {
      console.error("Failed to fetch outbox trends:", error);
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
        throw new Error(`Failed to dispatch emails: ${response.status}`);
      }

      const data = await response.json();
      if (data.ok) {
        // Refresh stats after dispatch
        await fetchStats();
      }
    } catch (error) {
      console.error("Failed to dispatch emails:", error);
    } finally {
      setDispatching(false);
    }
  };

  // Load stats and trends on component mount
  useEffect(() => {
    fetchStats();
    fetchTrends();
  }, []);

  // Auto-refresh stats every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStats();
      fetchTrends();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest(".email-outbox-nav-widget")) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isDropdownOpen]);

  const pendingCount = stats?.total_pending || 0;
  const hasAlert = alert && !alert.ok;

  const calculateSuccessRate = () => {
    if (!stats) return 0;
    const total = stats.total_sent + stats.total_error;
    return total > 0
      ? Math.round((stats.total_sent / total) * 100 * 10) / 10
      : 100;
  };

  return (
    <div className="relative email-outbox-nav-widget">
      {/* Clickable Navigation Item */}
      <button
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        className="flex items-center space-x-2 text-gray-600 dark:text-gray-300 hover:text-yec-primary dark:hover:text-yec-accent transition-all duration-300 hover:scale-105 group"
      >
        {/* Email Outbox Icon with Badge */}
        <div className="relative">
          <div className="p-2 rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-700 dark:to-blue-600 shadow-sm group-hover:shadow-md group-hover:from-yec-primary/10 group-hover:to-yec-accent/10 transition-all duration-300">
            <Mail className="h-4 w-4 text-blue-600 dark:text-blue-300" />
          </div>

          {/* Alert indicator */}
          {hasAlert && (
            <div className="absolute -top-1 -right-1">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            </div>
          )}

          {/* Pending count badge */}
          {pendingCount > 0 && (
            <div className="absolute -top-1 -right-1">
              <Badge
                variant="destructive"
                className="h-5 w-5 p-0 text-xs flex items-center justify-center"
              >
                {pendingCount > 99 ? "99+" : pendingCount}
              </Badge>
            </div>
          )}
        </div>

        {/* Email Outbox Label */}
        <span className="font-semibold">Email Outbox</span>

        {/* Dropdown Arrow */}
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 ${isDropdownOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown Menu */}
      {isDropdownOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  Email Outbox
                </h3>
              </div>
              <button
                onClick={() => setIsDropdownOpen(false)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <X className="h-4 w-4 text-gray-500" />
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Manage queued emails and manual dispatch
            </p>
          </div>

          {/* Alert Banner */}
          {hasAlert && (
            <div className="p-3 mx-4 mt-3 bg-yellow-50 border border-yellow-200 rounded-lg dark:bg-yellow-900/20 dark:border-yellow-800">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  Email Outbox Alert
                </span>
              </div>
            </div>
          )}

          {/* Stats Grid */}
          <div className="p-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                  {pendingCount}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Pending
                </div>
              </div>
              <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  {stats?.total_sent || 0}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Sent
                </div>
              </div>
              <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                <div className="text-lg font-bold text-red-600 dark:text-red-400">
                  {stats?.total_error || 0}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Errors
                </div>
              </div>
              <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  {calculateSuccessRate()}%
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Success Rate
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
            <div className="flex space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchStats}
                disabled={loading}
                className="flex-1"
              >
                <Loader2
                  className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>

              {pendingCount > 0 && (
                <Button
                  size="sm"
                  onClick={dispatchEmails}
                  disabled={dispatching}
                  className="flex-1"
                >
                  {dispatching ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4 mr-2" />
                  )}
                  Dispatch ({pendingCount})
                </Button>
              )}
            </div>

            <Link
              href="/admin/email-outbox"
              className="block w-full text-center text-sm text-blue-600 dark:text-blue-400 hover:underline"
              onClick={() => setIsDropdownOpen(false)}
            >
              View Full Email Outbox →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
