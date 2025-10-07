"use client";

import { useState, useEffect } from "react";

interface DataMappingStepProps {
  sessionId: string | null;
  onMappingComplete: (mappingConfig: any) => void;
  isLoading: boolean;
  error: string | null;
}

interface ColumnMapping {
  csvColumn: string;
  systemField: string;
  required: boolean;
  transformation?: string;
}

interface TransformationRule {
  type: string;
  config: any;
}

interface TransformationConfig {
  phone?: TransformationRule;
  title?: TransformationRule;
  hotel_choice?: TransformationRule;
  business_type?: TransformationRule;
  travel_type?: TransformationRule;
  [key: string]: TransformationRule | undefined;
}

const SYSTEM_FIELDS = [
  // Utility
  { value: "__ignore__", label: "Not Required (ignore)", required: false },

  // Basic Information
  { value: "first_name", label: "First Name", required: true },
  { value: "last_name", label: "Last Name", required: true },
  { value: "title", label: "Title (นาย/นางสาว)", required: true },
  { value: "nickname", label: "Nickname", required: false },
  { value: "phone", label: "Phone Number", required: true },
  { value: "line_id", label: "Line ID", required: false },
  { value: "email", label: "Email", required: false },

  // Business Information
  { value: "company_name", label: "Company Name", required: false },
  { value: "business_type", label: "Business Type", required: false },
  { value: "yec_province", label: "YEC Province", required: true },

  // Event Details
  { value: "hotel_choice", label: "Hotel Choice", required: false },
  { value: "room_type", label: "Room Type", required: false },
  {
    value: "external_hotel_name",
    label: "External Hotel Name",
    required: false,
  },
  { value: "roommate_info", label: "Roommate Info", required: false },
  { value: "travel_type", label: "Travel Type", required: false },

  // File URLs
  { value: "profile_image_url", label: "Profile Image URL", required: false },
  { value: "chamber_card_url", label: "Chamber Card URL", required: false },
  { value: "payment_slip_url", label: "Payment Slip URL", required: false },

  // System Fields
  { value: "created_at", label: "Created At (Timestamp)", required: false },
  { value: "status", label: "Status", required: false },

  // Approval Status Fields
  { value: "tcc_review_status", label: "TCC Review Status", required: false },
  {
    value: "profile_review_status",
    label: "Profile Review Status",
    required: false,
  },
  {
    value: "payment_review_status",
    label: "Payment Review Status",
    required: false,
  },
  {
    value: "review_checklist",
    label: "Review Checklist (JSON)",
    required: false,
  },
];

const THAI_COLUMN_MAPPINGS = {
  // Basic Information
  ชื่อ: "first_name",
  นามสกุล: "last_name",
  เพศ: "title", // Will be transformed: ชาย→นาย, หญิง→นางสาว
  ชื่อเล่น: "nickname",
  เบอร์โทรศัพท์: "phone",
  "Line ID": "line_id",
  "สมาชิกหอการค้า / YEC จังหวัด?": "yec_province",
  ประเภทธุรกิจ: "business_type",
  "ชื่อกิจการ หรือ บริษัท": "company_name",

  // Event Details
  ต้องการซื้อบัตรแบบไหน: "hotel_choice",
  "ชื่อ ผู้พักร่วม": "ignore", // Don't map to roommate_info, use TRIM column instead
  "นามสกุล ผู้พักร่วม": "ignore", // Don't map to roommate_info, use TRIM column instead
  "ผู้พักร่วม (TRIM)": "roommate_info", // This contains the full name as required
  โรงแรมที่พัก: "external_hotel_name", // Maps to External Hotel Name
  ประเภทการเดินทาง: "travel_type",

  // File URLs
  "รูป Profile": "profile_image_url",
  "บัตรสมาชิก TCC Connect": "chamber_card_url",
  สลิปโอนเงิน: "payment_slip_url",

  // System Fields
  Timestamp: "created_at",
  time: "created_at",

  // Approval Status Fields (will be transformed)
  "Check TCC": "tcc_review_status",
  "Check Profile Pic": "profile_review_status",
  "Check Slip": "payment_review_status",

  // Columns to ignore by default
  หมายเหตุ: "ignore",
  ภาค: "ignore",
  "ผู้ลงทะเบียน (TRIM)": "ignore",
  "Column 27": "ignore",
};

// Smart matching function for better suggestions
function findSmartMatch(columnName: string): string | null {
  const column = columnName.toLowerCase();

  // Define smart matching rules with confidence scores
  const smartRules = [
    // High confidence matches (90-100%)
    { pattern: /email|อีเมล/i, field: "email", confidence: 100 },
    { pattern: /phone|tel|โทร|เบอร์/i, field: "phone", confidence: 95 },
    { pattern: /first.*name|ชื่อ$/i, field: "first_name", confidence: 90 },
    { pattern: /last.*name|นามสกุล$/i, field: "last_name", confidence: 90 },
    {
      pattern: /company|บริษัท|กิจการ/i,
      field: "company_name",
      confidence: 90,
    },
    { pattern: /province|จังหวัด/i, field: "yec_province", confidence: 90 },

    // Medium confidence matches (70-89%)
    { pattern: /nickname|ชื่อเล่น/i, field: "nickname", confidence: 80 },
    { pattern: /line.*id|line/i, field: "line_id", confidence: 80 },
    {
      pattern: /hotel|โรงแรม|ที่พัก/i,
      field: "external_hotel_name",
      confidence: 75,
    },
    { pattern: /roommate|ผู้พักร่วม/i, field: "roommate_info", confidence: 75 },
    { pattern: /business|ธุรกิจ/i, field: "business_type", confidence: 75 },
    { pattern: /travel|เดินทาง/i, field: "travel_type", confidence: 70 },

    // Low confidence matches (50-69%) - these will be ignored
    { pattern: /note|หมายเหตุ|remark/i, field: "ignore", confidence: 60 },
    { pattern: /region|ภาค/i, field: "ignore", confidence: 60 },
    { pattern: /trim|trim/i, field: "ignore", confidence: 60 },
    { pattern: /column.*27/i, field: "ignore", confidence: 60 },
  ];

  // Find the best match with highest confidence
  let bestMatch = null;
  let highestConfidence = 0;

  for (const rule of smartRules) {
    if (rule.pattern.test(column) && rule.confidence > highestConfidence) {
      bestMatch = rule.field;
      highestConfidence = rule.confidence;
    }
  }

  // Only return suggestions with 80%+ confidence
  return highestConfidence >= 80 ? bestMatch : null;
}

export function DataMappingStep({
  sessionId,
  onMappingComplete,
  isLoading,
  error,
}: DataMappingStepProps) {
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [suggestions, setSuggestions] = useState<Record<string, string>>({});
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<"mapping" | "transformations">(
    "mapping",
  );
  const [transformations, setTransformations] = useState<TransformationConfig>(
    {},
  );
  const [jsonConfigLoaded, setJsonConfigLoaded] = useState(false);
  const [jsonConfigError, setJsonConfigError] = useState<string | null>(null);
  // Keep the most complete configuration we have loaded/imported so we can store the full JSON as default
  const [lastFullConfig, setLastFullConfig] = useState<any | null>(null);

  useEffect(() => {
    if (sessionId) {
      // Load CSV columns first; this will internally attempt to load default config
      // to avoid race conditions where defaults are overwritten by column-based init
      fetchCsvColumns();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  // Load JSON configuration when transformations tab is active
  useEffect(() => {
    if (activeTab === "transformations" && !jsonConfigLoaded) {
      loadJsonConfiguration();
    }
  }, [activeTab, jsonConfigLoaded]);

  const _loadDefaultConfiguration = async () => {
    try {
      console.log("🔄 Loading default configuration...");
      const response = await fetch("/api/admin/import/mapping/default", {
        cache: "no-store",
      });

      if (response.status === 204) {
        console.log("ℹ️ No default configuration found, using system defaults");
        return;
      }

      if (!response.ok) {
        throw new Error(
          `Failed to load default configuration: ${response.statusText}`,
        );
      }

      const defaultConfig = await response.json();
      // Apply mappings from storage default
      applyMappingConfig(defaultConfig);
      // ALSO apply transformations from storage default if present
      if (defaultConfig?.transformations) {
        setTransformations(defaultConfig.transformations);
        setJsonConfigLoaded(true);
      }
      setLastFullConfig(defaultConfig);
      console.log("✅ Default configuration loaded successfully");
    } catch (error: any) {
      console.error("❌ Failed to load default configuration:", error);
      // Don't show error to user, just use system defaults
    }
  };

  const loadJsonConfiguration = async () => {
    try {
      setJsonConfigError(null);
      const response = await fetch("/api/import/load-config", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Failed to load configuration: ${response.statusText}`);
      }

      const jsonConfig = await response.json();

      if (jsonConfig.transformations) {
        setTransformations(jsonConfig.transformations);
        setJsonConfigLoaded(true);
        setLastFullConfig(jsonConfig);
        console.log("✅ JSON configuration loaded successfully");
      } else {
        throw new Error("No transformations found in configuration");
      }
    } catch (error: any) {
      console.error("❌ Failed to load JSON configuration:", error);
      setJsonConfigError(error.message);
      setJsonConfigLoaded(false);
    }
  };

  const fetchCsvColumns = async () => {
    try {
      const response = await fetch(`/api/admin/import/columns/${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        // Extract columns from the response
        const columns = data.columns || [];
        setCsvColumns(columns);

        // Auto-suggest mappings based on Thai column names and smart matching
        const autoMappings: Record<string, string> = {};
        columns.forEach((column: string) => {
          // First check exact mappings
          if (
            THAI_COLUMN_MAPPINGS[column as keyof typeof THAI_COLUMN_MAPPINGS]
          ) {
            autoMappings[column] =
              THAI_COLUMN_MAPPINGS[column as keyof typeof THAI_COLUMN_MAPPINGS];
          } else {
            // Smart matching for unmapped columns
            const smartMatch = findSmartMatch(column);
            if (smartMatch) {
              autoMappings[column] = smartMatch;
            }
          }
        });
        setSuggestions(autoMappings);

        // Initialize mappings with suggestions
        const initialMappings = columns.map((column: string) => {
          const suggestedField = autoMappings[column] || "";
          // For ignore columns, default to 'ignore' instead of empty string
          const systemField =
            suggestedField === "ignore" ? "__ignore__" : suggestedField;

          return {
            csvColumn: column,
            systemField: systemField,
            required:
              SYSTEM_FIELDS.find((f) => f.value === systemField)?.required ||
              false,
          };
        });
        setMappings(initialMappings);
        ensureDefaultTransformations(initialMappings);
        // Auto-load default config after columns are known (graceful if not present)
        await tryLoadDefault(initialMappings);
      }
    } catch (error) {
      console.error("Error fetching CSV columns:", error);
    }
  };

  // Apply a mappingConfig to current columns
  const applyMappingConfig = (mappingConfig: any) => {
    if (!mappingConfig?.mappings) return;
    setMappings((prev) => {
      const mapByCsv: Record<string, string> = {};
      mappingConfig.mappings.forEach((m: any) => {
        if (m.csvColumn && typeof m.systemField === "string") {
          // Normalize legacy ignore markers ("ignore" or empty) to "__ignore__"
          const normalized =
            !m.systemField || m.systemField === "ignore"
              ? "__ignore__"
              : m.systemField;
          mapByCsv[m.csvColumn] = normalized;
        }
      });
      const next = prev.map((m) => {
        const resolved = mapByCsv[m.csvColumn] ?? m.systemField;
        return {
          ...m,
          systemField: resolved,
          required:
            resolved && resolved !== "__ignore__"
              ? SYSTEM_FIELDS.find((f) => f.value === resolved)?.required ||
                false
              : false,
        };
      });
      // If config provides explicit transformations, treat it as the source of truth
      if (mappingConfig.transformations) {
        setTransformations(mappingConfig.transformations);
      } else {
        // otherwise, suggest sensible defaults
        ensureDefaultTransformations(next);
      }
      return next;
    });
    // Remember the full config if provided
    setLastFullConfig(mappingConfig || null);
  };

  // Ensure default transformation rules are created for mapped fields (idempotent)
  const ensureDefaultTransformations = (
    currentMappings: ColumnMapping[],
    base?: TransformationConfig,
  ) => {
    const t: TransformationConfig = { ...(base || transformations) };
    const mappedFields = new Set(currentMappings.map((m) => m.systemField));
    if (mappedFields.has("phone") && !t.phone) {
      t.phone = {
        type: "phone_clean",
        config: {
          removeNonDigits: true,
          addCountryCode: "+66",
          removeLeadingZero: true,
        },
      };
    }
    if (mappedFields.has("title") && !t.title) {
      t.title = {
        type: "title_transform",
        config: { mappings: { ชาย: "นาย", หญิง: "นางสาว" } },
      };
    }
    if (mappedFields.has("hotel_choice") && !t.hotel_choice) {
      t.hotel_choice = {
        type: "enum_transform",
        config: {
          mappings: { รวมที่พัก: "in-quota", ไม่รวมที่พัก: "out-of-quota" },
        },
      };
    }
    if (mappedFields.has("business_type") && !t.business_type) {
      t.business_type = {
        type: "business_type_map",
        config: {
          mappings: {
            โรงแรม: "hospitality",
            พลังงาน: "energy",
            ค้าปลีก: "retail",
            อาหารและเครื่องดื่ม: "food_beverage",
            ตัวแทนจำหน่าย: "distribution",
            สุขภาพและการแพทย์: "healthcare",
            การก่อสร้าง: "construction",
            นำเข้าไม้แปรรูป: "import_processing",
            "Organize & Event": "event_management",
          },
        },
      };
    }
    if (mappedFields.has("travel_type") && !t.travel_type) {
      t.travel_type = {
        type: "travel_type_map",
        config: { mappings: { รถตู้: "van", รถส่วนตัว: "private-car" } },
      };
    }
    if (mappedFields.has("created_at") && !t.created_at) {
      (t as any).created_at = {
        type: "date_parse",
        config: { format: "dd/MM/yyyy HH:mm:ss", timezone: "UTC" },
      };
    }
    setTransformations(t);
    return t;
  };

  // Default mapping: auto-load when available
  const tryLoadDefault = async (current: ColumnMapping[]) => {
    try {
      const res = await fetch("/api/admin/import/mapping/default", {
        cache: "no-store",
      });
      if (!res.ok) return;
      const cfg = await res.json();
      applyMappingConfig(cfg);
      // If default includes transformations, apply them too
      if (cfg.transformations) {
        setTransformations(cfg.transformations);
      }
      setInfoMessage("Loaded default mapping configuration.");
    } catch (_) {
      // ignore if no default
    }
  };

  // Export current mapping as JSON
  const _handleExport = async () => {
    if (!sessionId) return;
    try {
      // Create mapping config from current mappings
      const mappingConfig = {
        mappings: mappings.filter(
          (m) => m.systemField && m.systemField !== "__ignore__",
        ),
        transformations: transformations,
      };

      const payload = {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        sessionId,
        mappings: mappingConfig.mappings,
        transformations: mappingConfig.transformations,
        sourceInfo: null,
      };

      // Create and download the JSON file
      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `mapping-${sessionId}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setInfoMessage("Mapping exported successfully.");
    } catch (e) {
      console.error(e);
      setInfoMessage("Export failed. Please try again.");
    }
  };

  // Import mapping JSON from file input
  const handleImport = async (file: File | null) => {
    if (!file || !sessionId) return;
    try {
      setBusy(true);
      console.log("🔄 Importing JSON configuration file...");
      const text = await file.text();
      const json = JSON.parse(text);

      // Validate that this is a proper configuration file
      if (!json.mappings || !json.transformations) {
        throw new Error(
          "Invalid configuration file format. Must contain mappings and transformations.",
        );
      }

      // Persist to session
      const res = await fetch("/api/admin/import/mapping/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, mappingConfig: json }),
      });
      if (!res.ok) throw new Error("Failed to import mapping");

      // Apply the imported configuration
      applyMappingConfig(json);
      if (json.transformations) {
        setTransformations(json.transformations);
        setJsonConfigLoaded(true);
      }
      setLastFullConfig(json);

      setInfoMessage(
        "✅ JSON configuration imported and applied successfully.",
      );
      console.log("✅ JSON configuration imported successfully");

      // Also set as default automatically
      await fetch("/api/admin/import/mapping/set-default", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Store the FULL JSON configuration exactly as imported
        body: JSON.stringify({ mappingConfig: json }),
      });
      console.log("✅ Configuration set as new default");
    } catch (e: any) {
      console.error("❌ Failed to import JSON configuration:", e);
      setInfoMessage(`❌ Import failed: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  // Use default mapping explicitly
  const handleUseDefault = async () => {
    try {
      setBusy(true);
      console.log("🔄 Loading default configuration...");
      const res = await fetch("/api/admin/import/mapping/default");

      if (res.status === 204) {
        setInfoMessage(
          "ℹ️ No default configuration found. Please set a default first.",
        );
        return;
      }

      if (!res.ok) throw new Error("No default mapping");
      const cfg = await res.json();
      applyMappingConfig(cfg);
      if (cfg.transformations) {
        setTransformations(cfg.transformations);
        setJsonConfigLoaded(true);
      }
      setLastFullConfig(cfg);
      setInfoMessage("✅ Default configuration loaded successfully.");
      console.log("✅ Default configuration loaded successfully");
    } catch (e: any) {
      console.error("❌ Failed to load default configuration:", e);
      setInfoMessage(`❌ Failed to load default: ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  // Set current mapping as default in storage
  const handleSetDefault = async () => {
    try {
      setBusy(true);
      // Always persist current UI state for mappings/transformations.
      // If we have a previous full config, keep its meta but override mappings/transformations.
      const mappingConfig = {
        version: (lastFullConfig && lastFullConfig.version) || "1.0",
        exportedAt: new Date().toISOString(),
        sessionId:
          sessionId || (lastFullConfig && lastFullConfig.sessionId) || "",
        mappings,
        transformations,
        sourceInfo: (lastFullConfig && lastFullConfig.sourceInfo) || null,
      } as any;
      const res = await fetch("/api/admin/import/mapping/set-default", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mappingConfig }),
      });
      if (!res.ok) throw new Error("Failed to set default mapping");
      setInfoMessage("Set current mapping as default.");
      setLastFullConfig(mappingConfig);
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  };

  const handleMappingChange = (csvColumn: string, systemField: string) => {
    setMappings((prev) => {
      const next = prev.map((mapping) =>
        mapping.csvColumn === csvColumn
          ? {
              ...mapping,
              systemField,
              required:
                SYSTEM_FIELDS.find((f) => f.value === systemField)?.required ||
                false,
            }
          : mapping,
      );
      ensureDefaultTransformations(next);
      return next;
    });
  };

  const handleSubmit = () => {
    const mappingConfig = {
      mappings: mappings.filter(
        (m) => m.systemField && m.systemField !== "__ignore__",
      ),
      transformations: transformations,
    };
    onMappingComplete(mappingConfig);
  };

  const requiredMappings = mappings.filter(
    (m) => m.required && (!m.systemField || m.systemField === "__ignore__"),
  );
  const totalRequired = mappings.filter((m) => m.required).length;
  const completedRequired = totalRequired - requiredMappings.length;
  const progressPercent =
    totalRequired > 0
      ? Math.round((completedRequired / totalRequired) * 100)
      : 0;
  const canProceed = requiredMappings.length === 0;

  return (
    <div className="p-6">
      {/* Progress / Checklist */}
      <div className="mb-6 p-4 rounded-lg border border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-900">
            Required fields progress
          </h3>
          <span className="text-sm text-gray-600">
            {completedRequired}/{totalRequired} · {progressPercent}%
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded h-2 overflow-hidden">
          <div
            className="bg-blue-600 h-2"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        {requiredMappings.length > 0 && (
          <div className="mt-3 text-sm text-gray-700">
            <p className="font-medium mb-1">Missing required mappings:</p>
            <ul className="list-disc list-inside">
              {requiredMappings.map((m) => (
                <li key={`missing-${m.csvColumn}`}>{m.csvColumn}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Map Data Fields
        </h2>
        <p className="text-gray-600">
          Map the columns from your CSV file to the system fields. Required
          fields are marked with an asterisk (*).
        </p>
        {/* Mapping Config Toolbar */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={handleUseDefault}
            disabled={busy}
            className="px-3 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm"
          >
            Use Default
          </button>
          <label className="px-3 py-1.5 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm cursor-pointer">
            Import JSON
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => handleImport(e.target.files?.[0] || null)}
            />
          </label>
          {/* Export button moved to Preview step to reduce confusion */}
          <button
            onClick={handleSetDefault}
            disabled={busy}
            className="px-3 py-1.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm"
          >
            Set As Default
          </button>
          {infoMessage && (
            <span className="ml-2 text-sm text-green-700">{infoMessage}</span>
          )}
        </div>
        {/* Tabs for Step 2 */}
        <div className="mt-4 border-b border-gray-200">
          <nav className="-mb-px flex space-x-6" aria-label="Tabs">
            <button
              className={`${activeTab === "mapping" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"} whitespace-nowrap py-2 px-1 border-b-2 text-sm font-medium`}
              onClick={() => setActiveTab("mapping")}
            >
              Mapping
            </button>
            <button
              className={`${activeTab === "transformations" ? "border-blue-500 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"} whitespace-nowrap py-2 px-1 border-b-2 text-sm font-medium`}
              onClick={() => setActiveTab("transformations")}
            >
              Data Transformations
            </button>
          </nav>
        </div>
      </div>
      {activeTab === "mapping" && (
        <div className="space-y-4">
          {mappings.map((mapping, index) => (
            <div
              key={index}
              className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg"
            >
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  CSV Column: {mapping.csvColumn}
                  {mapping.required && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </label>
                <p className="text-xs text-gray-500">{mapping.csvColumn}</p>
              </div>

              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  System Field
                </label>
                <select
                  value={mapping.systemField}
                  onChange={(e) =>
                    handleMappingChange(mapping.csvColumn, e.target.value)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a field...</option>
                  {SYSTEM_FIELDS.map((field) => (
                    <option key={field.value} value={field.value}>
                      {field.label} {field.required && "*"}
                    </option>
                  ))}
                </select>
              </div>

              {suggestions[mapping.csvColumn] &&
                mapping.systemField === suggestions[mapping.csvColumn] && (
                  <div className="flex-shrink-0">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Suggested
                    </span>
                  </div>
                )}
            </div>
          ))}
        </div>
      )}

      {/* Data Transformation Rules */}
      {activeTab === "transformations" && (
        <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">
            Data Transformation Rules
          </h3>
          <p className="text-sm text-blue-700 mb-4">
            Configure how data values are cleaned, formatted, and transformed
            before database insertion.
          </p>

          {jsonConfigLoaded && (
            <div className="mb-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded p-2">
              ✅ Loaded configuration from Supabase Storage
            </div>
          )}

          {jsonConfigError && (
            <div className="mb-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded p-2">
              ❌ Error loading configuration: {jsonConfigError}
              <button
                onClick={loadJsonConfiguration}
                className="ml-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-xs"
              >
                Retry
              </button>
            </div>
          )}

          {!jsonConfigLoaded && !jsonConfigError && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">
                  Loading transformation rules from JSON configuration...
                </p>
              </div>
            </div>
          )}

          {jsonConfigLoaded && (
            <div className="space-y-4">
              {/* Date Parsing */}
              <div className="p-4 bg-white rounded-lg border">
                <h4 className="font-medium text-gray-900 mb-2">
                  Date Parsing (Created At)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Format
                    </label>
                    <input
                      type="text"
                      value={
                        (transformations as any).created_at?.config?.format ||
                        "dd/MM/yyyy HH:mm:ss"
                      }
                      onChange={(e) =>
                        setTransformations((prev) => ({
                          ...prev,
                          created_at: {
                            type: "date_parse",
                            config: {
                              ...(prev as any).created_at?.config,
                              format: e.target.value,
                            },
                          } as any,
                        }))
                      }
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      placeholder="dd/MM/yyyy HH:mm:ss"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Timezone
                    </label>
                    <input
                      type="text"
                      value={
                        (transformations as any).created_at?.config?.timezone ||
                        "UTC"
                      }
                      onChange={(e) =>
                        setTransformations((prev) => ({
                          ...prev,
                          created_at: {
                            type: "date_parse",
                            config: {
                              ...(prev as any).created_at?.config,
                              timezone: e.target.value,
                            },
                          } as any,
                        }))
                      }
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      placeholder="UTC"
                    />
                  </div>
                </div>
              </div>
              {/* Phone Number Transformation */}
              <div className="p-4 bg-white rounded-lg border">
                <h4 className="font-medium text-gray-900 mb-2">
                  Phone Number Cleaning
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={
                        transformations.phone?.config.removeNonDigits || false
                      }
                      onChange={(e) =>
                        setTransformations((prev) => ({
                          ...prev,
                          phone: {
                            ...prev.phone!,
                            config: {
                              ...prev.phone!.config,
                              removeNonDigits: e.target.checked,
                            },
                          },
                        }))
                      }
                      className="mr-2"
                    />
                    Remove non-digits
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={
                        transformations.phone?.config.removeLeadingZero || false
                      }
                      onChange={(e) =>
                        setTransformations((prev) => ({
                          ...prev,
                          phone: {
                            ...prev.phone!,
                            config: {
                              ...prev.phone!.config,
                              removeLeadingZero: e.target.checked,
                            },
                          },
                        }))
                      }
                      className="mr-2"
                    />
                    Remove leading zero
                  </label>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Country Code
                    </label>
                    <input
                      type="text"
                      value={transformations.phone?.config.addCountryCode || ""}
                      onChange={(e) =>
                        setTransformations((prev) => ({
                          ...prev,
                          phone: {
                            ...prev.phone!,
                            config: {
                              ...prev.phone!.config,
                              addCountryCode: e.target.value,
                            },
                          },
                        }))
                      }
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      placeholder="+66"
                    />
                  </div>
                </div>
              </div>

              {/* Title Transformation */}
              <div className="p-4 bg-white rounded-lg border">
                <h4 className="font-medium text-gray-900 mb-2">
                  Title Transformation
                </h4>
                <div className="space-y-2">
                  {Object.entries(
                    transformations.title?.config.mappings || {},
                  ).map(([key, value]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={key}
                        onChange={(e) => {
                          const newMappings = {
                            ...transformations.title?.config.mappings,
                          };
                          delete newMappings[key];
                          newMappings[e.target.value] = value;
                          setTransformations((prev) => ({
                            ...prev,
                            title: {
                              ...prev.title!,
                              config: {
                                ...prev.title!.config,
                                mappings: newMappings,
                              },
                            },
                          }));
                        }}
                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <span>→</span>
                      <input
                        type="text"
                        value={String(value)}
                        onChange={(e) =>
                          setTransformations((prev) => ({
                            ...prev,
                            title: {
                              ...prev.title!,
                              config: {
                                ...prev.title!.config,
                                mappings: {
                                  ...prev.title!.config.mappings,
                                  [key]: e.target.value,
                                },
                              },
                            },
                          }))
                        }
                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Business Type Mapping */}
              <div className="p-4 bg-white rounded-lg border">
                <h4 className="font-medium text-gray-900 mb-2">
                  Business Type Mapping
                </h4>
                <div className="space-y-2">
                  {Object.entries(
                    transformations.business_type?.config.mappings || {},
                  ).map(([key, value]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={key}
                        onChange={(e) => {
                          const newMappings = {
                            ...transformations.business_type?.config.mappings,
                          };
                          delete newMappings[key];
                          newMappings[e.target.value] = value;
                          setTransformations((prev) => ({
                            ...prev,
                            business_type: {
                              ...prev.business_type!,
                              config: {
                                ...prev.business_type!.config,
                                mappings: newMappings,
                              },
                            },
                          }));
                        }}
                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <span>→</span>
                      <input
                        type="text"
                        value={String(value)}
                        onChange={(e) =>
                          setTransformations((prev) => ({
                            ...prev,
                            business_type: {
                              ...prev.business_type!,
                              config: {
                                ...prev.business_type!.config,
                                mappings: {
                                  ...prev.business_type!.config.mappings,
                                  [key]: e.target.value,
                                },
                              },
                            },
                          }))
                        }
                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Hotel Choice Mapping */}
              <div className="p-4 bg-white rounded-lg border">
                <h4 className="font-medium text-gray-900 mb-2">
                  Hotel Choice Mapping
                </h4>
                <div className="space-y-2">
                  {Object.entries(
                    transformations.hotel_choice?.config.mappings || {},
                  ).map(([key, value]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={key}
                        onChange={(e) => {
                          const newMappings = {
                            ...transformations.hotel_choice?.config.mappings,
                          };
                          delete newMappings[key];
                          newMappings[e.target.value] = value as string;
                          setTransformations((prev) => ({
                            ...prev,
                            hotel_choice: {
                              ...prev.hotel_choice!,
                              config: {
                                ...prev.hotel_choice!.config,
                                mappings: newMappings,
                              },
                            },
                          }));
                        }}
                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <span>→</span>
                      <input
                        type="text"
                        value={value as string}
                        onChange={(e) =>
                          setTransformations((prev) => ({
                            ...prev,
                            hotel_choice: {
                              ...prev.hotel_choice!,
                              config: {
                                ...prev.hotel_choice!.config,
                                mappings: {
                                  ...prev.hotel_choice!.config.mappings,
                                  [key]: e.target.value,
                                },
                              },
                            },
                          }))
                        }
                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Travel Type Mapping */}
              <div className="p-4 bg-white rounded-lg border">
                <h4 className="font-medium text-gray-900 mb-2">
                  Travel Type Mapping
                </h4>
                <div className="space-y-2">
                  {Object.entries(
                    transformations.travel_type?.config.mappings || {},
                  ).map(([key, value]) => (
                    <div key={key} className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={key}
                        onChange={(e) => {
                          const newMappings = {
                            ...transformations.travel_type?.config.mappings,
                          };
                          delete newMappings[key];
                          newMappings[e.target.value] = value as string;
                          setTransformations((prev) => ({
                            ...prev,
                            travel_type: {
                              ...prev.travel_type!,
                              config: {
                                ...prev.travel_type!.config,
                                mappings: newMappings,
                              },
                            },
                          }));
                        }}
                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <span>→</span>
                      <input
                        type="text"
                        value={value as string}
                        onChange={(e) =>
                          setTransformations((prev) => ({
                            ...prev,
                            travel_type: {
                              ...prev.travel_type!,
                              config: {
                                ...prev.travel_type!.config,
                                mappings: {
                                  ...prev.travel_type!.config.mappings,
                                  [key]: e.target.value,
                                },
                              },
                            },
                          }))
                        }
                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Other Transformations (auto-detected) */}
              {Object.entries(transformations)
                .filter(
                  ([field]) =>
                    ![
                      "created_at",
                      "phone",
                      "title",
                      "business_type",
                      "hotel_choice",
                      "travel_type",
                    ].includes(field),
                )
                .map(([field, rule]) => (
                  <div key={field} className="p-4 bg-white rounded-lg border">
                    <h4 className="font-medium text-gray-900 mb-2">{field}</h4>
                    <div className="text-sm text-gray-600 mb-2">
                      Type: {(rule as any)?.type || "unknown"}
                    </div>
                    {(rule as any)?.type === "pass_through" ? (
                      <div className="text-sm text-gray-700">
                        Pass-through (no transformation)
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">
                          Rule (JSON)
                        </label>
                        <textarea
                          className="w-full border border-gray-300 rounded p-2 text-sm font-mono"
                          rows={4}
                          value={JSON.stringify(rule, null, 2)}
                          onChange={(e) => {
                            try {
                              const next = JSON.parse(e.target.value);
                              setTransformations((prev) => ({
                                ...prev,
                                [field]: next as any,
                              }));
                            } catch (_) {
                              // ignore bad JSON while typing
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Required Fields Warning */}
      {requiredMappings.length > 0 && (
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Required Fields Missing
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Please map the following required fields:</p>
                <ul className="list-disc list-inside mt-1">
                  {requiredMappings.map((mapping) => (
                    <li key={mapping.csvColumn}>{mapping.csvColumn}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
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
                Mapping Error
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={!canProceed || isLoading}
          className={`px-6 py-2 rounded-md font-medium ${
            canProceed && !isLoading
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-gray-300 text-gray-500 cursor-not-allowed"
          }`}
        >
          {isLoading ? "Processing..." : "Continue to Preview"}
        </button>
      </div>
    </div>
  );
}
