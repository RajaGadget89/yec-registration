"use client";

import { useEffect, useState } from "react";
import AdminHeader from "../../../_components/AdminHeader";

type Props = { pageId: string };

export default function PageEditor({ pageId }: Props) {
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
  const [newSection, setNewSection] = useState({
    section_type: "rich_text",
    title: "",
    content: {
      body: "",
      subtitle: "",
      images: [] as any[],
    },
  });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/cms/pages/${pageId}`);
        if (!res.ok) throw new Error("Failed to load page");
        const data = await res.json();
        setForm({
          title: data.page?.title || "",
          slug: data.page?.slug || "",
          meta_description: data.page?.meta_description || "",
          language: data.page?.language || "en",
          is_active: !!data.page?.is_active,
        });

        const sres = await fetch(`/api/admin/cms/pages/${pageId}/sections`);
        if (sres.ok) {
          const sdata = await sres.json();
          setSections(sdata.sections || []);
        }
      } catch (_e) {
        alert("Failed to load page");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [pageId]);

  const save = async () => {
    try {
      setSaving(true);
      const res = await fetch(`/api/admin/cms/pages/${pageId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Save failed");
      alert("Saved");
    } catch (_e) {
      alert("Failed to save page");
    } finally {
      setSaving(false);
    }
  };

  const addSection = async () => {
    try {
      setAdding(true);
      const res = await fetch(`/api/admin/cms/pages/${pageId}/sections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section_type: newSection.section_type,
          section_order: sections.length,
          title: newSection.title,
          content: newSection.content,
          is_active: true,
        }),
      });
      if (!res.ok) throw new Error("Create failed");
      const { section } = await res.json();
      setSections([...sections, section]);
      setNewSection({
        section_type: "rich_text",
        title: "",
        content: {
          body: "",
          subtitle: "",
          images: [],
        },
      });
    } catch (_e) {
      alert("Failed to add section");
    } finally {
      setAdding(false);
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
            Title
          </label>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Slug
          </label>
          <input
            value={form.slug}
            onChange={(e) =>
              setForm({
                ...form,
                slug: e.target.value.replace(/\s+/g, "-").toLowerCase(),
              })
            }
            className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Meta Description
          </label>
          <textarea
            value={form.meta_description}
            onChange={(e) =>
              setForm({ ...form, meta_description: e.target.value })
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
            disabled={saving}
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
              <span className="text-xs text-gray-500">
                order: {s.section_order}
              </span>
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
              <option value="rich_text">Rich Text</option>
              <option value="gallery">Gallery</option>
            </select>
            <input
              placeholder="Title"
              value={newSection.title}
              onChange={(e) =>
                setNewSection({ ...newSection, title: e.target.value })
              }
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
            {newSection.section_type === "rich_text" ? (
              <input
                placeholder="Body (HTML)"
                value={newSection.content.body || ""}
                onChange={(e) =>
                  setNewSection({
                    ...newSection,
                    content: { ...newSection.content, body: e.target.value },
                  })
                }
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
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
            ) : (
              <input
                placeholder="Images (comma URLs)"
                value={
                  Array.isArray(newSection.content.images)
                    ? newSection.content.images.map((i: any) => i.url).join(",")
                    : ""
                }
                onChange={(e) =>
                  setNewSection({
                    ...newSection,
                    content: {
                      ...newSection.content,
                      images: e.target.value
                        .split(",")
                        .filter(Boolean)
                        .map((u) => ({ url: u.trim() })),
                    },
                  })
                }
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            )}
          </div>
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
      </div>
    </div>
  );
}
