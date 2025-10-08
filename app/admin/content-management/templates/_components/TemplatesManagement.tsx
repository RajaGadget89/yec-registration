"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, Copy, Eye, Download, Upload, Layout, FileText, Image, Video } from "lucide-react";

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

export default function TemplatesManagement() {
  const [templates, setTemplates] = useState<ContentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<ContentTemplate | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, [currentPage, searchTerm, filterType, filterStatus]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "12",
        ...(searchTerm && { search: searchTerm }),
        ...(filterType !== "all" && { template_type: filterType }),
        ...(filterStatus !== "all" && { is_active: filterStatus === "active" ? "true" : "false" }),
      });

      const response = await fetch(`/api/admin/cms/templates?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch templates");
      }

      const data = await response.json();
      setTemplates(data.templates || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error("Error fetching templates:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm("Are you sure you want to delete this template?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/cms/templates/${templateId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete template");
      }

      // Refresh the templates list
      fetchTemplates();
    } catch (error) {
      console.error("Error deleting template:", error);
      alert("Failed to delete template");
    }
  };

  const handleToggleStatus = async (templateId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/cms/templates/${templateId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          is_active: !currentStatus,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update template status");
      }

      // Refresh the templates list
      fetchTemplates();
    } catch (error) {
      console.error("Error updating template status:", error);
      alert("Failed to update template status");
    }
  };

  const handleCopy = async (template: ContentTemplate) => {
    try {
      const response = await fetch(`/api/admin/cms/templates`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: `${template.name} (Copy)`,
          description: template.description,
          template_type: template.template_type,
          template_data: template.template_data,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to copy template");
      }

      fetchTemplates();
    } catch (error) {
      console.error("Error copying template:", error);
      alert("Failed to copy template");
    }
  };

  const handlePreview = (template: ContentTemplate) => {
    setSelectedTemplate(template);
    setIsPreviewOpen(true);
  };

  const getTemplateTypeIcon = (type: string) => {
    switch (type) {
      case "page":
        return <FileText className="h-5 w-5 text-blue-500" />;
      case "news":
        return <FileText className="h-5 w-5 text-green-500" />;
      case "activity-card":
        return <Layout className="h-5 w-5 text-purple-500" />;
      case "hero-video":
        return <Video className="h-5 w-5 text-red-500" />;
      case "component":
        return <Layout className="h-5 w-5 text-orange-500" />;
      default:
        return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  const getTemplateTypeColor = (type: string) => {
    switch (type) {
      case "page":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
      case "news":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "activity-card":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400";
      case "hero-video":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
      case "component":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
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
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Types</option>
              <option value="page">Page</option>
              <option value="news">News</option>
              <option value="activity-card">Activity Card</option>
              <option value="hero-video">Hero Video</option>
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

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={() => {
              // TODO: Implement import template
              alert("Import template functionality coming soon!");
            }}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
          >
            <Upload className="h-4 w-4" />
            <span>Import</span>
          </button>
          <button
            onClick={() => {
              // TODO: Implement create template modal
              alert("Create template functionality coming soon!");
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-yec-primary text-white rounded-lg hover:bg-yec-accent transition-colors duration-200"
          >
            <Plus className="h-4 w-4" />
            <span>Create Template</span>
          </button>
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {templates.map((template) => (
          <div
            key={template.id}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-shadow duration-200"
          >
            {/* Template Preview */}
            <div className="aspect-video bg-gray-100 dark:bg-gray-700 relative">
              {template.preview_image ? (
                <img
                  src={template.preview_image}
                  alt={template.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {getTemplateTypeIcon(template.template_type)}
                </div>
              )}
              
              {/* System Template Badge */}
              {template.is_system && (
                <div className="absolute top-2 left-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yec-primary text-white">
                    System
                  </span>
                </div>
              )}

              {/* Status Badge */}
              <div className="absolute top-2 right-2">
                <button
                  onClick={() => handleToggleStatus(template.id, template.is_active)}
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-colors duration-200 ${
                    template.is_active
                      ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/30"
                      : "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-900/30"
                  }`}
                >
                  {template.is_active ? "Active" : "Inactive"}
                </button>
              </div>
            </div>

            {/* Template Info */}
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {template.name}
                </h3>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTemplateTypeColor(template.template_type)}`}>
                  {template.template_type.replace("-", " ")}
                </span>
              </div>
              
              {template.description && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                  {template.description}
                </p>
              )}

              <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                Created: {new Date(template.created_at).toLocaleDateString()}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handlePreview(template)}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors duration-200"
                    title="Preview Template"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      // TODO: Implement edit template
                      alert("Edit template functionality coming soon!");
                    }}
                    className="p-1 text-gray-400 hover:text-yec-primary transition-colors duration-200"
                    title="Edit Template"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleCopy(template)}
                    className="p-1 text-gray-400 hover:text-green-600 transition-colors duration-200"
                    title="Copy Template"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  {!template.is_system && (
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors duration-200"
                      title="Delete Template"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                
                <button
                  onClick={() => {
                    // TODO: Implement use template
                    alert("Use template functionality coming soon!");
                  }}
                  className="text-xs px-2 py-1 bg-yec-primary text-white rounded hover:bg-yec-accent transition-colors duration-200"
                >
                  Use
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Template Preview Modal */}
      {isPreviewOpen && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedTemplate.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedTemplate.template_type.replace("-", " ")} Template
                </p>
              </div>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>
            
            <div className="p-6">
              {selectedTemplate.preview_image ? (
                <div className="mb-6">
                  <img
                    src={selectedTemplate.preview_image}
                    alt={selectedTemplate.name}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-700"
                  />
                </div>
              ) : (
                <div className="mb-6 aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    {getTemplateTypeIcon(selectedTemplate.template_type)}
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                      No preview available
                    </p>
                  </div>
                </div>
              )}

              {selectedTemplate.description && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Description</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedTemplate.description}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Template Type</h4>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getTemplateTypeColor(selectedTemplate.template_type)}`}>
                    {selectedTemplate.template_type.replace("-", " ")}
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Status</h4>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    selectedTemplate.is_active
                      ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                      : "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"
                  }`}>
                    {selectedTemplate.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setIsPreviewOpen(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    // TODO: Implement use template
                    alert("Use template functionality coming soon!");
                  }}
                  className="px-4 py-2 bg-yec-primary text-white rounded-lg hover:bg-yec-accent transition-colors duration-200"
                >
                  Use Template
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
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}

      {/* Empty State */}
      {templates.length === 0 && !loading && (
        <div className="text-center py-12">
          <Layout className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No templates found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Get started by creating your first template.
          </p>
        </div>
      )}
    </div>
  );
}
