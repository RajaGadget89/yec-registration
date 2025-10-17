import { Suspense } from "react";
import { getSupabaseServerClient } from "../../lib/supabase/server";
import { audit } from "../../lib/audit";
import UnifiedAdminDashboard from "./_components/UnifiedAdminDashboard";

interface UnifiedAdminPageProps {
  searchParams?: Promise<{
    form_filter?: string;
    status_filter?: string;
    search?: string;
    page?: string;
  }>;
}

export default async function UnifiedAdminPage({
  searchParams,
}: UnifiedAdminPageProps) {
  const params = (await searchParams) ?? {};

  // Parse search params
  const formFilter = params.form_filter || "all";
  const statusFilter = params.status_filter || "all";
  const search = params.search || "";
  const page = parseInt(params.page || "1");
  const limit = 50;

  try {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Unauthorized
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Please log in to access the admin dashboard.
            </p>
          </div>
        </div>
      );
    }

    // Check if user has admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || !["admin", "super_admin"].includes(profile.role)) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Access Denied
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              You don&apos;t have permission to access this page.
            </p>
          </div>
        </div>
      );
    }

    // Fetch unified registrations
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/admin/registrations-unified?` +
        new URLSearchParams({
          form_filter: formFilter,
          status_filter: statusFilter,
          search,
          page: page.toString(),
          limit: limit.toString(),
        }),
      {
        headers: {
          Cookie: `sb-access-token=${(user as any).access_token}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error("Failed to fetch registrations");
    }

    const data = await response.json();
    const { registrations, pagination, form_types } = data;

    // Get registration statistics
    const statsResponse = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/admin/registrations-unified/stats`,
      {
        headers: {
          Cookie: `sb-access-token=${(user as any).access_token}`,
        },
      },
    );

    let stats = {
      total_registrations: 0,
      by_status: {},
      by_form_type: {},
      recent_registrations: 0,
    };

    if (statsResponse.ok) {
      const statsData = await statsResponse.json();
      stats = statsData.stats;
    }

    // Log access
    await audit.logAccess({
      action: "view_dashboard",
      method: "GET",
      resource: "unified_admin_dashboard",
      result: "success",
      request_id: crypto.randomUUID(),
      meta: {
        form_filter: formFilter,
        status_filter: statusFilter,
        search,
        page,
        total_results: registrations.length,
        actor: user.id,
      },
    });

    return (
      <Suspense
        fallback={
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
            <div className="max-w-7xl mx-auto">
              <div className="animate-pulse space-y-6">
                {/* Loading skeleton for summary cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[...Array(4)].map((_, i) => (
                    <div
                      key={i}
                      className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
                    >
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                  ))}
                </div>

                {/* Loading skeleton for filters */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                  <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>

                {/* Loading skeleton for table */}
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="h-12 bg-gray-200 dark:bg-gray-700 rounded"
                      ></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        }
      >
        <UnifiedAdminDashboard
          initialRegistrations={registrations}
          initialPagination={pagination}
          initialFormTypes={form_types}
          initialStats={stats}
          initialFilters={{
            form_filter: formFilter,
            status_filter: statusFilter,
            search,
            page,
          }}
        />
      </Suspense>
    );
  } catch (error) {
    console.error("Error in unified admin page:", error);
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Error Loading Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            There was an error loading the admin dashboard.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-yec-primary text-white rounded-lg hover:bg-yec-accent transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
}
