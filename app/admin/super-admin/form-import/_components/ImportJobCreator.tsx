"use client";

import { useState } from "react";
import { FormType } from "../../../../types/form-system";
import { Upload, AlertCircle, CheckCircle } from "lucide-react";

interface ImportJobCreatorProps {
  form: FormType;
  onJobCreated: () => void;
}

interface FieldMapping {
  [importField: string]: string;
}

export default function ImportJobCreator({
  form,
  onJobCreated,
}: ImportJobCreatorProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [fieldMapping, setFieldMapping] = useState<FieldMapping>({});
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"upload" | "mapping" | "confirm">("upload");
  const [error, setError] = useState<string | null>(null);

  // Sample form fields based on form configuration
  const formFields = [
    "name",
    "email",
    "phone",
    "company",
    "organization",
    "department",
    "position",
    "address",
    "city",
    "province",
    "postal_code",
    "country",
  ];

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError(null);

    try {
      setLoading(true);

      // Create FormData for file upload
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("form_key", form.form_key);

      // Upload file and get preview
      const response = await fetch(
        "/api/admin/super-admin/form-import/preview",
        {
          method: "POST",
          body: formData,
        },
      );

      if (response.ok) {
        const data = await response.json();
        setPreviewData(data.preview || []);
        setStep("mapping");
      } else {
        const error = await response.json();
        setError(error.message || "Failed to process file");
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      setError("Error uploading file");
    } finally {
      setLoading(false);
    }
  };

  const handleMappingChange = (importField: string, formField: string) => {
    setFieldMapping((prev) => ({
      ...prev,
      [importField]: formField,
    }));
  };

  const handleStartImport = async () => {
    if (!file) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/admin/super-admin/form-import/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          form_key: form.form_key,
          file_name: file.name,
          file_size: file.size,
          field_mapping: fieldMapping,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          onJobCreated();
          setStep("upload");
          setFile(null);
          setPreviewData([]);
          setFieldMapping({});
        } else {
          setError(data.message || "Failed to start import");
        }
      } else {
        const error = await response.json();
        setError(error.message || "Failed to start import");
      }
    } catch (error) {
      console.error("Error starting import:", error);
      setError("Error starting import");
    } finally {
      setLoading(false);
    }
  };

  const _getAvailableFormFields = (importField: string) => {
    const usedFields = Object.values(fieldMapping);
    return formFields.filter(
      (field) =>
        field !== fieldMapping[importField] && !usedFields.includes(field),
    );
  };

  const getUnmappedImportFields = () => {
    if (previewData.length === 0) return [];
    const headers = Object.keys(previewData[0] || {});
    return headers.filter((header) => !fieldMapping[header]);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Create Import Job
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Import registrations for {form.name} from a CSV or Excel file
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700 dark:text-red-300">{error}</span>
          </div>
        </div>
      )}

      {/* Step 1: File Upload */}
      {step === "upload" && (
        <div className="space-y-6">
          <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Upload CSV or Excel File
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Select a file containing registration data to import
            </p>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              disabled={loading}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-yec-primary file:text-white hover:file:bg-yec-accent"
            />
            {loading && (
              <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                Processing file...
              </div>
            )}
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
              File Requirements
            </h4>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• Supported formats: CSV, Excel (.xlsx, .xls)</li>
              <li>• Maximum file size: 10MB</li>
              <li>• First row should contain column headers</li>
              <li>
                • Required fields: name, email (will be mapped in next step)
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Step 2: Field Mapping */}
      {step === "mapping" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Map Import Fields to Form Fields
            </h3>
            <button
              onClick={() => setStep("upload")}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              ← Back to Upload
            </button>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Preview Data (First 3 rows)
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-600">
                    {Object.keys(previewData[0] || {}).map((header) => (
                      <th
                        key={header}
                        className="text-left py-2 px-3 font-medium text-gray-700 dark:text-gray-300"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.slice(0, 3).map((row, index) => (
                    <tr
                      key={index}
                      className="border-b border-gray-200 dark:border-gray-600"
                    >
                      {Object.values(row).map((value, cellIndex) => (
                        <td
                          key={cellIndex}
                          className="py-2 px-3 text-gray-600 dark:text-gray-400"
                        >
                          {String(value)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Field Mapping
            </h4>
            {Object.keys(previewData[0] || {}).map((importField) => (
              <div key={importField} className="flex items-center space-x-4">
                <div className="w-1/3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {importField}
                  </label>
                </div>
                <div className="w-1/3">
                  <select
                    value={fieldMapping[importField] || ""}
                    onChange={(e) =>
                      handleMappingChange(importField, e.target.value)
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-yec-primary focus:border-transparent"
                  >
                    <option value="">Select form field...</option>
                    {formFields.map((formField) => (
                      <option key={formField} value={formField}>
                        {formField}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-1/3">
                  {fieldMapping[importField] && (
                    <span className="text-sm text-green-600 dark:text-green-400 flex items-center">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Mapped
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {getUnmappedImportFields().length > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                Unmapped Fields
              </h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                The following import fields are not mapped:{" "}
                {getUnmappedImportFields().join(", ")}
              </p>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setStep("upload")}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => setStep("confirm")}
              disabled={Object.keys(fieldMapping).length === 0}
              className="px-4 py-2 bg-yec-primary text-white rounded-lg hover:bg-yec-accent disabled:opacity-50 transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Confirm Import */}
      {step === "confirm" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Confirm Import
            </h3>
            <button
              onClick={() => setStep("mapping")}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            >
              ← Back to Mapping
            </button>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Import Summary
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">File:</span>
                <span className="text-gray-900 dark:text-white">
                  {file?.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Form:</span>
                <span className="text-gray-900 dark:text-white">
                  {form.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  Total Rows:
                </span>
                <span className="text-gray-900 dark:text-white">
                  {previewData.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">
                  Mapped Fields:
                </span>
                <span className="text-gray-900 dark:text-white">
                  {Object.keys(fieldMapping).length}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
              What happens next?
            </h4>
            <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
              <li>• Import job will be created and queued for processing</li>
              <li>• Each row will be validated and processed individually</li>
              <li>• Tracking IDs will be generated automatically</li>
              <li>• You can monitor progress in the Import Jobs tab</li>
            </ul>
          </div>

          <div className="flex justify-end space-x-3">
            <button
              onClick={() => setStep("mapping")}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleStartImport}
              disabled={loading}
              className="px-4 py-2 bg-yec-primary text-white rounded-lg hover:bg-yec-accent disabled:opacity-50 transition-colors"
            >
              {loading ? "Starting Import..." : "Start Import"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
