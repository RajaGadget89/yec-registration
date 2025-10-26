import Link from "next/link";
import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../../lib/auth-utils.server";
import AdminHeader from "../_components/AdminHeader";
import {
  FileText,
  Shield,
  Key,
  BarChart3,
  CheckCircle,
  Server,
  ExternalLink,
  Database,
} from "lucide-react";

export const metadata: Metadata = {
  title: "MCP Management - Admin",
  description: "Configure content exposure for MCP server",
};

export default async function MCPManagementPage() {
  // Check authentication and super admin privileges
  const user = await getCurrentUser();
  if (!user) {
    redirect("/admin/login");
  }

  // Check if user has super admin privileges
  if (user.role !== "super_admin") {
    redirect("/admin/dashboard");
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        title="MCP Management"
        subtitle="Configure content exposure for MCP server and manage API access"
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Content Types
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                4
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                API Keys
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                2
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-xl flex items-center justify-center">
              <Key className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Active Endpoints
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                5
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-xl flex items-center justify-center">
              <Server className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                System Status
              </p>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                  Operational
                </span>
              </div>
            </div>
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Management Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          href="/admin/mcp-management/content-types"
          className="group bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-900/30 transition-colors">
              <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Content Types
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Enable/disable content types, configure schemas and endpoints
              </p>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-xs text-gray-500">Manage</span>
                <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
              </div>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/mcp-management/exposure"
          className="group bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-xl flex items-center justify-center group-hover:bg-green-200 dark:group-hover:bg-green-900/30 transition-colors">
              <Shield className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
                Exposure Rules
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Control which specific items are exposed through MCP
              </p>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-xs text-gray-500">Configure</span>
                <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-green-500 transition-colors" />
              </div>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/mcp-management/api-keys"
          className="group bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-xl flex items-center justify-center group-hover:bg-purple-200 dark:group-hover:bg-purple-900/30 transition-colors">
              <Key className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                API Keys
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Manage authentication keys for MCP access
              </p>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-xs text-gray-500">Manage</span>
                <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-purple-500 transition-colors" />
              </div>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/mcp-management/access-logs"
          className="group bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-xl flex items-center justify-center group-hover:bg-orange-200 dark:group-hover:bg-orange-900/30 transition-colors">
              <BarChart3 className="w-6 h-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                Access Logs
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Monitor API usage and performance metrics
              </p>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-xs text-gray-500">Monitor</span>
                <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-orange-500 transition-colors" />
              </div>
            </div>
          </div>
        </Link>

        <Link
          href="/admin/mcp-management/embedding-trigger"
          className="group bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-all duration-200"
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center group-hover:bg-indigo-200 dark:group-hover:bg-indigo-900/30 transition-colors">
              <Database className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                Embedding Trigger
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Manually trigger embedding generation for vector search
              </p>
              <div className="flex items-center gap-2 mt-3">
                <span className="text-xs text-gray-500">Manage</span>
                <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-indigo-500 transition-colors" />
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* System Status */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
            <Server className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              MCP System Status
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Your MCP system is currently operational with the following
              endpoints:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">
                  /api/mcp/public/search
                </code>
                <span className="text-gray-500">Vector search</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">
                  /api/mcp/public/comprehensive
                </code>
                <span className="text-gray-500">Bulk data</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">
                  /api/cms/[type]
                </code>
                <span className="text-gray-500">Targeted fetch</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">
                  /api/admin/embed-now
                </code>
                <span className="text-gray-500">Manual trigger</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
