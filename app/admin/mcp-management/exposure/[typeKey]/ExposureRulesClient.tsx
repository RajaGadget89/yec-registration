"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Pagination from "../../../_components/Pagination";

interface ContentItem {
  id: string;
  title: string;
  description?: string;
  is_exposed: boolean;
  created_at: string;
  updated_at: string;
}

interface PaginationData {
  items: ContentItem[];
  totalCount: number;
  totalPages: number;
}

interface ExposureRulesClientProps {
  typeKey: string;
}

export default function ExposureRulesClient({
  typeKey,
}: ExposureRulesClientProps) {
  const router = useRouter();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [saving, setSaving] = useState<string | null>(null);
  const itemsPerPage = 20;

  const fetchItems = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/mcp/exposure/${typeKey}?page=${currentPage}&limit=${itemsPerPage}`,
      );
      if (!response.ok) {
        if (response.status === 404) {
          setError("Content type not found or not enabled");
          return;
        }
        throw new Error("Failed to fetch content items");
      }

      const data: PaginationData = await response.json();
      setItems(Array.isArray(data.items) ? data.items : []);
      setTotalPages(data.totalPages || 1);
      setTotalCount(data.totalCount || 0);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load content items",
      );
      setItems([]);
      setTotalPages(1);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [typeKey, currentPage, itemsPerPage]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const toggleExposure = async (itemId: string, isExposed: boolean) => {
    try {
      setSaving(itemId);
      const response = await fetch(
        `/api/admin/mcp/exposure/${typeKey}/${itemId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_exposed: !isExposed }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update exposure");
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                is_exposed: !isExposed,
                updated_at: new Date().toISOString(),
              }
            : item,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(null);
    }
  };

  const toggleAllExposure = async (expose: boolean) => {
    try {
      setSaving("all");
      const response = await fetch(`/api/admin/mcp/exposure/${typeKey}/bulk`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_exposed: expose }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update exposure");
      }

      setItems((prev) =>
        prev.map((item) => ({
          ...item,
          is_exposed: expose,
          updated_at: new Date().toISOString(),
        })),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk update failed");
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="h-16 bg-gray-200 dark:bg-gray-700 rounded"
              ></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6">
        <div className="text-center">
          <h3 className="text-lg font-medium text-red-800 dark:text-red-200 mb-2">
            Error
          </h3>
          <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const exposedCount = items.filter((item) => item.is_exposed).length;
  const totalItems = items.length;

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4">
          <div className="text-sm text-red-800 dark:text-red-200">{error}</div>
        </div>
      )}

      {/* Summary */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
              Exposure Summary
            </h3>
            <p className="text-sm text-blue-600 dark:text-blue-400">
              {exposedCount} of {totalItems} items are exposed
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => toggleAllExposure(true)}
              disabled={saving === "all" || exposedCount === totalItems}
              className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {saving === "all" ? "Updating..." : "Expose All"}
            </button>
            <button
              onClick={() => toggleAllExposure(false)}
              disabled={saving === "all" || exposedCount === 0}
              className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {saving === "all" ? "Updating..." : "Hide All"}
            </button>
          </div>
        </div>
      </div>

      {/* Content Items */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
        {items.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              No content items found for this type.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {items.map((item) => (
              <div key={item.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white truncate">
                      {item.title}
                    </h4>
                    {item.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>
                        Created:{" "}
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                      <span>
                        Updated:{" "}
                        {new Date(item.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 ml-4">
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        item.is_exposed
                          ? "bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
                      }`}
                    >
                      {item.is_exposed ? "Exposed" : "Hidden"}
                    </div>

                    <button
                      onClick={() => toggleExposure(item.id, item.is_exposed)}
                      disabled={saving === item.id}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        item.is_exposed
                          ? "bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                          : "bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                      }`}
                    >
                      {saving === item.id
                        ? "Updating..."
                        : item.is_exposed
                          ? "Hide"
                          : "Expose"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {items.length > 0 && (
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
