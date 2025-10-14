"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Search, Check, FileText, Hash, Link, Share } from "lucide-react";

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

interface FAQGroupSelectorProps {
  selectedGroupId: string | null;
  onSelect: (groupId: string | null) => void;
  onClose: () => void;
}

export default function FAQGroupSelector({
  selectedGroupId,
  onSelect,
  onClose,
}: FAQGroupSelectorProps) {
  const [groups, setGroups] = useState<FAQGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [languageFilter, setLanguageFilter] = useState("all");

  const loadGroups = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: "1",
        limit: "50",
        is_active: "true",
      });

      if (languageFilter !== "all") {
        params.append("language", languageFilter);
      }

      const response = await fetch(`/api/admin/cms/faq-groups?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch FAQ groups");
      }

      const data = await response.json();
      setGroups(data.groups || []);
    } catch (error) {
      console.error("Error loading FAQ groups:", error);
      alert("Failed to load FAQ groups");
    } finally {
      setLoading(false);
    }
  }, [languageFilter]);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  const filteredGroups = groups.filter((group) => {
    const matchesSearch =
      !searchTerm ||
      group.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (group.description &&
        group.description.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesSearch;
  });

  const handleSelect = (groupId: string) => {
    onSelect(groupId);
    onClose();
  };

  const handleClear = () => {
    onSelect(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Select FAQ Group
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search FAQ groups..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-yec-primary focus:border-transparent"
                />
              </div>
            </div>
            <select
              value={languageFilter}
              onChange={(e) => setLanguageFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Languages</option>
              <option value="en">English</option>
              <option value="th">Thai</option>
            </select>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="text-gray-500 dark:text-gray-400">
                Loading FAQ groups...
              </div>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No FAQ groups found
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {searchTerm || languageFilter !== "all"
                  ? "Try adjusting your search or filters"
                  : "No FAQ groups are available"}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredGroups.map((group) => (
                <div
                  key={group.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedGroupId === group.id
                      ? "border-yec-primary bg-yec-primary/5"
                      : "border-gray-200 dark:border-gray-600 hover:border-yec-primary hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                  onClick={() => handleSelect(group.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {group.title}
                        </h3>
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
                          {group.language.toUpperCase()}
                        </span>
                        {group.published_at && (
                          <span className="px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full">
                            Published
                          </span>
                        )}
                        {selectedGroupId === group.id && (
                          <Check className="w-5 h-5 text-yec-primary" />
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
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleClear}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Clear Selection
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
