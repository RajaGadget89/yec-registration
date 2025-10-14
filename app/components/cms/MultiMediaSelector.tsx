"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  Search,
  Upload,
  Check,
  X,
  Image as ImageIcon,
  Plus,
} from "lucide-react";

interface MediaFile {
  id: string;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  alt_text: string;
  created_at: string;
  created_by: string | null;
}

interface MultiMediaSelectorProps {
  value: string[]; // Array of image URLs
  onChange: (urls: string[]) => void;
  _placeholder?: string;
  label?: string;
  required?: boolean;
  maxImages?: number;
}

export default function MultiMediaSelector({
  value = [],
  onChange,
  _placeholder = "Select images from library",
  label = "Images",
  required = false,
  maxImages = 10,
}: MultiMediaSelectorProps) {
  const [showModal, setShowModal] = useState(false);
  const [media, setMediaFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [selectedImages, setSelectedImages] = useState<MediaFile[]>([]);

  const fetchMedia = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: "1",
        limit: "50",
        ...(searchTerm && { search: searchTerm }),
        ...(filterType !== "all" && { type: filterType }),
      });

      const response = await fetch(`/api/admin/cms/media?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch media");
      }

      const data = await response.json();
      // Filter to only show image files
      const imageFiles = (data.media || []).filter((file: MediaFile) =>
        file.mime_type.startsWith("image/"),
      );
      setMediaFiles(imageFiles);
    } catch (error) {
      console.error("Error fetching media:", error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filterType]);

  useEffect(() => {
    if (showModal) {
      fetchMedia();
    }
  }, [showModal, fetchMedia]);

  const handleImageSelect = (file: MediaFile) => {
    if (selectedImages.find((img) => img.id === file.id)) {
      // Remove if already selected
      setSelectedImages((prev) => prev.filter((img) => img.id !== file.id));
    } else {
      // Add if not selected and under limit
      if (selectedImages.length < maxImages) {
        setSelectedImages((prev) => [...prev, file]);
      }
    }
  };

  const handleConfirmSelection = () => {
    const urls = selectedImages.map((img) => img.file_path);
    onChange(urls);
    setShowModal(false);
    setSelectedImages([]);
  };

  const handleRemoveImage = (index: number) => {
    const newUrls = value.filter((_, i) => i !== index);
    onChange(newUrls);
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const isImageSelected = (file: MediaFile) => {
    return selectedImages.some((img) => img.id === file.id);
  };

  const isImageInValue = (file: MediaFile) => {
    return value.includes(file.file_path);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <div className="space-y-2">
        {/* Selected Images Preview */}
        {value.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {value.length} image{value.length !== 1 ? "s" : ""} selected
              </span>
              <button
                type="button"
                onClick={handleClearAll}
                className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
              >
                Clear All
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {value.map((url, index) => (
                <div key={index} className="relative group">
                  <div className="aspect-square rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                    <Image
                      src={url}
                      alt={`Selected image ${index + 1}`}
                      width={100}
                      height={100}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className="absolute -top-1 -right-1 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add Images Button */}
        <button
          type="button"
          onClick={() => setShowModal(true)}
          disabled={value.length >= maxImages}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="h-4 w-4" />
          <span>
            {value.length >= maxImages
              ? `Maximum ${maxImages} images reached`
              : `Add Images (${value.length}/${maxImages})`}
          </span>
        </button>
      </div>

      {/* Media Library Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-6xl h-5/6 flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Select Images from Media Library
                {selectedImages.length > 0 && (
                  <span className="ml-2 text-sm text-blue-600">
                    ({selectedImages.length} selected)
                  </span>
                )}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSelectedImages([]);
                }}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Search and Filter */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex space-x-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search images..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white text-gray-900 placeholder-gray-500 shadow-sm focus:ring-2 focus:ring-yec-primary focus:border-yec-primary/50 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white text-gray-900 shadow-sm focus:ring-2 focus:ring-yec-primary focus:border-yec-primary/50 dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">All Images</option>
                  <option value="image/jpeg">JPEG</option>
                  <option value="image/png">PNG</option>
                  <option value="image/webp">WebP</option>
                  <option value="image/svg+xml">SVG</option>
                </select>
              </div>
            </div>

            {/* Media Grid */}
            <div className="flex-1 p-4 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : media.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-gray-500">
                  <ImageIcon className="h-12 w-12 mb-2" />
                  <p>No images found in media library</p>
                  <p className="text-sm">Upload some images to get started</p>
                </div>
              ) : (
                <div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {media.map((file) => {
                      const isSelected = isImageSelected(file);
                      const isInValue = isImageInValue(file);

                      return (
                        <div
                          key={file.id}
                          className={`relative group cursor-pointer bg-white rounded-lg border overflow-hidden hover:shadow-lg transition-shadow ${
                            isSelected
                              ? "border-blue-500 ring-2 ring-blue-200"
                              : isInValue
                                ? "border-green-500 ring-2 ring-green-200"
                                : "border-gray-200"
                          }`}
                          onClick={() => handleImageSelect(file)}
                        >
                          <div className="w-full aspect-square relative overflow-hidden">
                            {file.file_size < 1000 ? (
                              <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-100">
                                <svg
                                  className="w-8 h-8 mb-2"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                                <span className="text-sm">Small Image</span>
                              </div>
                            ) : (
                              <Image
                                src={file.file_path}
                                alt={file.original_filename}
                                width={200}
                                height={200}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = "none";
                                }}
                              />
                            )}
                          </div>
                          <div className="p-2">
                            <p className="text-xs text-gray-600 dark:text-gray-300 truncate">
                              {file.original_filename}
                            </p>
                            <p className="text-xs text-gray-400">
                              {(file.file_size / 1024).toFixed(1)} KB
                            </p>
                          </div>

                          {/* Selection Indicators */}
                          {isSelected && (
                            <div className="absolute inset-0 bg-blue-500 opacity-20 flex items-center justify-center">
                              <Check className="h-6 w-6 text-white" />
                            </div>
                          )}
                          {isInValue && !isSelected && (
                            <div className="absolute inset-0 bg-green-500 opacity-20 flex items-center justify-center">
                              <Check className="h-6 w-6 text-white" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  {selectedImages.length > 0 && (
                    <span>
                      {selectedImages.length} image
                      {selectedImages.length !== 1 ? "s" : ""} selected
                    </span>
                  )}
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setSelectedImages([]);
                    }}
                    className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      window.open("/admin/content-management/media", "_blank");
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                  >
                    <Upload className="h-4 w-4" />
                    <span>Upload New Images</span>
                  </button>
                  <button
                    onClick={handleConfirmSelection}
                    disabled={selectedImages.length === 0}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add Selected ({selectedImages.length})
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
