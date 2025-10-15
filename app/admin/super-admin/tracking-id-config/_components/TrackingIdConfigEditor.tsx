"use client";

import { useState, useEffect } from "react";
import { FormType } from "@/app/types/form-system";

interface TrackingIdConfig {
  prefix: string;
  sequence_start: number;
  sequence_length: number;
  format: string;
  is_active: boolean;
}

interface TrackingIdConfigEditorProps {
  form: FormType;
  onClose: () => void;
  onSave: () => void;
}

export default function TrackingIdConfigEditor({
  form,
  onClose,
  onSave,
}: TrackingIdConfigEditorProps) {
  const [config, setConfig] = useState<TrackingIdConfig>({
    prefix: form.form_key.toUpperCase().substring(0, 3),
    sequence_start: 1,
    sequence_length: 6,
    format: "PREFIX-000000",
    is_active: true,
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    loadExistingConfig();
  }, [form]);

  const loadExistingConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/super-admin/tracking-id-config/${form.form_key}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.config) {
          setConfig(data.config);
        }
      }
    } catch (error) {
      console.error("Failed to load tracking config:", error);
    } finally {
      setLoading(false);
    }
  };

  const validateConfig = (config: TrackingIdConfig): string[] => {
    const errors: string[] = [];

    if (!config.prefix || config.prefix.trim() === "") {
      errors.push("Prefix is required");
    }

    if (config.prefix && !/^[A-Z0-9]+$/.test(config.prefix)) {
      errors.push("Prefix must contain only uppercase letters and numbers");
    }

    if (config.sequence_start < 0) {
      errors.push("Sequence start must be non-negative");
    }

    if (config.sequence_length < 1 || config.sequence_length > 10) {
      errors.push("Sequence length must be between 1 and 10");
    }

    if (!config.format || !config.format.includes("PREFIX") || !config.format.includes("000000")) {
      errors.push("Format must include PREFIX and 000000 placeholders");
    }

    return errors;
  };

  const generatePreview = (config: TrackingIdConfig): string => {
    const paddedSequence = config.sequence_start.toString().padStart(config.sequence_length, '0');
    return config.format.replace('PREFIX', config.prefix).replace('000000', paddedSequence);
  };

  const handleSave = async () => {
    const errors = validateConfig(config);
    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      setSaving(true);
      setValidationErrors([]);
      
      const response = await fetch(
        `/api/admin/super-admin/tracking-id-config/${form.form_key}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ config }),
        }
      );

      if (response.ok) {
        onSave();
      } else {
        const error = await response.json();
        setValidationErrors([error.message || "Failed to save configuration"]);
      }
    } catch (error) {
      console.error("Failed to save tracking config:", error);
      setValidationErrors(["Failed to save configuration"]);
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (updates: Partial<TrackingIdConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
    setValidationErrors([]);
  };

  const updateFormat = (newFormat: string) => {
    updateConfig({ format: newFormat });
  };

  const updatePrefix = (newPrefix: string) => {
    const upperPrefix = newPrefix.toUpperCase();
    updateConfig({ prefix: upperPrefix });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Tracking ID Configuration
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Configure tracking ID format for: {form.name}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="text-sm text-red-800 dark:text-red-200">
                <ul className="list-disc list-inside space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Prefix Configuration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Prefix
            </label>
            <input
              type="text"
              value={config.prefix}
              onChange={(e) => updatePrefix(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white uppercase"
              placeholder="e.g., SEM, TRAVEL, EVENT"
              maxLength={10}
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Prefix for the tracking ID (uppercase letters and numbers only)
            </p>
          </div>

          {/* Sequence Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sequence Start
              </label>
              <input
                type="number"
                value={config.sequence_start}
                onChange={(e) => updateConfig({ sequence_start: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                min="0"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Starting number for the sequence
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Sequence Length
              </label>
              <input
                type="number"
                value={config.sequence_length}
                onChange={(e) => updateConfig({ sequence_length: parseInt(e.target.value) || 6 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                min="1"
                max="10"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Number of digits in the sequence (1-10)
              </p>
            </div>
          </div>

          {/* Format Configuration */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              ID Format
            </label>
            <div className="space-y-3">
              <input
                type="text"
                value={config.format}
                onChange={(e) => updateFormat(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white font-mono"
                placeholder="PREFIX-000000"
              />
              
              {/* Format Presets */}
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Common formats:</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {[
                    "PREFIX-000000",
                    "PREFIX000000",
                    "PREFIX_000000",
                    "PREFIX.000000",
                    "PREFIX-00000",
                    "PREFIX-0000000",
                  ].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => updateFormat(preset)}
                      className={`px-3 py-2 text-sm rounded border transition-colors ${
                        config.format === preset
                          ? "border-yec-primary bg-yec-primary/10 text-yec-primary"
                          : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Use PREFIX for the prefix and 000000 for the sequence placeholder
            </p>
          </div>

          {/* Preview */}
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Preview
            </h3>
            <div className="space-y-2">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Next ID that will be generated:
              </div>
              <div className="text-lg font-mono text-gray-900 dark:text-white bg-white dark:bg-gray-800 p-2 rounded border">
                {generatePreview(config)}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                After this: {generatePreview({ ...config, sequence_start: config.sequence_start + 1 })}
              </div>
            </div>
          </div>

          {/* Active Status */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={config.is_active}
              onChange={(e) => updateConfig({ is_active: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="is_active" className="text-sm text-gray-700 dark:text-gray-300">
              Active (generate IDs for this form)
            </label>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || validationErrors.length > 0}
            className="px-4 py-2 bg-yec-primary text-white rounded-lg hover:bg-yec-accent disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Save Configuration"}
          </button>
        </div>
      </div>
    </div>
  );
}
