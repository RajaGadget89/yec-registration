"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Users,
  Search,
  Filter,
  Crown,
  Shield,
  Edit3,
  Loader2,
  Trash2,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import ConfirmDialog from "./ConfirmDialog";

interface AdminUser {
  id: string;
  email: string;
  role: "admin" | "super_admin";
  business_roles: string[];
  status: "active" | "suspended";
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
  is_active: boolean;
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

interface AdminsTabProps {
  filters: Filters;
}

export default function AdminsTab({ filters }: AdminsTabProps) {
  // Feature flag for dev-only admin delete
  const DEV_DELETE = process.env.NEXT_PUBLIC_DEV_ADMIN_DELETE === "true";

  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(filters.search);
  const [roleFilter, setRoleFilter] = useState(filters.role);
  const [statusFilter, setStatusFilter] = useState(filters.status);
  const [sortBy, setSortBy] = useState(filters.sortBy);
  const [sortOrder, setSortOrder] = useState(filters.sortOrder);
  const [page, setPage] = useState(filters.page);
  const [pageSize, setPageSize] = useState(filters.size);
  const [totalCount, setTotalCount] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchAdmins = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        ...(searchTerm && { q: searchTerm }),
        ...(roleFilter && { role: roleFilter }),
        ...(statusFilter && { status: statusFilter }),
        sortBy,
        sortOrder,
      });

      const response = await fetch(`/api/admin/management/admins?${params}`);

      if (response.ok) {
        const data = await response.json();
        setAdmins(data.admins || []);
        setTotalCount(data.pagination?.total || 0);
      } else {
        setError("Failed to load admin users");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchTerm, roleFilter, statusFilter, sortBy, sortOrder]);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset to first page when searching
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setRoleFilter("");
    setStatusFilter("");
    setSortBy("created_at");
    setSortOrder("desc");
    setPage(1);
  };

  const handleRoleChange = async (adminId: string, newRole: string) => {
    setActionLoading(`role-${adminId}`);
    try {
      const response = await fetch(`/api/admin/management/admins/${adminId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        // Refresh the list
        await fetchAdmins();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to update role");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatusChange = async (adminId: string, newStatus: string) => {
    setActionLoading(`status-${adminId}`);
    try {
      const response = await fetch(`/api/admin/management/admins/${adminId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        // Refresh the list
        await fetchAdmins();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to update status");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const handleBusinessRolesChange = async (
    adminId: string,
    newBusinessRoles: string[],
  ) => {
    setActionLoading(`business-roles-${adminId}`);
    try {
      const response = await fetch(
        `/api/admin/management/admins/${adminId}/roles`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ business_roles: newBusinessRoles }),
        },
      );

      if (response.ok) {
        // Refresh the list
        await fetchAdmins();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to update business roles");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setActionLoading(null);
    }
  };

  const [deletePlan, setDeletePlan] = useState<any>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [editingBusinessRoles, setEditingBusinessRoles] = useState<
    string | null
  >(null);
  const [tempBusinessRoles, setTempBusinessRoles] = useState<string[]>([]);

  const startEditingBusinessRoles = (
    adminId: string,
    currentRoles: string[],
  ) => {
    setEditingBusinessRoles(adminId);
    setTempBusinessRoles([...currentRoles]);
  };

  const cancelEditingBusinessRoles = () => {
    setEditingBusinessRoles(null);
    setTempBusinessRoles([]);
  };

  const saveBusinessRoles = async (adminId: string) => {
    await handleBusinessRolesChange(adminId, tempBusinessRoles);
    setEditingBusinessRoles(null);
    setTempBusinessRoles([]);
  };

  const toggleBusinessRole = (role: string) => {
    setTempBusinessRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  };

  const handleDeleteClick = async (adminId: string) => {
    try {
      // Get the delete plan (dry-run)
      const planResponse = await fetch(
        `/api/admin/management/admins/${adminId}?dry_run=1`,
        {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        },
      );

      if (!planResponse.ok) {
        if (planResponse.status === 401) {
          console.warn(
            "Admin delete unauthorized (401): missing credentials or session",
          );
        }
        const errorData = await planResponse.json();
        setError(errorData.error || "Failed to get delete plan");
        return;
      }

      const planData = await planResponse.json();
      setDeletePlan(planData.plan);
      setPendingDeleteId(adminId);
      setShowDeleteDialog(true);
    } catch {
      setError("Network error. Please try again.");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDeleteId || !deletePlan) return;

    setActionLoading(`delete-${pendingDeleteId}`);
    try {
      // Execute the delete
      const deleteResponse = await fetch(
        `/api/admin/management/admins/${pendingDeleteId}`,
        {
          method: "DELETE",
          credentials: "same-origin",
        },
      );

      if (deleteResponse.ok) {
        const result = await deleteResponse.json();
        console.log("Delete successful:", result);

        // Close dialog first
        setShowDeleteDialog(false);
        setDeletePlan(null);
        setPendingDeleteId(null);

        // Force UI refresh with explicit state management
        setLoading(true);
        try {
          await fetchAdmins();
          console.log("Admin list refreshed successfully");
        } catch (refreshError) {
          console.error("Failed to refresh admin list:", refreshError);
          setError(
            "Admin deleted but failed to refresh list. Please reload the page.",
          );
        }
      } else {
        if (deleteResponse.status === 401) {
          console.warn(
            "Admin delete unauthorized (401): missing credentials or session",
          );
        }
        const errorData = await deleteResponse.json();
        setError(errorData.error || "Failed to delete admin");
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
          <Crown className="h-3 w-3 mr-1" />
          Super Admin
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200">
        <Shield className="h-3 w-3 mr-1" />
        Admin
      </span>
    );
  };

  const getStatusBadge = (status: string, isActive: boolean) => {
    if (!isActive) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200">
          Suspended
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200">
        Active
      </span>
    );
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  if (loading && admins.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-600 dark:text-gray-300">
          <Users className="h-12 w-12 mx-auto mb-4 text-gray-400 animate-pulse" />
          <div className="text-lg font-medium mb-2">Loading admin users...</div>
          <div className="text-sm">Please wait while we fetch the data</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div className="flex items-center">
          <span className="text-sm text-red-700 dark:text-red-400">
            {error}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
          <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Admin Users
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Manage admin user roles and permissions
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

        <form onSubmit={handleSearch} className="space-y-4">
          {/* Search and Quick Actions */}
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Search by email..."
                  data-testid="admins-search"
                />
              </div>
            </div>

            {(searchTerm || roleFilter || statusFilter) && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Filter Options */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Role Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Role
              </label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                data-testid="admins-role-filter"
              >
                <option value="">All Roles</option>
                <option value="super_admin">Super Admin</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                data-testid="admins-status-filter"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>

            {/* Sort Options */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="created_at">Created Date</option>
                <option value="email">Email</option>
                <option value="role">Role</option>
                <option value="last_login_at">Last Login</option>
              </select>
            </div>

            {/* Page Size */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Page Size
              </label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(parseInt(e.target.value))}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </form>
      </div>

      {/* Admins Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table
            className="min-w-full divide-y divide-gray-200 dark:divide-gray-700"
            data-testid="admins-table"
          >
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Job Scopes
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
              {admins.map((admin) => (
                <tr
                  key={admin.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800"
                  data-testid={`admins-row-${admin.id}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                          <span className="text-sm font-medium text-white">
                            {admin.email.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {admin.email}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          ID: {admin.id.slice(0, 8)}...
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getRoleBadge(admin.role)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingBusinessRoles === admin.id ? (
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-1">
                          {["user_profile", "payment_slip", "tcc_card"].map(
                            (role) => (
                              <label
                                key={role}
                                className="flex items-center space-x-1"
                              >
                                <input
                                  type="checkbox"
                                  checked={tempBusinessRoles.includes(role)}
                                  onChange={() => toggleBusinessRole(role)}
                                  className="rounded border-gray-300"
                                />
                                <span className="text-xs text-gray-700 dark:text-gray-300">
                                  {role
                                    .replace("_", " ")
                                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                                </span>
                              </label>
                            ),
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => saveBusinessRoles(admin.id)}
                            className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={cancelEditingBusinessRoles}
                            className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <div className="flex flex-wrap gap-1">
                          {admin.business_roles &&
                          admin.business_roles.length > 0 ? (
                            admin.business_roles.map((role) => (
                              <span
                                key={role}
                                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200"
                              >
                                {role
                                  .replace("_", " ")
                                  .replace(/\b\w/g, (l) => l.toUpperCase())}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-500 dark:text-gray-400 text-xs">
                              No scopes
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() =>
                            startEditingBusinessRoles(
                              admin.id,
                              admin.business_roles || [],
                            )
                          }
                          className="text-blue-600 hover:text-blue-800 text-xs"
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(admin.status, admin.is_active)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    <div>
                      <div>{formatTime(admin.created_at).formatted}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {formatTime(admin.created_at).timeAgo}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                    {admin.last_login_at ? (
                      <div>
                        <div>{formatTime(admin.last_login_at).formatted}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {formatTime(admin.last_login_at).timeAgo}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400">
                        Never
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() =>
                          handleRoleChange(
                            admin.id,
                            admin.role === "super_admin"
                              ? "admin"
                              : "super_admin",
                          )
                        }
                        disabled={actionLoading === `role-${admin.id}`}
                        className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md transition-colors ${
                          actionLoading === `role-${admin.id}`
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400"
                            : "text-blue-700 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30"
                        }`}
                        data-testid="admins-action-role"
                      >
                        {actionLoading === `role-${admin.id}` ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <Edit3 className="h-3 w-3 mr-1" />
                        )}
                        Change Role
                      </button>
                      <button
                        onClick={() =>
                          handleStatusChange(
                            admin.id,
                            admin.is_active ? "suspended" : "active",
                          )
                        }
                        disabled={actionLoading === `status-${admin.id}`}
                        className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md transition-colors ${
                          actionLoading === `status-${admin.id}`
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400"
                            : admin.is_active
                              ? "text-red-700 bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30"
                              : "text-green-700 bg-green-100 hover:bg-green-200 dark:bg-green-900/20 dark:text-green-300 dark:hover:bg-green-900/30"
                        }`}
                        data-testid="admins-action-status"
                      >
                        {actionLoading === `status-${admin.id}` ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : null}
                        {admin.is_active ? "Suspend" : "Activate"}
                      </button>

                      {/* DEV-ONLY: Delete button for admin users (not super_admin) */}
                      {DEV_DELETE && admin.role === "admin" ? (
                        <button
                          onClick={() => handleDeleteClick(admin.id)}
                          disabled={actionLoading === `delete-${admin.id}`}
                          title={
                            actionLoading === `delete-${admin.id}`
                              ? "Deleting..."
                              : "Delete this admin user"
                          }
                          className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md transition-colors ${
                            actionLoading === `delete-${admin.id}`
                              ? "bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400"
                              : "text-red-700 bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30"
                          }`}
                          data-testid="admins-action-delete"
                        >
                          {actionLoading === `delete-${admin.id}` ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3 mr-1" />
                          )}
                          Delete
                        </button>
                      ) : (
                        <span
                          className="text-muted text-xs"
                          title={
                            admin.role === "super_admin"
                              ? "Cannot delete super_admin users"
                              : "Delete feature disabled"
                          }
                        >
                          —
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Showing{" "}
                  <span className="font-medium">
                    {(page - 1) * pageSize + 1}
                  </span>{" "}
                  to{" "}
                  <span className="font-medium">
                    {Math.min(page * pageSize, totalCount)}
                  </span>{" "}
                  of <span className="font-medium">{totalCount}</span> results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && deletePlan && (
        <ConfirmDialog
          title="Delete admin?"
          description={`This will remove ${deletePlan.admin.email} from admin_users (Auth user is NOT deleted).`}
          confirmText="Delete"
          confirmVariant="destructive"
          onConfirm={handleDeleteConfirm}
          plan={deletePlan}
        >
          <div></div> {/* This div is not used but required by ConfirmDialog */}
        </ConfirmDialog>
      )}
    </div>
  );
}
