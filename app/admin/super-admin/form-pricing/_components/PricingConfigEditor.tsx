"use client";

import { useState, useEffect } from "react";
import { FormType } from "@/app/types/form-system";

interface PricingConfig {
  pricing_type: "fixed" | "tiered" | "early_bird";
  fixed_price?: number;
  tiered_pricing?: {
    tiers: Array<{
      name: string;
      min_quantity: number;
      max_quantity?: number;
      price_per_item: number;
    }>;
  };
  early_bird_pricing?: {
    early_price: number;
    regular_price: number;
    deadline: string; // ISO date
  };
  currency: string;
  tax_included: boolean;
  tax_rate?: number;
}

interface PricingConfigEditorProps {
  form: FormType;
  onClose: () => void;
  onSave: () => void;
}

export default function PricingConfigEditor({
  form,
  onClose,
  onSave,
}: PricingConfigEditorProps) {
  const [config, setConfig] = useState<PricingConfig>({
    pricing_type: "fixed",
    fixed_price: 0,
    currency: "THB",
    tax_included: false,
    tax_rate: 7,
  });

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadExistingConfig();
  }, [form]);

  const loadExistingConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/super-admin/form-pricing/${form.form_key}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.config) {
          setConfig(data.config);
        }
      }
    } catch (error) {
      console.error("Failed to load pricing config:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch(
        `/api/admin/super-admin/form-pricing/${form.form_key}`,
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
        alert(`Failed to save pricing config: ${error.message}`);
      }
    } catch (error) {
      console.error("Failed to save pricing config:", error);
      alert("Failed to save pricing config");
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (updates: Partial<PricingConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
  };

  const addTier = () => {
    const newTier = {
      name: `Tier ${(config.tiered_pricing?.tiers.length || 0) + 1}`,
      min_quantity: 1,
      max_quantity: undefined,
      price_per_item: 0,
    };

    updateConfig({
      tiered_pricing: {
        tiers: [...(config.tiered_pricing?.tiers || []), newTier],
      },
    });
  };

  const updateTier = (index: number, updates: any) => {
    const tiers = [...(config.tiered_pricing?.tiers || [])];
    tiers[index] = { ...tiers[index], ...updates };
    updateConfig({
      tiered_pricing: { tiers },
    });
  };

  const removeTier = (index: number) => {
    const tiers = [...(config.tiered_pricing?.tiers || [])];
    tiers.splice(index, 1);
    updateConfig({
      tiered_pricing: { tiers },
    });
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
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Pricing Configuration
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Configure pricing for: {form.name}
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
          {/* Pricing Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Pricing Type
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <label className="relative">
                <input
                  type="radio"
                  name="pricing_type"
                  value="fixed"
                  checked={config.pricing_type === "fixed"}
                  onChange={(e) => updateConfig({ pricing_type: e.target.value as any })}
                  className="sr-only"
                />
                <div
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    config.pricing_type === "fixed"
                      ? "border-yec-primary bg-yec-primary/10"
                      : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                  }`}
                >
                  <div className="font-medium text-gray-900 dark:text-white">Fixed Price</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Single price for all registrations
                  </div>
                </div>
              </label>

              <label className="relative">
                <input
                  type="radio"
                  name="pricing_type"
                  value="tiered"
                  checked={config.pricing_type === "tiered"}
                  onChange={(e) => updateConfig({ pricing_type: e.target.value as any })}
                  className="sr-only"
                />
                <div
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    config.pricing_type === "tiered"
                      ? "border-yec-primary bg-yec-primary/10"
                      : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                  }`}
                >
                  <div className="font-medium text-gray-900 dark:text-white">Tiered Pricing</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Different prices based on quantity
                  </div>
                </div>
              </label>

              <label className="relative">
                <input
                  type="radio"
                  name="pricing_type"
                  value="early_bird"
                  checked={config.pricing_type === "early_bird"}
                  onChange={(e) => updateConfig({ pricing_type: e.target.value as any })}
                  className="sr-only"
                />
                <div
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    config.pricing_type === "early_bird"
                      ? "border-yec-primary bg-yec-primary/10"
                      : "border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500"
                  }`}
                >
                  <div className="font-medium text-gray-900 dark:text-white">Early Bird</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Discounted price before deadline
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Fixed Price Configuration */}
          {config.pricing_type === "fixed" && (
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Fixed Price
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={config.fixed_price || 0}
                  onChange={(e) => updateConfig({ fixed_price: parseFloat(e.target.value) || 0 })}
                  className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                  min="0"
                  step="0.01"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {config.currency}
                </span>
              </div>
            </div>
          )}

          {/* Tiered Pricing Configuration */}
          {config.pricing_type === "tiered" && (
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Pricing Tiers
                </h3>
                <button
                  onClick={addTier}
                  className="px-3 py-1 text-sm bg-yec-primary text-white rounded hover:bg-yec-accent transition-colors"
                >
                  Add Tier
                </button>
              </div>

              <div className="space-y-3">
                {(config.tiered_pricing?.tiers || []).map((tier, index) => (
                  <div key={index} className="flex items-center space-x-2 p-3 bg-white dark:bg-gray-800 rounded border">
                    <input
                      type="text"
                      value={tier.name}
                      onChange={(e) => updateTier(index, { name: e.target.value })}
                      className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                      placeholder="Tier name"
                    />
                    <input
                      type="number"
                      value={tier.min_quantity}
                      onChange={(e) => updateTier(index, { min_quantity: parseInt(e.target.value) || 0 })}
                      className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                      placeholder="Min"
                    />
                    <input
                      type="number"
                      value={tier.max_quantity || ""}
                      onChange={(e) => updateTier(index, { max_quantity: e.target.value ? parseInt(e.target.value) : undefined })}
                      className="w-20 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                      placeholder="Max"
                    />
                    <input
                      type="number"
                      value={tier.price_per_item}
                      onChange={(e) => updateTier(index, { price_per_item: parseFloat(e.target.value) || 0 })}
                      className="w-24 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                      placeholder="Price"
                    />
                    <button
                      onClick={() => removeTier(index)}
                      className="px-2 py-1 text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-900 rounded"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Early Bird Pricing Configuration */}
          {config.pricing_type === "early_bird" && (
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Early Bird Price
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={config.early_bird_pricing?.early_price || 0}
                    onChange={(e) =>
                      updateConfig({
                        early_bird_pricing: {
                          ...config.early_bird_pricing,
                          early_price: parseFloat(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                    min="0"
                    step="0.01"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {config.currency}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Regular Price
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="number"
                    value={config.early_bird_pricing?.regular_price || 0}
                    onChange={(e) =>
                      updateConfig({
                        early_bird_pricing: {
                          ...config.early_bird_pricing,
                          regular_price: parseFloat(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                    min="0"
                    step="0.01"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {config.currency}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Early Bird Deadline
                </label>
                <input
                  type="datetime-local"
                  value={config.early_bird_pricing?.deadline || ""}
                  onChange={(e) =>
                    updateConfig({
                      early_bird_pricing: {
                        ...config.early_bird_pricing,
                        deadline: e.target.value,
                      },
                    })
                  }
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* Currency and Tax Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Currency
              </label>
              <select
                value={config.currency}
                onChange={(e) => updateConfig({ currency: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
              >
                <option value="THB">THB (Thai Baht)</option>
                <option value="USD">USD (US Dollar)</option>
                <option value="EUR">EUR (Euro)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tax Rate (%)
              </label>
              <input
                type="number"
                value={config.tax_rate || 0}
                onChange={(e) => updateConfig({ tax_rate: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-800 dark:text-white"
                min="0"
                max="100"
                step="0.01"
              />
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="tax_included"
              checked={config.tax_included}
              onChange={(e) => updateConfig({ tax_included: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="tax_included" className="text-sm text-gray-700 dark:text-gray-300">
              Tax included in price
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
            disabled={saving}
            className="px-4 py-2 bg-yec-primary text-white rounded-lg hover:bg-yec-accent disabled:opacity-50 transition-colors"
          >
            {saving ? "Saving..." : "Save Configuration"}
          </button>
        </div>
      </div>
    </div>
  );
}
