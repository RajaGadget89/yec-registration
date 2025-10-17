"use client";

import { useState, useEffect } from "react";
import { Plus, Save, Eye, Settings, Trash2 } from "lucide-react";
import {
  FormType,
  FormField,
  ApprovalWorkflowTemplate,
} from "../../../../types/form-system";
import FieldConfigPanel from "./FieldConfigPanel";
import ApprovalWorkflowSelector from "./ApprovalWorkflowSelector";
import FormPreview from "./FormPreview";

interface FormBuilderEditorProps {
  initialForm?: FormType | null;
  onClose?: (saved?: boolean) => void;
}

export default function FormBuilderEditor({
  initialForm,
  onClose,
}: FormBuilderEditorProps) {
  const [currentForm, setCurrentForm] = useState<Partial<FormType>>({
    form_key: "",
    name: "",
    description: "",
    config: {
      fields: [],
      approval_workflow: "payment_only",
      tracking_id_format: {
        prefix: "AUTO",
        sequence_start: 1,
        format: "{PREFIX}-{SEQUENCE:06d}",
      },
      // Tracking/registration ID config is now managed in form_tracking_configs table
    },
    is_active: true,
  });
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewForm, setPreviewForm] = useState<FormType | null>(null);
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [showFieldConfig, setShowFieldConfig] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // Initialize form with initialForm if provided
  useEffect(() => {
    if (initialForm) {
      setCurrentForm(initialForm);
    }
  }, [initialForm]);

  const validateForm = (): string[] => {
    const validationErrors: string[] = [];

    // Required field validation
    if (!currentForm.form_key?.trim()) {
      validationErrors.push("Form Key is required");
    } else if (!/^[a-z0-9-]+$/.test(currentForm.form_key)) {
      validationErrors.push(
        "Form Key must contain only lowercase letters, numbers, and hyphens",
      );
    }

    if (!currentForm.name?.trim()) {
      validationErrors.push("Form Name is required");
    }

    // Tracking ID config moved to Super Admin; no longer validated here

    if (!currentForm.config?.fields || currentForm.config.fields.length === 0) {
      validationErrors.push("At least one form field is required");
    }

    // Validate each field
    if (currentForm.config?.fields) {
      currentForm.config.fields.forEach((field, index) => {
        if (!field.id?.trim()) {
          validationErrors.push(`Field ${index + 1}: ID is required`);
        }
        if (!field.label?.trim()) {
          validationErrors.push(`Field ${index + 1}: Label is required`);
        }
        if (!field.type) {
          validationErrors.push(`Field ${index + 1}: Type is required`);
        }
      });
    }

    return validationErrors;
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setErrors([]);

      // Enhanced validation
      const validationErrors = validateForm();
      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        return;
      }

      // Check if this is an update or create
      const isUpdate = !!currentForm.id;
      const url = isUpdate
        ? `/api/admin/cms/form-types/${currentForm.id}`
        : "/api/admin/cms/form-types";
      const method = isUpdate ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentForm),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save form");
      }

      const _savedForm = await response.json();

      if (!isUpdate) {
        // Reset form only for new forms
        setCurrentForm({
          form_key: "",
          name: "",
          description: "",
          config: {
            fields: [],
            approval_workflow: "payment_only",
            tracking_id_format: {
              prefix: "AUTO",
              sequence_start: 1,
              format: "{PREFIX}-{SEQUENCE:06d}",
            },
          },
          is_active: true,
        });
      }

      alert("Form saved successfully!");
      if (onClose) {
        onClose(true); // Pass true to indicate form was saved
      }
    } catch (error) {
      console.error("Error saving form:", error);
      setErrors([
        error instanceof Error ? error.message : "Failed to save form",
      ]);
    } finally {
      setSaving(false);
    }
  };

  const handleAddField = () => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type: "text",
      label: "New Field",
      required: true, // Default to required
      placeholder: "",
    };

    setCurrentForm((prev) => ({
      ...prev,
      config: {
        ...prev.config!,
        fields: [...(prev.config?.fields || []), newField],
      },
    }));
    setEditingField(newField);
    setShowFieldConfig(true);
  };

  const handleEditField = (field: FormField) => {
    setEditingField(field);
    setShowFieldConfig(true);
  };

  const handleDeleteField = (fieldId: string) => {
    if (confirm("Are you sure you want to delete this field?")) {
      setCurrentForm((prev) => ({
        ...prev,
        config: {
          ...prev.config!,
          fields: prev.config?.fields?.filter((f) => f.id !== fieldId) || [],
        },
      }));
    }
  };

  const handleFieldConfigSave = (updatedField: FormField) => {
    setCurrentForm((prev) => ({
      ...prev,
      config: {
        ...prev.config!,
        fields:
          prev.config?.fields?.map((f) =>
            f.id === updatedField.id ? updatedField : f,
          ) || [],
      },
    }));
    setShowFieldConfig(false);
    setEditingField(null);
  };

  const handleApprovalWorkflowChange = (workflow: ApprovalWorkflowTemplate) => {
    setCurrentForm((prev) => ({
      ...prev,
      config: {
        ...prev.config!,
        approval_workflow: workflow,
      },
    }));
  };

  const _handleTrackingIdFormatChange = (format: any) => {
    setCurrentForm((prev) => ({
      ...prev,
      config: {
        ...prev.config!,
        tracking_id_format: format,
      },
    }));
  };

  return (
    <div className="space-y-6">
      {/* Form Editor */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Form Editor</h3>
        </div>
        <div className="p-6 space-y-6">
          {/* Error Display */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
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
                    Please fix the following errors:
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <ul className="list-disc pl-5 space-y-1">
                      {errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Form Key *
              </label>
              <input
                type="text"
                value={currentForm.form_key || ""}
                onChange={(e) =>
                  setCurrentForm((prev) => ({
                    ...prev,
                    form_key: e.target.value,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., seminar-2025"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Form Name *
              </label>
              <input
                type="text"
                value={currentForm.name || ""}
                onChange={(e) =>
                  setCurrentForm((prev) => ({ ...prev, name: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Seminar 2025 Registration"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={currentForm.description || ""}
              onChange={(e) =>
                setCurrentForm((prev) => ({
                  ...prev,
                  description: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Describe what this form is for..."
            />
          </div>

          {/* Tracking ID settings are configured in Super Admin → Tracking ID Management */}

          {/* Approval Workflow */}
          <ApprovalWorkflowSelector
            value={currentForm.config?.approval_workflow || "payment_only"}
            onChange={handleApprovalWorkflowChange}
          />

          {/* Fields */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-medium text-gray-900">Form Fields</h4>
              <button
                onClick={handleAddField}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Field
              </button>
            </div>

            {currentForm.config?.fields?.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No fields added yet. Click &quot;Add Field&quot; to get started.
              </p>
            ) : (
              <div className="space-y-3">
                {currentForm.config?.fields?.map((field) => (
                  <div
                    key={field.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div>
                        <span className="font-medium">{field.label}</span>
                        <span className="text-sm text-gray-500 ml-2">
                          ({field.type})
                        </span>
                        {field.required && (
                          <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded">
                            Required
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEditField(field)}
                        className="p-2 text-gray-400 hover:text-blue-600"
                      >
                        <Settings className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteField(field.id)}
                        className="p-2 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              onClick={() => {
                setPreviewForm(currentForm as FormType);
                setShowPreview(true);
              }}
              className="flex items-center px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </button>
            <button
              onClick={() => onClose && onClose(false)}
              className="flex items-center px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save Form"}
            </button>
          </div>
        </div>
      </div>

      {/* Field Configuration Modal */}
      {showFieldConfig && editingField && (
        <FieldConfigPanel
          field={editingField}
          onSave={handleFieldConfigSave}
          onCancel={() => {
            setShowFieldConfig(false);
            setEditingField(null);
          }}
        />
      )}

      {/* Form Preview Modal */}
      {showPreview && previewForm && (
        <FormPreview
          form={previewForm}
          onClose={() => {
            setShowPreview(false);
            setPreviewForm(null);
          }}
        />
      )}
    </div>
  );
}
