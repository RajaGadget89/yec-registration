"use client";

import { useState, useEffect } from "react";

interface ResultsStepProps {
  sessionId: string | null;
  executionResults: any;
  onReset: () => void;
  onSessionComplete: () => void;
}

export function ResultsStep({
  sessionId,
  executionResults,
  onReset,
  onSessionComplete,
}: ResultsStepProps) {
  const [isSuccess, setIsSuccess] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (executionResults) {
      setIsSuccess(executionResults.success || false);

      // Simulate progress animation
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 10;
        });
      }, 200);

      return () => clearInterval(interval);
    }
  }, [executionResults]);

  const handleReset = () => {
    onReset();
  };

  const handleViewSession = () => {
    onSessionComplete();
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds} seconds`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="p-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Import Results
        </h2>
        <p className="text-gray-600">
          {isSuccess
            ? "Import completed successfully!"
            : "Import completed with some issues."}
        </p>
      </div>

      {/* Success/Error Status */}
      <div
        className={`mb-8 rounded-lg p-6 ${
          isSuccess
            ? "bg-green-50 border border-green-200"
            : "bg-yellow-50 border border-yellow-200"
        }`}
      >
        <div className="flex items-center">
          <div className="flex-shrink-0">
            {isSuccess ? (
              <svg
                className="h-8 w-8 text-green-400"
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
              <svg
                className="h-8 w-8 text-yellow-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            )}
          </div>
          <div className="ml-3">
            <h3
              className={`text-lg font-medium ${
                isSuccess ? "text-green-800" : "text-yellow-800"
              }`}
            >
              {isSuccess ? "Import Successful" : "Import Completed with Issues"}
            </h3>
            <p
              className={`text-sm mt-1 ${
                isSuccess ? "text-green-700" : "text-yellow-700"
              }`}
            >
              {isSuccess
                ? "All records have been imported successfully with badges generated and emails sent."
                : "Some records may have failed. Please review the details below."}
            </p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>Import Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              isSuccess ? "bg-green-500" : "bg-yellow-500"
            }`}
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Results Summary */}
      {executionResults && (
        <div className="mb-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Import Summary
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-gray-900">
                {executionResults.totalRecords || 0}
              </div>
              <div className="text-sm text-gray-600">Total Records</div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-900">
                {executionResults.successfulRecords || 0}
              </div>
              <div className="text-sm text-green-700">Successful</div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-red-900">
                {executionResults.failedRecords || 0}
              </div>
              <div className="text-sm text-red-700">Failed</div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-900">
                {executionResults.badgesGenerated || 0}
              </div>
              <div className="text-sm text-blue-700">Badges Generated</div>
            </div>
          </div>

          {/* Processing Time */}
          {executionResults.processingTime && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                Processing Time
              </h4>
              <p className="text-lg font-semibold text-gray-700">
                {formatTime(executionResults.processingTime)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Generated Tracking Codes */}
      {executionResults?.trackingCodes &&
        executionResults.trackingCodes.length > 0 && (
          <div className="mb-8 bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Generated Tracking Codes
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {executionResults.trackingCodes
                .slice(0, 12)
                .map((code: string, index: number) => (
                  <div
                    key={index}
                    className="bg-gray-100 border border-gray-200 rounded px-3 py-2 text-sm font-mono"
                  >
                    {code}
                  </div>
                ))}
              {executionResults.trackingCodes.length > 12 && (
                <div className="bg-gray-100 border border-gray-200 rounded px-3 py-2 text-sm text-gray-500">
                  +{executionResults.trackingCodes.length - 12} more...
                </div>
              )}
            </div>
          </div>
        )}

      {/* Email Status */}
      {executionResults?.emailStatus && (
        <div className="mb-8 bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Email Status
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-900">
                {executionResults.emailStatus.queued || 0}
              </div>
              <div className="text-sm text-blue-700">Emails Queued</div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-green-900">
                {executionResults.emailStatus.sent || 0}
              </div>
              <div className="text-sm text-green-700">Emails Sent</div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="text-2xl font-bold text-yellow-900">
                {executionResults.emailStatus.pending || 0}
              </div>
              <div className="text-sm text-yellow-700">Pending</div>
            </div>
          </div>
        </div>
      )}

      {/* Errors and Warnings */}
      {executionResults?.errors && executionResults.errors.length > 0 && (
        <div className="mb-8 bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-red-900 mb-4">
            Errors Encountered
          </h3>
          <div className="space-y-2">
            {executionResults.errors
              .slice(0, 10)
              .map((error: any, index: number) => (
                <div key={index} className="text-sm text-red-700">
                  <span className="font-medium">Row {error.row}:</span>{" "}
                  {error.message}
                </div>
              ))}
            {executionResults.errors.length > 10 && (
              <div className="text-sm text-red-700 font-medium">
                ... and {executionResults.errors.length - 10} more errors
              </div>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-center space-x-4">
        <button
          onClick={handleReset}
          className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Start New Import
        </button>

        <button
          onClick={handleViewSession}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          View Import Session
        </button>
      </div>
    </div>
  );
}
