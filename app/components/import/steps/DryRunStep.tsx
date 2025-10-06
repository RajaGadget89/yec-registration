"use client";

import { useState, useEffect } from "react";

interface DryRunStepProps {
  sessionId: string | null;
  dryRunResults: any;
  onDryRun: () => void;
  onNext: () => void;
  onBack: () => void;
  isLoading: boolean;
  error: string | null;
}

export function DryRunStep({
  sessionId,
  dryRunResults,
  onDryRun,
  onNext,
  onBack,
  isLoading,
  error,
}: DryRunStepProps) {
  const [hasRunDryRun, setHasRunDryRun] = useState(false);

  useEffect(() => {
    if (dryRunResults) {
      setHasRunDryRun(true);
    }
  }, [dryRunResults]);

  const handleDryRun = () => {
    onDryRun();
  };

  const handleNext = () => {
    onNext();
  };

  const handleBack = () => {
    onBack();
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds} seconds`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Dry Run Simulation
        </h2>
        <p className="text-gray-600">
          Run a simulation of the import process to see what will happen without
          making any actual changes.
        </p>
      </div>

      {/* Dry Run Instructions */}
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-blue-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              What is a Dry Run?
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                A dry run simulates the complete import process without making
                any actual changes to the database. This allows you to:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>See what tracking codes will be generated</li>
                <li>Preview badge generation</li>
                <li>Review email content samples</li>
                <li>Identify any potential issues</li>
                <li>Estimate processing time</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Dry Run Results */}
      {dryRunResults && (
        <div className="mb-6 space-y-6">
          {/* Summary */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Simulation Results
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-900">
                  {dryRunResults.validRecords || 0}
                </div>
                <div className="text-sm text-green-700">Valid Records</div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-900">
                  {dryRunResults.trackingCodes?.length || 0}
                </div>
                <div className="text-sm text-blue-700">Tracking Codes</div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-900">
                  {dryRunResults.badges?.length || 0}
                </div>
                <div className="text-sm text-purple-700">
                  Badges to Generate
                </div>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="text-2xl font-bold text-orange-900">
                  {dryRunResults.emails?.length || 0}
                </div>
                <div className="text-sm text-orange-700">Emails to Send</div>
              </div>
            </div>

            {/* Estimated Time */}
            {dryRunResults.estimatedTime && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Estimated Processing Time
                </h4>
                <p className="text-lg font-semibold text-gray-700">
                  {formatTime(dryRunResults.estimatedTime)}
                </p>
              </div>
            )}
          </div>

          {/* Sample Tracking Codes */}
          {dryRunResults.trackingCodes &&
            dryRunResults.trackingCodes.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Sample Tracking Codes
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {dryRunResults.trackingCodes
                    .slice(0, 9)
                    .map((code: string, index: number) => (
                      <div
                        key={index}
                        className="bg-gray-100 border border-gray-200 rounded px-3 py-2 text-sm font-mono"
                      >
                        {code}
                      </div>
                    ))}
                  {dryRunResults.trackingCodes.length > 9 && (
                    <div className="bg-gray-100 border border-gray-200 rounded px-3 py-2 text-sm text-gray-500">
                      +{dryRunResults.trackingCodes.length - 9} more...
                    </div>
                  )}
                </div>
              </div>
            )}

          {/* Sample Email Preview */}
          {dryRunResults.emailPreview && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Email Preview
              </h3>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-2">
                  <strong>To:</strong> {dryRunResults.emailPreview.recipient}
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  <strong>Subject:</strong> {dryRunResults.emailPreview.subject}
                </div>
                <div className="text-sm text-gray-800 whitespace-pre-wrap">
                  {dryRunResults.emailPreview.content}
                </div>
              </div>
            </div>
          )}

          {/* Warnings and Issues */}
          {dryRunResults.warnings && dryRunResults.warnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-yellow-900 mb-4">
                Potential Issues
              </h3>
              <div className="space-y-2">
                {dryRunResults.warnings.map(
                  (warning: string, index: number) => (
                    <div key={index} className="text-sm text-yellow-800">
                      • {warning}
                    </div>
                  ),
                )}
              </div>
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
              <h3 className="text-sm font-medium text-red-800">
                Dry Run Error
              </h3>
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
          onClick={handleBack}
          disabled={isLoading}
          className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Back
        </button>

        <div className="flex space-x-3">
          <button
            onClick={handleDryRun}
            disabled={isLoading}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {isLoading ? "Running Simulation..." : "Run Dry Run"}
          </button>

          <button
            onClick={handleNext}
            disabled={!hasRunDryRun || isLoading}
            className={`px-6 py-2 rounded-md font-medium ${
              hasRunDryRun && !isLoading
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            {isLoading ? "Processing..." : "Proceed to Execution"}
          </button>
        </div>
      </div>
    </div>
  );
}
