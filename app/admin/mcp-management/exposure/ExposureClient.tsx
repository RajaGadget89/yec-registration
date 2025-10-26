"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Shield,
  FileText,
  Eye,
  EyeOff,
  Settings,
  ExternalLink,
  Plus,
} from "lucide-react";

interface ContentType {
  id: string;
  type_key: string;
  type_name: string;
  is_enabled: boolean;
}

export default function ExposureClient() {
  const [contentTypes, setContentTypes] = useState<ContentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchContentTypes();
  }, []);

  const fetchContentTypes = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/mcp/content-types");
      if (!response.ok) throw new Error("Failed to fetch content types");
      const data = await response.json();
      setContentTypes(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setContentTypes([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 bg-gray-200 dark:bg-gray-700 rounded"
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4">
          <div className="text-sm text-red-800 dark:text-red-200">{error}</div>
        </div>
      )}

      {contentTypes.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            No Content Types
          </h3>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 mb-6">
            You need to create content types first before managing exposure
            rules.
          </p>
          <Link
            href="/admin/mcp-management/content-types"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Go to Content Types
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {contentTypes.map((contentType) => (
            <div
              key={contentType.id}
              className="group bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                    <Shield className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {contentType.type_name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {contentType.type_key}
                    </p>
                  </div>
                </div>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${
                    contentType.is_enabled
                      ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400"
                      : "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400"
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
                </span>
              </div>

              <div className="space-y-3">
                <Link
                  href={`/admin/mcp-management/exposure/${contentType.type_key}`}
                  className="group/link block w-full bg-blue-600 text-white text-center px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Settings className="w-4 h-4" />
                    Manage Exposure Rules
                    <ExternalLink className="w-3 h-3 group-hover/link:translate-x-0.5 transition-transform" />
                  </div>
                </Link>

                {contentType.is_enabled ? (
                  <div className="text-xs text-green-600 dark:text-green-400 text-center flex items-center justify-center gap-1">
                    <Eye className="w-3 h-3" />
                    Configure which specific items are exposed
                  </div>
                ) : (
                  <div className="text-xs text-red-600 dark:text-red-400 text-center flex items-center justify-center gap-1">
                    <EyeOff className="w-3 h-3" />
                    Content type is disabled - no items will be exposed
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
