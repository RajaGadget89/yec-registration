"use client";

import { useState } from "react";
import { X, Save } from "lucide-react";
import { FormField, FormFieldType } from "../../../../types/form-system";

interface FieldConfigPanelProps {
  field: FormField;
  onSave: (field: FormField) => void;
  onCancel: () => void;
}

export default function FieldConfigPanel({
  field,
  onSave,
  onCancel,
}: FieldConfigPanelProps) {
  const [editedField, setEditedField] = useState<FormField>({ ...field });

  const fieldTypes: { value: FormFieldType; label: string }[] = [
    { value: "text", label: "Text Input" },
    { value: "email", label: "Email" },
    { value: "tel", label: "Phone Number" },
    { value: "select", label: "Dropdown" },
    { value: "textarea", label: "Text Area" },
    { value: "file", label: "File Upload" },
    { value: "checkbox", label: "Checkbox" },
    { value: "radio", label: "Radio Button" },
    { value: "date", label: "Date" },
    { value: "number", label: "Number" },
  ];

  const handleSave = () => {
    onSave(editedField);
  };

  const handleOptionChange = (
    index: number,
    key: "value" | "label",
    value: string,
  ) => {
    if (!editedField.options) {
      editedField.options = [];
    }
    editedField.options[index] = {
      ...editedField.options[index],
      [key]: value,
    };
    setEditedField({ ...editedField });
  };

  const addOption = () => {
    if (!editedField.options) {
      editedField.options = [];
    }
    editedField.options.push({ value: "", label: "" });
    setEditedField({ ...editedField });
  };

  const removeOption = (index: number) => {
    if (editedField.options) {
      editedField.options.splice(index, 1);
      setEditedField({ ...editedField });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Configure Field</h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Field Label *
              </label>
              <input
                type="text"
                value={editedField.label}
                onChange={(e) =>
                  setEditedField((prev) => ({ ...prev, label: e.target.value }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter field label"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Field Type *
              </label>
              <select
                value={editedField.type}
                onChange={(e) =>
                  setEditedField((prev) => ({
                    ...prev,
                    type: e.target.value as FormFieldType,
                  }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {fieldTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Placeholder Text
            </label>
            <input
              type="text"
              value={editedField.placeholder || ""}
              onChange={(e) =>
                setEditedField((prev) => ({
                  ...prev,
                  placeholder: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter placeholder text"
            />
          </div>

          {/* Required Field */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="required"
              checked={editedField.required}
              onChange={(e) =>
                setEditedField((prev) => ({
                  ...prev,
                  required: e.target.checked,
                }))
              }
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label
              htmlFor="required"
              className="ml-2 block text-sm text-gray-900"
            >
              Required field
            </label>
          </div>

          {/* Options for select, radio, checkbox */}
          {(editedField.type === "select" ||
            editedField.type === "radio" ||
            editedField.type === "checkbox") && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Options
                </label>
                <button
                  onClick={addOption}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                >
                  Add Option
                </button>
              </div>

              {editedField.options && editedField.options.length > 0 ? (
                <div className="space-y-2">
                  {editedField.options.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={option.value}
                        onChange={(e) =>
                          handleOptionChange(index, "value", e.target.value)
                        }
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Option value"
                      />
                      <input
                        type="text"
                        value={option.label}
                        onChange={(e) =>
                          handleOptionChange(index, "label", e.target.value)
                        }
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Option label"
                      />
                      <button
                        onClick={() => removeOption(index)}
                        className="px-2 py-1 text-red-600 hover:bg-red-100 rounded"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm">
                  No options added yet. Click &quot;Add Option&quot; to get
                  started.
                </p>
              )}
            </div>
          )}

          {/* Validation Rules */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Validation Rules
            </label>

            <div className="space-y-3">
              {editedField.type === "text" ||
              editedField.type === "textarea" ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        Min Length
                      </label>
                      <input
                        type="number"
                        value={editedField.validation?.min_length || ""}
                        onChange={(e) =>
                          setEditedField((prev) => ({
                            ...prev,
                            validation: {
                              ...prev.validation,
                              min_length: e.target.value
                                ? parseInt(e.target.value)
                                : undefined,
                            },
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Minimum length"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">
                        Max Length
                      </label>
                      <input
                        type="number"
                        value={editedField.validation?.max_length || ""}
                        onChange={(e) =>
                          setEditedField((prev) => ({
                            ...prev,
                            validation: {
                              ...prev.validation,
                              max_length: e.target.value
                                ? parseInt(e.target.value)
                                : undefined,
                            },
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Maximum length"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Pattern (Regex)
                    </label>
                    <input
                      type="text"
                      value={editedField.validation?.pattern || ""}
                      onChange={(e) =>
                        setEditedField((prev) => ({
                          ...prev,
                          validation: {
                            ...prev.validation,
                            pattern: e.target.value,
                          },
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Regular expression pattern"
                    />
                  </div>
                </>
              ) : editedField.type === "file" ? (
                <>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Allowed File Types
                    </label>
                    <input
                      type="text"
                      value={
                        editedField.validation?.file_types?.join(", ") || ""
                      }
                      onChange={(e) =>
                        setEditedField((prev) => ({
                          ...prev,
                          validation: {
                            ...prev.validation,
                            file_types: e.target.value
                              .split(",")
                              .map((s) => s.trim())
                              .filter((s) => s),
                          },
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="jpg, png, pdf (comma separated)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Max File Size (MB)
                    </label>
                    <input
                      type="number"
                      value={editedField.validation?.max_file_size || ""}
                      onChange={(e) =>
                        setEditedField((prev) => ({
                          ...prev,
                          validation: {
                            ...prev.validation,
                            max_file_size: e.target.value
                              ? parseInt(e.target.value)
                              : undefined,
                          },
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Maximum file size in MB"
                    />
                  </div>
                </>
              ) : null}
            </div>
          </div>

          {/* Conditional Logic */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Conditional Logic
            </label>

            <div className="space-y-3">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="hasCondition"
                  checked={!!editedField.depends_on}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setEditedField((prev) => ({
                        ...prev,
                        depends_on: { field: "", value: "" },
                      }));
                    } else {
                      setEditedField((prev) => ({
                        ...prev,
                        depends_on: undefined,
                      }));
                    }
                  }}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="hasCondition"
                  className="ml-2 block text-sm text-gray-900"
                >
                  Show this field conditionally
                </label>
              </div>

              {editedField.depends_on && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Depends on field
                    </label>
                    <input
                      type="text"
                      value={editedField.depends_on.field}
                      onChange={(e) =>
                        setEditedField((prev) => ({
                          ...prev,
                          depends_on: {
                            ...prev.depends_on!,
                            field: e.target.value,
                          },
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Field ID"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      When value equals
                    </label>
                    <input
                      type="text"
                      value={editedField.depends_on.value}
                      onChange={(e) =>
                        setEditedField((prev) => ({
                          ...prev,
                          depends_on: {
                            ...prev.depends_on!,
                            value: e.target.value,
                          },
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Value to match"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Field
          </button>
        </div>
      </div>
    </div>
  );
}
