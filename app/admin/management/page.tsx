"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminManagementDashboard from "./_components/AdminManagementDashboard";

export default function AdminManagementPage() {
  const router = useRouter();
  const [isFeatureEnabled, setIsFeatureEnabled] = useState<boolean | null>(
    null,
  );

  useEffect(() => {
    // Check feature flag on client side
    const checkFeatureFlag = async () => {
      try {
        const response = await fetch("/api/features");
        if (response.ok) {
          const flags = await response.json();
          if (!flags.adminManagement) {
            router.push("/admin"); // Redirect to admin dashboard if feature is disabled
            return;
          }
          setIsFeatureEnabled(true);
        } else {
          // If feature flags API is not available, assume disabled
          router.push("/admin");
        }
      } catch (error) {
        console.error("Error checking feature flag:", error);
        router.push("/admin");
      }
    };

    checkFeatureFlag();
  }, [router]);

  // Show loading while checking feature flag
  if (isFeatureEnabled === null) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  // Don't render if feature is disabled (will redirect)
  if (!isFeatureEnabled) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Admin Management
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage admin users, invitations, and permissions
          </p>
        </div>

        <Suspense
          fallback={
            <div className="space-y-8">
              {/* Loading skeleton for summary cards */}
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

              {/* Loading skeleton for sections */}
              <div className="space-y-6">
                {["section-1", "section-2", "section-3"].map((key) => (
                  <div
                    key={key}
                    className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse"
                  >
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                    <div className="space-y-3">
                      {["row-1", "row-2", "row-3"].map((rowKey) => (
                        <div
                          key={rowKey}
                          className="h-12 bg-gray-200 dark:bg-gray-700 rounded"
                        ></div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          }
        >
          <AdminManagementDashboard />
        </Suspense>
      </div>
    </div>
  );
}
