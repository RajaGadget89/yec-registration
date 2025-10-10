"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Clock, RefreshCw, X, AlertCircle, Loader2 } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ssrSafeIdempotencyKey } from "../../../lib/ssr-safe";

interface PendingInvitation {
  id: string;
  email: string;
  roles: string[];
  expires_at: string;
  status: string;
  created_at: string;
  resend_count?: number;
}

export default function PendingTab() {
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingInvitations();
  }, []);

  const fetchPendingInvitations = async () => {
    try {
      setLoading(true);
      setError(null);

      // Note: This endpoint needs to be implemented
      const response = await fetch(
        "/api/admin/management/invitations?status=pending",
      );

      if (response.ok) {
        const data = await response.json();
        setInvitations(data.invitations || []);
      } else {
        setError("Failed to load pending invitations");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async (invitationId: string) => {
    setActionLoading(`resend-${invitationId}`);
    try {
      const response = await fetch(
        `/api/admin/management/invitations/${invitationId}/resend`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": ssrSafeIdempotencyKey("resend"),
          },
        },
      );

      if (response.ok) {
        // Refresh the list to show updated resend count
        await fetchPendingInvitations();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to resend invitation");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (invitationId: string) => {
    setActionLoading(`cancel-${invitationId}`);
    try {
      const response = await fetch(
        `/api/admin/management/invitations/${invitationId}/cancel`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": ssrSafeIdempotencyKey("cancel"),
          },
        },
      );

      if (response.ok) {
        // Optimistically remove from list
        setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
      } else {
        const data = await response.json();
        setError(data.error || "Failed to cancel invitation");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setActionLoading(null);
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

  const getRoleBadge = (role: string) => {
    if (role === "super_admin") {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
          Super Admin
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
        Admin
      </span>
    );
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-600 dark:text-gray-300">
          <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400 animate-pulse" />
          <div className="text-lg font-medium mb-2">
            Loading pending invitations...
          </div>
          <div className="text-sm">Please wait while we fetch the data</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
          <span className="text-sm text-red-700 dark:text-red-400">
            {error}
          </span>
        </div>
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-600 dark:text-gray-300">
          <Clock className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <div className="text-lg font-medium mb-2">No pending invitations</div>
          <div className="text-sm mb-4">
            All invitations have been processed or expired
          </div>
          <Link
            href="/admin/management?tab=invite"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-purple-600 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/20 dark:text-purple-400 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
          >
            Send New Invitation
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/20">
            <Clock className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Pending Invitations
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Manage pending admin invitations
            </p>
          </div>
        </div>
        <button
          onClick={fetchPendingInvitations}
          className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </button>
      </div>

      {/* Pending Invitations Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table
            className="min-w-full divide-y divide-gray-200 dark:divide-gray-700"
            data-testid="pending-table"
          >
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Roles
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Expires At
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {invitations.map((invitation) => (
                <tr
                  key={invitation.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800"
                  data-testid={`pending-row-${invitation.id}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {invitation.email}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      ID: {invitation.id.slice(0, 8)}...
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {invitation.roles.map((role) => (
                        <div key={role}>{getRoleBadge(role)}</div>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    <div>
                      <div>{formatTime(invitation.expires_at).formatted}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {formatTime(invitation.expires_at).timeAgo}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {isExpired(invitation.expires_at) ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200">
                        Expired
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleResend(invitation.id)}
                        disabled={
                          actionLoading === `resend-${invitation.id}` ||
                          isExpired(invitation.expires_at)
                        }
                        className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md transition-colors ${
                          actionLoading === `resend-${invitation.id}` ||
                          isExpired(invitation.expires_at)
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400"
                            : "text-blue-700 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30"
                        }`}
                        data-testid="pending-resend"
                      >
                        {actionLoading === `resend-${invitation.id}` ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3 w-3 mr-1" />
                        )}
                        Resend
                      </button>
                      <button
                        onClick={() => handleCancel(invitation.id)}
                        disabled={actionLoading === `cancel-${invitation.id}`}
                        className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md transition-colors ${
                          actionLoading === `cancel-${invitation.id}`
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400"
                            : "text-red-700 bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30"
                        }`}
                        data-testid="pending-cancel"
                      >
                        {actionLoading === `cancel-${invitation.id}` ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <X className="h-3 w-3 mr-1" />
                        )}
                        Cancel
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
