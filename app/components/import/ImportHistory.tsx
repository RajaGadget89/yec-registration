"use client";

import { useState } from "react";

interface ImportSession {
  id: string;
  filename: string;
  status: "processing" | "completed" | "failed" | "rolled_back";
  totalRecords: number;
  successfulRecords: number;
  failedRecords: number;
  createdAt: string;
  completedAt?: string;
}

interface ImportHistoryProps {
  sessions: ImportSession[];
  onSessionSelect: (session: ImportSession) => void;
  onRefresh: () => void;
}

export function ImportHistory({
  sessions,
  onSessionSelect,
  onRefresh,
}: ImportHistoryProps) {
  const [filter, setFilter] = useState<
    "all" | "completed" | "failed" | "processing"
  >("all");
  const [sortBy, setSortBy] = useState<"date" | "status" | "records">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const filteredSessions = sessions.filter((session) => {
    if (filter === "all") return true;
    return session.status === filter;
  });

  const sortedSessions = [...filteredSessions].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case "date":
        comparison =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case "status":
        comparison = a.status.localeCompare(b.status);
        break;
      case "records":
        comparison = a.totalRecords - b.totalRecords;
        break;
    }

    return sortOrder === "asc" ? comparison : -comparison;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "rolled_back":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getSuccessRate = (session: ImportSession) => {
    if (session.totalRecords === 0) return 0;
    return Math.round((session.successfulRecords / session.totalRecords) * 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatDuration = (startDate: string, endDate?: string) => {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const diffMins = Math.round(diffMs / 60000);

    if (diffMins < 60) return `${diffMins}m`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Import History</h2>
          <button
            onClick={onRefresh}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Refresh
          </button>
        </div>

        {/* Filters and Sorting */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Filter:</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Sessions</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="processing">Processing</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">
              Sort by:
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="date">Date</option>
              <option value="status">Status</option>
              <option value="records">Records</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Order:</label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="desc">Newest First</option>
              <option value="asc">Oldest First</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sessions List */}
      {sortedSessions.length === 0 ? (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No import sessions found
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Start a new import from the Import Wizard tab.
          </p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {sortedSessions.map((session) => (
              <li key={session.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {session.filename}
                        </h3>
                        <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                          <span>Session: {session.id.slice(0, 8)}...</span>
                          <span>Started: {formatDate(session.createdAt)}</span>
                          {session.completedAt && (
                            <span>
                              Completed: {formatDate(session.completedAt)}
                            </span>
                          )}
                          <span>
                            Duration:{" "}
                            {formatDuration(
                              session.createdAt,
                              session.completedAt,
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="text-sm text-gray-900">
                            {session.successfulRecords} / {session.totalRecords}{" "}
                            records
                          </div>
                          <div className="text-sm text-gray-500">
                            {getSuccessRate(session)}% success rate
                          </div>
                        </div>

                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(session.status)}`}
                        >
                          {session.status.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar for Processing Sessions */}
                    {session.status === "processing" && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Progress</span>
                          <span>
                            {Math.round(
                              (session.successfulRecords /
                                session.totalRecords) *
                                100,
                            )}
                            %
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1">
                          <div
                            className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.round((session.successfulRecords / session.totalRecords) * 100)}%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    )}

                    {/* Error Summary for Failed Sessions */}
                    {session.status === "failed" &&
                      session.failedRecords > 0 && (
                        <div className="mt-2 text-sm text-red-600">
                          {session.failedRecords} records failed to import
                        </div>
                      )}
                  </div>

                  <div className="ml-4 flex-shrink-0">
                    <button
                      onClick={() => onSessionSelect(session)}
                      className="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
