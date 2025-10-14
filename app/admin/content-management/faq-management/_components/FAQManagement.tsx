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
  Hash,
  Link,
  Share,
} from "lucide-react";
import CreateFAQGroupModal from "./CreateFAQGroupModal";
import EditFAQGroupModal from "./EditFAQGroupModal";
import FAQItemsEditor from "./FAQItemsEditor";

interface FAQGroup {
  id: string;
  title: string;
  description?: string;
  language: string;
  is_active: boolean;
  display_config: {
    links: Array<{ text: string; url: string; icon?: string }>;
    hashtags: string[];
    share_enabled: boolean;
    share_title: string;
    share_text: string;
  };
  published_at?: string;
  created_at: string;
  updated_at: string;
  item_count: number;
}

export default function FAQManagement() {
  const [groups, setGroups] = useState<FAQGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [languageFilter, setLanguageFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showItemsEditor, setShowItemsEditor] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<FAQGroup | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const loadGroups = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      });

      if (languageFilter !== "all") {
        params.append("language", languageFilter);
      }
      if (statusFilter !== "all") {
        params.append(
          "is_active",
          statusFilter === "active" ? "true" : "false",
        );
      }
      if (searchTerm) {
        params.append("search", searchTerm);
      }

      const response = await fetch(`/api/admin/cms/faq-groups?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch FAQ groups");
      }

      const data = await response.json();
      setGroups(data.groups || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error("Error loading FAQ groups:", error);
      alert("Failed to load FAQ groups");
    } finally {
      setLoading(false);
    }
  }, [currentPage, languageFilter, statusFilter, searchTerm, itemsPerPage]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const handleCreateGroup = () => {
    setShowCreateModal(true);
  };

  const handleEditGroup = async (group: FAQGroup) => {
    try {
      // Fetch the complete group data including display_config
      const response = await fetch(`/api/admin/cms/faq-groups/${group.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch FAQ group details");
      }
      const fullGroupData = await response.json();
      setSelectedGroup(fullGroupData);
      setShowEditModal(true);
    } catch (error) {
      console.error("Error fetching FAQ group details:", error);
      alert("Failed to load FAQ group details");
    }
  };

  const handleViewItems = (group: FAQGroup) => {
    setSelectedGroup(group);
    setShowItemsEditor(true);
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this FAQ group? This will also delete all items in the group.",
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/cms/faq-groups/${groupId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete FAQ group");
      }

      await loadGroups();
      alert("FAQ group deleted successfully");
    } catch (error) {
      console.error("Error deleting FAQ group:", error);
      alert("Failed to delete FAQ group");
    }
  };

  const handleToggleStatus = async (group: FAQGroup) => {
    try {
      const response = await fetch(`/api/admin/cms/faq-groups/${group.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !group.is_active }),
      });

      if (!response.ok) {
        throw new Error("Failed to update FAQ group status");
      }

      await loadGroups();
    } catch (error) {
      console.error("Error updating FAQ group status:", error);
      alert("Failed to update FAQ group status");
    }
  };

  const filteredGroups = groups.filter((group) => {
    const matchesSearch =
      !searchTerm ||
      group.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (group.description &&
        group.description.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">Loading FAQ groups...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create Button */}
      <div className="flex justify-end mb-6">
        <button
          onClick={handleCreateGroup}
          className="flex items-center gap-2 px-4 py-2 bg-yec-primary text-white rounded-lg hover:bg-yec-accent transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create FAQ Group
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-center">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search FAQ groups..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white rounded-lg border-0 focus:ring-2 focus:ring-white focus:outline-none text-gray-900 placeholder-gray-500"
            />
          </div>

          {/* Language Filter */}
          <select
            value={languageFilter}
            onChange={(e) => setLanguageFilter(e.target.value)}
            className="px-3 py-2 bg-white rounded-lg border-0 focus:ring-2 focus:ring-white focus:outline-none text-gray-900 min-w-[140px]"
          >
            <option value="all">All Languages</option>
            <option value="en">English</option>
            <option value="th">Thai</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-white rounded-lg border-0 focus:ring-2 focus:ring-white focus:outline-none text-gray-900 min-w-[120px]"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {/* Items Per Page */}
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(parseInt(e.target.value));
              setCurrentPage(1); // Reset to first page when changing items per page
            }}
            className="px-3 py-2 bg-white rounded-lg border-0 focus:ring-2 focus:ring-white focus:outline-none text-gray-900 min-w-[120px]"
          >
            <option value="10">10 per page</option>
            <option value="20">20 per page</option>
            <option value="50">50 per page</option>
          </select>
        </div>
      </div>

      {/* FAQ Groups List */}
      {filteredGroups.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No FAQ groups found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {searchTerm || languageFilter !== "all" || statusFilter !== "all"
              ? "Try adjusting your filters"
              : "Create your first FAQ group to get started"}
          </p>
          {!searchTerm &&
            languageFilter === "all" &&
            statusFilter === "all" && (
              <button
                onClick={handleCreateGroup}
                className="px-4 py-2 bg-yec-primary text-white rounded-lg hover:bg-yec-accent transition-colors"
              >
                Create FAQ Group
              </button>
            )}
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredGroups.map((group) => (
            <div
              key={group.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {group.title}
                    </h3>
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        group.is_active
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                      }`}
                    >
                      {group.is_active ? "Active" : "Inactive"}
                    </span>
                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
                      {group.language.toUpperCase()}
                    </span>
                    {group.published_at && (
                      <span className="px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full">
                        Published
                      </span>
                    )}
                  </div>

                  {group.description && (
                    <p className="text-gray-600 dark:text-gray-400 mb-3">
                      {group.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      {group.item_count} items
                    </span>
                    {group.display_config.links.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Link className="w-4 h-4" />
                        {group.display_config.links.length} links
                      </span>
                    )}
                    {group.display_config.hashtags.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Hash className="w-4 h-4" />
                        {group.display_config.hashtags.length} tags
                      </span>
                    )}
                    {group.display_config.share_enabled && (
                      <span className="flex items-center gap-1">
                        <Share className="w-4 h-4" />
                        Share enabled
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleViewItems(group)}
                    className="p-2 text-gray-500 hover:text-yec-primary hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="Manage Items"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEditGroup(group)}
                    className="p-2 text-gray-500 hover:text-yec-primary hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="Edit Group"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleToggleStatus(group)}
                    className={`p-2 rounded-lg transition-colors ${
                      group.is_active
                        ? "text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900"
                        : "text-gray-500 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900"
                    }`}
                    title={group.is_active ? "Deactivate" : "Activate"}
                  >
                    {group.is_active ? (
                      <Lock className="w-4 h-4" />
                    ) : (
                      <Globe className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDeleteGroup(group.id)}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg transition-colors"
                    title="Delete Group"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Previous
          </button>
          <span className="px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() =>
              setCurrentPage(Math.min(totalPages, currentPage + 1))
            }
            disabled={currentPage === totalPages}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Next
          </button>
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateFAQGroupModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadGroups();
          }}
        />
      )}

      {showEditModal && selectedGroup && (
        <EditFAQGroupModal
          group={selectedGroup}
          onClose={() => {
            setShowEditModal(false);
            setSelectedGroup(null);
          }}
          onSuccess={() => {
            setShowEditModal(false);
            setSelectedGroup(null);
            loadGroups();
          }}
        />
      )}

      {showItemsEditor && selectedGroup && (
        <FAQItemsEditor
          group={selectedGroup}
          onClose={() => {
            setShowItemsEditor(false);
            setSelectedGroup(null);
          }}
          onSuccess={() => {
            setShowItemsEditor(false);
            setSelectedGroup(null);
            loadGroups();
          }}
        />
      )}
    </div>
  );
}
