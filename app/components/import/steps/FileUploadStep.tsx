"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";

interface FileUploadStepProps {
  onFileUpload: (file: File) => void;
  isLoading: boolean;
  error: string | null;
}

export function FileUploadStep({
  onFileUpload,
  isLoading,
  error,
}: FileUploadStepProps) {
  const [_dragActive, _setDragActive] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles.length > 0) {
        onFileUpload(acceptedFiles[0]);
      }
    },
    [onFileUpload],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
    },
    maxFiles: 1,
    maxSize: 50 * 1024 * 1024, // 50MB
    disabled: isLoading,
  });

  return (
    <div className="p-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Upload Your File
        </h2>
        <p className="text-gray-600 mb-8">
          Upload a CSV or Excel file containing the Google Form registration
          data.
        </p>

        {/* File Upload Area */}
        <div
          {...getRootProps()}
          className={`relative border-2 border-dashed rounded-lg p-12 cursor-pointer transition-colors ${
            isDragActive
              ? "border-blue-400 bg-blue-50"
              : "border-gray-300 hover:border-gray-400"
          } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <input {...getInputProps()} />

          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>

            <div className="mt-4">
              <p className="text-lg font-medium text-gray-900">
                {isDragActive
                  ? "Drop your file here"
                  : "Drag and drop your file here"}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                or click to browse files
              </p>
            </div>

            <div className="mt-4">
              <p className="text-xs text-gray-500">
                Supported formats: CSV, XLS, XLSX (max 50MB)
              </p>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="mt-6 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Processing file...</span>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="mt-6 bg-red-50 border border-red-200 rounded-md p-4">
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
                  Upload Error
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* File Requirements */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-md p-4">
          <h3 className="text-sm font-medium text-blue-800 mb-2">
            File Requirements
          </h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• File must be in CSV, XLS, or XLSX format</li>
            <li>• Maximum file size: 50MB</li>
            <li>• File should contain Thai character encoding (UTF-8)</li>
            <li>
              • Required columns: ชื่อ, นามสกุล, เบอร์โทรศัพท์, สมาชิกหอการค้า /
              YEC จังหวัด?
            </li>
            <li>
              • Optional columns: Line ID, ประเภทธุรกิจ, ชื่อกิจการ หรือ บริษัท,
              etc.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
