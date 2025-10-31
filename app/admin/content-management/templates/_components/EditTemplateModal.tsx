"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";

interface ContentTemplate {
  id: string;
  name: string;
  description?: string;
  template_type: "page" | "news" | "activity-card" | "hero-video" | "component";
  template_data: any;
  preview_image?: string;
  is_active: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
}

interface EditTemplateModalProps {
  template: ContentTemplate | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export default function EditTemplateModal({
  template,
  isOpen,
  onClose,
  onSave,
}: EditTemplateModalProps) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    template_type: "page" as ContentTemplate["template_type"],
    is_active: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (template) {
      setFormData({
        name: template.name || "",
        description: template.description || "",
        template_type: template.template_type || "page",
        is_active: template.is_active !== false,
      });
      setError("");
    }
  }, [template]);

  if (!isOpen || !template) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/cms/templates/${template.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update template");
      }

      onSave();
      onClose();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update template",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Edit Template
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Template Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="name"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="Enter template name"
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="Enter template description"
            />
          </div>

          <div>
            <label
              htmlFor="template_type"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Template Type <span className="text-red-500">*</span>
            </label>
            <select
              id="template_type"
              required
              value={formData.template_type}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  template_type: e.target
                    .value as ContentTemplate["template_type"],
                })
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="page">Page</option>
              <option value="news">News</option>
              <option value="activity-card">Activity Card</option>
              <option value="hero-video">Hero Video</option>
              <option value="component">Component</option>
            </select>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) =>
                setFormData({ ...formData, is_active: e.target.checked })
              }
              className="h-4 w-4 text-yec-primary focus:ring-yec-primary border-gray-300 rounded"
            />
            <label
              htmlFor="is_active"
              className="ml-2 block text-sm text-gray-700 dark:text-gray-300"
            >
              Active
            </label>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-yec-primary text-white rounded-lg hover:bg-yec-accent transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
