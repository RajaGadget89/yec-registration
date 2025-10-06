"use client";

import { useState, useEffect } from "react";
import { ImportProgress } from "./ImportProgress";

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

interface ImportDashboardProps {
  activeSession: ImportSession | null;
  onSessionUpdate: () => void;
}

export function ImportDashboard({
  activeSession,
  onSessionUpdate,
}: ImportDashboardProps) {
  const [sessionDetails, setSessionDetails] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (activeSession) {
      fetchSessionDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession]);

  const fetchSessionDetails = async () => {
    if (!activeSession) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/import/status/${activeSession.id}`,
      );
      if (response.ok) {
        const data = await response.json();
        setSessionDetails(data);
      } else {
        throw new Error("Failed to fetch session details");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRollback = async () => {
    if (!activeSession) return;

    const confirmed = window.confirm(
      "Are you sure you want to rollback this import? This will remove all imported data and cannot be undone.",
    );

    if (!confirmed) return;

    try {
      const response = await fetch("/api/admin/import/rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: activeSession.id }),
      });

      if (response.ok) {
        alert("Rollback initiated successfully");
        onSessionUpdate();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Rollback failed");
      }
    } catch (err: any) {
      alert(`Rollback failed: ${err.message}`);
    }
  };

  if (!activeSession) {
    return (
      <div className="p-6 text-center">
        <div className="text-gray-500">
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
            No Active Session
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Start a new import from the Import Wizard tab.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Import Dashboard
        </h2>
        <p className="text-gray-600">
          Monitor the progress of your active import session.
        </p>
      </div>

      {/* Session Info */}
      <div className="mb-6 bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Session Information
          </h3>
          <span
            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
              activeSession.status === "completed"
                ? "bg-green-100 text-green-800"
                : activeSession.status === "processing"
                  ? "bg-blue-100 text-blue-800"
                  : activeSession.status === "failed"
                    ? "bg-red-100 text-red-800"
                    : "bg-gray-100 text-gray-800"
            }`}
          >
            {activeSession.status.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-500">
              Filename
            </label>
            <p className="text-sm text-gray-900">{activeSession.filename}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">
              Session ID
            </label>
            <p className="text-sm text-gray-900 font-mono">
              {activeSession.id}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Started</label>
            <p className="text-sm text-gray-900">
              {new Date(activeSession.createdAt).toLocaleString()}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">
              Completed
            </label>
            <p className="text-sm text-gray-900">
              {activeSession.completedAt
                ? new Date(activeSession.completedAt).toLocaleString()
                : "In Progress"}
            </p>
          </div>
        </div>
      </div>

      {/* Progress Tracking */}
      <ImportProgress sessionId={activeSession.id} />

      {/* Session Details */}
      {sessionDetails && (
        <div className="mb-6 bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Detailed Progress
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-900">
                {sessionDetails.progress?.processedRecords || 0}
              </div>
              <div className="text-sm text-blue-700">Processed Records</div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-900">
                {sessionDetails.progress?.successfulRecords || 0}
              </div>
              <div className="text-sm text-green-700">Successful</div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-red-900">
                {sessionDetails.progress?.failedRecords || 0}
              </div>
              <div className="text-sm text-red-700">Failed</div>
            </div>
          </div>

          {/* Current Operation */}
          {sessionDetails.progress?.currentOperation && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                Current Operation
              </h4>
              <p className="text-sm text-gray-700">
                {sessionDetails.progress.currentOperation}
              </p>
            </div>
          )}

          {/* Estimated Completion */}
          {sessionDetails.progress?.estimatedCompletion && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                Estimated Completion
              </h4>
              <p className="text-sm text-gray-700">
                {sessionDetails.progress.estimatedCompletion}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between">
        <button
          onClick={fetchSessionDetails}
          disabled={isLoading}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {isLoading ? "Refreshing..." : "Refresh Status"}
        </button>

        {activeSession.status === "completed" && (
          <button
            onClick={handleRollback}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            Rollback Import
          </button>
        )}
      </div>
    </div>
  );
}
