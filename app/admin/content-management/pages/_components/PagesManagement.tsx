"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Globe,
  Lock,
  FileText,
} from "lucide-react";
import { formatDate } from "../../../../lib/datetime";

interface CMSPage {
  id: string;
  slug: string;
  title: string;
  meta_description?: string;
  language: string;
  is_active: boolean;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export default function PagesManagement() {
  const [pages, setPages] = useState<CMSPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    slug: "",
    title: "",
    meta_description: "",
    language: "en",
    is_active: true,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterLanguage, setFilterLanguage] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchPages = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(filterLanguage !== "all" && { language: filterLanguage }),
        ...(filterStatus !== "all" && {
          is_active: filterStatus === "active" ? "true" : "false",
        }),
      });

      const response = await fetch(`/api/admin/cms/pages?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch pages");
      }

      const data = await response.json();
      setPages(data.pages || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error("Error fetching pages:", error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, filterLanguage, filterStatus, itemsPerPage]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  const handleDelete = async (pageId: string) => {
    if (!confirm("Are you sure you want to delete this page?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/cms/pages/${pageId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete page");
      }

      // Refresh the pages list
      fetchPages();
    } catch (error) {
      console.error("Error deleting page:", error);
      alert("Failed to delete page");
    }
  };

  const handleToggleStatus = async (pageId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/cms/pages/${pageId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          is_active: !currentStatus,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update page status");
      }

      // Refresh the pages list
      fetchPages();
    } catch (error) {
      console.error("Error updating page status:", error);
      alert("Failed to update page status");
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
              placeholder="Search pages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white text-gray-900 placeholder-gray-500 shadow-sm focus:ring-2 focus:ring-yec-primary focus:border-yec-primary/50 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <select
              value={filterLanguage}
              onChange={(e) => setFilterLanguage(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white text-gray-900 shadow-sm focus:ring-2 focus:ring-yec-primary focus:border-yec-primary/50 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Languages</option>
              <option value="th">Thai</option>
              <option value="en">English</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white text-gray-900 shadow-sm focus:ring-2 focus:ring-yec-primary focus:border-yec-primary/50 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white text-gray-900 shadow-sm focus:ring-2 focus:ring-yec-primary focus:border-yec-primary/50 dark:bg-gray-700 dark:text-white"
            >
              <option value="5">5 per page</option>
              <option value="10">10 per page</option>
              <option value="20">20 per page</option>
              <option value="50">50 per page</option>
            </select>
          </div>
        </div>

        {/* Create Button */}
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-yec-primary text-white rounded-lg hover:bg-yec-accent transition-colors duration-200"
        >
          <Plus className="h-4 w-4" />
          <span>Create Page</span>
        </button>
      </div>

      {/* Pages Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Page
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Language
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Last Updated
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {pages.map((page) => (
                <tr
                  key={page.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        {page.is_active ? (
                          <Globe className="h-5 w-5 text-green-500" />
                        ) : (
                          <Lock className="h-5 w-5 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {page.title}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          /{page.slug}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                      {page.language.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() =>
                        handleToggleStatus(page.id, page.is_active)
                      }
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors duration-200 ${
                        page.is_active
                          ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/30"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-900/30"
                      }`}
                    >
                      {page.is_active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(page.updated_at)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => window.open(`/${page.slug}`, "_blank")}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors duration-200"
                        title="View Page"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <a
                        href={`/admin/content-management/pages/${page.id}`}
                        className="p-2 text-gray-400 hover:text-yec-primary transition-colors duration-200"
                        title="Edit Page"
                      >
                        <Edit className="h-4 w-4" />
                      </a>
                      <button
                        onClick={() => handleDelete(page.id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors duration-200"
                        title="Delete Page"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
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
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Results Info */}
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
            {Math.min(currentPage * itemsPerPage, pages.length)} of{" "}
            {pages.length} pages
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center gap-2">
            {/* Previous Button */}
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-2 text-sm font-medium rounded-md ${
                      currentPage === pageNum
                        ? "bg-blue-600 text-white"
                        : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            {/* Next Button */}
            <button
              onClick={() =>
                setCurrentPage(Math.min(totalPages, currentPage + 1))
              }
              disabled={currentPage === totalPages}
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {pages.length === 0 && !loading && (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            No pages found
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Get started by creating a new page.
          </p>
        </div>
      )}

      {/* Create Page Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Create Page
              </h3>
              <button
                onClick={() => setShowCreate(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Title
                </label>
                <input
                  value={createForm.title}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, title: e.target.value })
                  }
                  className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Slug
                </label>
                <input
                  value={createForm.slug}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      slug: e.target.value.replace(/\s+/g, "-").toLowerCase(),
                    })
                  }
                  placeholder="about-us"
                  className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Meta Description
                </label>
                <textarea
                  value={createForm.meta_description}
                  onChange={(e) =>
                    setCreateForm({
                      ...createForm,
                      meta_description: e.target.value,
                    })
                  }
                  className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Language
                  </label>
                  <select
                    value={createForm.language}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, language: e.target.value })
                    }
                    className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  >
                    <option value="en">English</option>
                    <option value="th">Thai</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="inline-flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={createForm.is_active}
                      onChange={(e) =>
                        setCreateForm({
                          ...createForm,
                          is_active: e.target.checked,
                        })
                      }
                    />
                    Active
                  </label>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    const res = await fetch("/api/admin/cms/pages", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(createForm),
                    });
                    if (!res.ok) throw new Error("Failed");
                    setShowCreate(false);
                    setCreateForm({
                      slug: "",
                      title: "",
                      meta_description: "",
                      language: "en",
                      is_active: true,
                    });
                    fetchPages();
                  } catch (_e) {
                    alert("Failed to create page");
                  }
                }}
                className="px-4 py-2 rounded-md bg-yec-primary text-white hover:bg-yec-accent"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
