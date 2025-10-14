"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import {
  X,
  Search,
  Upload,
  Image as ImageIcon,
  FileImage,
  Filter,
} from "lucide-react";

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

interface MediaLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (file: MediaFile) => void;
  title?: string;
}

export default function MediaLibraryModal({
  isOpen,
  onClose,
  onSelect,
  title = "Select Image from Media Library",
}: MediaLibraryModalProps) {
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [uploading, setUploading] = useState(false);
  const [imageDimensions, setImageDimensions] = useState<
    Record<string, { width: number; height: number }>
  >({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const fetchMedia = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        search: searchTerm,
        type: filterType,
        limit: "50",
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
      setMedia(imageFiles);
    } catch (error) {
      console.error("Error fetching media:", error);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, filterType]);

  useEffect(() => {
    if (isOpen) {
      fetchMedia();
    }
  }, [isOpen, fetchMedia]);

  const handleFileUpload = async (files: FileList) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("alt_text", "");
        formData.append("folder", "cms-media");

        const response = await fetch("/api/admin/cms/media/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }
      }

      // Refresh the media list
      fetchMedia();
    } catch (error) {
      console.error("Error uploading files:", error);
      alert("Failed to upload files");
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getImageDimensions = (file: MediaFile) => {
    // This would need to be implemented on the backend to get actual dimensions
    // For now, we'll show file size and type
    return {
      size: formatFileSize(file.file_size),
      type: file.mime_type.split("/")[1].toUpperCase(),
    };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Search and Filter Bar */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search images..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="all">All Images</option>
                <option value="image/jpeg">JPEG</option>
                <option value="image/png">PNG</option>
                <option value="image/gif">GIF</option>
                <option value="image/webp">WebP</option>
                <option value="image/svg">SVG</option>
              </select>
            </div>
          </div>
        </div>

        {/* Media Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yec-primary"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {media.map((file) => {
                const { size, type } = getImageDimensions(file);
                return (
                  <div
                    key={file.id}
                    onClick={() => onSelect(file)}
                    className="group cursor-pointer bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden hover:shadow-lg transition-all duration-200 border border-gray-200 dark:border-gray-600 hover:border-yec-primary"
                  >
                    <div className="aspect-square relative bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                      <Image
                        src={file.file_path}
                        alt={file.alt_text || file.original_filename}
                        width={200}
                        height={200}
                        className="absolute inset-0 w-full h-full object-cover"
                        style={{
                          display: "block",
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          objectPosition: "center",
                          zIndex: 10,
                        }}
                        onLoad={(e) => {
                          const target = e.currentTarget as HTMLImageElement;

                          // Check if target exists and has valid dimensions
                          if (
                            target &&
                            target.naturalWidth &&
                            target.naturalHeight
                          ) {
                            // Force visibility when image loads
                            target.style.display = "block";
                            target.style.visibility = "visible";
                            target.style.opacity = "1";

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
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = "none";
                          // Show fallback content
                          const container = target.parentElement;
                          if (container) {
                            container.innerHTML = `
                              <div class="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-gray-100 dark:bg-gray-700">
                                <svg class="w-8 h-8 mb-2" fill="currentColor" viewBox="0 0 20 20">
                                  <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" />
                                </svg>
                                <span class="text-sm">Image</span>
                              </div>
                            `;
                          }
                        }}
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center pointer-events-none">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <div className="bg-white dark:bg-gray-800 rounded-full p-2">
                            <ImageIcon className="h-4 w-4 text-yec-primary" />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="p-3 space-y-1">
                      <p
                        className="text-xs font-medium text-gray-900 dark:text-white truncate"
                        title={file.original_filename}
                      >
                        {file.original_filename}
                      </p>
                      <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>{size}</span>
                        <span>{type}</span>
                      </div>
                      {/* Image dimensions */}
                      {imageDimensions[file.id] && (
                        <div className="text-xs text-gray-400">
                          {imageDimensions[file.id].width} ×{" "}
                          {imageDimensions[file.id].height} px
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!loading && media.length === 0 && (
            <div className="flex flex-col items-center justify-center h-32 text-gray-500 dark:text-gray-400">
              <FileImage className="h-8 w-8 mb-2" />
              <p>No images found</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
          <div className="flex items-center space-x-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) =>
                e.target.files && handleFileUpload(e.target.files)
              }
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Upload className="h-4 w-4" />
              )}
              <span>{uploading ? "Uploading..." : "Upload New Image"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
