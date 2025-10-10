"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import MediaSelector from "../../../../../components/cms/MediaSelector";

export default function NewEventForm() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    event_name: "",
    event_slug: "",
    section_title: "Event Schedule & Activities",
    section_description:
      "Discover the exciting lineup of activities and networking opportunities planned for YEC Day",
    banner_image_url: "",
    is_active: false,
    display_order: 0,
    language: "th" as "th" | "en",
  });

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch(`/api/admin/cms/event-settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to create");
      const data = await res.json();
      router.push(`/admin/content-management/event-settings/${data.id}`);
    } catch (_e) {
      alert("Create failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-md hover:bg-gray-100"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-semibold">Create Event</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Event Name</label>
          <input
            value={form.event_name}
            onChange={(e) => setForm({ ...form, event_name: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Slug</label>
          <input
            value={form.event_slug}
            onChange={(e) => setForm({ ...form, event_slug: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Language</label>
          <select
            value={form.language}
            onChange={(e) =>
              setForm({ ...form, language: e.target.value as any })
            }
            className="w-full px-3 py-2 border rounded-lg"
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
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Section Title</label>
        <input
          value={form.section_title}
          onChange={(e) => setForm({ ...form, section_title: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg"
        />
      </div>

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
          className="w-full px-3 py-2 border rounded-lg"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-2">Banner Image</label>
        <div className="mb-3">
          <MediaSelector
            value={form.banner_image_url}
            onChange={(url) =>
              setForm({ ...form, banner_image_url: url || "" })
            }
            accept={["image/jpeg", "image/png", "image/webp", "image/svg+xml"]}
          />
        </div>
        {form.banner_image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={form.banner_image_url}
            alt="Banner"
            className="w-full h-56 object-contain rounded-md border"
          />
        )}
      </div>

      <div className="flex items-center gap-3">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
          />
          <span>Active (will deactivate others)</span>
        </label>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-yec-primary text-white hover:bg-yec-accent disabled:opacity-50"
        >
          <Save className="h-4 w-4" /> {saving ? "Creating..." : "Create Event"}
        </button>
      </div>
    </div>
  );
}
