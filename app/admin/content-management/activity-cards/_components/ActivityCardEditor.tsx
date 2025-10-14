"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Save, Eye, ArrowLeft, Link, Hash } from "lucide-react";
import MediaSelector from "../../../../components/cms/MediaSelector";
import ClientOnlyRichTextEditor from "../../../../components/cms/ClientOnlyRichTextEditor";

interface ActivityCard {
  id: string;
  page_id: string;
  card_slug: string;
  title: string;
  summary?: string;
  content?: string;
  icon_emoji?: string;
  image_url?: string;
  detail_page_id?: string;
  display_order: number;
  is_active: boolean;
  external_links?: Array<{
    title: string;
    url: string;
    description?: string;
  }>;
  hashtags?: string[];
  language?: "th" | "en";
  published_at?: string | null;
  scheduled_at?: string | null;
  ends_at?: string | null;
  created_at: string;
  updated_at: string;
}

interface ActivityCardEditorProps {
  cardId: string;
}

export default function ActivityCardEditor({
  cardId,
}: ActivityCardEditorProps) {
  const router = useRouter();
  const [card, setCard] = useState<ActivityCard | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    summary: "",
    content: "",
    card_slug: "",
    display_order: 0,
    language: "en" as "th" | "en",
    published_at: "",
    scheduled_at: "",
    ends_at: "",
    icon_emoji: "",
    image_url: "",
    is_active: true,
    hashtags: [] as string[],
    external_links: [] as Array<{
      title: string;
      url: string;
      description?: string;
    }>,
  });
  const [hashtagInput, setHashtagInput] = useState("");
  const [linkInput, setLinkInput] = useState({
    title: "",
    url: "",
    description: "",
  });

  const fetchCard = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/cms/activity-cards/${cardId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch activity card");
      }
      const data = await response.json();
      setCard(data);

      // Format dates for datetime-local inputs (remove timezone)
      const formatForInput = (dateStr: string | null | undefined) => {
        if (!dateStr) return "";
        try {
          const d = new Date(dateStr);
          if (isNaN(d.getTime())) return "";
          // Convert to local datetime-local format (YYYY-MM-DDTHH:mm)
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, "0");
          const day = String(d.getDate()).padStart(2, "0");
          const hours = String(d.getHours()).padStart(2, "0");
          const minutes = String(d.getMinutes()).padStart(2, "0");
          return `${year}-${month}-${day}T${hours}:${minutes}`;
        } catch {
          return "";
        }
      };

      setForm({
        title: data.title || "",
        summary: data.summary || data.description || "",
        content: data.content || "",
        card_slug: data.card_slug || "",
        display_order: data.display_order || 0,
        language: data.language || "en",
        published_at: formatForInput(data.published_at),
        scheduled_at: formatForInput(data.scheduled_at),
        ends_at: formatForInput(data.ends_at),
        icon_emoji: data.icon_emoji || "",
        image_url: data.image_url || "",
        is_active: data.is_active || false,
        hashtags: data.hashtags || [],
        external_links: data.external_links || [],
      });
    } catch (error) {
      console.error("Error fetching activity card:", error);
      alert("Failed to load activity card");
    } finally {
      setLoading(false);
    }
  }, [cardId]);

  useEffect(() => {
    fetchCard();
  }, [fetchCard]);

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch(`/api/admin/cms/activity-cards/${cardId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        throw new Error("Failed to update activity card");
      }

      alert("Activity card updated successfully!");
      router.push("/admin/content-management/activity-cards");
    } catch (error) {
      console.error("Error updating activity card:", error);
      alert("Failed to update activity card");
    } finally {
      setSaving(false);
    }
  };

  const addHashtag = () => {
    if (hashtagInput.trim() && !form.hashtags.includes(hashtagInput.trim())) {
      setForm({
        ...form,
        hashtags: [...form.hashtags, hashtagInput.trim()],
      });
      setHashtagInput("");
    }
  };

  const removeHashtag = (index: number) => {
    setForm({
      ...form,
      hashtags: form.hashtags.filter((_, i) => i !== index),
    });
  };

  const addLink = () => {
    if (linkInput.title.trim() && linkInput.url.trim()) {
      setForm({
        ...form,
        external_links: [...form.external_links, { ...linkInput }],
      });
      setLinkInput({ title: "", url: "", description: "" });
    }
  };

  const removeLink = (index: number) => {
    setForm({
      ...form,
      external_links: form.external_links.filter((_, i) => i !== index),
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yec-primary"></div>
      </div>
    );
  }

  if (!card) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
          Activity card not found
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          The requested activity card could not be found.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() =>
            router.push("/admin/content-management/activity-cards")
          }
          className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Activity Cards</span>
        </button>

        <div className="flex items-center space-x-3">
          <button
            onClick={() =>
              window.open(`/activities/${card.card_slug}`, "_blank")
            }
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <Eye className="h-4 w-4" />
            <span>Preview</span>
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center space-x-2 px-4 py-2 bg-yec-primary text-white rounded-lg hover:bg-yec-accent disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? "Saving..." : "Save Changes"}</span>
          </button>
        </div>
      </div>

      {/* Main Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white text-gray-900 placeholder-gray-500 shadow-sm focus:ring-2 focus:ring-yec-primary focus:border-yec-primary/50 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter activity title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Summary *
                </label>
                <textarea
                  rows={3}
                  value={form.summary}
                  onChange={(e) =>
                    setForm({ ...form, summary: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white text-gray-900 placeholder-gray-500 shadow-sm focus:ring-2 focus:ring-yec-primary focus:border-yec-primary/50 dark:bg-gray-700 dark:text-white"
                  placeholder="Brief description of the activity"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Slug
                </label>
                <input
                  type="text"
                  value={form.card_slug}
                  onChange={(e) =>
                    setForm({ ...form, card_slug: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white text-gray-900 placeholder-gray-500 shadow-sm focus:ring-2 focus:ring-yec-primary focus:border-yec-primary/50 dark:bg-gray-700 dark:text-white"
                  placeholder="activity-slug"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Display Order
                </label>
                <input
                  type="number"
                  value={form.display_order}
                  onChange={(e) =>
                    setForm({ ...form, display_order: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white text-gray-900 placeholder-gray-500 shadow-sm focus:ring-2 focus:ring-yec-primary focus:border-yec-primary/50 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Language
                </label>
                <select
                  value={form.language}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      language: e.target.value as "th" | "en",
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white text-gray-900 shadow-sm focus:ring-2 focus:ring-yec-primary focus:border-yec-primary/50 dark:bg-gray-700 dark:text-white"
                >
                  <option value="en">English</option>
                  <option value="th">Thai</option>
                </select>
              </div>

              <div className="flex items-center space-x-3">
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) =>
                      setForm({ ...form, is_active: e.target.checked })
                    }
                    className="rounded border-gray-300 text-yec-primary focus:ring-yec-primary"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Active
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Content *
            </label>
            <ClientOnlyRichTextEditor
              value={form.content}
              onChange={(value) => setForm({ ...form, content: value })}
              placeholder="Write your activity content here..."
              className="w-full"
            />
          </div>

          {/* Date Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Published At
              </label>
              <input
                type="datetime-local"
                value={form.published_at}
                onChange={(e) =>
                  setForm({ ...form, published_at: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white text-gray-900 shadow-sm focus:ring-2 focus:ring-yec-primary focus:border-yec-primary/50 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Scheduled At
              </label>
              <input
                type="datetime-local"
                value={form.scheduled_at}
                onChange={(e) =>
                  setForm({ ...form, scheduled_at: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white text-gray-900 shadow-sm focus:ring-2 focus:ring-yec-primary focus:border-yec-primary/50 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Ends At
              </label>
              <input
                type="datetime-local"
                value={form.ends_at}
                onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white text-gray-900 shadow-sm focus:ring-2 focus:ring-yec-primary focus:border-yec-primary/50 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          {/* Icon Emoji */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Icon Emoji (optional)
            </label>
            <input
              type="text"
              value={form.icon_emoji}
              onChange={(e) => setForm({ ...form, icon_emoji: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white text-gray-900 placeholder-gray-500 shadow-sm focus:ring-2 focus:ring-yec-primary focus:border-yec-primary/50 dark:bg-gray-700 dark:text-white"
              placeholder="🎯"
            />
          </div>

          {/* Image URL with Media Library Integration */}
          <MediaSelector
            value={form.image_url || ""}
            onChange={(url) => setForm({ ...form, image_url: url })}
            placeholder="Enter image URL or select from library"
            label="Image URL"
            required={false}
          />

          {/* Hashtags */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Hash className="inline h-4 w-4 mr-1" />
              Hashtags
            </label>
            <div className="flex space-x-2 mb-2">
              <input
                type="text"
                value={hashtagInput}
                onChange={(e) => setHashtagInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && addHashtag()}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white text-gray-900 placeholder-gray-500 shadow-sm focus:ring-2 focus:ring-yec-primary focus:border-yec-primary/50 dark:bg-gray-700 dark:text-white"
                placeholder="Add hashtag"
              />
              <button
                onClick={addHashtag}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {form.hashtags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-full text-sm bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
                >
                  #{tag}
                  <button
                    onClick={() => removeHashtag(index)}
                    className="ml-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* External Links */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Link className="inline h-4 w-4 mr-1" />
              External Links
            </label>
            <div className="space-y-3 mb-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  value={linkInput.title}
                  onChange={(e) =>
                    setLinkInput({ ...linkInput, title: e.target.value })
                  }
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white text-gray-900 placeholder-gray-500 shadow-sm focus:ring-2 focus:ring-yec-primary focus:border-yec-primary/50 dark:bg-gray-700 dark:text-white"
                  placeholder="Link title"
                />
                <input
                  type="url"
                  value={linkInput.url}
                  onChange={(e) =>
                    setLinkInput({ ...linkInput, url: e.target.value })
                  }
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white text-gray-900 placeholder-gray-500 shadow-sm focus:ring-2 focus:ring-yec-primary focus:border-yec-primary/50 dark:bg-gray-700 dark:text-white"
                  placeholder="https://example.com"
                />
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={linkInput.description}
                    onChange={(e) =>
                      setLinkInput({
                        ...linkInput,
                        description: e.target.value,
                      })
                    }
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white text-gray-900 placeholder-gray-500 shadow-sm focus:ring-2 focus:ring-yec-primary focus:border-yec-primary/50 dark:bg-gray-700 dark:text-white"
                    placeholder="Description (optional)"
                  />
                  <button
                    onClick={addLink}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              {form.external_links.map((link, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {link.title}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {link.url}
                    </div>
                    {link.description && (
                      <div className="text-sm text-gray-500 dark:text-gray-500">
                        {link.description}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => removeLink(index)}
                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
