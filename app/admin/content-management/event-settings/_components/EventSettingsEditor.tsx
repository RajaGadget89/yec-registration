"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Eye } from "lucide-react";
import MediaSelector from "../../../../components/cms/MediaSelector";

type FormState = {
  event_name: string;
  event_slug: string;
  section_title: string;
  section_description: string;
  banner_image_url: string;
  banner_images: Array<{ url: string; alt: string; order: number }>;
  carousel_enabled: boolean;
  carousel_interval: number;
  is_active: boolean;
  display_order: number;
  language: "th" | "en";
};

export default function EventSettingsEditor({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>({
    event_name: "",
    event_slug: "",
    section_title: "Event Schedule & Activities",
    section_description:
      "Discover the exciting lineup of activities and networking opportunities planned for YEC Day",
    banner_image_url: "",
    banner_images: [],
    carousel_enabled: false,
    carousel_interval: 5,
    is_active: false,
    display_order: 0,
    language: "th",
  });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/cms/event-settings/${eventId}`);
        if (!res.ok) throw new Error("Failed to load event");
        const data = await res.json();
        setForm({
          event_name: data.event_name || "",
          event_slug: data.event_slug || "",
          section_title: data.section_title || "Event Schedule & Activities",
          section_description:
            data.section_description ||
            "Discover the exciting lineup of activities and networking opportunities planned for YEC Day",
          banner_image_url: data.banner_image_url || "",
          banner_images: data.banner_images || [],
          carousel_enabled: !!data.carousel_enabled,
          carousel_interval: data.carousel_interval || 5,
          is_active: !!data.is_active,
          display_order: data.display_order ?? 0,
          language: data.language || "th",
        });
      } catch (_e) {
        alert("Failed to load event");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [eventId]);

  const handleSave = async () => {
    try {
      setSaving(true);

      // Auto-sync: Update banner_image_url with first carousel image
      const updatedForm = { ...form };
      if (form.banner_images && form.banner_images.length > 0) {
        // Find the first image by order or use index 0
        const firstImage = form.banner_images.sort(
          (a, b) => a.order - b.order,
        )[0];
        if (firstImage && firstImage.url) {
          updatedForm.banner_image_url = firstImage.url;
        }
      }

      const res = await fetch(`/api/admin/cms/event-settings/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedForm),
      });
      if (!res.ok) throw new Error("Failed to save");
      alert("Saved");
      router.push("/admin/content-management/event-settings");
    } catch (_e) {
      alert("Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Actions - parity with News editor */}
      <div className="flex items-center justify-between">
        <button
          onClick={() =>
            router.push("/admin/content-management/event-settings")
          }
          className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Event Settings</span>
        </button>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => window.open("/#event-schedule", "_blank")}
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

      {loading ? (
        <div className="py-20 text-center text-gray-500">Loading...</div>
      ) : (
        <>
          <div
            className="text-[10px] uppercase tracking-wider text-gray-400 select-none"
            aria-hidden="true"
          >
            editor ui v2
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 space-y-6">
            {/* Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Event Name
                </label>
                <input
                  value={form.event_name}
                  onChange={(e) =>
                    setForm({ ...form, event_name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white text-gray-900 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Slug</label>
                <input
                  value={form.event_slug}
                  onChange={(e) =>
                    setForm({ ...form, event_slug: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white text-gray-900 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Language
                </label>
                <select
                  value={form.language}
                  onChange={(e) =>
                    setForm({ ...form, language: e.target.value as any })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white text-gray-900 shadow-sm focus:ring-2 focus:ring-yec-primary focus:border-yec-primary/50 dark:bg-gray-700 dark:text-white"
                >
                  <option value="th">Thai</option>
                  <option value="en">English</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Display Order
                </label>
                <input
                  type="number"
                  value={form.display_order}
                  onChange={(e) =>
                    setForm({ ...form, display_order: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white text-gray-900 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            {/* Row 3 */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Section Title
              </label>
              <input
                value={form.section_title}
                onChange={(e) =>
                  setForm({ ...form, section_title: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white text-gray-900 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Row 4 */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Section Description
              </label>
              <textarea
                rows={3}
                value={form.section_description}
                onChange={(e) =>
                  setForm({ ...form, section_description: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white text-gray-900 dark:bg-gray-700 dark:text-white"
              />
            </div>

            {/* Row 5 - Banner Image (Hidden - auto-synced from first carousel image) */}
            <div style={{ display: "none" }}>
              <label className="block text-sm font-medium mb-2">
                Banner Image (Auto-synced)
              </label>
              <div className="mb-3">
                <MediaSelector
                  value={form.banner_image_url}
                  onChange={(url) =>
                    setForm({ ...form, banner_image_url: url || "" })
                  }
                  accept={[
                    "image/jpeg",
                    "image/png",
                    "image/webp",
                    "image/svg+xml",
                  ]}
                />
              </div>
            </div>

            {/* Row 6 - Multiple Images Manager */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Event Images (First image will be used as banner preview)
              </label>
              <div className="space-y-3">
                {form.banner_images.map((image, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg"
                  >
                    <div className="flex-1">
                      <MediaSelector
                        value={image.url}
                        onChange={(url) => {
                          const newImages = [...form.banner_images];
                          newImages[index] = { ...image, url: url || "" };
                          setForm({ ...form, banner_images: newImages });
                        }}
                        accept={[
                          "image/jpeg",
                          "image/png",
                          "image/webp",
                          "image/svg+xml",
                        ]}
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Alt text for accessibility"
                        value={image.alt}
                        onChange={(e) => {
                          const newImages = [...form.banner_images];
                          newImages[index] = { ...image, alt: e.target.value };
                          setForm({ ...form, banner_images: newImages });
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white text-gray-900 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newImages = form.banner_images.filter(
                          (_, i) => i !== index,
                        );
                        setForm({ ...form, banner_images: newImages });
                      }}
                      className="px-3 py-2 text-red-600 hover:text-red-800 border border-red-300 rounded-lg hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const newImages = [
                      ...form.banner_images,
                      { url: "", alt: "", order: form.banner_images.length },
                    ];
                    setForm({ ...form, banner_images: newImages });
                  }}
                  className="w-full px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-yec-primary hover:text-yec-primary transition-colors"
                >
                  + Add Image
                </button>
              </div>
            </div>

            {/* Row 7 - Carousel Controls */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.carousel_enabled}
                    onChange={(e) =>
                      setForm({ ...form, carousel_enabled: e.target.checked })
                    }
                  />
                  <span>Enable Auto-Scrolling</span>
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Scroll Interval (seconds)
                </label>
                <input
                  type="number"
                  min="2"
                  max="30"
                  value={form.carousel_interval}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      carousel_interval: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white text-gray-900 dark:bg-gray-700 dark:text-white"
                  disabled={!form.carousel_enabled}
                />
              </div>
            </div>

            {/* Row 8 */}
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) =>
                    setForm({ ...form, is_active: e.target.checked })
                  }
                />
                <span>Active (will deactivate others)</span>
              </label>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
