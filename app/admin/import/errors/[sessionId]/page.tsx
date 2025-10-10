"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { FailedRecordsTable } from "../../components/FailedRecordsTable";

interface SessionData {
  sessionId: string;
  filename: string;
  status: string;
  statistics: {
    totalRecords: number;
    successfulRecords: number;
    failedRecords: number;
  };
  successfulRecords: Array<any>;
  failedRecords: Array<any>;
}

export default function ImportErrorsPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;
  const [data, setData] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sessionId) {
      fetchSessionData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const fetchSessionData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/import/results/${sessionId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch session data: ${response.status}`);
      }

      const result = await response.json();
      setData(result.result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-900 mb-2">
            Error Loading Session Data
          </h2>
          <p className="text-red-700">{error}</p>
          <button
            onClick={fetchSessionData}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p className="text-gray-500">No session data found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Import Error Details
        </h1>
        <p className="mt-2 text-gray-600">
          Detailed error information for import session
        </p>
      </div>

      {/* Session Info Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Session Information</h2>
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Session ID</dt>
            <dd className="text-sm text-gray-900 font-mono">
              {data.sessionId}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Status</dt>
            <dd className="text-sm">
              <span
                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  data.status === "completed"
                    ? "bg-green-100 text-green-800"
                    : data.status === "failed"
                      ? "bg-red-100 text-red-800"
                      : "bg-gray-100 text-gray-800"
                }`}
              >
                {data.status.toUpperCase()}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Total Records</dt>
            <dd className="text-sm text-gray-900">
              {data.statistics.totalRecords}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Successful</dt>
            <dd className="text-sm text-green-600 font-semibold">
              {data.statistics.successfulRecords}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Failed</dt>
            <dd className="text-sm text-red-600 font-semibold">
              {data.statistics.failedRecords}
            </dd>
          </div>
        </dl>
      </div>

      {/* Failed Records */}
      {data.failedRecords && data.failedRecords.length > 0 ? (
        <FailedRecordsTable failedRecords={data.failedRecords} />
      ) : (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
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
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No Failed Records
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            All records were imported successfully.
          </p>
        </div>
      )}

      {/* Back Button */}
      <div className="mt-8">
        <Link
          href="/admin/import"
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <svg
            className="mr-2 h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to Import Dashboard
        </Link>
      </div>
    </div>
  );
}
