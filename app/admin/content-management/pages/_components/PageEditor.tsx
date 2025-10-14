"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminHeader from "../../../_components/AdminHeader";
// import MediaSelector from "../../../../components/cms/MediaSelector";
import MultiMediaSelector from "../../../../components/cms/MultiMediaSelector";
import ClientOnlyRichTextEditor from "../../../../components/cms/ClientOnlyRichTextEditor";
import HeroVideoSelector from "../../../../components/cms/HeroVideoSelector";
import FAQGroupSelector from "../../../../components/cms/FAQGroupSelector";

type Props = { pageId: string };

export default function PageEditor({ pageId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    slug: "",
    meta_description: "",
    language: "en",
    is_active: true,
  });
  const [sections, setSections] = useState<any[]>([]);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingSection, setEditingSection] = useState<any>(null);
  const [showFAQGroupSelector, setShowFAQGroupSelector] = useState(false);
  const [newSection, setNewSection] = useState({
    section_type: "content",
    title: "",
    content: {
      body: "",
      subtitle: "",
      images: [] as any[],
      // Hero section video configuration
      hero_video_id: null as string | null,
      desktop_video_url: "",
      mobile_video_url: "",
      fallback_image_url: "",
      autoplay: true,
      muted: true,
      loop: true,
      cta_text: "",
      cta_url: "",
      // ActivityCards configuration
      limit: 6,
      grid_cols: "3",
      show_title: true,
      show_description: true,
      show_image: true,
      show_hashtags: true,
      // FAQ configuration
      faq_group_id: null as string | null,
    },
  });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        console.log("Loading page with ID:", pageId);

        const res = await fetch(`/api/admin/cms/pages/${pageId}`);
        console.log("Page API response status:", res.status);

        if (!res.ok) {
          const errorData = await res.json();
          console.error("Failed to load page:", res.status, errorData);
          alert(`Failed to load page: ${errorData.error || "Unknown error"}`);
          return;
        }

        const data = await res.json();
        console.log("Loaded page data:", data);
        setForm({
          title: data.title || "",
          slug: data.slug || "",
          meta_description: data.meta_description || "",
          language: data.language || "en",
          is_active: !!data.is_active,
        });

        const sres = await fetch(`/api/admin/cms/pages/${pageId}/sections`);
        console.log("Sections API response status:", sres.status);

        if (sres.ok) {
          const sdata = await sres.json();
          console.log("Loaded sections data:", sdata);
          setSections(sdata.sections || []);
        } else {
          console.error("Failed to load sections:", sres.status);
        }
      } catch (error) {
        console.error("Error loading page:", error);
        alert(
          `Failed to load page: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [pageId]);

  const save = async () => {
    try {
      setSaving(true);
      console.log("Saving page with data:", form);

      // Validate required fields before sending
      if (!form.title.trim()) {
        alert("Title is required. Please enter a title.");
        return;
      }

      if (!form.slug.trim()) {
        alert("Slug is required. Please enter a slug.");
        return;
      }

      if (form.meta_description && form.meta_description.length > 500) {
        alert("Meta description is too long. Maximum 500 characters allowed.");
        return;
      }

      const res = await fetch(`/api/admin/cms/pages/${pageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error("Save failed:", res.status, errorData);

        // Show detailed validation errors
        if (errorData.details && Array.isArray(errorData.details)) {
          const errorMessages = errorData.details
            .map((detail: any) => `${detail.path.join(".")}: ${detail.message}`)
            .join("\n");
          alert(`Validation errors:\n${errorMessages}`);
        } else {
          alert(`Save failed: ${errorData.error || "Unknown error"}`);
        }
        return;
      }

      const result = await res.json();
      console.log("Save successful:", result);
      alert("Saved successfully");
      // Navigate back to Page Management
      router.push("/admin/content-management/pages");
    } catch (error) {
      console.error("Save error:", error);
      alert(
        `Failed to save page: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setSaving(false);
    }
  };

  const addSection = async () => {
    try {
      setAdding(true);
      const sectionData = {
        section_type: newSection.section_type,
        section_order: sections.length,
        title: newSection.title,
        content: newSection.content,
        is_active: true,
      };

      console.log("Adding section with data:", sectionData);

      const res = await fetch(`/api/admin/cms/pages/${pageId}/sections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sectionData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error("Add section failed:", res.status, errorData);
        alert(`Failed to add section: ${errorData.error || "Unknown error"}`);
        return;
      }

      const { section } = await res.json();
      console.log("Section added successfully:", section);
      setSections([...sections, section]);
      setNewSection({
        section_type: "content",
        title: "",
        content: {
          body: "",
          subtitle: "",
          images: [],
          // Hero section video configuration
          hero_video_id: null,
          desktop_video_url: "",
          mobile_video_url: "",
          fallback_image_url: "",
          autoplay: true,
          muted: true,
          loop: true,
          cta_text: "",
          cta_url: "",
          // ActivityCards configuration
          limit: 6,
          grid_cols: "3",
          show_title: true,
          show_description: true,
          show_image: true,
          show_hashtags: true,
          // FAQ configuration
          faq_group_id: null,
        },
      });
    } catch (error) {
      console.error("Add section error:", error);
      alert(
        `Failed to add section: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setAdding(false);
    }
  };

  const editSection = (section: any) => {
    setEditingSection(section);
    setEditing(true);
  };

  const updateSection = async () => {
    if (!editingSection) return;

    try {
      setAdding(true);
      const res = await fetch(
        `/api/admin/cms/pages/${pageId}/sections/${editingSection.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            section_type: editingSection.section_type,
            section_order: editingSection.section_order,
            title: editingSection.title,
            content: editingSection.content,
            is_active: editingSection.is_active,
          }),
        },
      );
      if (!res.ok) throw new Error("Update failed");
      const { section } = await res.json();

      // Update the sections list
      setSections(sections.map((s) => (s.id === section.id ? section : s)));
      setEditing(false);
      setEditingSection(null);
    } catch (_e) {
      alert("Failed to update section");
    } finally {
      setAdding(false);
    }
  };

  const deleteSection = async (sectionId: string) => {
    if (!confirm("Are you sure you want to delete this section?")) return;

    try {
      const res = await fetch(
        `/api/admin/cms/pages/${pageId}/sections/${sectionId}`,
        {
          method: "DELETE",
        },
      );
      if (!res.ok) throw new Error("Delete failed");

      setSections(sections.filter((s) => s.id !== sectionId));
    } catch (_e) {
      alert("Failed to delete section");
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
      <AdminHeader
        compact
        backHref="/admin/content-management/pages"
        title="Edit Page"
        subtitle={form.slug ? `/${form.slug}` : undefined}
      />
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className={`mt-1 w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white ${
              !form.title.trim()
                ? "border-red-500"
                : "border-gray-300 dark:border-gray-600"
            }`}
            placeholder="Enter page title"
          />
          {!form.title.trim() && (
            <p className="mt-1 text-sm text-red-500">Title is required</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Slug <span className="text-red-500">*</span>
          </label>
          <input
            value={form.slug}
            onChange={(e) =>
              setForm({
                ...form,
                slug: e.target.value.replace(/\s+/g, "-").toLowerCase(),
              })
            }
            className={`mt-1 w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white ${
              !form.slug.trim()
                ? "border-red-500"
                : "border-gray-300 dark:border-gray-600"
            }`}
            placeholder="Enter page slug (e.g., about-us)"
          />
          {!form.slug.trim() && (
            <p className="mt-1 text-sm text-red-500">Slug is required</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Meta Description
            {form.meta_description && (
              <span className="text-sm text-gray-500 ml-2">
                ({form.meta_description.length}/500)
              </span>
            )}
          </label>
          <textarea
            value={form.meta_description}
            onChange={(e) =>
              setForm({ ...form, meta_description: e.target.value })
            }
            className={`mt-1 w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white ${
              form.meta_description.length > 500
                ? "border-red-500"
                : "border-gray-300 dark:border-gray-600"
            }`}
            placeholder="Enter meta description for SEO (optional)"
            rows={3}
          />
          {form.meta_description.length > 500 && (
            <p className="mt-1 text-sm text-red-500">
              Meta description is too long. Maximum 500 characters allowed.
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Language
            </label>
            <select
              value={form.language}
              onChange={(e) => setForm({ ...form, language: e.target.value })}
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
                checked={form.is_active}
                onChange={(e) =>
                  setForm({ ...form, is_active: e.target.checked })
                }
              />
              Active
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <a
            href={`/${form.slug}`}
            target="_blank"
            className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600"
          >
            View
          </a>
          <button
            onClick={save}
            disabled={
              saving ||
              !form.title.trim() ||
              !form.slug.trim() ||
              form.meta_description.length > 500
            }
            className="px-4 py-2 rounded-md bg-yec-primary text-white hover:bg-yec-accent disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {/* Sections */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Sections
        </h3>
        {sections.length === 0 && (
          <p className="text-gray-500 dark:text-gray-400">No sections yet.</p>
        )}
        <ul className="space-y-3">
          {sections.map((s, i) => (
            <li
              key={s.id}
              className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="text-sm text-gray-800 dark:text-gray-200">
                <span className="font-medium mr-2">{i + 1}.</span>
                <span className="uppercase tracking-wide text-xs px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-700 mr-2">
                  {s.section_type}
                </span>
                <span>{s.title || "Untitled"}</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">
                  order: {s.section_order}
                </span>
                <button
                  onClick={() => editSection(s)}
                  className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  Edit
                </button>
                <button
                  onClick={() => deleteSection(s.id)}
                  className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>

        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
            Add Section
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              value={newSection.section_type}
              onChange={(e) =>
                setNewSection({ ...newSection, section_type: e.target.value })
              }
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            >
              <option value="hero">Hero</option>
              <option value="content">Content</option>
              <option value="banner">Banner</option>
              <option value="activity_cards">Activity Cards</option>
              <option value="faq">FAQ</option>
            </select>
            <input
              placeholder="Title"
              value={newSection.title}
              onChange={(e) =>
                setNewSection({ ...newSection, title: e.target.value })
              }
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
            {newSection.section_type === "content" ? (
              <div className="col-span-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Content
                </label>
                <ClientOnlyRichTextEditor
                  value={newSection.content.body || ""}
                  onChange={(value) =>
                    setNewSection({
                      ...newSection,
                      content: { ...newSection.content, body: value },
                    })
                  }
                  placeholder="Write your content here..."
                  className="w-full"
                />
              </div>
            ) : newSection.section_type === "hero" ? (
              <input
                placeholder="Subtitle"
                value={newSection.content.subtitle || ""}
                onChange={(e) =>
                  setNewSection({
                    ...newSection,
                    content: {
                      ...newSection.content,
                      subtitle: e.target.value,
                    },
                  })
                }
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            ) : newSection.section_type === "activity_cards" ? (
              <div className="col-span-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input
                    placeholder="Number of cards to show (default: 6)"
                    type="number"
                    value={newSection.content.limit || ""}
                    onChange={(e) =>
                      setNewSection({
                        ...newSection,
                        content: {
                          ...newSection.content,
                          limit: parseInt(e.target.value) || 6,
                        },
                      })
                    }
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                  <select
                    value={newSection.content.grid_cols || "3"}
                    onChange={(e) =>
                      setNewSection({
                        ...newSection,
                        content: {
                          ...newSection.content,
                          grid_cols: e.target.value,
                        },
                      })
                    }
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  >
                    <option value="1">1 Column</option>
                    <option value="2">2 Columns</option>
                    <option value="3">3 Columns</option>
                    <option value="4">4 Columns</option>
                  </select>
                </div>
                <div className="mt-3 space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newSection.content.show_title !== false}
                      onChange={(e) =>
                        setNewSection({
                          ...newSection,
                          content: {
                            ...newSection.content,
                            show_title: e.target.checked,
                          },
                        })
                      }
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Show section title
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newSection.content.show_description !== false}
                      onChange={(e) =>
                        setNewSection({
                          ...newSection,
                          content: {
                            ...newSection.content,
                            show_description: e.target.checked,
                          },
                        })
                      }
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Show activity descriptions
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newSection.content.show_image !== false}
                      onChange={(e) =>
                        setNewSection({
                          ...newSection,
                          content: {
                            ...newSection.content,
                            show_image: e.target.checked,
                          },
                        })
                      }
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Show activity images
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={newSection.content.show_hashtags !== false}
                      onChange={(e) =>
                        setNewSection({
                          ...newSection,
                          content: {
                            ...newSection.content,
                            show_hashtags: e.target.checked,
                          },
                        })
                      }
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Show hashtags
                    </span>
                  </label>
                </div>
              </div>
            ) : newSection.section_type === "faq" ? (
              <div className="col-span-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  FAQ Group
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowFAQGroupSelector(true)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-left hover:border-yec-primary focus:ring-2 focus:ring-yec-primary focus:border-transparent"
                  >
                    {newSection.content.faq_group_id ? (
                      <span className="text-gray-900 dark:text-white">
                        FAQ Group Selected
                      </span>
                    ) : (
                      <span className="text-gray-500 dark:text-gray-400">
                        Select FAQ Group
                      </span>
                    )}
                  </button>
                  {newSection.content.faq_group_id && (
                    <button
                      type="button"
                      onClick={() =>
                        setNewSection({
                          ...newSection,
                          content: {
                            ...newSection.content,
                            faq_group_id: null,
                          },
                        })
                      }
                      className="px-3 py-2 text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg transition-colors"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="col-span-3">
                <MultiMediaSelector
                  value={
                    Array.isArray(newSection.content.images)
                      ? newSection.content.images.map((i: any) => i.url)
                      : []
                  }
                  onChange={(urls) =>
                    setNewSection({
                      ...newSection,
                      content: {
                        ...newSection.content,
                        images: urls.map((url) => ({ url })),
                      },
                    })
                  }
                  label="Gallery Images"
                  _placeholder="Select images from media library"
                  maxImages={10}
                />
              </div>
            )}
          </div>

          {/* Enhanced Hero Section Configuration */}
          {newSection.section_type === "hero" && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-4">
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-3">
                Hero Video Configuration
              </h4>
              <div className="space-y-4">
                <HeroVideoSelector
                  onSelect={(heroVideo) => {
                    if (heroVideo) {
                      setNewSection({
                        ...newSection,
                        content: {
                          ...newSection.content,
                          hero_video_id: heroVideo.id,
                          desktop_video_url: heroVideo.desktop_video_url || "",
                          mobile_video_url: heroVideo.mobile_video_url || "",
                          fallback_image_url:
                            heroVideo.fallback_image_url || "",
                          autoplay: heroVideo.autoplay,
                          muted: heroVideo.muted,
                          loop: heroVideo.loop,
                        },
                      });
                    } else {
                      setNewSection({
                        ...newSection,
                        content: {
                          ...newSection.content,
                          hero_video_id: null,
                          desktop_video_url: "",
                          mobile_video_url: "",
                          fallback_image_url: "",
                          autoplay: true,
                          muted: true,
                          loop: true,
                        },
                      });
                    }
                  }}
                  selectedHeroVideoId={
                    newSection.content.hero_video_id || undefined
                  }
                />
                <div className="text-xs text-blue-600 dark:text-blue-400">
                  Select a hero video from the management system or leave empty
                  to use default videos.
                </div>
              </div>
            </div>
          )}

          <div className="mt-3">
            <button
              onClick={addSection}
              disabled={adding}
              className="px-4 py-2 rounded-md bg-yec-primary text-white hover:bg-yec-accent disabled:opacity-50"
            >
              {adding ? "Adding..." : "Add Section"}
            </button>
          </div>
        </div>

        {/* Edit Section Form */}
        {editing && editingSection && (
          <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <h4 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-3">
              Edit Section: {editingSection.title}
            </h4>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <select
                  value={editingSection.section_type}
                  onChange={(e) =>
                    setEditingSection({
                      ...editingSection,
                      section_type: e.target.value,
                    })
                  }
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                >
                  <option value="hero">Hero</option>
                  <option value="content">Content</option>
                  <option value="banner">Banner</option>
                  <option value="activity_cards">Activity Cards</option>
                </select>
                <input
                  placeholder="Title"
                  value={editingSection.title || ""}
                  onChange={(e) =>
                    setEditingSection({
                      ...editingSection,
                      title: e.target.value,
                    })
                  }
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
                {editingSection.section_type === "content" ? (
                  <div className="col-span-3">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Content
                    </label>
                    <ClientOnlyRichTextEditor
                      value={editingSection.content?.body || ""}
                      onChange={(value) =>
                        setEditingSection({
                          ...editingSection,
                          content: { ...editingSection.content, body: value },
                        })
                      }
                      placeholder="Write your content here..."
                      className="w-full"
                    />
                  </div>
                ) : editingSection.section_type === "hero" ? (
                  <input
                    placeholder="Subtitle"
                    value={editingSection.content?.subtitle || ""}
                    onChange={(e) =>
                      setEditingSection({
                        ...editingSection,
                        content: {
                          ...editingSection.content,
                          subtitle: e.target.value,
                        },
                      })
                    }
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                ) : editingSection.section_type === "activity_cards" ? (
                  <div className="col-span-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <input
                        placeholder="Number of cards to show (default: 6)"
                        type="number"
                        value={editingSection.content?.limit || ""}
                        onChange={(e) =>
                          setEditingSection({
                            ...editingSection,
                            content: {
                              ...editingSection.content,
                              limit: parseInt(e.target.value) || 6,
                            },
                          })
                        }
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                      />
                      <select
                        value={editingSection.content?.grid_cols || "3"}
                        onChange={(e) =>
                          setEditingSection({
                            ...editingSection,
                            content: {
                              ...editingSection.content,
                              grid_cols: e.target.value,
                            },
                          })
                        }
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                      >
                        <option value="1">1 Column</option>
                        <option value="2">2 Columns</option>
                        <option value="3">3 Columns</option>
                        <option value="4">4 Columns</option>
                      </select>
                    </div>
                    <div className="mt-3 space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={editingSection.content?.show_title !== false}
                          onChange={(e) =>
                            setEditingSection({
                              ...editingSection,
                              content: {
                                ...editingSection.content,
                                show_title: e.target.checked,
                              },
                            })
                          }
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          Show section title
                        </span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={
                            editingSection.content?.show_description !== false
                          }
                          onChange={(e) =>
                            setEditingSection({
                              ...editingSection,
                              content: {
                                ...editingSection.content,
                                show_description: e.target.checked,
                              },
                            })
                          }
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          Show activity descriptions
                        </span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={editingSection.content?.show_image !== false}
                          onChange={(e) =>
                            setEditingSection({
                              ...editingSection,
                              content: {
                                ...editingSection.content,
                                show_image: e.target.checked,
                              },
                            })
                          }
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          Show activity images
                        </span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={
                            editingSection.content?.show_hashtags !== false
                          }
                          onChange={(e) =>
                            setEditingSection({
                              ...editingSection,
                              content: {
                                ...editingSection.content,
                                show_hashtags: e.target.checked,
                              },
                            })
                          }
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          Show hashtags
                        </span>
                      </label>
                    </div>
                  </div>
                ) : (
                  <div className="col-span-3">
                    <MultiMediaSelector
                      value={
                        Array.isArray(editingSection.content?.images)
                          ? editingSection.content.images.map((i: any) => i.url)
                          : []
                      }
                      onChange={(urls) =>
                        setEditingSection({
                          ...editingSection,
                          content: {
                            ...editingSection.content,
                            images: urls.map((url) => ({ url })),
                          },
                        })
                      }
                      label="Gallery Images"
                      _placeholder="Select images from media library"
                      maxImages={10}
                    />
                  </div>
                )}
              </div>

              {/* Enhanced Hero Section Configuration for Editing */}
              {editingSection.section_type === "hero" && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-3">
                    Hero Video Configuration
                  </h4>
                  <div className="space-y-4">
                    <HeroVideoSelector
                      onSelect={(heroVideo) => {
                        if (heroVideo) {
                          setEditingSection({
                            ...editingSection,
                            content: {
                              ...editingSection.content,
                              hero_video_id: heroVideo.id,
                              desktop_video_url:
                                heroVideo.desktop_video_url || "",
                              mobile_video_url:
                                heroVideo.mobile_video_url || "",
                              fallback_image_url:
                                heroVideo.fallback_image_url || "",
                              autoplay: heroVideo.autoplay,
                              muted: heroVideo.muted,
                              loop: heroVideo.loop,
                            },
                          });
                        } else {
                          setEditingSection({
                            ...editingSection,
                            content: {
                              ...editingSection.content,
                              hero_video_id: null,
                              desktop_video_url: "",
                              mobile_video_url: "",
                              fallback_image_url: "",
                              autoplay: true,
                              muted: true,
                              loop: true,
                            },
                          });
                        }
                      }}
                      selectedHeroVideoId={
                        editingSection.content?.hero_video_id || undefined
                      }
                    />
                    <div className="text-xs text-blue-600 dark:text-blue-400">
                      Select a hero video from the management system or leave
                      empty to use default videos.
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setEditing(false);
                    setEditingSection(null);
                  }}
                  className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={updateSection}
                  disabled={adding}
                  className="px-4 py-2 rounded-md bg-yec-primary text-white hover:bg-yec-accent disabled:opacity-50"
                >
                  {adding ? "Updating..." : "Update Section"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FAQ Group Selector Modal */}
        {showFAQGroupSelector && (
          <FAQGroupSelector
            selectedGroupId={newSection.content.faq_group_id}
            onSelect={(groupId) => {
              setNewSection({
                ...newSection,
                content: { ...newSection.content, faq_group_id: groupId },
              });
            }}
            onClose={() => setShowFAQGroupSelector(false)}
          />
        )}
      </div>
    </div>
  );
}
