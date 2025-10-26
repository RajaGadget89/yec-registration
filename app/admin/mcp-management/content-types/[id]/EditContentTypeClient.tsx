"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface ContentType {
  id: string;
  type_key: string;
  type_name: string;
  description: string;
  endpoint_path: string;
  is_enabled: boolean;
  access_level: string;
  source_table: string;
  schema_definition: string;
  query_config: string;
  created_at: string;
}

interface EditContentTypeClientProps {
  contentTypeId: string;
}

export default function EditContentTypeClient({
  contentTypeId,
}: EditContentTypeClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contentType, setContentType] = useState<ContentType | null>(null);
  const [formData, setFormData] = useState({
    type_key: "",
    type_name: "",
    description: "",
    endpoint_path: "",
    access_level: "public",
    source_table: "",
    schema_definition: "{}",
    query_config: "{}",
    is_enabled: false,
  });

  const fetchContentType = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/mcp/content-types/${contentTypeId}`,
      );
      if (!response.ok) {
        if (response.status === 404) {
          setError("Content type not found");
          return;
        }
        throw new Error("Failed to fetch content type");
      }

      const data = await response.json();
      setContentType(data);
      setFormData({
        type_key: data.type_key || "",
        type_name: data.type_name || "",
        description: data.description || "",
        endpoint_path: data.endpoint_path || "",
        access_level: data.access_level || "public",
        source_table: data.source_table || "",
        schema_definition: data.schema_definition || "{}",
        query_config: data.query_config || "{}",
        is_enabled: data.is_enabled || false,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load content type",
      );
    } finally {
      setLoading(false);
    }
  }, [contentTypeId]);

  useEffect(() => {
    fetchContentType();
  }, [fetchContentType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/mcp/content-types/${contentTypeId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update content type");
      }

      router.push("/admin/mcp-management/content-types");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
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

  if (error && !contentType) {
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

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6"
    >
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4">
          <div className="text-sm text-red-800 dark:text-red-200">{error}</div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Type Key *
          </label>
          <input
            type="text"
            value={formData.type_key}
            onChange={(e) => handleChange("type_key", e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="e.g., travel_packages"
            required
            disabled
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Type key cannot be changed
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Type Name *
          </label>
          <input
            type="text"
            value={formData.type_name}
            onChange={(e) => handleChange("type_name", e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="e.g., Travel Packages"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => handleChange("description", e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            rows={3}
            placeholder="Brief description of this content type"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Endpoint Path *
          </label>
          <input
            type="text"
            value={formData.endpoint_path}
            onChange={(e) => handleChange("endpoint_path", e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="/api/mcp/public/travel_packages"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Access Level *
          </label>
          <select
            value={formData.access_level}
            onChange={(e) => handleChange("access_level", e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="public">Public</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Source Table *
          </label>
          <input
            type="text"
            value={formData.source_table}
            onChange={(e) => handleChange("source_table", e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="cms_travel_packages"
            required
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Database table name
          </p>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Schema Definition
        </label>
        <textarea
          value={formData.schema_definition}
          onChange={(e) => handleChange("schema_definition", e.target.value)}
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
          rows={6}
          placeholder='{"fields": {"id": {"expose": true}, "title": {"expose": true}}}'
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          JSON configuration for field exposure
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Query Config
        </label>
        <textarea
          value={formData.query_config}
          onChange={(e) => handleChange("query_config", e.target.value)}
          className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
          rows={4}
          placeholder='{"default_filters": {"is_active": true}, "order_by": "created_at DESC"}'
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          JSON configuration for default queries
        </p>
      </div>

      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.is_enabled}
            onChange={(e) => handleChange("is_enabled", e.target.checked)}
            className="rounded border-gray-300 dark:border-gray-600"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Enable this content type
          </span>
        </label>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
