"use client";

import { useState, useEffect, useCallback } from "react";
import Pagination from "../../_components/Pagination";
import {
  Plus,
  Key,
  RotateCcw,
  Trash2,
  Eye,
  EyeOff,
  Server,
  Activity,
  Calendar,
  X,
  Search,
  Copy,
  Check,
} from "lucide-react";

interface ApiKey {
  id: string;
  key_name: string;
  key_type: string;
  access_level: string;
  api_key: string;
  is_active: boolean;
  created_at: string;
  last_used?: string;
  usage_count: number;
}

interface PaginationData {
  apiKeys: ApiKey[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export default function ApiKeysClient() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewKeyForm, setShowNewKeyForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyType, setNewKeyType] = useState("public");
  const [currentPage, setCurrentPage] = useState(1);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [copiedKeys, setCopiedKeys] = useState<Set<string>>(new Set());
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;

  const fetchApiKeys = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/mcp/api-keys?page=${currentPage}&limit=${itemsPerPage}`,
      );
      if (!response.ok) throw new Error("Failed to fetch API keys");
      const data: PaginationData = await response.json();
      setApiKeys(Array.isArray(data.apiKeys) ? data.apiKeys : []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.totalCount || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setApiKeys([]);
      setTotalPages(1);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage]);

  useEffect(() => {
    fetchApiKeys();
  }, [fetchApiKeys]);

  const createApiKey = async () => {
    try {
      const response = await fetch("/api/admin/mcp/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key_name: newKeyName,
          key_type: newKeyType,
          access_level: newKeyType,
        }),
      });

      if (!response.ok) throw new Error("Failed to create API key");

      const newKey = await response.json();
      setApiKeys((prev) => [...prev, newKey]);
      setShowNewKeyForm(false);
      setNewKeyName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Creation failed");
    }
  };

  const rotateApiKey = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/mcp/api-keys/${id}/rotate`, {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to rotate API key");

      await fetchApiKeys(); // Refresh the list
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rotation failed");
    }
  };

  const toggleApiKey = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/mcp/api-keys/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !isActive }),
      });

      if (!response.ok) throw new Error("Failed to update API key");

      setApiKeys((prev) =>
        prev.map((key) =>
          key.id === id ? { ...key, is_active: !isActive } : key,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  };

  const deleteApiKey = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this API key? This action cannot be undone.",
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/mcp/api-keys/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete API key");

      setApiKeys((prev) => prev.filter((key) => key.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Deletion failed");
    }
  };

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const copyApiKey = async (apiKey: string, id: string) => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopiedKeys((prev) => new Set(prev).add(id));
      setTimeout(() => {
        setCopiedKeys((prev) => {
          const newSet = new Set(prev);
          newSet.delete(id);
          return newSet;
        });
      }, 2000);
    } catch (_err) {
      setError("Failed to copy API key");
    }
  };

  if (loading) {
    return (
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
    );
  }

  return (
    <>
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4">
          <div className="text-sm text-red-800 dark:text-red-200">{error}</div>
        </div>
      )}

      {showNewKeyForm && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Create New API Key
            </h3>
            <button
              onClick={() => setShowNewKeyForm(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Key Name
              </label>
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="e.g., n8n-production-key"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Access Level
              </label>
              <select
                value={newKeyType}
                onChange={(e) => setNewKeyType(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="public">Public</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex gap-3">
              <button
                onClick={createApiKey}
                className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Key className="w-4 h-4" />
                Create Key
              </button>
              <button
                onClick={() => setShowNewKeyForm(false)}
                className="inline-flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filter Section */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search API keys..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-3">
              <select className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              <select className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="">All Types</option>
                <option value="public">Public</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          {/* Create Button */}
          <button
            onClick={() => setShowNewKeyForm(true)}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Create API Key
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {apiKeys.length === 0 ? (
          <div className="text-center py-12">
            <Key className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
              No API Keys
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Get started by creating your first API key.
            </p>
            <div className="mt-6">
              <button
                onClick={() => setShowNewKeyForm(true)}
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create API Key
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    API Key
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Access Level
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Usage
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
                {apiKeys.map((apiKey) => (
                  <tr
                    key={apiKey.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                          <Key className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {apiKey.key_name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Created:{" "}
                            {new Date(apiKey.created_at).toLocaleDateString()}
                          </div>
                          <div className="mt-2">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => toggleKeyVisibility(apiKey.id)}
                                className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 transition-colors"
                              >
                                {visibleKeys.has(apiKey.id) ? (
                                  <EyeOff className="w-3 h-3" />
                                ) : (
                                  <Eye className="w-3 h-3" />
                                )}
                                {visibleKeys.has(apiKey.id) ? "Hide" : "Show"}{" "}
                                Key
                              </button>
                              {visibleKeys.has(apiKey.id) && (
                                <button
                                  onClick={() =>
                                    copyApiKey(apiKey.api_key, apiKey.id)
                                  }
                                  className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 transition-colors"
                                >
                                  {copiedKeys.has(apiKey.id) ? (
                                    <Check className="w-3 h-3" />
                                  ) : (
                                    <Copy className="w-3 h-3" />
                                  )}
                                  {copiedKeys.has(apiKey.id)
                                    ? "Copied!"
                                    : "Copy"}
                                </button>
                              )}
                            </div>
                            {visibleKeys.has(apiKey.id) && (
                              <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono text-gray-800 dark:text-gray-200 break-all">
                                {apiKey.api_key}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${
                          apiKey.access_level === "public"
                            ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400"
                            : "bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400"
                        }`}
                      >
                        <Server className="w-3 h-3" />
                        {apiKey.access_level}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        <div className="flex items-center gap-1">
                          <Activity className="w-3 h-3" />
                          {apiKey.usage_count} requests
                        </div>
                        {apiKey.last_used && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            Last used:{" "}
                            {new Date(apiKey.last_used).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() =>
                          toggleApiKey(apiKey.id, apiKey.is_active)
                        }
                        className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                          apiKey.is_active
                            ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/30"
                            : "bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/30"
                        }`}
                      >
                        {apiKey.is_active ? (
                          <>
                            <Eye className="w-3 h-3" />
                            Active
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3" />
                            Inactive
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => rotateApiKey(apiKey.id)}
                          className="inline-flex items-center gap-1 text-orange-600 dark:text-orange-400 hover:text-orange-900 dark:hover:text-orange-300 transition-colors"
                        >
                          <RotateCcw className="w-4 h-4" />
                          Rotate
                        </button>
                        <button
                          onClick={() => deleteApiKey(apiKey.id)}
                          className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Revoke
                        </button>
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
      {apiKeys.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          itemsPerPage={itemsPerPage}
          totalItems={totalCount}
          showInfo={true}
        />
      )}
    </>
  );
}
