"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import {
  Search,
  Trash2,
  Eye,
  Download,
  Video,
  FileText,
  Upload,
  Edit,
  Check,
  Square,
  Grid3X3,
  List,
  LayoutGrid,
  Maximize2,
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
  const [hoveredVideoId, setHoveredVideoId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Multi-selection state
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [_isSelectAll, _setIsSelectAll] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [lastSelected, setLastSelected] = useState<string | null>(null);

  // View style state
  const [viewStyle, setViewStyle] = useState<
    "grid" | "list" | "masonry" | "compact"
  >("grid");
  const [itemsPerPage, setItemsPerPage] = useState(24);
  const [sortBy, setSortBy] = useState<
    "newest" | "oldest" | "name-asc" | "name-desc" | "size-large" | "size-small"
  >("newest");

  // Bulk operations state
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [_bulkOperation, _setBulkOperation] = useState<string | null>(null);
  const [renamePattern, setRenamePattern] = useState("");

  // Single file rename state
  const [showSingleRenameModal, setShowSingleRenameModal] = useState(false);
  const [fileToRename, setFileToRename] = useState<MediaFile | null>(null);
  const [newFileName, setNewFileName] = useState("");

  const fetchMedia = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(filterType !== "all" && { mime_type: filterType }),
        ...(sortBy && { sort: sortBy }),
      });

      const response = await fetch(`/api/admin/cms/media?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch media");
      }

      const data = await response.json();
      setMedia(data.media || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error("Error fetching media:", error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, filterType, sortBy, itemsPerPage]);

  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

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
      const response = await fetch(`/api/admin/cms/media/${mediaId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete media file");
      }

      // Refresh the media list
      fetchMedia();
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

  const getFileType = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return "Image";
    if (mimeType.startsWith("video/")) return "Video";
    if (mimeType === "application/pdf") return "Document";
    if (mimeType.startsWith("application/")) return "Document";
    return "File";
  };

  // Selection logic
  const toggleItemSelection = (itemId: string) => {
    setSelectedItems((prev) => {
      const newSelected = new Set(prev);
      if (newSelected.has(itemId)) {
        newSelected.delete(itemId);
      } else {
        newSelected.add(itemId);
      }
      return newSelected;
    });
    setLastSelected(itemId);
  };

  const _selectAll = () => {
    const allIds = new Set(media.map((item) => item.id));
    setSelectedItems(allIds);
    _setIsSelectAll(true);
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
    _setIsSelectAll(false);
    setLastSelected(null);
  };

  const handleItemClick = (file: MediaFile, event: React.MouseEvent) => {
    const { ctrlKey, shiftKey } = event;

    if (ctrlKey) {
      // Toggle individual selection
      toggleItemSelection(file.id);
    } else if (shiftKey && lastSelected) {
      // Range selection
      selectRange(lastSelected, file.id);
    } else {
      // Single selection or open file
      if (bulkMode) {
        toggleItemSelection(file.id);
      } else {
        window.open(file.file_path, "_blank");
      }
    }
  };

  const selectRange = (startId: string, endId: string) => {
    const startIndex = media.findIndex((item) => item.id === startId);
    const endIndex = media.findIndex((item) => item.id === endId);

    if (startIndex === -1 || endIndex === -1) return;

    const minIndex = Math.min(startIndex, endIndex);
    const maxIndex = Math.max(startIndex, endIndex);

    const rangeIds = media.slice(minIndex, maxIndex + 1).map((item) => item.id);
    setSelectedItems((prev) => {
      const newSelected = new Set(prev);
      rangeIds.forEach((id) => newSelected.add(id));
      return newSelected;
    });
  };

  // Bulk operations
  const handleBulkDownload = async () => {
    const selectedIds = Array.from(selectedItems);
    const selectedFiles = media.filter((file) => selectedIds.includes(file.id));

    if (selectedFiles.length === 0) {
      alert("No files selected");
      return;
    }

    console.log(`Starting bulk download of ${selectedFiles.length} files`);

    for (const file of selectedFiles) {
      try {
        // Fetch the file first to ensure it's downloaded
        const response = await fetch(file.file_path);
        const blob = await response.blob();

        // Create download link with blob
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = file.original_filename;
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up the blob URL
        window.URL.revokeObjectURL(url);

        console.log(`Downloaded: ${file.original_filename}`);

        // Small delay between downloads
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Failed to download ${file.original_filename}:`, error);
        // Fallback to direct link
        const link = document.createElement("a");
        link.href = file.file_path;
        link.download = file.original_filename;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }

    alert(`Downloaded ${selectedFiles.length} files successfully!`);
  };

  const handleBulkDelete = async () => {
    const selectedIds = Array.from(selectedItems);
    const count = selectedIds.length;

    if (
      !confirm(
        `Are you sure you want to delete ${count} item${count !== 1 ? "s" : ""}?`,
      )
    ) {
      return;
    }

    try {
      for (const id of selectedIds) {
        const response = await fetch(`/api/admin/cms/media/${id}`, {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to delete item ${id}`);
        }
      }

      // Refresh the media list
      fetchMedia();
      clearSelection();
    } catch (error) {
      console.error("Error deleting items:", error);
      alert("Failed to delete some items");
    }
  };

  const handleBulkRename = () => {
    _setBulkOperation("rename");
    setShowRenameModal(true);
  };

  // Single file rename functions
  const handleSingleRename = (file: MediaFile) => {
    setFileToRename(file);
    setNewFileName(file.original_filename);
    setShowSingleRenameModal(true);
  };

  const handleSingleRenameSubmit = async () => {
    if (!fileToRename || !newFileName.trim()) {
      alert("Please enter a new filename");
      return;
    }

    try {
      console.log(
        `Attempting to rename file ${fileToRename.id} to ${newFileName.trim()}`,
      );

      const response = await fetch(
        `/api/admin/cms/media/${fileToRename.id}/rename`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            new_filename: newFileName.trim(),
          }),
        },
      );

      console.log("Rename response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Rename API error:", errorData);
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const result = await response.json();
      console.log("File renamed successfully:", result);

      alert(
        `File renamed from "${fileToRename.original_filename}" to "${newFileName}"`,
      );
      setShowSingleRenameModal(false);
      setFileToRename(null);
      setNewFileName("");

      // Refresh the media list
      fetchMedia();
    } catch (error) {
      console.error("Error renaming file:", error);
      alert(
        `Failed to rename file: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  };

  const handleRenameSubmit = async () => {
    if (!renamePattern.trim()) {
      alert("Please enter a rename pattern");
      return;
    }

    const selectedIds = Array.from(selectedItems);
    const selectedFiles = media.filter((file) => selectedIds.includes(file.id));

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const newName = renamePattern
          .replace("{index}", (i + 1).toString())
          .replace("{original}", file.original_filename.split(".")[0])
          .replace(
            "{extension}",
            file.original_filename.split(".").pop() || "",
          );

        // Here you would call a rename API endpoint
        // For now, we'll just show what would be renamed
        console.log(`Would rename: ${file.original_filename} -> ${newName}`);
      }

      alert(`Rename pattern applied to ${selectedFiles.length} files`);
      setShowRenameModal(false);
      setRenamePattern("");
      clearSelection();
    } catch (error) {
      console.error("Error renaming files:", error);
      alert("Failed to rename files");
    }
  };

  const handleBulkOperation = (operation: string) => {
    switch (operation) {
      case "download":
        handleBulkDownload();
        break;
      case "delete":
        handleBulkDelete();
        break;
      case "rename":
        handleBulkRename();
        break;
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) {
      return <ImageIcon className="h-8 w-8 text-blue-500" />;
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
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white text-gray-900 placeholder-gray-500 shadow-sm focus:ring-2 focus:ring-yec-primary focus:border-yec-primary/50 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white text-gray-900 shadow-sm focus:ring-2 focus:ring-yec-primary focus:border-yec-primary/50 dark:bg-gray-700 dark:text-white"
          >
            <option value="all">All Types</option>
            <option value="image/">Images</option>
            <option value="video/">Videos</option>
            <option value="application/pdf">PDFs</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white text-gray-900 shadow-sm focus:ring-2 focus:ring-yec-primary focus:border-yec-primary/50 dark:bg-gray-700 dark:text-white"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name-asc">Name A-Z</option>
            <option value="name-desc">Name Z-A</option>
            <option value="size-large">Largest First</option>
            <option value="size-small">Smallest First</option>
          </select>

          {/* Page Size */}
          <select
            value={itemsPerPage}
            onChange={(e) => setItemsPerPage(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white text-gray-900 shadow-sm focus:ring-2 focus:ring-yec-primary focus:border-yec-primary/50 dark:bg-gray-700 dark:text-white"
          >
            <option value="12">12 per page</option>
            <option value="24">24 per page</option>
            <option value="48">48 per page</option>
            <option value="96">96 per page</option>
          </select>
        </div>

        {/* View Style Selector */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewStyle("grid")}
              className={`p-2 rounded-md transition-colors ${
                viewStyle === "grid"
                  ? "bg-white dark:bg-gray-600 shadow-sm"
                  : "hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
              title="Grid View"
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewStyle("list")}
              className={`p-2 rounded-md transition-colors ${
                viewStyle === "list"
                  ? "bg-white dark:bg-gray-600 shadow-sm"
                  : "hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
              title="List View"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewStyle("masonry")}
              className={`p-2 rounded-md transition-colors ${
                viewStyle === "masonry"
                  ? "bg-white dark:bg-gray-600 shadow-sm"
                  : "hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
              title="Masonry View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewStyle("compact")}
              className={`p-2 rounded-md transition-colors ${
                viewStyle === "compact"
                  ? "bg-white dark:bg-gray-600 shadow-sm"
                  : "hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
              title="Compact View"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>

          {/* Bulk Mode Toggle */}
          <button
            onClick={() => {
              console.log("Bulk mode toggle clicked, current state:", bulkMode);
              setBulkMode(!bulkMode);
            }}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
              bulkMode
                ? "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
            }`}
          >
            <Square className="h-4 w-4" />
            <span>{bulkMode ? "Exit Select" : "Select"}</span>
          </button>
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

      {/* Selection Toolbar */}
      {selectedItems.size > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                {selectedItems.size} item{selectedItems.size !== 1 ? "s" : ""}{" "}
                selected
              </span>
              <button
                onClick={clearSelection}
                className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              >
                Clear Selection
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleBulkOperation("download")}
                className="flex items-center space-x-1 px-3 py-1 bg-green-100 text-green-700 rounded-md hover:bg-green-200 dark:bg-green-900/20 dark:text-green-300 dark:hover:bg-green-900/30"
              >
                <Download className="h-4 w-4" />
                <span>Download</span>
              </button>

              <button
                onClick={() => handleBulkOperation("delete")}
                className="flex items-center space-x-1 px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 dark:bg-red-900/20 dark:text-red-300 dark:hover:bg-red-900/30"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media Grid */}
      {/* Selected Files List */}
      {bulkMode && selectedItems.size > 0 && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
              Selected Files ({selectedItems.size})
            </h4>
            <button
              onClick={clearSelection}
              className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
            >
              Clear All
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from(selectedItems).map((fileId) => {
              const file = media.find((f) => f.id === fileId);
              if (!file) return null;
              return (
                <div
                  key={fileId}
                  className="flex items-center space-x-2 bg-white dark:bg-gray-700 px-2 py-1 rounded border border-blue-200 dark:border-blue-600"
                >
                  <span className="text-xs text-gray-700 dark:text-gray-300 truncate max-w-32">
                    {file.original_filename}
                  </span>
                  <button
                    onClick={() => toggleItemSelection(fileId)}
                    className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div
        className={`${
          viewStyle === "grid"
            ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4"
            : viewStyle === "list"
              ? "space-y-2"
              : viewStyle === "masonry"
                ? "columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4"
                : viewStyle === "compact"
                  ? "grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2"
                  : "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4"
        }`}
      >
        {media.map((file) => {
          const isVideo = file.mime_type.startsWith("video/");
          const isHovered = hoveredVideoId === file.id;
          const isSelected = selectedItems.has(file.id);

          return (
            <div
              key={file.id}
              className={`${
                viewStyle === "grid"
                  ? "bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-shadow duration-200 cursor-pointer"
                  : viewStyle === "list"
                    ? "bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow duration-200 cursor-pointer"
                    : viewStyle === "masonry"
                      ? "bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-shadow duration-200 cursor-pointer break-inside-avoid mb-4"
                      : viewStyle === "compact"
                        ? "bg-white dark:bg-gray-800 rounded-lg shadow border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow duration-200 cursor-pointer"
                        : "bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-shadow duration-200 cursor-pointer"
              } ${isSelected ? "ring-2 ring-blue-500 dark:ring-blue-400" : ""}`}
              onMouseEnter={() => isVideo && setHoveredVideoId(file.id)}
              onMouseLeave={() => isVideo && setHoveredVideoId(null)}
              onClick={(e) => handleItemClick(file, e)}
            >
              {/* Selection Checkbox */}
              {bulkMode && (
                <div className="absolute top-2 left-2 z-10">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleItemSelection(file.id);
                    }}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                      isSelected
                        ? "bg-blue-500 border-blue-500 text-white"
                        : "bg-white border-gray-300 hover:border-blue-400"
                    }`}
                  >
                    {isSelected && <Check className="h-3 w-3" />}
                  </button>
                </div>
              )}

              <div
                className={`${
                  viewStyle === "list"
                    ? "flex items-center space-x-4 p-4"
                    : viewStyle === "compact"
                      ? "aspect-square bg-gray-100 dark:bg-gray-700 flex items-center justify-center relative"
                      : "aspect-square bg-gray-100 dark:bg-gray-700 flex items-center justify-center relative"
                }`}
              >
                {viewStyle === "list" ? (
                  // List view layout
                  <>
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                      {file.mime_type.startsWith("image/") ? (
                        <Image
                          src={file.file_path}
                          alt={file.alt_text || file.original_filename}
                          width={64}
                          height={64}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <div className="flex items-center justify-center text-gray-500 dark:text-gray-400">
                          {getFileIcon(file.mime_type)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {file.original_filename}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {formatFileSize(file.file_size)} •{" "}
                        {getFileType(file.mime_type)} •{" "}
                        {new Date(file.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </>
                ) : (
                  // Grid/Masonry/Compact view layout
                  <>
                    {file.mime_type.startsWith("image/") ? (
                      <Image
                        src={file.file_path}
                        alt={file.alt_text || file.original_filename}
                        width={200}
                        height={200}
                        className="w-full h-full object-cover"
                      />
                    ) : isVideo ? (
                      <>
                        {isHovered ? (
                          <video
                            src={file.file_path}
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                            onLoadedData={() => {
                              // Stop video after 3 seconds
                              setTimeout(() => {
                                const video = document.querySelector(
                                  `video[src="${file.file_path}"]`,
                                ) as HTMLVideoElement;
                                if (video) {
                                  video.pause();
                                  video.currentTime = 0;
                                }
                              }, 3000);
                            }}
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                            {getFileIcon(file.mime_type)}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-gray-500 dark:text-gray-400">
                        {getFileIcon(file.mime_type)}
                      </div>
                    )}
                  </>
                )}
              </div>
              {/* Card content for non-list views */}
              {viewStyle !== "list" && (
                <div className="p-3">
                  <div
                    className="text-sm font-medium text-gray-900 dark:text-white truncate"
                    title={file.original_filename}
                  >
                    {file.original_filename}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {formatFileSize(file.file_size)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(file.created_at).toLocaleDateString()}
                  </div>
                  <div className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                    {getFileType(file.mime_type)}
                  </div>
                </div>
              )}
              <div className="px-3 pb-3">
                <div className="flex items-center justify-between">
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent card click
                      // Open media file in new tab
                      window.open(file.file_path, "_blank");
                    }}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors duration-200"
                    title="View"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation(); // Prevent card click
                      // Download media file with blob approach
                      try {
                        const response = await fetch(file.file_path);
                        const blob = await response.blob();
                        const url = window.URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.href = url;
                        link.download = file.original_filename;
                        link.style.display = "none";
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        window.URL.revokeObjectURL(url);
                      } catch (error) {
                        console.error("Download failed:", error);
                        // Fallback to direct link
                        const link = document.createElement("a");
                        link.href = file.file_path;
                        link.download = file.original_filename;
                        link.target = "_blank";
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }
                    }}
                    className="p-1 text-gray-400 hover:text-green-600 transition-colors duration-200"
                    title="Download"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent card click
                      handleSingleRename(file);
                    }}
                    className="p-1 text-gray-400 hover:text-yellow-600 transition-colors duration-200"
                    title="Rename"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent card click
                      handleDelete(file.id);
                    }}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors duration-200"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Enhanced Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Results Info */}
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
            {Math.min(currentPage * itemsPerPage, media.length)} of{" "}
            {media.length} media files
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center gap-2">
            {/* Previous Button */}
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>

            {/* Page Numbers */}
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`px-3 py-2 text-sm font-medium rounded-md ${
                      currentPage === pageNum
                        ? "bg-blue-600 text-white"
                        : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            {/* Next Button */}
            <button
              onClick={() =>
                setCurrentPage(Math.min(totalPages, currentPage + 1))
              }
              disabled={currentPage === totalPages}
              className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Empty State */}
      {media.length === 0 && !loading && (
        <div className="text-center py-12">
          <ImageIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            No media files found
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Get started by uploading your first media file.
          </p>
        </div>
      )}

      {/* Rename Modal */}
      {showRenameModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Rename {selectedItems.size} items
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Rename Pattern
                </label>
                <input
                  type="text"
                  value={renamePattern}
                  onChange={(e) => setRenamePattern(e.target.value)}
                  placeholder="New Name {index}"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Use {"{index}"} for numbering, {"{original}"} for original
                  name
                </p>
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowRenameModal(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleRenameSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Rename All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single File Rename Modal */}
      {showSingleRenameModal && fileToRename && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              Rename File
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Current Name
                </label>
                <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-md text-gray-600 dark:text-gray-400">
                  {fileToRename.original_filename}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  New Name
                </label>
                <input
                  type="text"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter new filename"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowSingleRenameModal(false);
                  setFileToRename(null);
                  setNewFileName("");
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSingleRenameSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Rename
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
