"use client";

import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";

interface CreateFAQGroupModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface LinkItem {
  text: string;
  url: string;
  icon?: string;
}

export default function CreateFAQGroupModal({
  onClose,
  onSuccess,
}: CreateFAQGroupModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    language: "en" as "en" | "th",
    is_active: true,
    display_config: {
      links: [] as LinkItem[],
      hashtags: [] as string[],
      share_enabled: false,
      share_title: "",
      share_text: "",
    },
  });

  const [newLink, setNewLink] = useState({ text: "", url: "", icon: "" });
  const [newHashtag, setNewHashtag] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/admin/cms/faq-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create FAQ group");
      }

      onSuccess();
    } catch (error) {
      console.error("Error creating FAQ group:", error);
      alert(
        error instanceof Error ? error.message : "Failed to create FAQ group",
      );
    } finally {
      setLoading(false);
    }
  };

  const addLink = () => {
    if (newLink.text && newLink.url) {
      setFormData({
        ...formData,
        display_config: {
          ...formData.display_config,
          links: [...formData.display_config.links, newLink],
        },
      });
      setNewLink({ text: "", url: "", icon: "" });
    }
  };

  const removeLink = (index: number) => {
    setFormData({
      ...formData,
      display_config: {
        ...formData.display_config,
        links: formData.display_config.links.filter((_, i) => i !== index),
      },
    });
  };

  const addHashtag = () => {
    const trimmedHashtag = newHashtag.trim();

    // Validate hashtag format
    if (!trimmedHashtag) {
      alert("Please enter a hashtag");
      return;
    }

    // Check for spaces (traditional hashtags should not contain spaces)
    if (trimmedHashtag.includes(" ")) {
      alert(
        "Hashtags cannot contain spaces. Use underscores (_) or camelCase instead. Example: #LongTermTravel or #Long_Term_Travel",
      );
      return;
    }

    // Check if hashtag already exists
    if (formData.display_config.hashtags.includes(trimmedHashtag)) {
      alert("This hashtag already exists");
      return;
    }

    // Add hashtag with # prefix if not already present
    const hashtagWithPrefix = trimmedHashtag.startsWith("#")
      ? trimmedHashtag
      : `#${trimmedHashtag}`;

    setFormData({
      ...formData,
      display_config: {
        ...formData.display_config,
        hashtags: [...formData.display_config.hashtags, hashtagWithPrefix],
      },
    });
    setNewHashtag("");
  };

  const removeHashtag = (index: number) => {
    setFormData({
      ...formData,
      display_config: {
        ...formData.display_config,
        hashtags: formData.display_config.hashtags.filter(
          (_, i) => i !== index,
        ),
      },
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Create FAQ Group
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Basic Information
            </h3>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-yec-primary focus:border-transparent"
                placeholder="e.g., Travel FAQ, Seminar Details"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-yec-primary focus:border-transparent"
                placeholder="Brief description of this FAQ group"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Language
                </label>
                <select
                  value={formData.language}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      language: e.target.value as "en" | "th",
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-yec-primary focus:border-transparent"
                >
                  <option value="en">English</option>
                  <option value="th">Thai</option>
                </select>
              </div>

              <div className="flex items-center">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) =>
                      setFormData({ ...formData, is_active: e.target.checked })
                    }
                    className="mr-2 rounded border-gray-300 text-yec-primary focus:ring-yec-primary"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Active
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Display Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Display Configuration
            </h3>

            {/* Links */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Related Links
              </label>
              <div className="space-y-2">
                {formData.display_config.links.map((link, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <div className="flex-1">
                      <span className="text-sm font-medium">{link.text}</span>
                      <span className="text-sm text-gray-500 ml-2">
                        ({link.url})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLink(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Link text"
                    value={newLink.text}
                    onChange={(e) =>
                      setNewLink({ ...newLink, text: e.target.value })
                    }
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-yec-primary focus:border-transparent"
                  />
                  <input
                    type="url"
                    placeholder="URL"
                    value={newLink.url}
                    onChange={(e) =>
                      setNewLink({ ...newLink, url: e.target.value })
                    }
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-yec-primary focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={addLink}
                    className="px-3 py-2 bg-yec-primary text-white rounded-lg hover:bg-yec-accent transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Hashtags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Hashtags
              </label>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {formData.display_config.hashtags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full text-sm"
                    >
                      #{tag}
                      <button
                        type="button"
                        onClick={() => removeHashtag(index)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add hashtag (no spaces allowed)"
                    value={newHashtag}
                    onChange={(e) => {
                      // Remove spaces as user types
                      const value = e.target.value.replace(/\s/g, "");
                      setNewHashtag(value);
                    }}
                    onKeyPress={(e) =>
                      e.key === "Enter" && (e.preventDefault(), addHashtag())
                    }
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-yec-primary focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={addHashtag}
                    className="px-3 py-2 bg-yec-primary text-white rounded-lg hover:bg-yec-accent transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Share Configuration */}
            <div className="space-y-4">
              <div className="flex items-center">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.display_config.share_enabled}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        display_config: {
                          ...formData.display_config,
                          share_enabled: e.target.checked,
                        },
                      })
                    }
                    className="mr-2 rounded border-gray-300 text-yec-primary focus:ring-yec-primary"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Enable share button
                  </span>
                </label>
              </div>

              {formData.display_config.share_enabled && (
                <div className="space-y-3 pl-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Share Title
                    </label>
                    <input
                      type="text"
                      value={formData.display_config.share_title}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          display_config: {
                            ...formData.display_config,
                            share_title: e.target.value,
                          },
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-yec-primary focus:border-transparent"
                      placeholder="Title for shared content"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Share Text
                    </label>
                    <textarea
                      value={formData.display_config.share_text}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          display_config: {
                            ...formData.display_config,
                            share_text: e.target.value,
                          },
                        })
                      }
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-yec-primary focus:border-transparent"
                      placeholder="Description for shared content"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-yec-primary text-white rounded-lg hover:bg-yec-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating..." : "Create FAQ Group"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
