"use client";

import { useState } from "react";
import Image from "next/image";
import { X, Monitor, Smartphone, Eye, EyeOff } from "lucide-react";

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

interface BrandingPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  branding: BrandingConfig;
}

export default function BrandingPreview({
  isOpen,
  onClose,
  branding,
}: BrandingPreviewProps) {
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">(
    "desktop",
  );
  const [showColors, setShowColors] = useState(true);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <Eye className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Branding Preview
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Preview Controls */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setPreviewMode("desktop")}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
                    previewMode === "desktop"
                      ? "bg-white shadow-sm text-blue-600"
                      : "text-gray-600 dark:text-gray-400"
                  }`}
                >
                  <Monitor className="h-4 w-4" />
                  <span>Desktop</span>
                </button>
                <button
                  onClick={() => setPreviewMode("mobile")}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
                    previewMode === "mobile"
                      ? "bg-white shadow-sm text-blue-600"
                      : "text-gray-600 dark:text-gray-400"
                  }`}
                >
                  <Smartphone className="h-4 w-4" />
                  <span>Mobile</span>
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowColors(!showColors)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                  showColors
                    ? "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                }`}
              >
                {showColors ? (
                  <Eye className="h-4 w-4" />
                ) : (
                  <EyeOff className="h-4 w-4" />
                )}
                <span>Color Preview</span>
              </button>
            </div>
          </div>
        </div>

        {/* Preview Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div
            className={`mx-auto ${previewMode === "mobile" ? "max-w-sm" : "max-w-4xl"}`}
          >
            {/* Website Header Preview */}
            <div
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm mb-6"
              style={
                showColors && branding.brand_colors?.background
                  ? { backgroundColor: branding.brand_colors.background }
                  : {}
              }
            >
              {/* Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* Logo */}
                    {branding.logo_desktop_url && (
                      <div className="h-12 w-auto">
                        <Image
                          src={branding.logo_desktop_url}
                          alt="Desktop Logo"
                          width={200}
                          height={48}
                          className="h-full w-auto object-contain"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = "none";
                          }}
                        />
                      </div>
                    )}
                    <div>
                      <h1
                        className="text-xl font-bold"
                        style={
                          showColors && branding.brand_colors?.text
                            ? { color: branding.brand_colors.text }
                            : {}
                        }
                      >
                        YEC Registration System
                      </h1>
                      <p
                        className="text-sm text-gray-600 dark:text-gray-400"
                        style={
                          showColors && branding.brand_colors?.text
                            ? {
                                color: branding.brand_colors.text,
                                opacity: 0.7,
                              }
                            : {}
                        }
                      >
                        Your Business Network Platform
                      </p>
                    </div>
                  </div>

                  {/* Navigation */}
                  <nav className="hidden md:flex space-x-6">
                    <a
                      href="#"
                      className="text-sm font-medium hover:text-blue-600 transition-colors"
                      style={
                        showColors && branding.brand_colors?.primary
                          ? { color: branding.brand_colors.primary }
                          : {}
                      }
                    >
                      Home
                    </a>
                    <a
                      href="#"
                      className="text-sm font-medium hover:text-blue-600 transition-colors"
                      style={
                        showColors && branding.brand_colors?.primary
                          ? { color: branding.brand_colors.primary }
                          : {}
                      }
                    >
                      About
                    </a>
                    <a
                      href="#"
                      className="text-sm font-medium hover:text-blue-600 transition-colors"
                      style={
                        showColors && branding.brand_colors?.primary
                          ? { color: branding.brand_colors.primary }
                          : {}
                      }
                    >
                      Contact
                    </a>
                  </nav>
                </div>
              </div>

              {/* Hero Section */}
              <div className="p-8 text-center">
                <h2
                  className="text-3xl font-bold mb-4"
                  style={
                    showColors && branding.brand_colors?.text
                      ? { color: branding.brand_colors.text }
                      : {}
                  }
                >
                  Welcome to YEC
                </h2>
                <p
                  className="text-lg mb-6"
                  style={
                    showColors && branding.brand_colors?.text
                      ? { color: branding.brand_colors.text, opacity: 0.8 }
                      : {}
                  }
                >
                  Join our business network and grow your enterprise
                </p>
                <button
                  className="px-6 py-3 rounded-lg font-medium transition-colors"
                  style={
                    showColors && branding.brand_colors?.primary
                      ? {
                          backgroundColor: branding.brand_colors.primary,
                          color: "white",
                        }
                      : {
                          backgroundColor: "#3b82f6",
                          color: "white",
                        }
                  }
                >
                  Get Started
                </button>
              </div>
            </div>

            {/* Color Palette Preview */}
            {showColors && branding.brand_colors && (
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                  Color Palette Preview
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {branding.brand_colors.primary && (
                    <div className="text-center">
                      <div
                        className="w-16 h-16 rounded-lg mx-auto mb-2 border border-gray-200"
                        style={{
                          backgroundColor: branding.brand_colors.primary,
                        }}
                      ></div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Primary
                      </p>
                      <p className="text-xs font-mono text-gray-500">
                        {branding.brand_colors.primary}
                      </p>
                    </div>
                  )}
                  {branding.brand_colors.secondary && (
                    <div className="text-center">
                      <div
                        className="w-16 h-16 rounded-lg mx-auto mb-2 border border-gray-200"
                        style={{
                          backgroundColor: branding.brand_colors.secondary,
                        }}
                      ></div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Secondary
                      </p>
                      <p className="text-xs font-mono text-gray-500">
                        {branding.brand_colors.secondary}
                      </p>
                    </div>
                  )}
                  {branding.brand_colors.accent && (
                    <div className="text-center">
                      <div
                        className="w-16 h-16 rounded-lg mx-auto mb-2 border border-gray-200"
                        style={{
                          backgroundColor: branding.brand_colors.accent,
                        }}
                      ></div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Accent
                      </p>
                      <p className="text-xs font-mono text-gray-500">
                        {branding.brand_colors.accent}
                      </p>
                    </div>
                  )}
                  {branding.brand_colors.background && (
                    <div className="text-center">
                      <div
                        className="w-16 h-16 rounded-lg mx-auto mb-2 border border-gray-200"
                        style={{
                          backgroundColor: branding.brand_colors.background,
                        }}
                      ></div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Background
                      </p>
                      <p className="text-xs font-mono text-gray-500">
                        {branding.brand_colors.background}
                      </p>
                    </div>
                  )}
                  {branding.brand_colors.text && (
                    <div className="text-center">
                      <div
                        className="w-16 h-16 rounded-lg mx-auto mb-2 border border-gray-200"
                        style={{ backgroundColor: branding.brand_colors.text }}
                      ></div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Text
                      </p>
                      <p className="text-xs font-mono text-gray-500">
                        {branding.brand_colors.text}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Logo Preview */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                Logo Preview
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Desktop Logo */}
                <div className="text-center">
                  <h4 className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
                    Desktop Logo
                  </h4>
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                    {branding.logo_desktop_url ? (
                      <Image
                        src={branding.logo_desktop_url}
                        alt="Desktop Logo Preview"
                        width={200}
                        height={64}
                        className="max-h-16 w-auto mx-auto"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="h-16 flex items-center justify-center text-gray-400">
                        <span className="text-sm">No desktop logo</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Mobile Logo */}
                <div className="text-center">
                  <h4 className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
                    Mobile Logo
                  </h4>
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                    {branding.logo_mobile_url ? (
                      <Image
                        src={branding.logo_mobile_url}
                        alt="Mobile Logo Preview"
                        width={150}
                        height={64}
                        className="max-h-16 w-auto mx-auto"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="h-16 flex items-center justify-center text-gray-400">
                        <span className="text-sm">No mobile logo</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Favicon */}
                <div className="text-center">
                  <h4 className="text-sm font-medium mb-3 text-gray-700 dark:text-gray-300">
                    Favicon
                  </h4>
                  <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                    {branding.logo_favicon_url ? (
                      <Image
                        src={branding.logo_favicon_url}
                        alt="Favicon Preview"
                        width={32}
                        height={32}
                        className="h-8 w-8 mx-auto"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="h-8 w-8 flex items-center justify-center text-gray-400 mx-auto">
                        <span className="text-xs">No favicon</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This is a preview of how your branding will appear on the website
            </p>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
