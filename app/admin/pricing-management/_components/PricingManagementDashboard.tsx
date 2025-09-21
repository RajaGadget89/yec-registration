"use client";

import { useState, useEffect } from "react";
import {
  DollarSign,
  Calendar,
  Settings,
  Save,
  RotateCcw,
  Eye,
} from "lucide-react";
import TimezoneAwareDateTimePicker from "./TimezoneAwareDateTimePicker";

interface PricingConfig {
  earlyBirdDeadline: string;
  prices: {
    earlyBirdOutOfQuota: number;
    earlyBirdInQuotaDouble: number;
    earlyBirdInQuotaSingle: number;
    normalOutOfQuota: number;
    normalInQuotaDouble: number;
    normalInQuotaSingle: number;
  };
  allowInQuotaAfterEarlyBird: boolean;
  inQuotaSurchargeAfterEarlyBird: number;
}

interface PricingStats {
  totalRegistrations: number;
  earlyBirdRegistrations: number;
  totalRevenue: number;
  averagePrice: number;
  priceDistribution: {
    outOfQuota: number;
    inQuotaDouble: number;
    inQuotaSingle: number;
    noAccommodation: number;
  };
}

export default function PricingManagementDashboard() {
  const [config, setConfig] = useState<PricingConfig | null>(null);
  const [originalConfig, setOriginalConfig] = useState<PricingConfig | null>(
    null,
  );
  const [stats, setStats] = useState<PricingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Fetch initial data
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [configResponse, statsResponse] = await Promise.all([
        fetch("/api/admin/pricing/config"),
        fetch("/api/admin/pricing/stats"),
      ]);

      if (!configResponse.ok) {
        throw new Error("Failed to fetch pricing configuration");
      }

      const configData = await configResponse.json();
      setConfig(configData);
      setOriginalConfig(configData);

      // Fetch stats if available
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setError(error instanceof Error ? error.message : "Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch("/api/admin/pricing/config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save configuration");
      }

      setSuccess("Pricing configuration updated successfully!");
      setOriginalConfig(config);

      // Refresh stats after saving
      fetchData();
    } catch (error) {
      console.error("Error saving configuration:", error);
      setError(
        error instanceof Error ? error.message : "Failed to save configuration",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (originalConfig) {
      setConfig(originalConfig);
      setError(null);
      setSuccess(null);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    if (!config) return;

    if (field.includes(".")) {
      const [parent, child] = field.split(".");
      const parentValue = config[parent as keyof PricingConfig];
      setConfig({
        ...config,
        [parent]: {
          ...(parentValue && typeof parentValue === "object"
            ? parentValue
            : {}),
          [child]: value,
        },
      });
    } else {
      setConfig({
        ...config,
        [field]: value,
      });
    }
  };

  const isDirty = JSON.stringify(config) !== JSON.stringify(originalConfig);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yec-primary"></div>
        <span className="ml-2 text-gray-600 dark:text-gray-300">
          Loading pricing configuration...
        </span>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 dark:text-red-400">
          Failed to load pricing configuration
        </p>
        <button
          onClick={fetchData}
          className="mt-4 px-4 py-2 bg-yec-primary text-white rounded-lg hover:bg-yec-primary/90 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <DollarSign className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Total Revenue
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {new Intl.NumberFormat("th-TH", {
                    style: "currency",
                    currency: "THB",
                  }).format(stats.totalRevenue)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <Calendar className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Early Bird
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.earlyBirdRegistrations}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Settings className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Total Registrations
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalRegistrations}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <DollarSign className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  Average Price
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {new Intl.NumberFormat("th-TH", {
                    style: "currency",
                    currency: "THB",
                  }).format(stats.averagePrice)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Configuration Form */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Pricing Configuration
            </h2>
            <div className="flex space-x-2">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <Eye className="h-4 w-4 mr-1" />
                Preview
              </button>
              <button
                onClick={handleReset}
                disabled={!isDirty}
                className="flex items-center px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </button>
              <button
                onClick={handleSave}
                disabled={!isDirty || saving}
                className="flex items-center px-4 py-2 text-sm bg-yec-primary text-white rounded-lg hover:bg-yec-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="h-4 w-4 mr-1" />
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Error/Success Messages */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-green-800 dark:text-green-200">{success}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Early Bird Deadline */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Early Bird Settings
              </h3>

              <TimezoneAwareDateTimePicker
                value={config.earlyBirdDeadline}
                onChange={(value) =>
                  handleInputChange("earlyBirdDeadline", value)
                }
                label="Early Bird Deadline"
                placeholder="Select early bird deadline"
                disabled={saving}
              />

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="allowInQuotaAfterEarlyBird"
                  checked={config.allowInQuotaAfterEarlyBird}
                  onChange={(e) =>
                    handleInputChange(
                      "allowInQuotaAfterEarlyBird",
                      e.target.checked,
                    )
                  }
                  className="h-4 w-4 text-yec-primary focus:ring-yec-primary border-gray-300 rounded"
                />
                <label
                  htmlFor="allowInQuotaAfterEarlyBird"
                  className="ml-2 text-sm text-gray-700 dark:text-gray-300"
                >
                  Allow in-quota options after early bird period
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  In-quota Surcharge After Early Bird (THB)
                </label>
                <input
                  type="number"
                  min="0"
                  value={config.inQuotaSurchargeAfterEarlyBird}
                  onChange={(e) =>
                    handleInputChange(
                      "inQuotaSurchargeAfterEarlyBird",
                      parseInt(e.target.value) || 0,
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            {/* Price Fields */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Price Configuration
              </h3>

              {/* Early Bird Prices */}
              <div className="space-y-3">
                <h4 className="text-md font-medium text-gray-800 dark:text-gray-200">
                  Early Bird Prices
                </h4>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Out of Quota (THB)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={config.prices.earlyBirdOutOfQuota}
                    onChange={(e) =>
                      handleInputChange(
                        "prices.earlyBirdOutOfQuota",
                        parseInt(e.target.value) || 0,
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    In Quota - Double Room (THB)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={config.prices.earlyBirdInQuotaDouble}
                    onChange={(e) =>
                      handleInputChange(
                        "prices.earlyBirdInQuotaDouble",
                        parseInt(e.target.value) || 0,
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    In Quota - Single Room (THB)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={config.prices.earlyBirdInQuotaSingle}
                    onChange={(e) =>
                      handleInputChange(
                        "prices.earlyBirdInQuotaSingle",
                        parseInt(e.target.value) || 0,
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>

              {/* Normal Prices */}
              <div className="space-y-3">
                <h4 className="text-md font-medium text-gray-800 dark:text-gray-200">
                  Normal Prices
                </h4>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Out of Quota (THB)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={config.prices.normalOutOfQuota}
                    onChange={(e) =>
                      handleInputChange(
                        "prices.normalOutOfQuota",
                        parseInt(e.target.value) || 0,
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    In Quota - Double Room (THB)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={config.prices.normalInQuotaDouble}
                    onChange={(e) =>
                      handleInputChange(
                        "prices.normalInQuotaDouble",
                        parseInt(e.target.value) || 0,
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    In Quota - Single Room (THB)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={config.prices.normalInQuotaSingle}
                    onChange={(e) =>
                      handleInputChange(
                        "prices.normalInQuotaSingle",
                        parseInt(e.target.value) || 0,
                      )
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Preview Section */}
          {showPreview && (
            <div className="mt-8 p-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Price Preview
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">
                    Early Bird Prices
                  </h4>
                  <div className="space-y-1 text-sm">
                    <p>
                      Out of Quota:{" "}
                      {new Intl.NumberFormat("th-TH", {
                        style: "currency",
                        currency: "THB",
                      }).format(config.prices.earlyBirdOutOfQuota)}
                    </p>
                    <p>
                      In Quota - Double:{" "}
                      {new Intl.NumberFormat("th-TH", {
                        style: "currency",
                        currency: "THB",
                      }).format(config.prices.earlyBirdInQuotaDouble)}
                    </p>
                    <p>
                      In Quota - Single:{" "}
                      {new Intl.NumberFormat("th-TH", {
                        style: "currency",
                        currency: "THB",
                      }).format(config.prices.earlyBirdInQuotaSingle)}
                    </p>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800 dark:text-gray-200 mb-2">
                    Normal Prices
                  </h4>
                  <div className="space-y-1 text-sm">
                    <p>
                      Out of Quota:{" "}
                      {new Intl.NumberFormat("th-TH", {
                        style: "currency",
                        currency: "THB",
                      }).format(config.prices.normalOutOfQuota)}
                    </p>
                    <p>
                      In Quota - Double:{" "}
                      {new Intl.NumberFormat("th-TH", {
                        style: "currency",
                        currency: "THB",
                      }).format(config.prices.normalInQuotaDouble)}
                    </p>
                    <p>
                      In Quota - Single:{" "}
                      {new Intl.NumberFormat("th-TH", {
                        style: "currency",
                        currency: "THB",
                      }).format(config.prices.normalInQuotaSingle)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
