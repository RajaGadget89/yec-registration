"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  Search,
} from "lucide-react";
import MediaSelector from "../../../../components/cms/MediaSelector";
import { useRouter } from "next/navigation";

type EventItem = {
  id: string;
  event_name: string;
  event_slug: string;
  section_title?: string;
  section_description?: string;
  banner_image_url?: string | null;
  is_active: boolean;
  display_order: number;
  language: "th" | "en";
  created_at: string;
  updated_at: string;
};

export default function EventSettingsManagement() {
  const router = useRouter();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [_page, _setPage] = useState(1);
  const [_total, _setTotal] = useState(0);
  const [language, setLanguage] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [showCreate, setShowCreate] = useState(false);
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

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (language) params.append("language", language);
      if (status)
        params.append("is_active", status === "active" ? "true" : "false");

      const res = await fetch(`/api/admin/cms/event-settings?${params}`);
      if (!res.ok) throw new Error("Failed to fetch events");
      const data = await res.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  }, [language, status]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const setActive = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/cms/event-settings/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: true }),
      });
      if (!res.ok) throw new Error("Failed to set active");
      fetchEvents();
    } catch (_e) {
      alert("Failed to set active event");
    }
  };

  const handleReorder = async (id: string, direction: "up" | "down") => {
    const current = events.find((e) => e.id === id);
    if (!current) return;
    const newOrder =
      direction === "up"
        ? current.display_order - 1
        : current.display_order + 1;
    if (newOrder < 0) return;
    try {
      const res = await fetch(`/api/admin/cms/event-settings/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_order: newOrder }),
      });
      if (!res.ok) throw new Error("Failed to reorder");
      fetchEvents();
    } catch (_e) {
      alert("Failed to reorder");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between px-1 sm:px-0">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          {/* Search (by event name or slug) */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search events..."
              onChange={(e) => {
                const q = e.target.value.trim().toLowerCase();
                // simple client-side filter; keeps server parameters intact
                if (!q) {
                  fetchEvents();
                  return;
                }
                const filtered = events.filter(
                  (ev) =>
                    ev.event_name.toLowerCase().includes(q) ||
                    ev.event_slug.toLowerCase().includes(q),
                );
                setEvents(filtered);
              }}
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white text-gray-900 placeholder-gray-500 shadow-sm focus:ring-2 focus:ring-yec-primary focus:border-yec-primary/50 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Language filter */}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white text-gray-900 shadow-sm focus:ring-2 focus:ring-yec-primary focus:border-yec-primary/50 dark:bg-gray-700 dark:text-white"
          >
            <option value="">All Languages</option>
            <option value="th">Thai</option>
            <option value="en">English</option>
          </select>

          {/* Status filter */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white text-gray-900 shadow-sm focus:ring-2 focus:ring-yec-primary focus:border-yec-primary/50 dark:bg-gray-700 dark:text-white"
          >
            <option value="">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>

        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-yec-primary text-white hover:bg-yec-accent"
        >
          <Plus className="h-4 w-4" /> Create Event
        </button>
      </div>

      {loading ? (
        <div className="py-20 text-center text-gray-500">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((ev) => (
            <div
              key={ev.id}
              className="rounded-xl border bg-white shadow-sm overflow-hidden"
            >
              {ev.banner_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={ev.banner_image_url}
                  alt={ev.event_name}
                  className="w-full h-40 object-cover"
                />
              ) : (
                <div className="w-full h-40 bg-gray-100 flex items-center justify-center text-gray-400">
                  No Image
                </div>
              )}
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h3
                    className="font-semibold text-lg truncate"
                    title={ev.event_name}
                  >
                    {ev.event_name}
                  </h3>
                  {ev.is_active && (
                    <span className="inline-flex items-center gap-1 text-green-700 bg-green-100 px-2 py-1 rounded-md text-xs">
                      <CheckCircle2 className="h-3 w-3" /> Active
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 truncate">
                  Slug: {ev.event_slug}
                </p>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Order: {ev.display_order}</span>
                  <span>Lang: {ev.language.toUpperCase()}</span>
                </div>
                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <button
                      title="Move up"
                      onClick={() => handleReorder(ev.id, "up")}
                      className="p-1 text-gray-500 hover:text-yec-primary"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      title="Move down"
                      onClick={() => handleReorder(ev.id, "down")}
                      className="p-1 text-gray-500 hover:text-yec-primary"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      title="Preview public"
                      onClick={() => window.open("/#event-schedule", "_blank")}
                      className="p-1 text-gray-500 hover:text-yec-primary"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    {!ev.is_active && (
                      <button
                        onClick={() => setActive(ev.id)}
                        className="px-2 py-1 bg-green-600 text-white rounded-md text-xs"
                      >
                        Set Active
                      </button>
                    )}
                    <button
                      onClick={() =>
                        router.push(
                          `/admin/content-management/event-settings/${ev.id}`,
                        )
                      }
                      className="p-1 text-gray-600 hover:text-yec-primary"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm("Delete this event?")) return;
                        const res = await fetch(
                          `/api/admin/cms/event-settings/${ev.id}`,
                          { method: "DELETE" },
                        );
                        if (res.ok) fetchEvents();
                        else alert("Delete failed");
                      }}
                      className="p-1 text-gray-600 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Event Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Create Event
              </h3>
              <button
                onClick={() => setShowCreate(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Event Name
                  </label>
                  <input
                    value={form.event_name}
                    onChange={(e) =>
                      setForm({ ...form, event_name: e.target.value })
                    }
                    className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Slug
                  </label>
                  <input
                    value={form.event_slug}
                    onChange={(e) =>
                      setForm({ ...form, event_slug: e.target.value })
                    }
                    className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Language
                  </label>
                  <select
                    value={form.language}
                    onChange={(e) =>
                      setForm({ ...form, language: e.target.value as any })
                    }
                    className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  >
                    <option value="th">Thai</option>
                    <option value="en">English</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={form.display_order}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        display_order: Number(e.target.value),
                      })
                    }
                    className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Section Title
                </label>
                <input
                  value={form.section_title}
                  onChange={(e) =>
                    setForm({ ...form, section_title: e.target.value })
                  }
                  className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Section Description
                </label>
                <textarea
                  rows={4}
                  value={form.section_description}
                  onChange={(e) =>
                    setForm({ ...form, section_description: e.target.value })
                  }
                  className="mt-1 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Banner Image
                </label>
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

              <div className="flex items-center gap-2">
                <input
                  id="new-active"
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) =>
                    setForm({ ...form, is_active: e.target.checked })
                  }
                />
                <label
                  htmlFor="new-active"
                  className="text-sm text-gray-700 dark:text-gray-300"
                >
                  Active
                </label>
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
                    const res = await fetch("/api/admin/cms/event-settings", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(form),
                    });
                    if (!res.ok) throw new Error("Failed");
                    setShowCreate(false);
                    setForm({
                      event_name: "",
                      event_slug: "",
                      section_title: "Event Schedule & Activities",
                      section_description:
                        "Discover the exciting lineup of activities and networking opportunities planned for YEC Day",
                      banner_image_url: "",
                      is_active: false,
                      display_order: 0,
                      language: "th",
                    });
                    fetchEvents();
                  } catch (_e) {
                    alert("Failed to create event");
                  }
                }}
                className="px-4 py-2 rounded-md bg-yec-primary text-white hover:bg-yec-accent"
              >
                Create Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
