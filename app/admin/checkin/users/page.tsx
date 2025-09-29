"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface UserCheckin {
  id: string;
  checkin_time: string;
  location: string;
  notes: string;
  metadata: any;
  checkin_events: {
    name: string;
    event_types: {
      name: string;
      description: string;
    };
  };
  admin_users: {
    email: string;
  };
}

interface UserInfo {
  registration_id: string;
  user_info: {
    full_name: string;
    email: string;
    phone: string;
    yec_province: string;
    status: string;
  };
  checkins: UserCheckin[];
  total_checkins: number;
}

export default function UserCheckinsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/admin/checkin/users/${searchTerm.trim()}`,
      );

      if (!response.ok) {
        if (response.status === 404) {
          setError("User not found");
        } else {
          const errorData = await response.json();
          setError(errorData.error || "Search failed");
        }
        setSearchResults(null);
        return;
      }

      const userData = await response.json();
      setSearchResults(userData);
    } catch (error) {
      console.error("Search error:", error);
      setError("Search failed. Please try again.");
      setSearchResults(null);
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                User Check-in History
              </h1>
              <p className="text-sm text-gray-600">
                Search and view user check-in records
              </p>
            </div>
            <button
              onClick={() => router.push("/admin/checkin/dashboard")}
              className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Search Form */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label
                htmlFor="search"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Search by Registration ID
              </label>
              <div className="flex space-x-3">
                <input
                  type="text"
                  id="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Enter registration ID (e.g., REG-001)"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-yec-primary focus:border-yec-primary"
                />
                <button
                  type="submit"
                  disabled={loading || !searchTerm.trim()}
                  className="bg-yec-primary text-white px-6 py-2 rounded-md hover:bg-yec-accent disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Searching..." : "Search"}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
            <button
              onClick={() => setError("")}
              className="ml-4 text-sm underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Search Results */}
        {searchResults && (
          <div className="space-y-6">
            {/* User Information */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  User Information
                </h3>
              </div>
              <div className="px-6 py-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      Name:
                    </span>
                    <p className="text-sm text-gray-900">
                      {searchResults.user_info.full_name}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      Email:
                    </span>
                    <p className="text-sm text-gray-900">
                      {searchResults.user_info.email}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      Phone:
                    </span>
                    <p className="text-sm text-gray-900">
                      {searchResults.user_info.phone}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      Province:
                    </span>
                    <p className="text-sm text-gray-900">
                      {searchResults.user_info.yec_province}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      Registration ID:
                    </span>
                    <p className="text-sm text-gray-900">
                      {searchResults.registration_id}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">
                      Status:
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        searchResults.user_info.status === "approved"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      {searchResults.user_info.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Check-in History */}
            <div className="bg-white shadow rounded-lg">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">
                  Check-in History ({searchResults.total_checkins} total)
                </h3>
              </div>
              <div className="overflow-hidden">
                {searchResults.checkins.length > 0 ? (
                  <ul className="divide-y divide-gray-200">
                    {searchResults.checkins.map((checkin) => (
                      <li key={checkin.id} className="px-6 py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center">
                              <h4 className="text-sm font-medium text-gray-900">
                                {checkin.checkin_events.name}
                              </h4>
                              <span className="ml-2 text-xs text-gray-500">
                                {checkin.checkin_events.event_types.description}
                              </span>
                            </div>
                            <div className="mt-1 text-sm text-gray-600">
                              {checkin.location && (
                                <span>📍 {checkin.location}</span>
                              )}
                              {checkin.notes && (
                                <span className="ml-2">📝 {checkin.notes}</span>
                              )}
                            </div>
                            {checkin.metadata && (
                              <div className="mt-1 text-xs text-gray-500">
                                <span className="font-medium">Checked by:</span>{" "}
                                {checkin.admin_users.email}
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-900">
                              {formatDateTime(checkin.checkin_time)}
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="px-6 py-8 text-center">
                    <div className="text-gray-400 text-4xl mb-2">📝</div>
                    <p className="text-gray-500">
                      No check-ins found for this user
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        {!searchResults && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              How to Search
            </h3>
            <div className="space-y-3 text-sm text-gray-600">
              <p>
                1. Enter the user&apos;s registration ID in the search field
                above
              </p>
              <p>2. Click &quot;Search&quot; to view their check-in history</p>
              <p>3. The results will show all check-ins for that user</p>
              <p>4. You can see which events they attended and when</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
