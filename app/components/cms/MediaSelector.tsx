"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  Search,
  Upload,
  Eye,
  Check,
  X,
  Image as ImageIcon,
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

interface MediaSelectorProps {
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  accept?: string[];
}

export default function MediaSelector({
  value,
  onChange,
  placeholder = "Enter image URL or select from library",
  accept: _accept,
  label = "Image URL",
  required = false,
}: MediaSelectorProps) {
  const [showModal, setShowModal] = useState(false);
  const [media, setMediaFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [selectedImage, setSelectedImage] = useState<MediaFile | null>(null);
  const [imageDimensions, setImageDimensions] = useState<
    Record<string, { width: number; height: number }>
  >({});
  // Preview controls
  const [aspectRatio, setAspectRatio] = useState<
    "1:1" | "16:9" | "4:3" | "3:2"
  >("1:1");
  const [fitMode, setFitMode] = useState<"cover" | "contain">("cover");
  const [objectPosition, setObjectPosition] = useState<{
    x: number;
    y: number;
  }>({ x: 50, y: 50 });

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
      setMediaFiles(data.media || []);
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
    setSelectedImage(file);
    onChange(file.file_path);
    setShowModal(false);
  };

  const handleClearImage = () => {
    setSelectedImage(null);
    onChange("");
  };

  const getImagePreview = () => {
    if (selectedImage) {
      return selectedImage.file_path;
    }
    if (value && value.startsWith("http")) {
      return value;
    }
    return null;
  };

  const _isValidImageUrl = (url: string) => {
    return url && (url.startsWith("http") || url.startsWith("/"));
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <div className="space-y-2">
        {/* Image Preview Controls */}
        {getImagePreview() && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
            <div className="flex items-center gap-1">
              <span className="font-medium">Ratio:</span>
              {(["1:1", "16:9", "4:3", "3:2"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setAspectRatio(r)}
                  className={`px-2 py-1 rounded-md border ${aspectRatio === r ? "bg-blue-600 text-white border-blue-600" : "bg-white/70 dark:bg-gray-800/50 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"}`}
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1">
              <span className="font-medium">Fit:</span>
              {(["cover", "contain"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setFitMode(m)}
                  className={`px-2 py-1 rounded-md border capitalize ${fitMode === m ? "bg-blue-600 text-white border-blue-600" : "bg-white/70 dark:bg-gray-800/50 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"}`}
                >
                  {m}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setObjectPosition({ x: 50, y: 50 })}
              className="px-2 py-1 rounded-md border bg-white/70 dark:bg-gray-800/50 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Reset focal
            </button>
          </div>
        )}

        {/* Image Preview */}
        {getImagePreview() && (
          <div
            className={`relative rounded-xl overflow-hidden ring-1 ring-gray-200 dark:ring-gray-700 bg-gray-50 dark:bg-gray-800/40 shadow-sm mx-auto max-w-sm md:max-w-md ${
              aspectRatio === "1:1"
                ? "aspect-square"
                : aspectRatio === "16:9"
                  ? "aspect-[16/9]"
                  : aspectRatio === "4:3"
                    ? "aspect-[4/3]"
                    : "aspect-[3/2]"
            }`}
            onClick={(e) => {
              // set focal point based on click position
              const rect = (
                e.currentTarget as HTMLDivElement
              ).getBoundingClientRect();
              const x = Math.max(
                0,
                Math.min(100, ((e.clientX - rect.left) / rect.width) * 100),
              );
              const y = Math.max(
                0,
                Math.min(100, ((e.clientY - rect.top) / rect.height) * 100),
              );
              setObjectPosition({ x, y });
            }}
            title="Click to set focal point"
          >
            <Image
              src={getImagePreview()!}
              alt="Preview"
              width={400}
              height={300}
              className={`w-full h-full ${fitMode === "cover" ? "object-cover" : "object-contain"} transition-transform duration-300 ease-out hover:scale-[1.005]`}
              style={{
                objectPosition: `${objectPosition.x}% ${objectPosition.y}%`,
              }}
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            {/* Focal point indicator */}
            <div
              className="absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full bg-white shadow ring-2 ring-blue-600 pointer-events-none"
              style={{
                left: `${objectPosition.x}%`,
                top: `${objectPosition.y}%`,
              }}
            />
            <button
              onClick={handleClearImage}
              className="absolute top-2 right-2 p-1.5 bg-red-600/90 text-white rounded-full hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-400 shadow"
              title="Clear image"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* URL Input Field */}
        <div className="flex space-x-2">
          <div className="flex-1">
            <input
              type="url"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white text-gray-900 placeholder-gray-500 shadow-sm focus:ring-2 focus:ring-yec-primary focus:border-yec-primary/50 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <ImageIcon className="h-4 w-4" />
            <span>Browse</span>
          </button>
        </div>

        {/* Quick Actions */}
        {value && (
          <div className="flex space-x-2">
            <button
              type="button"
              onClick={() => window.open(value, "_blank")}
              className="flex items-center space-x-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
            >
              <Eye className="h-4 w-4" />
              <span>Preview</span>
            </button>
            <button
              type="button"
              onClick={handleClearImage}
              className="flex items-center space-x-1 px-3 py-1 text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
            >
              <X className="h-4 w-4" />
              <span>Clear</span>
            </button>
          </div>
        )}
      </div>

      {/* Media Library Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-6xl h-5/6 flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Select Image from Media Library
              </h3>
              <button
                onClick={() => setShowModal(false)}
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
                      return (
                        <div
                          key={file.id}
                          className="relative group cursor-pointer bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
                          onClick={() => handleImageSelect(file)}
                        >
                          {/* Use the EXACT same structure as the working test images */}
                          <div className="w-full aspect-square border border-gray-300 relative overflow-hidden">
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
                              <>
                                <Image
                                  src={file.file_path}
                                  alt={file.original_filename}
                                  width={200}
                                  height={200}
                                  className="w-full h-full object-cover"
                                  style={{
                                    display: "block",
                                    width: "100%",
                                    height: "100%",
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                    zIndex: 10,
                                  }}
                                  onError={(e) => {
                                    console.error(
                                      "Main grid image failed to load:",
                                      {
                                        file_path: file.file_path,
                                        file_size: file.file_size,
                                        mime_type: file.mime_type,
                                      },
                                    );
                                    e.currentTarget.style.display = "none";
                                    const container =
                                      e.currentTarget.parentElement;
                                    if (container) {
                                      container.innerHTML = `
                                      <div class="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-100">
                                        <svg class="w-8 h-8 mb-2" fill="currentColor" viewBox="0 0 20 20">
                                          <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" />
                                        </svg>
                                        <span class="text-sm">Image</span>
                                      </div>
                                    `;
                                    }
                                  }}
                                  onLoad={(e) => {
                                    const target =
                                      e.currentTarget as HTMLImageElement;

                                    // Check if target exists and has valid dimensions
                                    if (
                                      target &&
                                      target.naturalWidth &&
                                      target.naturalHeight
                                    ) {
                                      console.log(
                                        "Main grid image loaded successfully:",
                                        {
                                          file_path: file.file_path,
                                          file_size: file.file_size,
                                          naturalWidth: target.naturalWidth,
                                          naturalHeight: target.naturalHeight,
                                        },
                                      );
                                      // Force visibility
                                      target.style.display = "block";
                                      target.style.visibility = "visible";
                                      target.style.opacity = "1";
                                      target.style.zIndex = "10";

                                      // Store image dimensions
                                      setImageDimensions((prev) => ({
                                        ...prev,
                                        [file.id]: {
                                          width: target.naturalWidth,
                                          height: target.naturalHeight,
                                        },
                                      }));
                                    }
                                  }}
                                />
                              </>
                            )}
                          </div>
                          <div className="p-2">
                            <p className="text-xs text-gray-600 dark:text-gray-300 truncate">
                              {file.original_filename}
                            </p>
                            <p className="text-xs text-gray-400">
                              {(file.file_size / 1024).toFixed(1)} KB
                            </p>
                            <p className="text-xs text-gray-400">
                              {file.mime_type}
                            </p>
                            {/* Image dimensions */}
                            {imageDimensions[file.id] && (
                              <p className="text-xs text-gray-400">
                                {imageDimensions[file.id].width} ×{" "}
                                {imageDimensions[file.id].height} px
                              </p>
                            )}
                          </div>
                          <div className="absolute inset-0 bg-blue-500 opacity-0 group-hover:opacity-20 transition-opacity pointer-events-none flex items-center justify-center">
                            <Check className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Open media library in new tab for upload
                    window.open("/admin/content-management/media", "_blank");
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                >
                  <Upload className="h-4 w-4" />
                  <span>Upload New Image</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
