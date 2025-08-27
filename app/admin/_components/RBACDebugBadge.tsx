"use client";

import { useRBAC } from "../../lib/rbac-client";

export default function RBACDebugBadge() {
  const { data, loading } = useRBAC();

  // Only show in development or when DEV_ADMIN_DEBUG is enabled
  if (
    process.env.NODE_ENV === "production" &&
    process.env.DEV_ADMIN_DEBUG !== "true"
  ) {
    return null;
  }

  if (loading || !data) {
    return null;
  }

  // Enhanced styling for better visibility and less prominence
  return (
    <div className="flex items-center gap-1 px-2 py-1 text-xs bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 rounded-md border border-yellow-200 dark:border-yellow-700 font-mono shadow-sm">
      <span className="font-semibold text-yellow-800 dark:text-yellow-200">
        RBAC:
      </span>
      <span className="text-yellow-700 dark:text-yellow-300">{data.email}</span>
      <span className="text-yellow-600 dark:text-yellow-400">→</span>
      <span className="text-yellow-700 dark:text-yellow-300">
        [{data.roles.join(", ")}]
      </span>
      <span className="text-yellow-600 dark:text-yellow-400">•</span>
      <span className="text-yellow-600 dark:text-yellow-400">
        build:{data.envBuildId}
      </span>
    </div>
  );
}
