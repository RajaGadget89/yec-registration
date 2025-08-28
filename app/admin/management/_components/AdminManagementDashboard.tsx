"use client";

import { useState, useEffect } from "react";
import InviteAdminSection from "./InviteAdminSection";
import PendingInvitationsSection from "./PendingInvitationsSection";
import AdminsSection from "./AdminsSection";
import ActivitySection from "./ActivitySection";

interface AdminUser {
  id: string;
  email: string;
  role: "admin" | "super_admin";
  status: "active" | "suspended";
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  is_active: boolean;
}

interface AdminInvitation {
  id: string;
  email: string;
  token: string;
  status: "pending" | "accepted" | "expired" | "revoked";
  expires_at: string;
  invited_by_admin_id: string;
  created_at: string;
}

interface AdminStats {
  total_admins: number;
  active_admins: number;
  suspended_admins: number;
  pending_invitations: number;
  accepted_invitations: number;
}

export default function AdminManagementDashboard() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [invitations, setInvitations] = useState<AdminInvitation[]>([]);
  const [stats, setStats] = useState<AdminStats>({
    total_admins: 0,
    active_admins: 0,
    suspended_admins: 0,
    pending_invitations: 0,
    accepted_invitations: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch initial data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch admins and invitations in parallel
      const [adminsResponse, invitationsResponse] = await Promise.all([
        fetch("/api/admin/management/admins"),
        fetch("/api/admin/management/invitations"),
      ]);

      if (!adminsResponse.ok) {
        throw new Error("Failed to fetch admins");
      }

      if (!invitationsResponse.ok) {
        throw new Error("Failed to fetch invitations");
      }

      const adminsData = await adminsResponse.json();
      const invitationsData = await invitationsResponse.json();

      setAdmins(adminsData.admins || []);
      setInvitations(invitationsData.invitations || []);

      // Calculate stats
      const activeAdmins = adminsData.admins?.filter((admin: AdminUser) => admin.status === "active")?.length || 0;
      const suspendedAdmins = adminsData.admins?.filter((admin: AdminUser) => admin.status === "suspended")?.length || 0;
      const pendingInvitations = invitationsData.invitations?.filter((inv: AdminInvitation) => inv.status === "pending")?.length || 0;
      const acceptedInvitations = invitationsData.invitations?.filter((inv: AdminInvitation) => inv.status === "accepted")?.length || 0;

      setStats({
        total_admins: adminsData.admins?.length || 0,
        active_admins: activeAdmins,
        suspended_admins: suspendedAdmins,
        pending_invitations: pendingInvitations,
        accepted_invitations: acceptedInvitations,
      });

    } catch (err) {
      console.error("Error fetching admin management data:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const handleInviteSuccess = () => {
    // Refresh data after successful invitation
    fetchData();
    setRefreshTrigger(prev => prev + 1);
  };

  const handleAdminUpdate = () => {
    // Refresh data after admin update
    fetchData();
    setRefreshTrigger(prev => prev + 1);
  };

  const handleInvitationRevoke = () => {
    // Refresh data after invitation revocation
    fetchData();
    setRefreshTrigger(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {["card-1", "card-2", "card-3", "card-4"].map((key) => (
            <div
              key={key}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse"
            >
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-red-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
              Error loading admin management data
            </h3>
            <div className="mt-2 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
            <div className="mt-4">
              <button
                onClick={fetchData}
                className="bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 px-3 py-2 rounded-md text-sm font-medium hover:bg-red-200 dark:hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Admins</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.total_admins}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Admins</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.active_admins}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending Invitations</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.pending_invitations}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636M5.636 18.364l12.728-12.728" />
                </svg>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Suspended Admins</p>
              <p className="text-2xl font-semibold text-gray-900 dark:text-white">{stats.suspended_admins}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Management Sections */}
      <div className="space-y-6">
        <InviteAdminSection onInviteSuccess={handleInviteSuccess} />
        <PendingInvitationsSection 
          invitations={invitations.filter(inv => inv.status === "pending")}
          onRevoke={handleInvitationRevoke}
        />
        <AdminsSection 
          admins={admins}
          onUpdate={handleAdminUpdate}
        />
        <ActivitySection refreshTrigger={refreshTrigger} />
      </div>
    </div>
  );
}
