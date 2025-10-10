"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Play,
  Monitor,
  Smartphone,
  Tablet,
} from "lucide-react";

interface HeroVideo {
  id: string;
  page_id: string;
  device_type: "desktop" | "tablet" | "mobile";
  video_url: string;
  thumbnail_url?: string;
  title?: string;
  description?: string;
  autoplay: boolean;
  loop: boolean;
  muted: boolean;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function HeroVideosManagement() {
  const [videos, setVideos] = useState<HeroVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDevice, setFilterDevice] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage, _setItemsPerPage] = useState(10);

  const fetchVideos = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        ...(searchTerm && { search: searchTerm }),
        ...(filterDevice !== "all" && { device_type: filterDevice }),
        ...(filterStatus !== "all" && {
          is_active: filterStatus === "active" ? "true" : "false",
        }),
      });

      const response = await fetch(`/api/admin/cms/hero-videos?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch hero videos");
      }

      const data = await response.json();
      setVideos(data.videos || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (error) {
      console.error("Error fetching hero videos:", error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, filterDevice, filterStatus, itemsPerPage]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const handleDelete = async (videoId: string) => {
    if (!confirm("Are you sure you want to delete this hero video?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/cms/hero-videos/${videoId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete hero video");
      }

      // Refresh the videos list
      fetchVideos();
    } catch (error) {
      console.error("Error deleting hero video:", error);
      alert("Failed to delete hero video");
    }
  };

  const handleToggleStatus = async (
    videoId: string,
    currentStatus: boolean,
  ) => {
    try {
      const response = await fetch(`/api/admin/cms/hero-videos/${videoId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          is_active: !currentStatus,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update video status");
      }

      // Refresh the videos list
      fetchVideos();
    } catch (error) {
      console.error("Error updating video status:", error);
      alert("Failed to update video status");
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case "desktop":
        return <Monitor className="h-5 w-5 text-blue-500" />;
      case "tablet":
        return <Tablet className="h-5 w-5 text-green-500" />;
      case "mobile":
        return <Smartphone className="h-5 w-5 text-purple-500" />;
      default:
        return <Monitor className="h-5 w-5 text-gray-500" />;
    }
  };

  const getDeviceColor = (deviceType: string) => {
    switch (deviceType) {
      case "desktop":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400";
      case "tablet":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
      case "mobile":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
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
              placeholder="Search hero videos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <select
              value={filterDevice}
              onChange={(e) => setFilterDevice(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Devices</option>
              <option value="desktop">Desktop</option>
              <option value="tablet">Tablet</option>
              <option value="mobile">Mobile</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Create Button */}
        <button
          onClick={() => {
            // TODO: Implement create hero video modal
            alert("Create hero video functionality coming soon!");
          }}
          className="flex items-center space-x-2 px-4 py-2 bg-yec-primary text-white rounded-lg hover:bg-yec-accent transition-colors duration-200"
        >
          <Plus className="h-4 w-4" />
          <span>Create Video</span>
        </button>
      </div>

      {/* Hero Videos Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map((video) => (
          <div
            key={video.id}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-shadow duration-200"
          >
            {/* Video Thumbnail */}
            <div className="aspect-video bg-gray-100 dark:bg-gray-700 relative">
              {video.thumbnail_url ? (
                <Image
                  src={video.thumbnail_url}
                  alt={video.title || "Hero video"}
                  width={400}
                  height={225}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Play className="h-12 w-12 text-gray-400" />
                </div>
              )}

              {/* Device Type Badge */}
              <div className="absolute top-2 left-2">
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getDeviceColor(video.device_type)}`}
                >
                  {getDeviceIcon(video.device_type)}
                  <span className="ml-1 capitalize">{video.device_type}</span>
                </span>
              </div>

              {/* Status Badge */}
              <div className="absolute top-2 right-2">
                <button
                  onClick={() => handleToggleStatus(video.id, video.is_active)}
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-colors duration-200 ${
                    video.is_active
                      ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/30"
                      : "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-900/30"
                  }`}
                >
                  {video.is_active ? "Active" : "Inactive"}
                </button>
              </div>
            </div>

            {/* Video Info */}
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                {video.title || "Untitled Video"}
              </h3>

              {video.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                  {video.description}
                </p>
              )}

              {/* Video Settings */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>Autoplay</span>
                  <span
                    className={
                      video.autoplay ? "text-green-600" : "text-gray-400"
                    }
                  >
                    {video.autoplay ? "On" : "Off"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>Loop</span>
                  <span
                    className={video.loop ? "text-green-600" : "text-gray-400"}
                  >
                    {video.loop ? "On" : "Off"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>Muted</span>
                  <span
                    className={video.muted ? "text-green-600" : "text-gray-400"}
                  >
                    {video.muted ? "On" : "Off"}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => {
                      // TODO: Implement preview video
                      alert("Preview video functionality coming soon!");
                    }}
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors duration-200"
                    title="Preview Video"
                  >
                    <Play className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      // TODO: Implement edit video
                      alert("Edit video functionality coming soon!");
                    }}
                    className="p-2 text-gray-400 hover:text-yec-primary transition-colors duration-200"
                    title="Edit Video"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(video.id)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors duration-200"
                    title="Delete Video"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Order: {video.display_order}
                </div>
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
            onClick={() =>
              setCurrentPage(Math.min(totalPages, currentPage + 1))
            }
            disabled={currentPage === totalPages}
            className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}

      {/* Empty State */}
      {videos.length === 0 && !loading && (
        <div className="text-center py-12">
          <Play className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            No hero videos found
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Get started by creating your first hero video.
          </p>
        </div>
      )}
    </div>
  );
}
