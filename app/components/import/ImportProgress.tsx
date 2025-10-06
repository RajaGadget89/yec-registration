"use client";

import { useState, useEffect } from "react";
import { FailedRecordsTable } from "@/admin/import/components/FailedRecordsTable";

interface ImportProgressProps {
  sessionId: string;
}

interface ProgressData {
  currentBatch: number;
  totalBatches: number;
  processedRecords: number;
  successfulRecords: number;
  failedRecords: number;
  estimatedCompletion: string;
  currentOperation: string;
}

interface FailedRecord {
  rowNumber: number;
  registrationId: string;
  name: string;
  email: string;
  phone: string;
  error: {
    code: string;
    constraint: string;
    field: string;
    message: string;
    technicalDetails: string;
    value?: any;
  };
  originalData: Record<string, any>;
  transformedData: any;
}

export function ImportProgress({ sessionId }: ImportProgressProps) {
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [failedRecords, setFailedRecords] = useState<FailedRecord[]>([]);

  useEffect(() => {
    if (sessionId && !isCompleted) {
      fetchProgress();
      // Set up polling for real-time updates
      const interval = setInterval(fetchProgress, 2000);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, isCompleted]);

  // Fetch failed records when import completes
  useEffect(() => {
    if (isCompleted && sessionId) {
      fetchFailedRecords();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCompleted, sessionId]);

  const fetchFailedRecords = async () => {
    try {
      console.log("📊 Fetching failed records for session:", sessionId);
      const response = await fetch(`/api/admin/import/results/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        console.log("📊 Failed records response:", data);
        if (data.result && data.result.failedRecords) {
          console.log(
            "📊 Setting failed records:",
            data.result.failedRecords.length,
            "records",
          );
          setFailedRecords(data.result.failedRecords);
        } else {
          console.log("📊 No failed records found in response");
        }
      } else {
        console.error(
          "📊 Failed to fetch failed records, status:",
          response.status,
        );
      }
    } catch (err) {
      console.error("📊 Failed to fetch failed records:", err);
    }
  };

  const fetchProgress = async () => {
    try {
      const response = await fetch(`/api/admin/import/progress/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setProgress(data);
        setError(null);

        // Stop polling if import is completed or failed
        if (
          data.currentOperation === "Import completed successfully" ||
          data.currentOperation === "Import failed" ||
          data.estimatedCompletion === "Completed"
        ) {
          setIsCompleted(true);
          setIsLoading(false);
        }
      } else {
        throw new Error("Failed to fetch progress");
      }
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const getProgressPercentage = () => {
    if (!progress) return 0;

    // If import is completed, show 100%
    if (isCompleted || progress.estimatedCompletion === "Completed") {
      return 100;
    }

    // If there are batches, calculate based on batch progress
    if (progress.totalBatches > 0) {
      return Math.round((progress.currentBatch / progress.totalBatches) * 100);
    }

    // If no batches but has processed records, calculate based on records
    if (
      progress.processedRecords > 0 &&
      progress.processedRecords ===
        progress.successfulRecords + progress.failedRecords
    ) {
      return 100;
    }

    return 0;
  };

  const getStatusColor = () => {
    if (!progress) return "bg-gray-500";
    if (progress.failedRecords > 0) return "bg-yellow-500";
    if (progress.successfulRecords > 0) return "bg-green-500";
    return "bg-blue-500";
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-2 bg-gray-200 rounded mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
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
            <h3 className="text-sm font-medium text-red-800">Progress Error</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!progress) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <p className="text-gray-500 text-center">No progress data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="mb-4">
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Import Progress
        </h3>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>
              Batch {progress.currentBatch} of {progress.totalBatches}
            </span>
            <span>{getProgressPercentage()}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${getStatusColor()}`}
              style={{ width: `${getProgressPercentage()}%` }}
            ></div>
          </div>
        </div>

        {/* Current Operation */}
        {progress.currentOperation && (
          <div
            className={`mb-4 rounded-lg p-4 ${
              isCompleted
                ? "bg-green-50 border border-green-200"
                : "bg-blue-50 border border-blue-200"
            }`}
          >
            <div className="flex items-center">
              {isCompleted ? (
                <svg
                  className="h-5 w-5 text-green-600 mr-3"
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
              ) : (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
              )}
              <div>
                <h4
                  className={`text-sm font-medium ${
                    isCompleted ? "text-green-800" : "text-blue-800"
                  }`}
                >
                  {isCompleted ? "Status" : "Current Operation"}
                </h4>
                <p
                  className={`text-sm ${
                    isCompleted ? "text-green-700" : "text-blue-700"
                  }`}
                >
                  {progress.currentOperation}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-blue-900">
              {progress.processedRecords}
            </div>
            <div className="text-sm text-blue-700">Processed</div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-green-900">
              {progress.successfulRecords}
            </div>
            <div className="text-sm text-green-700">Successful</div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-2xl font-bold text-red-900">
              {progress.failedRecords}
            </div>
            <div className="text-sm text-red-700">Failed</div>
            {progress.failedRecords > 0 && (
              <a
                href={`/admin/import/errors/${sessionId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 text-xs text-red-600 hover:text-red-800 underline block"
              >
                View Error Details →
              </a>
            )}
          </div>
        </div>

        {/* Estimated Completion */}
        {progress.estimatedCompletion && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-1">
              Estimated Completion
            </h4>
            <p className="text-sm text-gray-700">
              {progress.estimatedCompletion}
            </p>
          </div>
        )}
      </div>

      {/* Failed Records Table - Always show when completed */}
      {isCompleted && (
        <div className="mt-6">
          {failedRecords.length > 0 ? (
            <FailedRecordsTable failedRecords={failedRecords} />
          ) : progress && progress.failedRecords > 0 ? (
            <div className="border rounded-lg p-6 bg-yellow-50 dark:bg-yellow-950/20">
              <div className="flex items-center gap-2 mb-4">
                <svg
                  className="h-5 w-5 text-yellow-600 dark:text-yellow-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100">
                  Failed Records Detected ({progress.failedRecords})
                </h3>
              </div>
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-4">
                Some records failed to import. Detailed error information is not
                available in the current session. This can happen if the page
                was refreshed during import.
              </p>
              <div className="bg-white dark:bg-gray-900 rounded p-4 border">
                <h4 className="font-semibold mb-2">💡 To troubleshoot:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-gray-700 dark:text-gray-300">
                  <li>
                    Check the server logs if you have access (console output
                    during import)
                  </li>
                  <li>
                    Common issues: invalid email format, missing required
                    fields, duplicate IDs
                  </li>
                  <li>Re-run the import to see detailed errors in real-time</li>
                  <li>
                    Contact support if issues persist: errors are logged with
                    session ID: {sessionId}
                  </li>
                </ul>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
