import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { Suspense } from "react";
import { Users, Shield, Crown, UserCheck, Filter, Mail, Clock, Activity } from "lucide-react";
import { getCurrentUser } from "../../lib/auth-utils.server";
import { hasRole } from "../../lib/auth-utils.server";
import { isAdminManagementEnabled } from "../../lib/features";
import AdminManagementTabs from "./_components/AdminManagementTabs";

// Force Node runtime for server-side operations
export const runtime = "nodejs";

// Force dynamic rendering for real-time data
export const dynamic = "force-dynamic";

interface ManagementPageProps {
  searchParams?: Promise<{
    tab?: string;
    search?: string;
    role?: string;
    status?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: string;
    size?: string;
  }>;
}

export default async function ManagementPage({
  searchParams,
}: ManagementPageProps) {
  // 1. Feature Flag Check: if disabled → return 403
  if (!isAdminManagementEnabled()) {
    // Return 403 response for feature flag disabled
    return new Response("Feature not available", { status: 403 });
  }

  // 2. Session Check: require valid session
  const user = await getCurrentUser();
  if (!user || !user.is_active) {
    redirect("/admin/login");
  }

  // 3. DB-first RBAC: must be super_admin
  if (!(await hasRole("super_admin"))) {
    redirect("/admin/login?unauthorized=1");
  }

  const params = (await searchParams) ?? {};

  // Get current tab from query params, default to "invite"
  const currentTab = params.tab || "invite";
  const validTabs = ["invite", "pending", "admins", "activity"];
  const activeTab = validTabs.includes(currentTab) ? currentTab : "invite";

  // Build filters from URL params
  const filters = {
    search: params.search || "",
    role: params.role || "",
    status: params.status || "",
    sortBy: params.sortBy || "created_at",
    sortOrder: (params.sortOrder as "asc" | "desc") || "desc",
    page: parseInt(params.page || "1"),
    size: Math.min(parseInt(params.size || "20"), 100),
  };

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
                Admin Management Console
              </h1>
              <p className="text-gray-700 dark:text-gray-300">
                Manage admin users, invitations, and system activity
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
            <Shield className="h-4 w-4" />
            <span>Super Admin Access</span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6" aria-label="Admin Management Tabs">
            <a
              href="/admin/management?tab=invite"
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "invite"
                  ? "border-purple-500 text-purple-600 dark:text-purple-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
              data-testid="tab-invite"
            >
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4" />
                <span>Invite</span>
              </div>
            </a>
            <a
              href="/admin/management?tab=pending"
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "pending"
                  ? "border-purple-500 text-purple-600 dark:text-purple-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
              data-testid="tab-pending"
            >
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>Pending</span>
              </div>
            </a>
            <a
              href="/admin/management?tab=admins"
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "admins"
                  ? "border-purple-500 text-purple-600 dark:text-purple-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
              data-testid="tab-admins"
            >
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Admins</span>
              </div>
            </a>
            <a
              href="/admin/management?tab=activity"
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === "activity"
                  ? "border-purple-500 text-purple-600 dark:text-purple-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
              data-testid="tab-activity"
            >
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4" />
                <span>Activity</span>
              </div>
            </a>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
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
            <AdminManagementTabs 
              activeTab={activeTab} 
              filters={filters}
              user={user}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
