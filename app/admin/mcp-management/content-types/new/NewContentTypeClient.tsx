"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewContentTypeClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    type_key: "",
    type_name: "",
    description: "",
    endpoint_path: "",
    access_level: "public",
    source_table: "",
    schema_definition: "{}",
    query_config: "{}",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/mcp/content-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create content type");
      }

      router.push("/admin/mcp-management/content-types");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Creation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <main className="p-6 space-y-6">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow p-6 space-y-6"
      >
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-sm text-red-800">{error}</div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Type Key *
            </label>
            <input
              type="text"
              value={formData.type_key}
              onChange={(e) => handleChange("type_key", e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="e.g., travel_packages"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Unique identifier for this content type
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Type Name *
            </label>
            <input
              type="text"
              value={formData.type_name}
              onChange={(e) => handleChange("type_name", e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="e.g., Travel Packages"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              rows={3}
              placeholder="Brief description of this content type"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Endpoint Path *
            </label>
            <input
              type="text"
              value={formData.endpoint_path}
              onChange={(e) => handleChange("endpoint_path", e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="/api/mcp/public/travel_packages"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Access Level *
            </label>
            <select
              value={formData.access_level}
              onChange={(e) => handleChange("access_level", e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="public">Public</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Source Table *
            </label>
            <input
              type="text"
              value={formData.source_table}
              onChange={(e) => handleChange("source_table", e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
              placeholder="cms_travel_packages"
              required
            />
            <p className="mt-1 text-xs text-gray-500">Database table name</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Schema Definition
          </label>
          <textarea
            value={formData.schema_definition}
            onChange={(e) => handleChange("schema_definition", e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 font-mono text-sm"
            rows={6}
            placeholder='{"fields": {"id": {"expose": true}, "title": {"expose": true}}}'
          />
          <p className="mt-1 text-xs text-gray-500">
            JSON configuration for field exposure
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Query Config
          </label>
          <textarea
            value={formData.query_config}
            onChange={(e) => handleChange("query_config", e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 font-mono text-sm"
            rows={4}
            placeholder='{"default_filters": {"is_active": true}, "order_by": "created_at DESC"}'
          />
          <p className="mt-1 text-xs text-gray-500">
            JSON configuration for default queries
          </p>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Content Type"}
          </button>
        </div>
      </form>
    </main>
  );
}
