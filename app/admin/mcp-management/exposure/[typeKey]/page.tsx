import { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "../../../../lib/auth-utils.server";
import ExposureRulesClient from "./ExposureRulesClient";

export const metadata: Metadata = {
  title: "Exposure Rules - MCP Management",
  description: "Configure which specific content items are exposed through MCP",
};

interface ExposureRulesPageProps {
  params: Promise<{ typeKey: string }>;
}

export default async function ExposureRulesPage({
  params,
}: ExposureRulesPageProps) {
  // Check authentication and super admin privileges
  const user = await getCurrentUser();
  if (!user) {
    redirect("/admin/login");
  }

  // Check if user has super admin privileges
  if (user.role !== "super_admin") {
    redirect("/admin/dashboard");
  }

  const { typeKey } = await params;

  return (
    <div className="space-y-6">
      {/* Rounded Header Card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-4 mb-4">
          <Link
            href="/admin/mcp-management/exposure"
            className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back
          </Link>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Exposure Rules: {typeKey}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Configure which specific content items are exposed through MCP
          </p>
        </div>
      </div>

      <ExposureRulesClient typeKey={typeKey} />
    </div>
  );
}
