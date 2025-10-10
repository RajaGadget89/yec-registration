"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Save,
  Upload,
  Palette,
  Monitor,
  Smartphone,
  Globe,
  Image as ImageIcon,
  X,
  Eye,
} from "lucide-react";
import MediaLibraryModal from "./MediaLibraryModal";
import BrandingPreview from "./BrandingPreview";

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

interface MediaFile {
  id: string;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  alt_text?: string;
  created_at: string;
  created_by: string;
}

export default function BrandingManagement() {
  const [branding, setBranding] = useState<BrandingConfig>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Media Library modal state
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [currentLogoType, setCurrentLogoType] = useState<
    "desktop" | "mobile" | "favicon" | null
  >(null);
  const [selectedImageDetails, setSelectedImageDetails] = useState<{
    [key: string]: MediaFile;
  }>({});

  // Preview modal state
  const [showPreview, setShowPreview] = useState(false);

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

  const isHex = (v?: string) => /^#?[0-9a-fA-F]{6}$/.test(v || "");

  const handleSave = async () => {
    try {
      setError(null);
      const c = branding.brand_colors || {};
      if (c.primary && !isHex(c.primary))
        return setError("Primary must be a 6-digit hex color");
      if (c.secondary && !isHex(c.secondary))
        return setError("Secondary must be a 6-digit hex color");
      if (c.accent && !isHex(c.accent))
        return setError("Accent must be a 6-digit hex color");
      if (c.background && !isHex(c.background))
        return setError("Background must be a 6-digit hex color");
      if (c.text && !isHex(c.text))
        return setError("Text must be a 6-digit hex color");
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
    } catch (error) {
      console.error("Error saving branding:", error);
      setError("Failed to save branding configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (
    type: "desktop" | "mobile" | "favicon",
    file: File,
  ) => {
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
      setBranding((prev) => ({
        ...prev,
        [`logo_${type}_url`]: data.url,
      }));
    } catch (error) {
      console.error("Error uploading logo:", error);
      alert("Failed to upload logo");
    }
  };

  const handleColorChange = (colorKey: string, value: string) => {
    setBranding((prev) => ({
      ...prev,
      brand_colors: {
        ...prev.brand_colors,
        [colorKey]: value,
      },
    }));
  };

  // Media Library handlers
  const openMediaLibrary = (logoType: "desktop" | "mobile" | "favicon") => {
    setCurrentLogoType(logoType);
    setShowMediaLibrary(true);
  };

  const handleImageSelect = (file: MediaFile) => {
    if (!currentLogoType) return;

    setBranding((prev) => ({
      ...prev,
      [`logo_${currentLogoType}_url`]: file.file_path,
    }));

    setSelectedImageDetails((prev) => ({
      ...prev,
      [currentLogoType]: file,
    }));

    setShowMediaLibrary(false);
    setCurrentLogoType(null);
  };

  const handleRemoveImage = (logoType: "desktop" | "mobile" | "favicon") => {
    setBranding((prev) => ({
      ...prev,
      [`logo_${logoType}_url`]: undefined,
    }));

    setSelectedImageDetails((prev) => {
      const newDetails = { ...prev };
      delete newDetails[logoType];
      return newDetails;
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getImageDimensions = (file: MediaFile) => {
    return {
      size: formatFileSize(file.file_size),
      type: file.mime_type.split("/")[1].toUpperCase(),
    };
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
      <Link
        href="/admin/content-management"
        className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
      >
        ← Back to CMS
      </Link>
      {/* Logo Management */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
          Logo Management
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Desktop Logo */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Monitor className="h-5 w-5 text-gray-500" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Desktop Logo
              </h3>
            </div>
            <div className="aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 relative group">
              {branding.logo_desktop_url &&
              branding.logo_desktop_url.startsWith("http") ? (
                <>
                  <Image
                    src={branding.logo_desktop_url}
                    alt="Desktop Logo"
                    width={200}
                    height={100}
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                    }}
                  />
                  <button
                    onClick={() => handleRemoveImage("desktop")}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </>
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <Upload className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">No desktop logo</p>
                </div>
              )}
            </div>

            {/* Image Details Display */}
            {selectedImageDetails.desktop && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 space-y-1">
                <p className="text-xs font-medium text-gray-900 dark:text-white">
                  {selectedImageDetails.desktop.original_filename}
                </p>
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>
                    {getImageDimensions(selectedImageDetails.desktop).size}
                  </span>
                  <span>
                    {getImageDimensions(selectedImageDetails.desktop).type}
                  </span>
                </div>
              </div>
            )}

            <div className="flex space-x-2">
              <button
                onClick={() => openMediaLibrary("desktop")}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-yec-primary text-white rounded-lg hover:bg-yec-accent transition-colors"
              >
                <ImageIcon className="h-4 w-4" />
                <span>Browse Media</span>
              </button>
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  e.target.files?.[0] &&
                  handleLogoUpload("desktop", e.target.files[0])
                }
                className="hidden"
                id="desktop-upload"
              />
              <label
                htmlFor="desktop-upload"
                className="flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              >
                <Upload className="h-4 w-4" />
              </label>
            </div>
          </div>

          {/* Mobile Logo */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Smartphone className="h-5 w-5 text-gray-500" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Mobile Logo
              </h3>
            </div>
            <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 relative group">
              {branding.logo_mobile_url &&
              branding.logo_mobile_url.startsWith("http") ? (
                <>
                  <Image
                    src={branding.logo_mobile_url}
                    alt="Mobile Logo"
                    width={150}
                    height={150}
                    className="max-w-full max-h-full object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                    }}
                  />
                  <button
                    onClick={() => handleRemoveImage("mobile")}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </>
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <Upload className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">No mobile logo</p>
                </div>
              )}
            </div>

            {/* Image Details Display */}
            {selectedImageDetails.mobile && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 space-y-1">
                <p className="text-xs font-medium text-gray-900 dark:text-white">
                  {selectedImageDetails.mobile.original_filename}
                </p>
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>
                    {getImageDimensions(selectedImageDetails.mobile).size}
                  </span>
                  <span>
                    {getImageDimensions(selectedImageDetails.mobile).type}
                  </span>
                </div>
              </div>
            )}

            <div className="flex space-x-2">
              <button
                onClick={() => openMediaLibrary("mobile")}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-yec-primary text-white rounded-lg hover:bg-yec-accent transition-colors"
              >
                <ImageIcon className="h-4 w-4" />
                <span>Browse Media</span>
              </button>
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  e.target.files?.[0] &&
                  handleLogoUpload("mobile", e.target.files[0])
                }
                className="hidden"
                id="mobile-upload"
              />
              <label
                htmlFor="mobile-upload"
                className="flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              >
                <Upload className="h-4 w-4" />
              </label>
            </div>
          </div>

          {/* Favicon */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Globe className="h-5 w-5 text-gray-500" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Favicon
              </h3>
            </div>
            <div className="aspect-square bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 relative group">
              {branding.logo_favicon_url &&
              branding.logo_favicon_url.startsWith("http") ? (
                <>
                  <Image
                    src={branding.logo_favicon_url}
                    alt="Favicon"
                    width={32}
                    height={32}
                    className="w-8 h-8 object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                    }}
                  />
                  <button
                    onClick={() => handleRemoveImage("favicon")}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </>
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <Upload className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">No favicon</p>
                </div>
              )}
            </div>

            {/* Image Details Display */}
            {selectedImageDetails.favicon && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 space-y-1">
                <p className="text-xs font-medium text-gray-900 dark:text-white">
                  {selectedImageDetails.favicon.original_filename}
                </p>
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>
                    {getImageDimensions(selectedImageDetails.favicon).size}
                  </span>
                  <span>
                    {getImageDimensions(selectedImageDetails.favicon).type}
                  </span>
                </div>
              </div>
            )}

            <div className="flex space-x-2">
              <button
                onClick={() => openMediaLibrary("favicon")}
                className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-yec-primary text-white rounded-lg hover:bg-yec-accent transition-colors"
              >
                <ImageIcon className="h-4 w-4" />
                <span>Browse Media</span>
              </button>
              <input
                type="file"
                accept="image/*"
                onChange={(e) =>
                  e.target.files?.[0] &&
                  handleLogoUpload("favicon", e.target.files[0])
                }
                className="hidden"
                id="favicon-upload"
              />
              <label
                htmlFor="favicon-upload"
                className="flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              >
                <Upload className="h-4 w-4" />
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Brand Colors */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center space-x-2 mb-6">
          <Palette className="h-5 w-5 text-gray-500" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Brand Colors
          </h2>
        </div>

        {error && (
          <div className="mb-4 rounded-md bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
            {error}
          </div>
        )}

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
                onChange={(e) =>
                  handleColorChange("background", e.target.value)
                }
                className="w-12 h-10 rounded border border-gray-300 dark:border-gray-600"
              />
              <input
                type="text"
                value={branding.brand_colors?.background || ""}
                onChange={(e) =>
                  handleColorChange("background", e.target.value)
                }
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

      {/* Action Buttons */}
      <div className="flex justify-between">
        <button
          onClick={() => setShowPreview(true)}
          className="flex items-center space-x-2 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors duration-200"
        >
          <Eye className="h-4 w-4" />
          <span>Preview Changes</span>
        </button>

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

      {/* Media Library Modal */}
      <MediaLibraryModal
        isOpen={showMediaLibrary}
        onClose={() => {
          setShowMediaLibrary(false);
          setCurrentLogoType(null);
        }}
        onSelect={handleImageSelect}
        title="Select Image from Media Library"
      />

      {/* Branding Preview Modal */}
      <BrandingPreview
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        branding={branding}
      />
    </div>
  );
}
