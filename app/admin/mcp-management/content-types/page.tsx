"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Pagination from "../../_components/Pagination";
import AdminHeader from "../../_components/AdminHeader";
import {
  Plus,
  Edit,
  Shield,
  Eye,
  EyeOff,
  FileText,
  Server,
} from "lucide-react";

interface ContentType {
  id: string;
  type_key: string;
  type_name: string;
  description: string;
  endpoint_path: string;
  is_enabled: boolean;
  access_level: string;
  source_table: string;
  created_at: string;
}

interface PaginationData {
  contentTypes: ContentType[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export default function ContentTypesPage() {
  const [contentTypes, setContentTypes] = useState<ContentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  const fetchContentTypes = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/mcp/content-types?page=${currentPage}&limit=${itemsPerPage}`,
      );
      if (!response.ok) throw new Error("Failed to fetch content types");
      const data: PaginationData = await response.json();
      setContentTypes(
        Array.isArray(data.contentTypes) ? data.contentTypes : [],
      );
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.totalCount || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setContentTypes([]);
      setTotalPages(1);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage]);

  useEffect(() => {
    fetchContentTypes();
  }, [fetchContentTypes]);

  const toggleContentType = async (id: string, isEnabled: boolean) => {
    try {
      const response = await fetch(`/api/admin/mcp/content-types/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_enabled: !isEnabled }),
      });

      if (!response.ok) throw new Error("Failed to update content type");

      setContentTypes((prev) =>
        prev.map((ct) =>
          ct.id === id ? { ...ct, is_enabled: !isEnabled } : ct,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Content Types
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage MCP content type configurations
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-12 bg-gray-200 dark:bg-gray-700 rounded"
                ></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Content Types"
        subtitle="Manage MCP content type configurations and API endpoints"
        actions={
          <Link
            href="/admin/mcp-management/content-types/new"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Content Type
          </Link>
        }
      />

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4">
          <div className="text-sm text-red-800 dark:text-red-200">{error}</div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {contentTypes.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
              No Content Types
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Get started by creating your first content type.
            </p>
            <div className="mt-6">
              <Link
                href="/admin/mcp-management/content-types/new"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Content Type
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Content Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Endpoint
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Access Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {contentTypes.map((contentType) => (
                  <tr
                    key={contentType.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                          <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {contentType.type_name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {contentType.type_key}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        {contentType.endpoint_path}
                      </code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${
                          contentType.access_level === "public"
                            ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400"
                            : contentType.access_level === "admin"
                              ? "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400"
                              : "bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400"
                        }`}
                      >
                        <Server className="w-3 h-3" />
                        {contentType.access_level}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() =>
                          toggleContentType(
                            contentType.id,
                            contentType.is_enabled,
                          )
                        }
                        className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                          contentType.is_enabled
                            ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/30"
                            : "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/30"
                        }`}
                      >
                        {contentType.is_enabled ? (
                          <>
                            <Eye className="w-3 h-3" />
                            Enabled
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3" />
                            Disabled
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/admin/mcp-management/content-types/${contentType.id}`}
                          className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </Link>
                        <Link
                          href={`/admin/mcp-management/exposure/${contentType.type_key}`}
                          className="inline-flex items-center gap-1 text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 transition-colors"
                        >
                          <Shield className="w-4 h-4" />
                          Rules
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {contentTypes.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          itemsPerPage={itemsPerPage}
          totalItems={totalCount}
          showInfo={true}
        />
      )}
    </div>
  );
}
