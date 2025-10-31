"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  Upload,
  FileSpreadsheet,
  FileText,
  CheckCircle,
  AlertCircle,
  XCircle,
  Download,
  X,
  Loader2,
} from "lucide-react";

interface ImportResult {
  success: boolean;
  inserted: number;
  updated: number;
  unchanged: number;
  errors: string[];
  message?: string;
  summary?: {
    totalProcessed: number;
    inserted: number;
    updated: number;
    unchanged: number;
    errors: number;
    perTable: Record<string, number>;
    dryRun?: boolean;
    errorRows?: Array<{ row: number; data: any; error: string }>;
  };
}

interface ImportDataProps {
  onImportComplete: (result: ImportResult) => void;
  onRefreshData: () => void;
}

export default function ImportData({
  onImportComplete,
  onRefreshData,
}: ImportDataProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDryRun, setIsDryRun] = useState(false);
  const [rowLimit, setRowLimit] = useState(0);
  const [fileType, setFileType] = useState<"excel" | "csv">("csv");
  const [liveTotal, setLiveTotal] = useState<number | null>(null);
  const [liveUpdatedAt, setLiveUpdatedAt] = useState<string | null>(null);
  const pollRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    const poll = async () => {
      try {
        const res = await fetch("/api/admin/seminar-management/import/stats", {
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        const total = data?.counts?.participants;
        if (typeof total === "number") {
          setLiveTotal(total);
          setLiveUpdatedAt(
            new Date(data.updatedAt || Date.now()).toLocaleTimeString(),
          );
        }
      } catch {}
    };
    // fire immediately, then every 2s
    poll();
    pollRef.current = window.setInterval(poll, 2000);
  }, []);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      window.clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!isUploading) {
      stopPolling();
    }
    return () => stopPolling();
  }, [isUploading, stopPolling]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileUpload = useCallback(
    async (file: File) => {
      // Validate file type based on selected file type
      const isValidFile =
        fileType === "excel"
          ? file.name.endsWith(".xlsx") ||
            file.type ===
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          : file.name.endsWith(".csv") || file.type === "text/csv";

      if (!isValidFile) {
        setError(
          `Please select a valid ${fileType.toUpperCase()} file (${fileType === "excel" ? ".xlsx" : ".csv"})`,
        );
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError("File size must be less than 10MB");
        return;
      }

      setIsUploading(true);
      setError(null);
      setImportResult(null);
      setUploadProgress(0);
      setLiveTotal(null);
      setLiveUpdatedAt(null);
      startPolling();

      try {
        const formData = new FormData();
        formData.append("file", file);

        // Simulate progress
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return 90;
            }
            return prev + 10;
          });
        }, 200);

        // Build URL with query parameters - use different endpoints for different file types
        const endpoint =
          fileType === "excel"
            ? "/api/admin/seminar-management/import"
            : "/api/admin/seminar-management/import-csv";

        const url = new URL(endpoint, window.location.origin);
        if (isDryRun) url.searchParams.set("dryRun", "true");
        if (rowLimit > 0) url.searchParams.set("rowLimit", rowLimit.toString());

        const response = await fetch(url.toString(), {
          method: "POST",
          body: formData,
        });

        clearInterval(progressInterval);
        setUploadProgress(100);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Import failed");
        }

        const result: ImportResult = await response.json();
        setImportResult(result);

        if (result.success) {
          onImportComplete(result);
          // Refresh data after successful import (only if not dry run)
          if (!isDryRun) {
            setTimeout(() => {
              onRefreshData();
            }, 1000);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Import failed");
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
        stopPolling();
      }
    },
    [
      fileType,
      isDryRun,
      rowLimit,
      onImportComplete,
      onRefreshData,
      startPolling,
      stopPolling,
    ],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      const validFile = files.find((file) => {
        if (fileType === "excel") {
          return (
            file.type ===
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
            file.name.endsWith(".xlsx")
          );
        } else {
          return file.type === "text/csv" || file.name.endsWith(".csv");
        }
      });

      if (validFile) {
        handleFileUpload(validFile);
      } else {
        setError(
          `Please select a valid ${fileType.toUpperCase()} file (${fileType === "excel" ? ".xlsx" : ".csv"})`,
        );
      }
    },
    [fileType, handleFileUpload],
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const downloadSampleTemplate = () => {
    if (fileType === "csv") {
      // For CSV, provide a note about using the Detail.csv file
      const note = `CSV Import Template

For CSV import, please use the Detail.csv file exported from your Excel source file.
This file contains all necessary data including:
- Participant information
- Accommodation details  
- Transportation data (outbound and return)
- Finance information
- Event participation

The Detail.csv file should contain all 51 columns as exported from the original Excel file.
Please ensure the file is saved as UTF-8 CSV format.`;

      const blob = new Blob([note], { type: "text/plain;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "csv_import_instructions.txt");
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Create a sample Excel template
      const sampleData = [
        [
          "คำนำหน้า",
          "ชื่อ-สกุล",
          "ตำแหน่ง",
          "ตำแหน่งผู้เข้าร่วมงาน",
          "จังหวัด",
          "ระบุภาค",
          "เพศ",
          "รหัส นง.",
          "Code",
          "โรงแรม/ที่พัก",
          "วันที่เข้า",
          "วันที่ออก",
          "ประเภทห้อง/เตียง",
          "20/11/2025",
          "21/11/2025",
          "22/11/2025",
          "23/11/2025",
          "วันที่ 21 พ.ย. 68",
          "วันที่ 22 พ.ย. 68",
          "วันที่ 23 พ.ย. 68",
          "ค่ากิจกรรม",
          "ค่าที่พัก",
          "ค่างานเลี้ยงภาคค่ำ",
          "สถานะชำระเงิน",
          "ขาไป",
          "ขากลับ",
        ],
        [
          "นาย",
          "สมชาย ใจดี",
          "ผู้จัดการ",
          "ผู้เข้าร่วม",
          "กรุงเทพฯ",
          "ภาคกลาง",
          "ชาย",
          "1.1",
          "TCC001",
          "โรงแรมบุรีศรีภู",
          "2025-11-20",
          "2025-11-23",
          "ประเภทห้อง/เตียง",
          "1",
          "1",
          "1",
          "0",
          "1",
          "1",
          "1",
          "2000",
          "1500",
          "500",
          "ชำระแล้ว",
          "รถบัส",
          "รถบัส",
        ],
        [
          "นาง",
          "สมหญิง รักดี",
          "รองผู้จัดการ",
          "ผู้เข้าร่วม",
          "เชียงใหม่",
          "ภาคเหนือ",
          "หญิง",
          "1.2",
          "TCC002",
          "โรงแรมบุรีศรีภู",
          "2025-11-20",
          "2025-11-23",
          "ห้องคู่",
          "1",
          "1",
          "1",
          "0",
          "1",
          "1",
          "0",
          "2000",
          "1200",
          "500",
          "ยังไม่ได้ชำระเงิน",
          "รถบัส",
          "รถบัส",
        ],
      ];

      // Convert to CSV for download
      const csvContent = sampleData.map((row) => row.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", "seminar_template.csv");
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const downloadErrorCSV = async () => {
    if (
      !importResult?.summary?.errorRows ||
      importResult.summary.errorRows.length === 0
    ) {
      setError("No error data available to download");
      return;
    }

    try {
      const response = await fetch(
        "/api/admin/seminar-management/import/errors",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            errorRows: importResult.summary.errorRows,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to generate error CSV");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `import-errors-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to download error CSV",
      );
    }
  };

  const clearResult = () => {
    setImportResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Import {fileType.toUpperCase()} Data
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={downloadSampleTemplate}
              className="flex items-center gap-2 px-3 py-2 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 border border-blue-300 dark:border-blue-600 rounded-md hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              <Download className="h-4 w-4" />
              {fileType === "csv"
                ? "Download Instructions"
                : "Download Template"}
            </button>
          </div>
        </div>

        {/* Import Options */}
        <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-md">
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isDryRun}
                onChange={(e) => setIsDryRun(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Dry Run (Preview only, no database changes)
              </span>
            </label>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700 dark:text-gray-300">
                Row Limit:
              </label>
              <input
                type="number"
                value={rowLimit || ""}
                onChange={(e) => setRowLimit(parseInt(e.target.value) || 0)}
                placeholder="0 = all rows"
                className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* File Type Selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            File Type
          </label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="fileType"
                value="csv"
                checked={fileType === "csv"}
                onChange={(e) => setFileType(e.target.value as "csv")}
                className="mr-2"
              />
              <FileText className="h-4 w-4 mr-1" />
              <span className="text-sm">CSV (Recommended)</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="fileType"
                value="excel"
                checked={fileType === "excel"}
                onChange={(e) => setFileType(e.target.value as "excel")}
                className="mr-2"
              />
              <FileSpreadsheet className="h-4 w-4 mr-1" />
              <span className="text-sm">Excel (.xlsx)</span>
            </label>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            CSV format is recommended for better performance and reliability
          </p>
        </div>

        {/* Upload Area */}
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragOver
              ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20"
              : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
          } ${isUploading ? "pointer-events-none opacity-50" : ""}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={fileType === "excel" ? ".xlsx" : ".csv"}
            onChange={handleFileSelect}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isUploading}
          />

          {isUploading ? (
            <div className="space-y-4">
              <Loader2 className="h-12 w-12 text-blue-600 dark:text-blue-400 mx-auto animate-spin" />
              <div className="space-y-2">
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  Processing {fileType.toUpperCase()} file...
                </p>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {uploadProgress}% complete
                </p>
                {/* Live stats moved out of progress zone */}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {fileType === "csv" ? (
                <FileText className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto" />
              ) : (
                <FileSpreadsheet className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto" />
              )}
              <div className="space-y-2">
                <p className="text-lg font-medium text-gray-900 dark:text-white">
                  Drop your {fileType.toUpperCase()} file here
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  or click to browse
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Supports {fileType === "excel" ? ".xlsx" : ".csv"} files up to
                  10MB
                </p>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <Upload className="h-4 w-4" />
                Choose File
              </button>
            </div>
          )}
        </div>

        {/* Live Import Stats (separate from progress to allow refresh) */}
        {isUploading && (
          <div className="mt-3 p-3 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
            <div className="text-xs text-gray-600 dark:text-gray-300">
              <span className="font-medium">Live participants inserted:</span>
              <span className="ml-1 text-gray-900 dark:text-white">
                {liveTotal ?? 0}
              </span>
              {liveUpdatedAt && (
                <span className="ml-2 text-gray-500 dark:text-gray-400">
                  (updated {liveUpdatedAt})
                </span>
              )}
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <div className="flex items-start gap-3">
              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-red-800 dark:text-red-400">
                  Import Failed
                </h4>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  {error}
                </p>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600 dark:hover:text-red-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Success Result Display */}
        {importResult && importResult.success && (
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
            <div className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-green-800 dark:text-green-400">
                  Import Successful
                  {importResult.summary?.dryRun ? " (DRY RUN)" : ""}
                </h4>
                <div className="text-sm text-green-700 dark:text-green-300 mt-2 space-y-1">
                  <p>✅ {importResult.inserted} new records inserted</p>
                  <p>🔄 {importResult.updated} records updated</p>
                  <p>⏭️ {importResult.unchanged} records unchanged</p>
                  {importResult.summary?.perTable && (
                    <div className="mt-2 p-2 bg-white dark:bg-gray-800 rounded border">
                      <p className="font-medium mb-1">Per Table Counts:</p>
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        {Object.entries(importResult.summary.perTable).map(
                          ([table, count]) => (
                            <div key={table} className="flex justify-between">
                              <span className="capitalize">{table}:</span>
                              <span>{count}</span>
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}
                  {importResult.summary?.errorRows &&
                    importResult.summary.errorRows.length > 0 && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-red-600 dark:text-red-400">
                          ⚠️ {importResult.summary.errorRows.length} errors
                          found
                        </span>
                        <button
                          onClick={downloadErrorCSV}
                          className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                        >
                          Download Error CSV
                        </button>
                      </div>
                    )}
                  {importResult.message && (
                    <p className="mt-2 font-medium">{importResult.message}</p>
                  )}
                </div>
              </div>
              <button
                onClick={clearResult}
                className="text-green-400 hover:text-green-600 dark:hover:text-green-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Error Result Display */}
        {importResult && !importResult.success && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-red-800 dark:text-red-400">
                  Import Completed with Errors
                </h4>
                <div className="text-sm text-red-700 dark:text-red-300 mt-2">
                  {importResult.message && (
                    <p className="mb-2">{importResult.message}</p>
                  )}
                  {importResult.errors.length > 0 && (
                    <div>
                      <p className="font-medium mb-1">Errors:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {importResult.errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={clearResult}
                className="text-red-400 hover:text-red-600 dark:hover:text-red-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-md">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
            Import Instructions
          </h4>
          <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
            <li>• Use the provided template format for best results</li>
            <li>• Required columns: ชื่อ-สกุล, จังหวัด, รหัส นง.</li>
            <li>• Dates should be in YYYY-MM-DD format</li>
            <li>• Payment status: ชำระแล้ว, ยังไม่ได้ชำระเงิน, or ฟรี</li>
            <li>• Existing records will be updated based on รหัส นง.</li>
            <li>• Checker Reference IDs will be auto-generated</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
