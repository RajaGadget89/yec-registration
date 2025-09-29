"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMobileSession } from "../_components/MobileSessionProvider";

interface ActiveEvent {
  id: string;
  name: string;
  description: string;
  location: string;
  start_time: string;
  end_time: string;
  event_types: {
    name: string;
    description: string;
  };
}

export default function EventsPage() {
  const [events, setEvents] = useState<ActiveEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();
  const { session, connectionStatus } = useMobileSession();

  useEffect(() => {
    if (!session) {
      router.push("/checker/login");
      return;
    }

    loadEvents();
  }, [session, router]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/checkin/events/active");

      if (!response.ok) {
        throw new Error("Failed to load events");
      }

      const data = await response.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error("Error loading events:", error);
      setError("Failed to load events. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yec-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Active Events
              </h1>
              <p className="text-sm text-gray-600">Available check-in events</p>
            </div>
            <button
              onClick={() => router.push("/checker/scan")}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
            <button
              onClick={loadEvents}
              className="ml-4 text-sm underline hover:no-underline"
            >
              Try Again
            </button>
          </div>
        )}

        {events.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📅</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Active Events
            </h3>
            <p className="text-gray-600">
              There are currently no active check-in events available.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <div key={event.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {event.name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      {event.description}
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="font-medium w-20">Location:</span>
                        <span>{event.location}</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600">
                        <span className="font-medium w-20">Type:</span>
                        <span>{event.event_types.description}</span>
                      </div>
                      {event.start_time && (
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="font-medium w-20">Start:</span>
                          <span>{formatDateTime(event.start_time)}</span>
                        </div>
                      )}
                      {event.end_time && (
                        <div className="flex items-center text-sm text-gray-600">
                          <span className="font-medium w-20">End:</span>
                          <span>{formatDateTime(event.end_time)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="ml-4">
                    <button
                      onClick={() =>
                        router.push(`/checker/scan?event=${event.id}`)
                      }
                      className="bg-yec-primary text-white px-4 py-2 rounded-md hover:bg-yec-accent focus:outline-none focus:ring-2 focus:ring-yec-primary"
                    >
                      Start Scanning
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Connection Status */}
        <div className="mt-8 bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">
                Connection Status
              </h3>
              <p className="text-sm text-gray-600">
                Last checked:{" "}
                {new Date(connectionStatus.timestamp).toLocaleTimeString()}
              </p>
            </div>
            <div className="flex space-x-4">
              <div className="flex items-center">
                <div
                  className={`w-3 h-3 rounded-full mr-2 ${
                    connectionStatus.internet ? "bg-green-400" : "bg-red-400"
                  }`}
                ></div>
                <span className="text-sm text-gray-600">Internet</span>
              </div>
              <div className="flex items-center">
                <div
                  className={`w-3 h-3 rounded-full mr-2 ${
                    connectionStatus.database ? "bg-green-400" : "bg-red-400"
                  }`}
                ></div>
                <span className="text-sm text-gray-600">Database</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
