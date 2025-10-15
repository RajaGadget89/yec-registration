"use client";

import { useState, useEffect } from "react";
import { Plus, Save, Eye, Settings, Trash2 } from "lucide-react";
import { FormType, FormField, ApprovalWorkflowTemplate } from "../../../../types/form-system";
import FieldConfigPanel from "./FieldConfigPanel";
import ApprovalWorkflowSelector from "./ApprovalWorkflowSelector";
import FormPreview from "./FormPreview";

export default function FormBuilderEditor() {
  const [formTypes, setFormTypes] = useState<FormType[]>([]);
  const [currentForm, setCurrentForm] = useState<Partial<FormType>>({
    form_key: "",
    name: "",
    description: "",
    config: {
      fields: [],
      approval_workflow: "payment_only",
      tracking_id_format: {
        prefix: "",
        sequence_start: 1,
        format: "{PREFIX}-{SEQUENCE:06d}"
      }
    },
    is_active: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [showFieldConfig, setShowFieldConfig] = useState(false);

  // Load form types on mount
  useEffect(() => {
    loadFormTypes();
  }, []);

  const loadFormTypes = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/cms/form-types");
      if (!response.ok) {
        throw new Error("Failed to load form types");
      }
      const data = await response.json();
      setFormTypes(data.formTypes || []);
    } catch (error) {
      console.error("Error loading form types:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Validate form
      if (!currentForm.form_key || !currentForm.name) {
        alert("Please fill in form key and name");
        return;
      }

      if (!currentForm.config?.fields || currentForm.config.fields.length === 0) {
        alert("Please add at least one field to the form");
        return;
      }

      const response = await fetch("/api/admin/cms/form-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentForm)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save form");
      }

      const savedForm = await response.json();
      setFormTypes(prev => [...prev, savedForm]);
      setCurrentForm({
        form_key: "",
        name: "",
        description: "",
        config: {
          fields: [],
          approval_workflow: "payment_only",
          tracking_id_format: {
            prefix: "",
            sequence_start: 1,
            format: "{PREFIX}-{SEQUENCE:06d}"
          }
        },
        is_active: true
      });
      
      alert("Form saved successfully!");
    } catch (error) {
      console.error("Error saving form:", error);
      alert(`Failed to save form: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddField = () => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type: "text",
      label: "New Field",
      required: false,
      placeholder: ""
    };

    setCurrentForm(prev => ({
      ...prev,
      config: {
        ...prev.config!,
        fields: [...(prev.config?.fields || []), newField]
      }
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
      setCurrentForm(prev => ({
        ...prev,
        config: {
          ...prev.config!,
          fields: prev.config?.fields?.filter(f => f.id !== fieldId) || []
        }
      }));
    }
  };

  const handleFieldConfigSave = (updatedField: FormField) => {
    setCurrentForm(prev => ({
      ...prev,
      config: {
        ...prev.config!,
        fields: prev.config?.fields?.map(f => 
          f.id === updatedField.id ? updatedField : f
        ) || []
      }
    }));
    setShowFieldConfig(false);
    setEditingField(null);
  };

  const handleApprovalWorkflowChange = (workflow: ApprovalWorkflowTemplate) => {
    setCurrentForm(prev => ({
      ...prev,
      config: {
        ...prev.config!,
        approval_workflow: workflow
      }
    }));
  };

  const handleTrackingIdFormatChange = (format: any) => {
    setCurrentForm(prev => ({
      ...prev,
      config: {
        ...prev.config!,
        tracking_id_format: format
      }
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading form builder...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Form List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Existing Forms</h3>
        </div>
        <div className="p-6">
          {formTypes.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No forms created yet</p>
          ) : (
            <div className="grid gap-4">
              {formTypes.map((form) => (
                <div key={form.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">{form.name}</h4>
                    <p className="text-sm text-gray-500">Key: {form.form_key}</p>
                    <p className="text-sm text-gray-500">{form.config.fields.length} fields</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setCurrentForm(form)}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setShowPreview(true)}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Form Editor */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Form Editor</h3>
        </div>
        <div className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Form Key *
              </label>
              <input
                type="text"
                value={currentForm.form_key || ""}
                onChange={(e) => setCurrentForm(prev => ({ ...prev, form_key: e.target.value }))}
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
                onChange={(e) => setCurrentForm(prev => ({ ...prev, name: e.target.value }))}
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
              onChange={(e) => setCurrentForm(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Describe what this form is for..."
            />
          </div>

          {/* Tracking ID Format */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tracking ID Prefix *
              </label>
              <input
                type="text"
                value={currentForm.config?.tracking_id_format?.prefix || ""}
                onChange={(e) => handleTrackingIdFormatChange({
                  ...currentForm.config?.tracking_id_format,
                  prefix: e.target.value
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., SEM"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sequence Start
              </label>
              <input
                type="number"
                value={currentForm.config?.tracking_id_format?.sequence_start || 1}
                onChange={(e) => handleTrackingIdFormatChange({
                  ...currentForm.config?.tracking_id_format,
                  sequence_start: parseInt(e.target.value) || 1
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                min="1"
              />
            </div>
          </div>

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
              <p className="text-gray-500 text-center py-8">No fields added yet. Click "Add Field" to get started.</p>
            ) : (
              <div className="space-y-3">
                {currentForm.config?.fields?.map((field) => (
                  <div key={field.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div>
                        <span className="font-medium">{field.label}</span>
                        <span className="text-sm text-gray-500 ml-2">({field.type})</span>
                        {field.required && (
                          <span className="ml-2 text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Required</span>
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
              onClick={() => setShowPreview(true)}
              className="flex items-center px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview
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
      {showPreview && (
        <FormPreview
          form={currentForm as FormType}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  );
}
