"use client";

import { useState, useEffect } from "react";
import {
  X,
  Download,
  FileSpreadsheet,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface ExportOptions {
  availableColumns: Array<{
    key: string;
    label: string;
    category: string;
  }>;
  filterOptions: {
    provinces: string[];
    hotels: string[];
    events: string[];
    paymentStatuses: string[];
  };
  formats: Array<{
    key: string;
    label: string;
    description: string;
  }>;
  scopes: Array<{
    key: string;
    label: string;
    description: string;
  }>;
}

interface ExportModalProps {
  filters: any;
  selectedParticipantIds?: number[];
  onClose: () => void;
}

export default function ExportModal({
  filters,
  selectedParticipantIds = [],
  onClose,
}: ExportModalProps) {
  const [exportOptions, setExportOptions] = useState<ExportOptions | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Export settings
  const [format, setFormat] = useState<"excel" | "csv">("excel");
  const [scope, setScope] = useState<"all" | "filtered">("filtered");
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["Basic Info"]),
  );

  // Load export options on mount
  useEffect(() => {
    loadExportOptions();
  }, []);

  const loadExportOptions = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/seminar-management/export");

      if (!response.ok) {
        throw new Error("Failed to load export options");
      }

      const options = await response.json();
      setExportOptions(options);

      // Set default selected columns (basic info + contact)
      const defaultColumns = options.availableColumns
        .filter((col: any) =>
          ["Basic Info", "Contact Info"].includes(col.category),
        )
        .map((col: any) => col.key);
      setSelectedColumns(defaultColumns);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load export options",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      setError(null);

      const response = await fetch("/api/admin/seminar-management/export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          format,
          scope,
          columns: selectedColumns,
          filters: scope === "filtered" ? filters : {},
          participantIds:
            selectedParticipantIds.length > 0
              ? selectedParticipantIds
              : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Export failed");
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get("Content-Disposition");
      const filename = contentDisposition
        ? contentDisposition.split("filename=")[1]?.replace(/"/g, "")
        : `seminar_participants_${scope}_${new Date().toISOString().slice(0, 10)}.${format === "excel" ? "xlsx" : "csv"}`;

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Close modal on success
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleColumn = (columnKey: string) => {
    setSelectedColumns((prev) =>
      prev.includes(columnKey)
        ? prev.filter((key) => key !== columnKey)
        : [...prev, columnKey],
    );
  };

  const selectAllInCategory = (category: string) => {
    if (!exportOptions) return;

    const categoryColumns = exportOptions.availableColumns
      .filter((col) => col.category === category)
      .map((col) => col.key);

    const allSelected = categoryColumns.every((col) =>
      selectedColumns.includes(col),
    );

    if (allSelected) {
      // Deselect all in category
      setSelectedColumns((prev) =>
        prev.filter((key) => !categoryColumns.includes(key)),
      );
    } else {
      // Select all in category
      setSelectedColumns((prev) => [...new Set([...prev, ...categoryColumns])]);
    }
  };

  const selectAllColumns = () => {
    if (!exportOptions) return;

    const allColumns = exportOptions.availableColumns.map((col) => col.key);
    const allSelected = allColumns.every((col) =>
      selectedColumns.includes(col),
    );

    if (allSelected) {
      setSelectedColumns([]);
    } else {
      setSelectedColumns(allColumns);
    }
  };

  const getCategoryColumns = (category: string) => {
    if (!exportOptions) return [];
    return exportOptions.availableColumns.filter(
      (col) => col.category === category,
    );
  };

  const getCategories = () => {
    if (!exportOptions) return [];
    return [
      ...new Set(exportOptions.availableColumns.map((col) => col.category)),
    ];
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-3 text-lg font-medium text-gray-900 dark:text-white">
              Loading export options...
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (!exportOptions) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center justify-center text-red-600">
            <AlertCircle className="h-8 w-8" />
            <span className="ml-3 text-lg font-medium">
              Failed to load export options
            </span>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Download className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Export Participants
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Choose format, scope, and columns to export
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="space-y-6">
            {/* Format Selection */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                Export Format
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {exportOptions.formats.map((formatOption) => (
                  <label
                    key={formatOption.key}
                    className={`relative flex items-start p-4 border rounded-lg cursor-pointer transition-colors ${
                      format === formatOption.key
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                    }`}
                  >
                    <input
                      type="radio"
                      name="format"
                      value={formatOption.key}
                      checked={format === formatOption.key}
                      onChange={(e) =>
                        setFormat(e.target.value as "excel" | "csv")
                      }
                      className="sr-only"
                    />
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        {formatOption.key === "excel" ? (
                          <FileSpreadsheet className="h-5 w-5 text-green-600 dark:text-green-400" />
                        ) : (
                          <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {formatOption.label}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {formatOption.description}
                        </div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Scope Selection */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                Export Scope
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {exportOptions.scopes.map((scopeOption) => (
                  <label
                    key={scopeOption.key}
                    className={`relative flex items-start p-4 border rounded-lg cursor-pointer transition-colors ${
                      scope === scopeOption.key
                        ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                        : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                    }`}
                  >
                    <input
                      type="radio"
                      name="scope"
                      value={scopeOption.key}
                      checked={scope === scopeOption.key}
                      onChange={(e) =>
                        setScope(e.target.value as "all" | "filtered")
                      }
                      className="sr-only"
                    />
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {scopeOption.label}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {scopeOption.description}
                        </div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Column Selection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Select Columns
                </h3>
                <button
                  onClick={selectAllColumns}
                  className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  {exportOptions.availableColumns.every((col) =>
                    selectedColumns.includes(col.key),
                  )
                    ? "Deselect All"
                    : "Select All"}
                </button>
              </div>

              <div className="space-y-2">
                {getCategories().map((category) => {
                  const categoryColumns = getCategoryColumns(category);
                  const isExpanded = expandedCategories.has(category);
                  const selectedInCategory = categoryColumns.filter((col) =>
                    selectedColumns.includes(col.key),
                  ).length;
                  const allSelectedInCategory =
                    selectedInCategory === categoryColumns.length;

                  return (
                    <div
                      key={category}
                      className="border border-gray-200 dark:border-gray-600 rounded-lg"
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => toggleCategory(category)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            toggleCategory(category);
                          }
                        }}
                        className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-gray-900 dark:text-white">
                            {category}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            ({selectedInCategory}/{categoryColumns.length})
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              selectAllInCategory(category);
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            {allSelectedInCategory
                              ? "Deselect All"
                              : "Select All"}
                          </button>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-3 pb-3 space-y-2">
                          {categoryColumns.map((column) => (
                            <label
                              key={column.key}
                              className="flex items-center gap-2 text-sm"
                            >
                              <input
                                type="checkbox"
                                checked={selectedColumns.includes(column.key)}
                                onChange={() => toggleColumn(column.key)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                              />
                              <span className="text-gray-700 dark:text-gray-300">
                                {column.label}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <span className="text-sm text-red-800 dark:text-red-400">
                    {error}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {selectedColumns.length} column
            {selectedColumns.length !== 1 ? "s" : ""} selected
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={exporting}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleExport}
              disabled={exporting || selectedColumns.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Export
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
