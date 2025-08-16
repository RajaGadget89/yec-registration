"use client";

import { useState, useEffect } from "react";
import { Button } from "../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { Loader2, Mail, CheckCircle, XCircle, Clock } from "lucide-react";
// import { toast } from 'sonner'; // Removed - not available

interface OutboxStats {
  total_pending: number;
  total_sent: number;
  total_error: number;
  oldest_pending: string | null;
}

interface DispatchResult {
  sent: number;
  errors: number;
  remaining: number;
  details: {
    successful: string[];
    failed: Array<{ id: string; error: string }>;
  };
}

export function EmailOutboxWidget() {
  const [stats, setStats] = useState<OutboxStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [lastDispatch, setLastDispatch] = useState<DispatchResult | null>(null);

  // Fetch outbox statistics
  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/dispatch-emails");
      if (!response.ok) {
        throw new Error("Failed to fetch outbox stats");
      }
      const data = await response.json();
      setStats(data.stats);
    } catch (error) {
      console.error("Failed to fetch outbox stats:", error);
      console.error("Failed to load email outbox statistics");
    } finally {
      setLoading(false);
    }
  };

  // Dispatch emails manually
  const dispatchEmails = async (batchSize: number = 50) => {
    try {
      setDispatching(true);
      const response = await fetch("/api/admin/dispatch-emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ batchSize }),
      });

      if (!response.ok) {
        throw new Error("Failed to dispatch emails");
      }

      const data = await response.json();
      setLastDispatch(data.result);

      // Refresh stats after dispatch
      await fetchStats();

      // Show success/error messages
      if (data.result.sent > 0) {
        console.log(`Successfully sent ${data.result.sent} emails`);
      }
      if (data.result.errors > 0) {
        console.error(`${data.result.errors} emails failed to send`);
      }
      if (data.result.sent === 0 && data.result.errors === 0) {
        console.log("No emails to dispatch");
      }
    } catch (error) {
      console.error("Failed to dispatch emails:", error);
      console.error("Failed to dispatch emails");
    } finally {
      setDispatching(false);
    }
  };

  // Load stats on component mount
  useEffect(() => {
    fetchStats();
  }, []);

  // Auto-refresh stats every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

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

  if (loading && !stats) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Outbox
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading outbox statistics...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Email Outbox
        </CardTitle>
        <CardDescription>
          Manage queued emails and manual dispatch
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Statistics */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-yellow-500" />
              <span className="text-sm font-medium">Pending</span>
            </div>
            <Badge
              variant={
                stats?.total_pending && stats.total_pending > 0
                  ? "destructive"
                  : "secondary"
              }
            >
              {stats?.total_pending || 0}
            </Badge>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Sent</span>
            </div>
            <Badge variant="outline">{stats?.total_sent || 0}</Badge>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium">Errors</span>
            </div>
            <Badge
              variant={
                stats?.total_error && stats.total_error > 0
                  ? "destructive"
                  : "secondary"
              }
            >
              {stats?.total_error || 0}
            </Badge>
          </div>
        </div>

        {/* Oldest Pending */}
        {stats?.oldest_pending && (
          <div className="text-sm text-muted-foreground">
            Oldest pending: {formatOldestPending(stats.oldest_pending)}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={() => dispatchEmails(50)}
            disabled={dispatching || (stats?.total_pending || 0) === 0}
            className="flex-1"
          >
            {dispatching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Dispatching...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Dispatch Now (50)
              </>
            )}
          </Button>

          <Button
            onClick={fetchStats}
            disabled={loading}
            variant="outline"
            size="icon"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Clock className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Last Dispatch Results */}
        {lastDispatch && (
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <h4 className="text-sm font-medium mb-2">Last Dispatch Results</h4>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span>Sent:</span>
                <span className="text-green-600">{lastDispatch.sent}</span>
              </div>
              <div className="flex justify-between">
                <span>Errors:</span>
                <span className="text-red-600">{lastDispatch.errors}</span>
              </div>
              <div className="flex justify-between">
                <span>Remaining:</span>
                <span>{lastDispatch.remaining}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
