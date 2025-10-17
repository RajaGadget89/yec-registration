"use client";

import { useState, useEffect, useCallback } from "react";
import { FormType } from "../../../../types/form-system";
import { CheckCircle, Plus, Trash2 } from "lucide-react";

interface CheckinEvent {
  id: string;
  name: string;
  description?: string;
  event_date: string;
  location?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface FormCheckinPoint {
  id: string;
  form_key: string;
  checkin_event_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CheckinConfigEditorProps {
  form: FormType;
  onClose: () => void;
  onSave?: () => void;
}

export default function CheckinConfigEditor({
  form,
  onClose,
  onSave: _onSave,
}: CheckinConfigEditorProps) {
  const [availableEvents, setAvailableEvents] = useState<CheckinEvent[]>([]);
  const [currentPoints, setCurrentPoints] = useState<FormCheckinPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState("");

  const loadCheckinConfig = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/super-admin/form-checkin-config/${form.form_key}`,
      );
      if (response.ok) {
        const data = await response.json();
        setAvailableEvents(data.availableEvents || []);
        setCurrentPoints(data.currentPoints || []);
      }
    } catch (error) {
      console.error("Failed to load check-in config:", error);
    } finally {
      setLoading(false);
    }
  }, [form.form_key]);

  useEffect(() => {
    loadCheckinConfig();
  }, [form, loadCheckinConfig]);

  const handleAddCheckinPoint = async () => {
    if (!selectedEventId) {
      alert("Please select an event");
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(
        `/api/admin/super-admin/form-checkin-config/${form.form_key}/add-point`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ checkin_event_id: selectedEventId }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Add to current points
          const newPoint: FormCheckinPoint = {
            id: data.pointId,
            form_key: form.form_key,
            checkin_event_id: selectedEventId,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          setCurrentPoints([...currentPoints, newPoint]);
          setSelectedEventId("");
        } else {
          alert(`Failed to add check-in point: ${data.message}`);
        }
      } else {
        const error = await response.json();
        alert(`Failed to add check-in point: ${error.message}`);
      }
    } catch (error) {
      console.error("Failed to add check-in point:", error);
      alert("Failed to add check-in point");
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveCheckinPoint = async (checkinEventId: string) => {
    if (!confirm("Are you sure you want to remove this check-in point?")) {
      return;
    }

    try {
      setSaving(true);
      const response = await fetch(
        `/api/admin/super-admin/form-checkin-config/${form.form_key}/remove-point`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ checkin_event_id: checkinEventId }),
        },
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          // Remove from current points
          setCurrentPoints(
            currentPoints.filter((p) => p.checkin_event_id !== checkinEventId),
          );
        } else {
          alert(`Failed to remove check-in point: ${data.message}`);
        }
      } else {
        const error = await response.json();
        alert(`Failed to remove check-in point: ${error.message}`);
      }
    } catch (error) {
      console.error("Failed to remove check-in point:", error);
      alert("Failed to remove check-in point");
    } finally {
      setSaving(false);
    }
  };

  const getEventName = (eventId: string) => {
    const event = availableEvents.find((e) => e.id === eventId);
    return event ? event.name : "Unknown Event";
  };

  const getEventDate = (eventId: string) => {
    const event = availableEvents.find((e) => e.id === eventId);
    return event ? new Date(event.event_date).toLocaleDateString() : "";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Check-in Configuration
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Configure check-in points for: {form.name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Add New Check-in Point */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Add Check-in Point
            </h3>

            <div className="flex items-center space-x-4">
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-600 dark:text-white focus:ring-2 focus:ring-yec-primary focus:border-transparent"
              >
                <option value="">Select an event...</option>
                {availableEvents
                  .filter(
                    (event) =>
                      !currentPoints.some(
                        (point) => point.checkin_event_id === event.id,
                      ),
                  )
                  .map((event) => (
                    <option key={event.id} value={event.id}>
                      {event.name} - {formatDate(event.event_date)}
                    </option>
                  ))}
              </select>

              <button
                onClick={handleAddCheckinPoint}
                disabled={!selectedEventId || saving}
                className="px-4 py-2 bg-yec-primary text-white rounded-lg hover:bg-yec-accent disabled:opacity-50 transition-colors flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                {saving ? "Adding..." : "Add Point"}
              </button>
            </div>
          </div>

          {/* Current Check-in Points */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Current Check-in Points
            </h3>

            {currentPoints.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                No check-in points configured for this form
              </div>
            ) : (
              <div className="space-y-3">
                {currentPoints.map((point) => (
                  <div
                    key={point.id}
                    className="flex items-center justify-between p-4 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-5 h-5 text-green-500" />
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {getEventName(point.checkin_event_id)}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Event Date: {getEventDate(point.checkin_event_id)}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() =>
                        handleRemoveCheckinPoint(point.checkin_event_id)
                      }
                      disabled={saving}
                      className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Available Events Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
              Available Events
            </h3>
            <div className="text-sm text-blue-700 dark:text-blue-300">
              {availableEvents.length === 0 ? (
                <p>
                  No check-in events available. Create events in the Check-in
                  Management section first.
                </p>
              ) : (
                <div className="space-y-1">
                  {availableEvents.map((event) => (
                    <div key={event.id} className="flex items-center space-x-2">
                      <span className="font-medium">{event.name}</span>
                      <span className="text-blue-600 dark:text-blue-400">
                        - {formatDate(event.event_date)}
                      </span>
                      {event.location && (
                        <span className="text-blue-500 dark:text-blue-400">
                          ({event.location})
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
