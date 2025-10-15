"use client";

import { useState, useEffect } from "react";
import { FormType } from "@/app/types/form-system";

interface BadgeTemplate {
  logo_url?: string;
  title_text: string;
  subtitle_text?: string;
  background_color: string;
  text_color: string;
  fields: string[];
  layout: "vertical" | "horizontal";
  font_family?: string;
  font_size?: {
    title: number;
    subtitle: number;
    field: number;
  };
  dimensions: {
    width: number;
    height: number;
  };
}

interface BadgeTemplateEditorProps {
  form: FormType;
  onClose: () => void;
  onSave: () => void;
}

const AVAILABLE_FIELDS = [
  "name",
  "email",
  "phone",
  "tracking_id",
  "company",
  "organization",
  "event_name",
  "registration_date",
  "core_data.name",
  "core_data.email",
  "core_data.phone",
  "core_data.company",
  "extra_data.organization",
  "extra_data.department",
];

const FONT_FAMILIES = [
  "Arial, sans-serif",
  "Helvetica, sans-serif",
  "Times New Roman, serif",
  "Georgia, serif",
  "Verdana, sans-serif",
  "Tahoma, sans-serif",
];

const LAYOUT_OPTIONS = [
  { value: "vertical", label: "Vertical Layout" },
  { value: "horizontal", label: "Horizontal Layout" },
];

export default function BadgeTemplateEditor({
  form,
  onClose,
  onSave,
}: BadgeTemplateEditorProps) {
  const [template, setTemplate] = useState<BadgeTemplate>({
    logo_url: "",
    title_text: form.name,
    subtitle_text: "",
    background_color: "#2F68C9",
    text_color: "#FFFFFF",
    fields: ["name", "tracking_id"],
    layout: "vertical",
    font_family: "Arial, sans-serif",
    font_size: {
      title: 24,
      subtitle: 16,
      field: 14,
    },
    dimensions: {
      width: 400,
      height: 600,
    },
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [previewData, setPreviewData] = useState<Record<string, string>>({});

  useEffect(() => {
    loadExistingTemplate();
    initializePreviewData();
  }, [form]);

  const loadExistingTemplate = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/super-admin/form-badge-templates/${form.form_key}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.template) {
          setTemplate(data.template);
        }
      }
    } catch (error) {
      console.error("Failed to load badge template:", error);
    } finally {
      setLoading(false);
    }
  };

  const initializePreviewData = () => {
    setPreviewData({
      name: "John Doe",
      email: "john.doe@example.com",
      phone: "+66 123 456 789",
      tracking_id: `${form.form_key.toUpperCase()}-000001`,
      company: "Example Company",
      organization: "YEC Organization",
      event_name: form.name,
      registration_date: new Date().toLocaleDateString(),
      "core_data.name": "John Doe",
      "core_data.email": "john.doe@example.com",
      "core_data.phone": "+66 123 456 789",
      "core_data.company": "Example Company",
      "extra_data.organization": "YEC Organization",
      "extra_data.department": "IT Department",
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch(
        `/api/admin/super-admin/form-badge-templates/${form.form_key}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ template }),
        }
      );

      if (response.ok) {
        onSave();
      } else {
        const error = await response.json();
        alert(`Failed to save badge template: ${error.message}`);
      }
    } catch (error) {
      console.error("Failed to save badge template:", error);
      alert("Failed to save badge template");
    } finally {
      setSaving(false);
    }
  };

  const updateTemplate = (updates: Partial<BadgeTemplate>) => {
    setTemplate((prev) => ({ ...prev, ...updates }));
  };

  const addField = (field: string) => {
    if (!template.fields.includes(field)) {
      updateTemplate({
        fields: [...template.fields, field],
      });
    }
  };

  const removeField = (field: string) => {
    updateTemplate({
      fields: template.fields.filter(f => f !== field),
    });
  };

  const moveField = (index: number, direction: "up" | "down") => {
    const newFields = [...template.fields];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    
    if (newIndex >= 0 && newIndex < newFields.length) {
      [newFields[index], newFields[newIndex]] = [newFields[newIndex], newFields[index]];
      updateTemplate({ fields: newFields });
    }
  };

  const renderPreview = () => {
    return (
      <div
        className="border-2 border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden"
        style={{
          width: template.dimensions.width / 2,
          height: template.dimensions.height / 2,
          backgroundColor: template.background_color,
          color: template.text_color,
          fontFamily: template.font_family,
        }}
      >
        <div className="p-4 h-full flex flex-col justify-center items-center text-center">
          {template.logo_url && (
            <div className="mb-4">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                <span className="text-gray-600 text-xs">LOGO</span>
              </div>
            </div>
          )}
          
          <div
            className="font-bold mb-2"
            style={{ fontSize: template.font_size.title / 2 }}
          >
            {template.title_text}
          </div>
          
          {template.subtitle_text && (
            <div
              className="mb-4"
              style={{ fontSize: template.font_size.subtitle / 2 }}
            >
              {template.subtitle_text}
            </div>
          )}
          
          <div className="space-y-1">
            {template.fields.map((field, index) => {
              const value = previewData[field] || `[${field}]`;
              return (
                <div
                  key={index}
                  style={{ fontSize: template.font_size.field / 2 }}
                >
                  {field.toUpperCase()}: {value}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
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
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Badge Template Editor
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Configure badge template for: {form.name}
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Template Configuration */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Template Configuration
              </h3>

              {/* Basic Settings */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Title Text
                  </label>
                  <input
                    type="text"
                    value={template.title_text}
                    onChange={(e) => updateTemplate({ title_text: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    placeholder="Event Title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Subtitle Text (Optional)
                  </label>
                  <input
                    type="text"
                    value={template.subtitle_text || ""}
                    onChange={(e) => updateTemplate({ subtitle_text: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    placeholder="Event Subtitle"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Logo URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={template.logo_url || ""}
                    onChange={(e) => updateTemplate({ logo_url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    placeholder="https://example.com/logo.png"
                  />
                </div>
              </div>

              {/* Colors */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Background Color
                  </label>
                  <input
                    type="color"
                    value={template.background_color}
                    onChange={(e) => updateTemplate({ background_color: e.target.value })}
                    className="w-full h-10 border border-gray-300 dark:border-gray-600 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Text Color
                  </label>
                  <input
                    type="color"
                    value={template.text_color}
                    onChange={(e) => updateTemplate({ text_color: e.target.value })}
                    className="w-full h-10 border border-gray-300 dark:border-gray-600 rounded-lg"
                  />
                </div>
              </div>

              {/* Layout */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Layout
                </label>
                <select
                  value={template.layout}
                  onChange={(e) => updateTemplate({ layout: e.target.value as "vertical" | "horizontal" })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                >
                  {LAYOUT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Font Settings */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Font Family
                </label>
                <select
                  value={template.font_family}
                  onChange={(e) => updateTemplate({ font_family: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                >
                  {FONT_FAMILIES.map((font) => (
                    <option key={font} value={font}>
                      {font}
                    </option>
                  ))}
                </select>
              </div>

              {/* Font Sizes */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Title Size
                  </label>
                  <input
                    type="number"
                    value={template.font_size.title}
                    onChange={(e) => updateTemplate({
                      font_size: { ...template.font_size, title: parseInt(e.target.value) || 24 }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    min="12"
                    max="48"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Subtitle Size
                  </label>
                  <input
                    type="number"
                    value={template.font_size.subtitle}
                    onChange={(e) => updateTemplate({
                      font_size: { ...template.font_size, subtitle: parseInt(e.target.value) || 16 }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    min="10"
                    max="32"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Field Size
                  </label>
                  <input
                    type="number"
                    value={template.font_size.field}
                    onChange={(e) => updateTemplate({
                      font_size: { ...template.font_size, field: parseInt(e.target.value) || 14 }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    min="8"
                    max="24"
                  />
                </div>
              </div>

              {/* Dimensions */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Width (px)
                  </label>
                  <input
                    type="number"
                    value={template.dimensions.width}
                    onChange={(e) => updateTemplate({
                      dimensions: { ...template.dimensions, width: parseInt(e.target.value) || 400 }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    min="200"
                    max="800"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Height (px)
                  </label>
                  <input
                    type="number"
                    value={template.dimensions.height}
                    onChange={(e) => updateTemplate({
                      dimensions: { ...template.dimensions, height: parseInt(e.target.value) || 600 }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    min="300"
                    max="1200"
                  />
                </div>
              </div>
            </div>

            {/* Fields and Preview */}
            <div className="space-y-4">
              {/* Fields Configuration */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Badge Fields
                </h3>
                
                <div className="space-y-2">
                  {template.fields.map((field, index) => (
                    <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                      <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                        {field}
                      </span>
                      <button
                        onClick={() => moveField(index, "up")}
                        disabled={index === 0}
                        className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded disabled:opacity-50"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveField(index, "down")}
                        disabled={index === template.fields.length - 1}
                        className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded disabled:opacity-50"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => removeField(field)}
                        className="px-2 py-1 text-xs bg-red-200 dark:bg-red-600 text-red-700 dark:text-red-300 rounded"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Add Field
                  </label>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        addField(e.target.value);
                        e.target.value = "";
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">Select a field to add...</option>
                    {AVAILABLE_FIELDS.filter(field => !template.fields.includes(field)).map((field) => (
                      <option key={field} value={field}>
                        {field}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preview */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Preview
                </h3>
                <div className="flex justify-center">
                  {renderPreview()}
                </div>
              </div>
            </div>
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
            disabled={saving}
            className="px-4 py-2 bg-yec-primary text-white rounded-lg hover:bg-yec-accent disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Save Template"}
          </button>
        </div>
      </div>
    </div>
  );
}
