"use client";

import { useState, useEffect } from "react";
import { Save, Upload, Palette, Monitor, Smartphone, Globe } from "lucide-react";

interface BrandingConfig {
  id?: string;
  logo_desktop_url?: string;
  logo_mobile_url?: string;
  logo_favicon_url?: string;
  brand_colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
    text?: string;
  };
  is_active?: boolean;
}

export default function BrandingManagement() {
  const [branding, setBranding] = useState<BrandingConfig>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchBranding();
  }, []);

  const fetchBranding = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/cms/branding");
      if (!response.ok) {
        throw new Error("Failed to fetch branding configuration");
      }

      const data = await response.json();
      setBranding(data.branding || {});
    } catch (error) {
      console.error("Error fetching branding:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch("/api/admin/cms/branding", {
        method: branding.id ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(branding),
      });

      if (!response.ok) {
        throw new Error("Failed to save branding configuration");
      }

      const data = await response.json();
      setBranding(data);
      alert("Branding configuration saved successfully!");
    } catch (error) {
      console.error("Error saving branding:", error);
      alert("Failed to save branding configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (type: "desktop" | "mobile" | "favicon", file: File) => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "branding");

      const response = await fetch("/api/admin/cms/media/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload logo");
      }

      const data = await response.json();
      setBranding(prev => ({
        ...prev,
        [`logo_${type}_url`]: data.url
      }));
    } catch (error) {
      console.error("Error uploading logo:", error);
      alert("Failed to upload logo");
    }
  };

  const handleColorChange = (colorKey: string, value: string) => {
    setBranding(prev => ({
      ...prev,
      brand_colors: {
        ...prev.brand_colors,
        [colorKey]: value
      }
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yec-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Logo Management */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Logo Management</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Desktop Logo */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Monitor className="h-5 w-5 text-gray-500" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Desktop Logo</h3>
            </div>
            <div className="aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600">
              {branding.logo_desktop_url ? (
                <img
                  src={branding.logo_desktop_url}
                  alt="Desktop Logo"
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <Upload className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">No desktop logo</p>
                </div>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && handleLogoUpload("desktop", e.target.files[0])}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-yec-primary file:text-white hover:file:bg-yec-accent"
            />
          </div>

          {/* Mobile Logo */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Smartphone className="h-5 w-5 text-gray-500" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Mobile Logo</h3>
            </div>
            <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600">
              {branding.logo_mobile_url ? (
                <img
                  src={branding.logo_mobile_url}
                  alt="Mobile Logo"
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <Upload className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">No mobile logo</p>
                </div>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && handleLogoUpload("mobile", e.target.files[0])}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-yec-primary file:text-white hover:file:bg-yec-accent"
            />
          </div>

          {/* Favicon */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Globe className="h-5 w-5 text-gray-500" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Favicon</h3>
            </div>
            <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600">
              {branding.logo_favicon_url ? (
                <img
                  src={branding.logo_favicon_url}
                  alt="Favicon"
                  className="w-8 h-8 object-contain"
                />
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <Upload className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">No favicon</p>
                </div>
              )}
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && handleLogoUpload("favicon", e.target.files[0])}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-yec-primary file:text-white hover:file:bg-yec-accent"
            />
          </div>
        </div>
      </div>

      {/* Brand Colors */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Palette className="h-5 w-5 text-gray-500" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Brand Colors</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Primary Color
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                value={branding.brand_colors?.primary || "#3B82F6"}
                onChange={(e) => handleColorChange("primary", e.target.value)}
                className="w-12 h-10 rounded border border-gray-300 dark:border-gray-600"
              />
              <input
                type="text"
                value={branding.brand_colors?.primary || ""}
                onChange={(e) => handleColorChange("primary", e.target.value)}
                placeholder="#3B82F6"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Secondary Color
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                value={branding.brand_colors?.secondary || "#10B981"}
                onChange={(e) => handleColorChange("secondary", e.target.value)}
                className="w-12 h-10 rounded border border-gray-300 dark:border-gray-600"
              />
              <input
                type="text"
                value={branding.brand_colors?.secondary || ""}
                onChange={(e) => handleColorChange("secondary", e.target.value)}
                placeholder="#10B981"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Accent Color
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                value={branding.brand_colors?.accent || "#F59E0B"}
                onChange={(e) => handleColorChange("accent", e.target.value)}
                className="w-12 h-10 rounded border border-gray-300 dark:border-gray-600"
              />
              <input
                type="text"
                value={branding.brand_colors?.accent || ""}
                onChange={(e) => handleColorChange("accent", e.target.value)}
                placeholder="#F59E0B"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Background Color
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                value={branding.brand_colors?.background || "#FFFFFF"}
                onChange={(e) => handleColorChange("background", e.target.value)}
                className="w-12 h-10 rounded border border-gray-300 dark:border-gray-600"
              />
              <input
                type="text"
                value={branding.brand_colors?.background || ""}
                onChange={(e) => handleColorChange("background", e.target.value)}
                placeholder="#FFFFFF"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Text Color
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                value={branding.brand_colors?.text || "#1F2937"}
                onChange={(e) => handleColorChange("text", e.target.value)}
                className="w-12 h-10 rounded border border-gray-300 dark:border-gray-600"
              />
              <input
                type="text"
                value={branding.brand_colors?.text || ""}
                onChange={(e) => handleColorChange("text", e.target.value)}
                placeholder="#1F2937"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center space-x-2 px-6 py-3 bg-yec-primary text-white rounded-lg hover:bg-yec-accent transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
          ) : (
            <Save className="h-4 w-4" />
          )}
          <span>{saving ? "Saving..." : "Save Branding"}</span>
        </button>
      </div>
    </div>
  );
}
