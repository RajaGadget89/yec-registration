"use client";

import { useState, useEffect, useRef } from "react";
import { Plus, Search, Filter, Trash2, Eye, Download, Image, Video, FileText, Upload } from "lucide-react";

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

export default function MediaLibrary() {
  const [media, setMedia] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMedia();
  }, [currentPage, searchTerm, filterType]);

  const fetchMedia = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "12",
        ...(searchTerm && { search: searchTerm }),
        ...(filterType !== "all" && { mime_type: filterType }),
      });

      const response = await fetch(`/api/admin/cms/media?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch media files");
      }

      const data = await response.json();
      setMedia(data.media || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error("Error fetching media files:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (files: FileList) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("alt_text", ""); // TODO: Allow user to set alt text
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

  const handleDelete = async (mediaId: string) => {
    if (!confirm("Are you sure you want to delete this media file?")) {
      return;
    }

    try {
      // TODO: Implement delete media API endpoint
      alert("Delete media functionality coming soon!");
    } catch (error) {
      console.error("Error deleting media file:", error);
      alert("Failed to delete media file");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) {
      return <Image className="h-8 w-8 text-blue-500" />;
    } else if (mimeType.startsWith("video/")) {
      return <Video className="h-8 w-8 text-purple-500" />;
    } else {
      return <FileText className="h-8 w-8 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yec-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-4 flex-1">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search media files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Types</option>
            <option value="image/">Images</option>
            <option value="video/">Videos</option>
            <option value="application/pdf">PDFs</option>
          </select>
        </div>

        {/* Upload Button */}
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,application/pdf"
            onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center space-x-2 px-4 py-2 bg-yec-primary text-white rounded-lg hover:bg-yec-accent transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <Upload className="h-4 w-4" />
            )}
            <span>{uploading ? "Uploading..." : "Upload Files"}</span>
          </button>
        </div>
      </div>

      {/* Media Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {media.map((file) => (
          <div
            key={file.id}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-shadow duration-200"
          >
            <div className="aspect-square bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
              {file.mime_type.startsWith("image/") ? (
                <img
                  src={file.file_path}
                  alt={file.alt_text || file.original_filename}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                  {getFileIcon(file.mime_type)}
                </div>
              )}
            </div>
            <div className="p-3">
              <div className="text-sm font-medium text-gray-900 dark:text-white truncate" title={file.original_filename}>
                {file.original_filename}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {formatFileSize(file.file_size)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(file.created_at).toLocaleDateString()}
              </div>
            </div>
            <div className="px-3 pb-3">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    // TODO: Implement view media
                    alert("View media functionality coming soon!");
                  }}
                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors duration-200"
                  title="View"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    // TODO: Implement download media
                    alert("Download media functionality coming soon!");
                  }}
                  className="p-1 text-gray-400 hover:text-green-600 transition-colors duration-200"
                  title="Download"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(file.id)}
                  className="p-1 text-gray-400 hover:text-red-600 transition-colors duration-200"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}

      {/* Empty State */}
      {media.length === 0 && !loading && (
        <div className="text-center py-12">
          <Image className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No media files found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Get started by uploading your first media file.
          </p>
        </div>
      )}
    </div>
  );
}
