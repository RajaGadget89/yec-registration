"use client";

import { useState } from "react";

interface ExecutionStepProps {
  sessionId: string | null;
  dryRunResults: any;
  onExecute: () => void;
  onBack: () => void;
  isLoading: boolean;
  error: string | null;
}

export function ExecutionStep({
  sessionId,
  dryRunResults,
  onExecute,
  onBack,
  isLoading,
  error,
}: ExecutionStepProps) {
  const [confirmed, setConfirmed] = useState(false);

  const handleExecute = () => {
    onExecute();
  };

  const handleBack = () => {
    onBack();
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Execute Import
        </h2>
        <p className="text-gray-600">
          This will perform the actual import operation. Make sure you have
          reviewed the dry run results.
        </p>
      </div>

      {/* Dry Run Results Summary */}
      {dryRunResults && (
        <div className="mb-6 bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Dry Run Results Summary
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
              <div className="text-sm text-purple-700">Badges to Generate</div>
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
                {dryRunResults.estimatedTime < 60
                  ? `${dryRunResults.estimatedTime} seconds`
                  : `${Math.floor(dryRunResults.estimatedTime / 60)}m ${dryRunResults.estimatedTime % 60}s`}
              </p>
            </div>
          )}

          {/* Sample Tracking Codes */}
          {dryRunResults.trackingCodes &&
            dryRunResults.trackingCodes.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">
                  Sample Tracking Codes
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                  {dryRunResults.trackingCodes
                    .slice(0, 6)
                    .map((code: string, index: number) => (
                      <div
                        key={index}
                        className="bg-gray-100 border border-gray-200 rounded px-3 py-2 text-sm font-mono"
                      >
                        {code}
                      </div>
                    ))}
                  {dryRunResults.trackingCodes.length > 6 && (
                    <div className="bg-gray-100 border border-gray-200 rounded px-3 py-2 text-sm text-gray-500">
                      +{dryRunResults.trackingCodes.length - 6} more...
                    </div>
                  )}
                </div>
              </div>
            )}

          {/* Warnings */}
          {dryRunResults.warnings && dryRunResults.warnings.length > 0 && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-yellow-900 mb-2">
                Potential Issues
              </h4>
              <div className="space-y-1">
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

      {/* Confirmation Checklist */}
      <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-md p-6">
        <h3 className="text-lg font-medium text-yellow-900 mb-4">
          Pre-Execution Checklist
        </h3>
        <div className="space-y-3">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-3 text-sm text-yellow-800">
              I have reviewed the dry run results and understand what will
              happen
            </span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-3 text-sm text-yellow-800">
              I understand that this will create actual registrations in the
              system
            </span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-3 text-sm text-yellow-800">
              I understand that badges will be generated and emails will be sent
            </span>
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <span className="ml-3 text-sm text-yellow-800">
              I have a rollback plan if something goes wrong
            </span>
          </label>
        </div>
      </div>

      {/* Execution Warning */}
      <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-red-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Important Warning
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>This action will:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Create new registrations in the database</li>
                <li>Generate tracking codes and badges</li>
                <li>Send congratulation emails to all imported users</li>
                <li>
                  Process Google Drive files and upload to Supabase storage
                </li>
                <li>Set all imported users to approved status</li>
              </ul>
              <p className="mt-2 font-medium">
                This operation cannot be easily undone. Make sure you are ready
                to proceed.
              </p>
            </div>
          </div>
        </div>
      </div>

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
                Execution Error
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

        <button
          onClick={handleExecute}
          disabled={!confirmed || isLoading}
          className={`px-8 py-3 rounded-md font-medium text-lg ${
            confirmed && !isLoading
              ? "bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          {isLoading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
              Executing Import...
            </div>
          ) : (
            "Execute Import"
          )}
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
            <div>
              <h4 className="text-sm font-medium text-blue-800">
                Import in Progress
              </h4>
              <p className="text-sm text-blue-700 mt-1">
                Please wait while the import is being processed. This may take
                several minutes.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
