"use client";

import { useEffect, useState } from "react";
import EventTypeFormModal, { EventTypeModel } from "./EventTypeFormModal";

export default function EventTypesTab() {
  const [types, setTypes] = useState<EventTypeModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState<EventTypeModel | undefined>(undefined);

  const load = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/checkin/event-types");
      if (!res.ok) throw new Error("Failed to load event types");
      const data = await res.json();
      setTypes(data.event_types || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (payload: EventTypeModel) => {
    try {
      const res = await fetch("/api/admin/checkin/event-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create event type");
      }
      setOpenForm(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
  };

  const handleUpdate = async (payload: EventTypeModel) => {
    try {
      const res = await fetch(`/api/admin/checkin/event-types/${payload.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update event type");
      }
      setEditing(undefined);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    if (!confirm("Delete this event type? It will fail if used by events."))
      return;
    try {
      const res = await fetch(`/api/admin/checkin/event-types/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to delete event type");
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
  };

  const Badge = ({ value }: { value: string }) => (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        value === "ONE_TIME_ONLY"
          ? "bg-red-100 text-red-800"
          : "bg-green-100 text-green-800"
      }`}
    >
      {value === "ONE_TIME_ONLY" ? "One-Time Only" : "Multiple Allowed"}
    </span>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Event Types</h2>
        <button
          onClick={() => {
            setEditing(undefined);
            setOpenForm(true);
          }}
          className="bg-yec-primary text-white px-4 py-2 rounded-md hover:bg-yec-accent"
        >
          Create Type
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded">
          {error}
        </div>
      )}

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {loading ? (
          <div className="p-6 text-gray-600">Loading...</div>
        ) : types.length === 0 ? (
          <div className="p-6 text-gray-600">No event types.</div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {types.map((t) => (
              <li key={t.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-md font-medium text-gray-900">
                        {t.name}
                      </h3>
                      {t.is_default && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-800">
                          Default
                        </span>
                      )}
                      <Badge value={t.business_rule_category} />
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {t.description}
                    </p>
                    <div className="text-xs text-gray-500 mt-1">
                      Status: {t.is_active ? "Active" : "Inactive"}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setEditing(t);
                      }}
                      className="text-yec-primary hover:text-yec-accent text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <EventTypeFormModal
        open={openForm}
        onClose={() => setOpenForm(false)}
        onSubmit={handleCreate}
      />

      <EventTypeFormModal
        open={!!editing}
        initial={editing}
        onClose={() => setEditing(undefined)}
        onSubmit={handleUpdate}
      />
    </div>
  );
}
