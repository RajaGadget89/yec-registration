"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Monitor,
  Smartphone,
  Tablet,
  Eye,
  Copy,
  Save,
} from "lucide-react";

interface ResponsiveContent {
  id: string;
  page_id: string;
  device_type: "desktop" | "tablet" | "mobile";
  content_type: "text" | "image" | "video" | "component";
  content_data: any;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function ResponsiveContentManagement() {
  const [content, setContent] = useState<ResponsiveContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDevice, setFilterDevice] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedContent, setSelectedContent] =
    useState<ResponsiveContent | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const fetchContent = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
        ...(searchTerm && { search: searchTerm }),
        ...(filterDevice !== "all" && { device_type: filterDevice }),
        ...(filterType !== "all" && { content_type: filterType }),
        ...(filterStatus !== "all" && {
          is_active: filterStatus === "active" ? "true" : "false",
        }),
      });

      const response = await fetch(
        `/api/admin/cms/responsive-content?${params}`,
      );
      if (!response.ok) {
        throw new Error("Failed to fetch responsive content");
      }

      const data = await response.json();
      setContent(data.content || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error("Error fetching responsive content:", error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, filterDevice, filterType, filterStatus]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const handleDelete = async (contentId: string) => {
    if (!confirm("Are you sure you want to delete this content?")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/cms/responsive-content/${contentId}`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to delete content");
      }

      // Refresh the content list
      fetchContent();
    } catch (error) {
      console.error("Error deleting content:", error);
      alert("Failed to delete content");
    }
  };

  const handleToggleStatus = async (
    contentId: string,
    currentStatus: boolean,
  ) => {
    try {
      const response = await fetch(
        `/api/admin/cms/responsive-content/${contentId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            is_active: !currentStatus,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to update content status");
      }

      // Refresh the content list
      fetchContent();
    } catch (error) {
      console.error("Error updating content status:", error);
      alert("Failed to update content status");
    }
  };

  const handleEdit = (content: ResponsiveContent) => {
    setSelectedContent(content);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!selectedContent) return;

    try {
      const response = await fetch(
        `/api/admin/cms/responsive-content/${selectedContent.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(selectedContent),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to update content");
      }

      setIsEditing(false);
      setSelectedContent(null);
      fetchContent();
    } catch (error) {
      console.error("Error updating content:", error);
      alert("Failed to update content");
    }
  };

  const handleCopy = async (content: ResponsiveContent) => {
    try {
      const response = await fetch(`/api/admin/cms/responsive-content`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...content,
          id: undefined,
          device_type: content.device_type === "desktop" ? "tablet" : "mobile",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to copy content");
      }

      fetchContent();
    } catch (error) {
      console.error("Error copying content:", error);
      alert("Failed to copy content");
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case "desktop":
        return <Monitor className="h-5 w-5 text-blue-500" />;
      case "tablet":
        return <Tablet className="h-5 w-5 text-green-500" />;
      case "mobile":
        return <Smartphone className="h-5 w-5 text-purple-500" />;
      default:
        return <Monitor className="h-5 w-5 text-gray-500" />;
    }
  };

  const getDeviceColor = (deviceType: string) => {
    switch (deviceType) {
      case "desktop":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
      case "tablet":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "mobile":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
    }
  };

  const getContentTypeIcon = (contentType: string) => {
    switch (contentType) {
      case "text":
        return "📝";
      case "image":
        return "🖼️";
      case "video":
        return "🎥";
      case "component":
        return "🧩";
      default:
        return "📄";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yec-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search responsive content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <select
              value={filterDevice}
              onChange={(e) => setFilterDevice(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Devices</option>
              <option value="desktop">Desktop</option>
              <option value="tablet">Tablet</option>
              <option value="mobile">Mobile</option>
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Types</option>
              <option value="text">Text</option>
              <option value="image">Image</option>
              <option value="video">Video</option>
              <option value="component">Component</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Create Button */}
        <button
          onClick={() => {
            // TODO: Implement create responsive content modal
            alert("Create responsive content functionality coming soon!");
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-yec-primary text-white rounded-lg hover:bg-yec-accent transition-colors duration-200"
        >
          <Plus className="h-4 w-4" />
          <span>Create Content</span>
        </button>
      </div>

      {/* Responsive Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {content.map((item) => (
          <div
            key={item.id}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-shadow duration-200"
          >
            {/* Content Preview */}
            <div className="aspect-video bg-gray-100 dark:bg-gray-700 flex items-center justify-center relative">
              <div className="text-center">
                <div className="text-4xl mb-2">
                  {getContentTypeIcon(item.content_type)}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                  {item.content_type} Content
                </div>
              </div>

              {/* Device Type Badge */}
              <div className="absolute top-2 left-2">
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDeviceColor(item.device_type)}`}
                >
                  {getDeviceIcon(item.device_type)}
                  <span className="ml-1 capitalize">{item.device_type}</span>
                </span>
              </div>

              {/* Status Badge */}
              <div className="absolute top-2 right-2">
                <button
                  onClick={() => handleToggleStatus(item.id, item.is_active)}
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-colors duration-200 ${
                    item.is_active
                      ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/30"
                      : "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-900/30"
                  }`}
                >
                  {item.is_active ? "Active" : "Inactive"}
                </button>
              </div>
            </div>

            {/* Content Info */}
            <div className="p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                  {item.content_type} Content
                </h3>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Order: {item.display_order}
                </span>
              </div>

              {/* Content Preview */}
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {item.content_type === "text" && item.content_data?.text && (
                  <div className="line-clamp-2">{item.content_data.text}</div>
                )}
                {item.content_type === "image" && item.content_data?.alt && (
                  <div>Image: {item.content_data.alt}</div>
                )}
                {item.content_type === "video" && item.content_data?.title && (
                  <div>Video: {item.content_data.title}</div>
                )}
                {item.content_type === "component" &&
                  item.content_data?.name && (
                    <div>Component: {item.content_data.name}</div>
                  )}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => {
                      // TODO: Implement preview content
                      alert("Preview content functionality coming soon!");
                    }}
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors duration-200"
                    title="Preview Content"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleEdit(item)}
                    className="p-2 text-gray-400 hover:text-yec-primary transition-colors duration-200"
                    title="Edit Content"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleCopy(item)}
                    className="p-2 text-gray-400 hover:text-green-600 transition-colors duration-200"
                    title="Copy Content"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors duration-200"
                    title="Delete Content"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {isEditing && selectedContent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Edit Responsive Content
                </h3>
                <button
                  onClick={() => setIsEditing(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Device Type
                  </label>
                  <select
                    value={selectedContent.device_type}
                    onChange={(e) =>
                      setSelectedContent({
                        ...selectedContent,
                        device_type: e.target.value as
                          | "desktop"
                          | "tablet"
                          | "mobile",
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="desktop">Desktop</option>
                    <option value="tablet">Tablet</option>
                    <option value="mobile">Mobile</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Content Type
                  </label>
                  <select
                    value={selectedContent.content_type}
                    onChange={(e) =>
                      setSelectedContent({
                        ...selectedContent,
                        content_type: e.target.value as
                          | "text"
                          | "image"
                          | "video"
                          | "component",
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                  >
                    <option value="text">Text</option>
                    <option value="image">Image</option>
                    <option value="video">Video</option>
                    <option value="component">Component</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={selectedContent.display_order}
                    onChange={(e) =>
                      setSelectedContent({
                        ...selectedContent,
                        display_order: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={selectedContent.is_active}
                    onChange={(e) =>
                      setSelectedContent({
                        ...selectedContent,
                        is_active: e.target.checked,
                      })
                    }
                    className="h-4 w-4 text-yec-primary focus:ring-yec-primary border-gray-300 rounded"
                  />
                  <label
                    htmlFor="is_active"
                    className="text-sm text-gray-700 dark:text-gray-300"
                  >
                    Active
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center space-x-2 px-4 py-2 bg-yec-primary text-white rounded-lg hover:bg-yec-accent transition-colors duration-200"
                >
                  <Save className="h-4 w-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() =>
              setCurrentPage(Math.min(totalPages, currentPage + 1))
            }
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}

      {/* Empty State */}
      {content.length === 0 && !loading && (
        <div className="text-center py-12">
          <Monitor className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            No responsive content found
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Get started by creating your first responsive content.
          </p>
        </div>
      )}
    </div>
  );
}
