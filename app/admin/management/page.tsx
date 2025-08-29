import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Users, Shield, Crown, UserCheck, UserX, Search, Filter } from "lucide-react";
import { getCurrentUser } from "../../lib/auth-utils.server";
import { hasRole } from "../../lib/auth-utils.server";
import AdminUserTable from "../_components/AdminUserTable";
import AdminManagementFilters from "../_components/AdminManagementFilters";

// Force Node runtime for server-side operations
export const runtime = "nodejs";

// Force dynamic rendering for real-time data
export const dynamic = "force-dynamic";

interface ManagementPageProps {
  searchParams?: Promise<{
    search?: string;
    role?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
  }>;
}

export default async function ManagementPage({ searchParams }: ManagementPageProps) {
  // Check admin authentication and super_admin role
  const user = await getCurrentUser();
  if (!user || !user.is_active) {
    redirect("/admin/login");
  }

  // Check if user is super_admin
  if (!(await hasRole("super_admin"))) {
    redirect("/admin");
  }

  const params = (await searchParams) ?? {};

  // Build filters from URL params
  const filters = {
    search: params.search || "",
    role: params.role || "",
    status: params.status || "",
    sortBy: params.sortBy || "created_at",
    sortOrder: (params.sortOrder as "asc" | "desc") || "desc",
  };

  // Fetch admin users data
  let adminUsers = [];
  let totalCount = 0;
  let roleStats = {
    super_admin: 0,
    admin: 0,
    active: 0,
    inactive: 0,
  };

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/admin/users`, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      const data = await response.json();
      adminUsers = data.users || [];
      totalCount = adminUsers.length;

      // Calculate role statistics
      roleStats = adminUsers.reduce(
        (stats: any, user: any) => {
          if (user.role === "super_admin") stats.super_admin++;
          if (user.role === "admin") stats.admin++;
          if (user.is_active) stats.active++;
          if (!user.is_active) stats.inactive++;
          return stats;
        },
        { super_admin: 0, admin: 0, active: 0, inactive: 0 }
      );
    }
  } catch (error) {
    console.error("Error fetching admin users:", error);
    // Continue with empty arrays for better UX
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Admin Management Team
              </h1>
              <p className="text-gray-700 dark:text-gray-300">
                Manage admin users, roles, and permissions
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
            <Shield className="h-4 w-4" />
            <span>Super Admin Access</span>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Admins</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalCount}</p>
            </div>
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Super Admins</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{roleStats.super_admin}</p>
            </div>
            <div className="p-2 rounded-lg bg-yellow-100 dark:bg-yellow-900/20">
              <Crown className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Regular Admins</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{roleStats.admin}</p>
            </div>
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
              <Shield className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Users</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{roleStats.active}</p>
            </div>
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/20">
              <UserCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
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

        <AdminManagementFilters currentFilters={filters} />
      </div>

      {/* Admin Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Admin Users
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Manage admin user roles and permissions
              </p>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
              <Users className="h-4 w-4" />
              <span>{totalCount} users</span>
            </div>
          </div>

          <Suspense
            fallback={
              <div className="space-y-4">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4"></div>
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((key) => (
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
            <AdminUserTable users={adminUsers} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
