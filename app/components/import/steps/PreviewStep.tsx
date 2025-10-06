"use client";

import { useState, useEffect } from "react";

interface PreviewStepProps {
  sessionId: string | null;
  mappedData: any[];
  validationResults: any;
  onPreview: () => void;
  onNext: () => void;
  onBack: () => void;
  isLoading: boolean;
  error: string | null;
}

export function PreviewStep({
  sessionId,
  mappedData,
  validationResults,
  onPreview,
  onNext,
  onBack,
  isLoading,
  error,
}: PreviewStepProps) {
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [autoTriggered, setAutoTriggered] = useState(false);

  useEffect(() => {
    console.log("=== PreviewStep useEffect ===");
    console.log("validationResults changed:", validationResults);
    if (validationResults) {
      console.log("Validation results received:", {
        success: validationResults.success,
        validRecords: validationResults.validRecords,
        invalidRecords: validationResults.invalidRecords,
        totalRecords: validationResults.totalRecords,
        mappedRecordsLength: validationResults.mappedRecords?.length,
        errorsCount: validationResults.errors?.length,
        warningsCount: validationResults.warnings?.length,
        allColumnsLength: validationResults.allColumns?.length,
        debug: validationResults.debug,
      });
      console.log(
        "Mapped records sample:",
        validationResults.mappedRecords?.slice(0, 2),
      );
      console.log("Available columns:", validationResults.allColumns);
      setPreviewData(validationResults.mappedRecords || []);
      // Hide helper/derived columns that are not part of the DB schema
      const hiddenHelperColumns = new Set<string>(["in_quota_room_type"]);
      const filteredColumns = (validationResults.allColumns || []).filter(
        (c: string) => !hiddenHelperColumns.has(c),
      );
      setAvailableColumns(filteredColumns);
      setShowPreview(true);
      console.log(
        "Preview data set with",
        validationResults.mappedRecords?.length || 0,
        "records",
      );
      console.log(
        "Available columns set with",
        validationResults.allColumns?.length || 0,
        "columns",
      );
    }
  }, [validationResults]);

  const handlePreview = () => {
    onPreview();
  };

  const handleNext = () => {
    onNext();
  };
  const handleBack = () => {
    onBack();
  };

  // Export mapping from the current session (uses server export API)
  const handleExportMapping = async () => {
    if (!sessionId) return;
    try {
      const res = await fetch(
        `/api/admin/import/mapping/export?sessionId=${sessionId}`,
      );
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mapping-${sessionId}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (_) {
      // swallow
    }
  };

  // Export preview data to CSV
  const handleExportPreview = () => {
    if (!previewData || previewData.length === 0) {
      alert("No data to export");
      return;
    }

    try {
      // Create CSV headers from available columns
      const headers = availableColumns;

      // Convert data to CSV format
      const csvContent = [
        headers.join(","),
        ...previewData.map((record: any) =>
          headers
            .map((header: string) => {
              const value = record[header];
              // Handle different data types
              let stringValue = "";
              if (value === null || value === undefined) {
                stringValue = "";
              } else if (typeof value === "object") {
                // Handle JSON objects (like review_checklist)
                stringValue = JSON.stringify(value);
              } else {
                stringValue = String(value);
              }

              // Escape commas, quotes, and newlines in CSV
              if (
                stringValue.includes(",") ||
                stringValue.includes('"') ||
                stringValue.includes("\n")
              ) {
                return `"${stringValue.replace(/"/g, '""')}"`;
              }
              return stringValue;
            })
            .join(","),
        ),
      ].join("\n");

      // Create and download the file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `import-preview-${sessionId}-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting CSV:", error);
      alert("Failed to export CSV");
    }
  };

  // Auto-validate when entering Step 3 if no results yet
  useEffect(() => {
    if (!autoTriggered && sessionId && !validationResults && !isLoading) {
      setAutoTriggered(true);
      onPreview();
    }
  }, [sessionId, validationResults, isLoading, onPreview, autoTriggered]);

  const _getValidationStatus = (field: string, value: any) => {
    if (!validationResults?.errors) return "valid";

    const fieldErrors = validationResults.errors.filter(
      (error: any) => error.field === field && error.value === value,
    );

    return fieldErrors.length > 0 ? "invalid" : "valid";
  };

  const _getErrorCount = () => {
    return validationResults?.errors?.length || 0;
  };

  const getWarningCount = () => {
    return validationResults?.warnings?.length || 0;
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Database Destination Preview
        </h2>
        <p className="text-gray-600">
          Review the transformed data exactly as it will appear in the
          registrations table. This is your final destination view before
          database insertion.
        </p>
      </div>

      {/* Validation Summary */}
      {validationResults && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
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
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-800">
                  Valid Records
                </p>
                <p className="text-2xl font-bold text-green-900">
                  {validationResults.validRecords || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-8 w-8 text-red-400"
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
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-800">
                  Invalid Records
                </p>
                <p className="text-2xl font-bold text-red-900">
                  {validationResults.invalidRecords || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
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
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-yellow-800">Warnings</p>
                <p className="text-2xl font-bold text-yellow-900">
                  {getWarningCount()}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Validation Errors */}
      {validationResults?.errors && validationResults.errors.length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
          <h3 className="text-sm font-medium text-red-800 mb-2">
            Validation Errors
          </h3>
          <div className="space-y-2">
            {validationResults.errors
              .slice(0, 10)
              .map((error: any, index: number) => (
                <div key={index} className="text-sm text-red-700">
                  <span className="font-medium">Row {error.row}:</span>{" "}
                  {error.message}
                  {error.value && (
                    <span className="text-gray-600">
                      {" "}
                      (Value: {error.value})
                    </span>
                  )}
                </div>
              ))}
            {validationResults.errors.length > 10 && (
              <div className="text-sm text-red-700 font-medium">
                ... and {validationResults.errors.length - 10} more errors
              </div>
            )}
          </div>
        </div>
      )}

      {/* Validation Warnings */}
      {validationResults?.warnings && validationResults.warnings.length > 0 && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <h3 className="text-sm font-medium text-yellow-800 mb-2">
            Validation Warnings
          </h3>
          <div className="space-y-2">
            {validationResults.warnings
              .slice(0, 5)
              .map((warning: string, index: number) => (
                <div key={index} className="text-sm text-yellow-700">
                  {warning}
                </div>
              ))}
            {validationResults.warnings.length > 5 && (
              <div className="text-sm text-yellow-700 font-medium">
                ... and {validationResults.warnings.length - 5} more warnings
              </div>
            )}
          </div>
        </div>
      )}

      {/* Data Preview Table - ALL Records with Scrolling */}
      {showPreview && previewData.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Database Destination View - All Records:{" "}
            {validationResults?.totalRecords || previewData.length}
          </h3>
          <div className="bg-green-50 border border-green-200 rounded-md p-3 mb-4">
            <div className="flex items-center">
              <svg
                className="h-5 w-5 text-green-400 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <p className="text-sm text-green-800 font-medium">
                  🎯 COMPLETE DATABASE DESTINATION VIEW: This shows ALL columns
                  that will exist in the registrations table.
                </p>
                <p className="text-sm text-green-700 mt-1">
                  Includes: User-mapped columns + Complete database schema +
                  System fields + Pricing fields + Status fields.
                </p>
                <p className="text-sm text-green-600 mt-1">
                  Total columns: {availableColumns.length} (matches real
                  database structure)
                </p>
              </div>
            </div>
          </div>

          {/* Scrollable Container */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-auto max-h-96">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0 z-10">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-20">
                      Row
                    </th>
                    {availableColumns.map((column: string) => (
                      <th
                        key={column}
                        className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {column
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (l) => l.toUpperCase())}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {previewData.map((record: any, index: number) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 sticky left-0 bg-white z-10 font-medium">
                        {index + 1}
                      </td>
                      {availableColumns.map((column: string) => (
                        <td
                          key={column}
                          className="px-3 py-2 whitespace-nowrap text-sm text-gray-900"
                        >
                          {column === "is_valid" ? (
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                record[column]
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {record[column] ? "Valid" : "Invalid"}
                            </span>
                          ) : column === "validation_errors" ||
                            column === "validation_warnings" ? (
                            <span className="text-xs text-gray-500">
                              {Array.isArray(record[column])
                                ? record[column].length
                                : 0}{" "}
                              items
                            </span>
                          ) : column === "review_checklist" ||
                            column === "form_data" ||
                            column === "price_breakdown" ? (
                            <span className="text-xs text-blue-600 font-mono">
                              {typeof record[column] === "object"
                                ? "JSON Object"
                                : record[column] || "-"}
                            </span>
                          ) : column === "chamber_card_url" ||
                            column === "profile_image_url" ||
                            column === "payment_slip_url" ||
                            column === "badge_url" ? (
                            <span className="text-xs text-green-600">
                              {record[column] ? (
                                <a
                                  href={record[column]}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 underline"
                                >
                                  View File
                                </a>
                              ) : (
                                "No file"
                              )}
                            </span>
                          ) : column === "created_at" ||
                            column === "updated_at" ? (
                            <span className="text-xs text-gray-500">
                              {record[column]
                                ? new Date(record[column]).toLocaleString()
                                : "-"}
                            </span>
                          ) : (
                            <span className="text-xs">
                              {(() => {
                                const v = record[column];
                                if (typeof v === "boolean")
                                  return v ? "TRUE" : "FALSE";
                                if (typeof v === "object")
                                  return JSON.stringify(v);
                                return v ?? "-";
                              })()}
                            </span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Show message if no preview data */}
      {!showPreview && !isLoading && (
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
                Ready to Preview Data
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  Click &quot;Validate Data&quot; to see a preview of the mapped
                  data that will be imported.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Debug information - Client-side only */}
      {typeof window !== "undefined" &&
        process.env.NODE_ENV === "development" && (
          <div className="mb-6 bg-gray-50 border border-gray-200 rounded-md p-4">
            <h4 className="text-sm font-medium text-gray-800 mb-2">
              Debug Info
            </h4>
            <div className="text-xs text-gray-600 space-y-1">
              <p>showPreview: {showPreview.toString()}</p>
              <p>previewData.length: {previewData.length}</p>
              <p>
                validationResults:{" "}
                {validationResults ? "Available" : "Not available"}
              </p>
              <p>mappedData.length: {mappedData.length}</p>
              {validationResults && (
                <>
                  <p>
                    validationResults.mappedRecords.length:{" "}
                    {validationResults.mappedRecords?.length || 0}
                  </p>
                  <p>
                    validationResults.validRecords:{" "}
                    {validationResults.validRecords}
                  </p>
                  <p>
                    validationResults.invalidRecords:{" "}
                    {validationResults.invalidRecords}
                  </p>
                  <p>
                    validationResults.totalRecords:{" "}
                    {validationResults.totalRecords}
                  </p>
                  <p>Available columns count: {availableColumns.length}</p>
                  <p>Available columns: {availableColumns.join(", ")}</p>
                  {validationResults.debug && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded">
                      <div className="font-medium text-blue-800">
                        Complete Database Schema Debug Info:
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          Original Data Length:{" "}
                          {validationResults.debug.originalDataLength}
                        </div>
                        <div>
                          Transformed Data Length:{" "}
                          {validationResults.debug.transformedDataLength}
                        </div>
                        <div>
                          Records Match:{" "}
                          {validationResults.debug.recordsMatch ? "Yes" : "No"}
                        </div>
                        <div>
                          Mapping Config Used:{" "}
                          {validationResults.debug.mappingConfigUsed
                            ? "Yes"
                            : "No"}
                        </div>
                        <div>
                          Total Columns:{" "}
                          {validationResults.debug.dynamicColumnsGenerated}
                        </div>
                        <div>
                          Database Columns:{" "}
                          {validationResults.debug.totalDatabaseColumns}
                        </div>
                        <div>
                          User Mappings:{" "}
                          {validationResults.debug.userMappingsCount}
                        </div>
                        <div>
                          Complete Schema:{" "}
                          {validationResults.debug.completeDatabaseSchema
                            ? "Yes"
                            : "No"}
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-blue-600">
                        Available Columns: {availableColumns.join(", ")}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
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
                Preview Error
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <button
          onClick={handleBack}
          disabled={isLoading}
          className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {isLoading ? "..." : "Back"}
        </button>

        {/* Export mapping appears here in Preview step */}
        <button
          onClick={handleExportMapping}
          disabled={!sessionId || isLoading}
          className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Export Mapping
        </button>

        <button
          onClick={handleExportPreview}
          disabled={!previewData || previewData.length === 0 || isLoading}
          className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Export Preview CSV
        </button>

        <button
          onClick={handlePreview}
          disabled={isLoading}
          className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {isLoading ? "Validating..." : "Validate Data"}
        </button>

        <button
          onClick={handleNext}
          disabled={!validationResults || isLoading}
          className={`px-6 py-2 rounded-md font-medium ${
            validationResults && !isLoading
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          {isLoading ? "Processing..." : "Continue to Dry Run"}
        </button>
      </div>
    </div>
  );
}
