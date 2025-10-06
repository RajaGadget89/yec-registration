"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, AlertCircle, ChevronDown, ChevronRight } from "lucide-react";

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

interface FailedRecordsTableProps {
  failedRecords: FailedRecord[];
}

export function FailedRecordsTable({ failedRecords }: FailedRecordsTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [selectedRecords, setSelectedRecords] = useState<Set<number>>(
    new Set(),
  );

  if (failedRecords.length === 0) {
    return null;
  }

  const toggleRowExpanded = (rowNumber: number) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(rowNumber)) {
      newExpanded.delete(rowNumber);
    } else {
      newExpanded.add(rowNumber);
    }
    setExpandedRows(newExpanded);
  };

  const toggleSelectRecord = (rowNumber: number) => {
    const newSelected = new Set(selectedRecords);
    if (newSelected.has(rowNumber)) {
      newSelected.delete(rowNumber);
    } else {
      newSelected.add(rowNumber);
    }
    setSelectedRecords(newSelected);
  };

  const selectAll = () => {
    if (selectedRecords.size === failedRecords.length) {
      setSelectedRecords(new Set());
    } else {
      setSelectedRecords(new Set(failedRecords.map((r) => r.rowNumber)));
    }
  };

  const downloadErrorReport = () => {
    // Generate CSV from failed records
    const headers = [
      "Row",
      "Registration ID",
      "Name",
      "Email",
      "Phone",
      "Error Type",
      "Field",
      "Error Message",
      "Invalid Value",
    ];

    const rows = failedRecords.map((record) => [
      record.rowNumber,
      record.registrationId || "N/A",
      record.name,
      record.email,
      record.phone,
      record.error.constraint || record.error.code,
      record.error.field || "N/A",
      record.error.message,
      record.error.value || "N/A",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","),
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `import-errors-${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getErrorBadgeVariant = (constraint: string) => {
    if (constraint.includes("format")) return "destructive";
    if (constraint.includes("null")) return "default";
    if (constraint.includes("unique")) return "secondary";
    return "outline";
  };

  return (
    <div className="mt-8 border rounded-lg p-6 bg-red-50 dark:bg-red-950/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">
            Failed Records ({failedRecords.length})
          </h3>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={downloadErrorReport}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Download Error Report
          </Button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-lg overflow-hidden border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 border-b">
              <tr>
                <th className="px-4 py-3 text-left w-12">
                  <input
                    type="checkbox"
                    checked={selectedRecords.size === failedRecords.length}
                    onChange={selectAll}
                    className="rounded"
                  />
                </th>
                <th className="px-4 py-3 text-left w-16">Row</th>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Contact</th>
                <th className="px-4 py-3 text-left">Error</th>
                <th className="px-4 py-3 text-left w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {failedRecords.map((record) => (
                <>
                  <tr
                    key={record.rowNumber}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedRecords.has(record.rowNumber)}
                        onChange={() => toggleSelectRecord(record.rowNumber)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                      {record.rowNumber}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-gray-100">
                        {record.name}
                      </div>
                      {record.registrationId && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {record.registrationId}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs">
                        <div className="text-gray-900 dark:text-gray-100">
                          {record.email}
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">
                          {record.phone}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={getErrorBadgeVariant(record.error.constraint)}
                        className="mb-1"
                      >
                        {record.error.constraint || record.error.code}
                      </Badge>
                      <div className="text-xs text-gray-700 dark:text-gray-300 mt-1">
                        {record.error.message}
                      </div>
                      {record.error.field && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Field:{" "}
                          <span className="font-mono">
                            {record.error.field}
                          </span>
                          {record.error.value && (
                            <span className="ml-2">
                              Value:{" "}
                              <span className="font-mono">
                                &quot;{record.error.value}&quot;
                              </span>
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        onClick={() => toggleRowExpanded(record.rowNumber)}
                        variant="ghost"
                        size="sm"
                        className="gap-1"
                      >
                        {expandedRows.has(record.rowNumber) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        Details
                      </Button>
                    </td>
                  </tr>
                  {expandedRows.has(record.rowNumber) && (
                    <tr className="bg-gray-50 dark:bg-gray-800/50">
                      <td colSpan={6} className="px-4 py-4">
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-semibold text-sm mb-2 text-gray-900 dark:text-gray-100">
                              Technical Details
                            </h4>
                            <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-3 rounded overflow-x-auto text-gray-800 dark:text-gray-200">
                              {record.error.technicalDetails}
                            </pre>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h4 className="font-semibold text-sm mb-2 text-gray-900 dark:text-gray-100">
                                Original Data
                              </h4>
                              <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-3 rounded overflow-x-auto max-h-48 text-gray-800 dark:text-gray-200">
                                {JSON.stringify(record.originalData, null, 2)}
                              </pre>
                            </div>
                            <div>
                              <h4 className="font-semibold text-sm mb-2 text-gray-900 dark:text-gray-100">
                                Transformed Data
                              </h4>
                              <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-3 rounded overflow-x-auto max-h-48 text-gray-800 dark:text-gray-200">
                                {JSON.stringify(
                                  record.transformedData,
                                  null,
                                  2,
                                )}
                              </pre>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRecords.size > 0 && (
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            {selectedRecords.size} record(s) selected. You can export selected
            records or review them for manual correction.
          </p>
        </div>
      )}
    </div>
  );
}
