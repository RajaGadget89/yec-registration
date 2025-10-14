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
} from "lucide-react";
import CreateHeroVideoModal from "./CreateHeroVideoModal";
import VideoPreviewModal from "./VideoPreviewModal";
import EditHeroVideoModal from "./EditHeroVideoModal";

interface CmsPage {
  id: string;
  slug: string;
  title: string;
  language: string;
}

interface HeroVideo {
  id: string;
  page_id: string;
  desktop_video_url?: string;
  mobile_video_url?: string;
  fallback_image_url?: string;
  autoplay: boolean;
  loop: boolean;
  muted: boolean;
  is_active: boolean;
  is_landing_page_active?: boolean;
  created_at: string;
  updated_at: string;
  cms_pages: CmsPage;
}

export default function HeroVideosManagement() {
  const [videos, setVideos] = useState<HeroVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDevice, setFilterDevice] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPage, setFilterPage] = useState("all");
  const [pages, setPages] = useState<CmsPage[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage, _setItemsPerPage] = useState(10);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<HeroVideo | null>(null);
  const [hoveredVideoId, setHoveredVideoId] = useState<string | null>(null);
  const [thumbnailErrors, setThumbnailErrors] = useState<Set<string>>(
    new Set(),
  );
  const [thumbnailLoading, setThumbnailLoading] = useState<Set<string>>(
    new Set(),
  );
  const [isLandingPageModalOpen, setIsLandingPageModalOpen] = useState(false);
  const [selectedLandingPageVideo, setSelectedLandingPageVideo] =
    useState<HeroVideo | null>(null);
  const [landingPageLoading, setLandingPageLoading] = useState<string | null>(
    null,
  );

  const fetchPages = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/cms/pages?limit=100");
      if (!response.ok) {
        throw new Error("Failed to fetch pages");
      }
      const data = await response.json();
      setPages(data.pages || []);
    } catch (error) {
      console.error("Error fetching pages:", error);
    }
  }, []);

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
        ...(filterPage !== "all" && { page_id: filterPage }),
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
  }, [
    currentPage,
    searchTerm,
    filterDevice,
    filterStatus,
    filterPage,
    itemsPerPage,
  ]);

  useEffect(() => {
    fetchVideos();
    fetchPages();
  }, [fetchVideos, fetchPages]);

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

  const handlePreview = (video: HeroVideo) => {
    setSelectedVideo(video);
    setIsPreviewModalOpen(true);
  };

  const handleEdit = (video: HeroVideo) => {
    setSelectedVideo(video);
    setIsEditModalOpen(true);
  };

  const getVideoPreviewUrl = (video: HeroVideo) => {
    // Prefer desktop video for preview, fallback to mobile
    const videoUrl = video.desktop_video_url || video.mobile_video_url;
    if (!videoUrl) return null;

    // If it's already a complete YouTube embed URL, return as is
    if (videoUrl.includes("youtube.com/embed/")) {
      return videoUrl;
    }

    // If it's a regular YouTube URL, convert to embed format
    if (videoUrl.includes("youtube.com/watch?v=")) {
      const videoId = videoUrl.split("v=")[1]?.split("&")[0];
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }

    return videoUrl;
  };

  const getVideoThumbnailUrl = (video: HeroVideo) => {
    // If fallback image is provided, use it
    if (video.fallback_image_url) {
      return video.fallback_image_url;
    }

    // Extract YouTube video ID and generate thumbnail
    const videoUrl = video.desktop_video_url || video.mobile_video_url;
    if (!videoUrl) return null;

    let videoId = null;

    try {
      // Extract video ID from different YouTube URL formats
      if (videoUrl.includes("youtube.com/embed/")) {
        const match = videoUrl.match(/\/embed\/([a-zA-Z0-9_-]+)/);
        videoId = match ? match[1] : null;
      } else if (videoUrl.includes("youtube.com/watch?v=")) {
        const match = videoUrl.match(/[?&]v=([a-zA-Z0-9_-]+)/);
        videoId = match ? match[1] : null;
      } else if (videoUrl.includes("youtu.be/")) {
        const match = videoUrl.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
        videoId = match ? match[1] : null;
      }

      // Validate video ID format (YouTube IDs are typically 11 characters)
      if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        // Use hqdefault instead of maxresdefault for better reliability
        return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      } else if (videoId) {
        console.warn(
          "Invalid YouTube video ID format:",
          videoId,
          "from URL:",
          videoUrl,
        );
      }
    } catch (error) {
      console.warn("Error extracting video ID from URL:", videoUrl, error);
    }

    return null;
  };

  const getFallbackThumbnailUrl = (video: HeroVideo) => {
    // Extract YouTube video ID and generate fallback thumbnail
    const videoUrl = video.desktop_video_url || video.mobile_video_url;
    if (!videoUrl) return null;

    let videoId = null;

    try {
      // Extract video ID from different YouTube URL formats
      if (videoUrl.includes("youtube.com/embed/")) {
        const match = videoUrl.match(/\/embed\/([a-zA-Z0-9_-]+)/);
        videoId = match ? match[1] : null;
      } else if (videoUrl.includes("youtube.com/watch?v=")) {
        const match = videoUrl.match(/[?&]v=([a-zA-Z0-9_-]+)/);
        videoId = match ? match[1] : null;
      } else if (videoUrl.includes("youtu.be/")) {
        const match = videoUrl.match(/youtu\.be\/([a-zA-Z0-9_-]+)/);
        videoId = match ? match[1] : null;
      }

      // Validate video ID format (YouTube IDs are typically 11 characters)
      if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        // Use hqdefault as fallback (more reliable than maxresdefault)
        return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      }
    } catch (error) {
      console.warn(
        "Error extracting video ID for fallback thumbnail:",
        videoUrl,
        error,
      );
    }

    return null;
  };

  const handleMouseEnter = (video: HeroVideo) => {
    setHoveredVideoId(video.id);
  };

  const handleMouseLeave = () => {
    setHoveredVideoId(null);
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

  const handleLandingPageToggle = (video: HeroVideo) => {
    if (video.is_landing_page_active) {
      // If already active, show confirmation to deactivate
      setSelectedLandingPageVideo(video);
      setIsLandingPageModalOpen(true);
    } else {
      // If not active, show confirmation to activate
      setSelectedLandingPageVideo(video);
      setIsLandingPageModalOpen(true);
    }
  };

  const confirmLandingPageChange = async () => {
    if (!selectedLandingPageVideo) return;

    try {
      setLandingPageLoading(selectedLandingPageVideo.id);

      if (selectedLandingPageVideo.is_landing_page_active) {
        // Deactivate landing page status
        const response = await fetch(
          `/api/admin/cms/hero-videos/${selectedLandingPageVideo.id}/landing-page-active`,
          { method: "DELETE" },
        );

        if (!response.ok) {
          throw new Error("Failed to remove landing page active status");
        }
      } else {
        // First, ensure the video is active before setting as landing page active
        if (!selectedLandingPageVideo.is_active) {
          console.log("Video is not active, activating it first...");
          const activateResponse = await fetch(
            `/api/admin/cms/hero-videos/${selectedLandingPageVideo.id}`,
            {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ is_active: true }),
            },
          );

          if (!activateResponse.ok) {
            throw new Error("Failed to activate video");
          }
        }

        // Activate landing page status
        const response = await fetch(
          `/api/admin/cms/hero-videos/${selectedLandingPageVideo.id}/landing-page-active`,
          { method: "PUT" },
        );

        if (!response.ok) {
          throw new Error("Failed to set landing page active status");
        }
      }

      // Refresh the videos list
      await fetchVideos();

      // Close modal
      setIsLandingPageModalOpen(false);
      setSelectedLandingPageVideo(null);
    } catch (error) {
      console.error("Error updating landing page status:", error);
      alert("Failed to update landing page status");
    } finally {
      setLandingPageLoading(null);
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

            <select
              value={filterPage}
              onChange={(e) => setFilterPage(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Pages</option>
              {pages.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.title} ({page.slug})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Create Button */}
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-yec-primary text-white rounded-lg hover:bg-yec-accent transition-colors duration-200"
        >
          <Plus className="h-4 w-4" />
          <span>Create Video</span>
        </button>
      </div>

      {/* Hero Videos Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map((video) => {
          const isHovered = hoveredVideoId === video.id;
          const previewUrl = getVideoPreviewUrl(video);
          const thumbnailUrl = getVideoThumbnailUrl(video);
          const fallbackThumbnailUrl = getFallbackThumbnailUrl(video);

          // Only try to load thumbnails if we have valid video URLs
          const hasValidVideoUrl =
            video.desktop_video_url || video.mobile_video_url;

          // Set loading state for new thumbnails only if we have a valid URL
          if (
            thumbnailUrl &&
            hasValidVideoUrl &&
            !thumbnailLoading.has(video.id) &&
            !thumbnailErrors.has(video.id)
          ) {
            // Only set loading if the URL looks valid
            if (
              thumbnailUrl.includes("img.youtube.com") ||
              thumbnailUrl.startsWith("http")
            ) {
              setThumbnailLoading((prev) => new Set(prev).add(video.id));
            }
          }

          return (
            <div
              key={video.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-all duration-300 ease-in-out hover:scale-[1.02]"
              onMouseEnter={() => handleMouseEnter(video)}
              onMouseLeave={handleMouseLeave}
            >
              {/* Video Thumbnail */}
              <div className="aspect-video bg-gray-100 dark:bg-gray-700 relative overflow-hidden group">
                {isHovered && previewUrl ? (
                  <div className="absolute inset-0 w-full h-full transition-all duration-300 ease-in-out">
                    <iframe
                      className="w-full h-full"
                      src={`${previewUrl}?autoplay=1&mute=1&controls=0&loop=1&modestbranding=1&showinfo=0&rel=0&playsinline=1&start=0&end=5`}
                      title={`Hero Video Preview - ${video.id}`}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      style={{
                        pointerEvents: "none",
                        transform: "scale(1.05)",
                        transformOrigin: "center",
                      }}
                    />
                    {/* Overlay to prevent interaction */}
                    <div className="absolute inset-0 bg-transparent" />
                    {/* Preview indicator */}
                    <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                      Preview
                    </div>
                  </div>
                ) : thumbnailUrl &&
                  hasValidVideoUrl &&
                  !thumbnailErrors.has(video.id) &&
                  (thumbnailUrl.includes("img.youtube.com") ||
                    thumbnailUrl.startsWith("http")) ? (
                  <div className="relative w-full h-full">
                    {thumbnailLoading.has(video.id) && (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-700">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yec-primary"></div>
                      </div>
                    )}
                    <Image
                      src={thumbnailUrl}
                      alt="Hero video thumbnail"
                      width={400}
                      height={225}
                      className="w-full h-full object-cover"
                      onLoad={() => {
                        setThumbnailLoading((prev) => {
                          const newSet = new Set(prev);
                          newSet.delete(video.id);
                          return newSet;
                        });
                      }}
                      onError={(e) => {
                        // Try fallback thumbnail if available
                        if (
                          fallbackThumbnailUrl &&
                          fallbackThumbnailUrl !== thumbnailUrl
                        ) {
                          const target = e.target as HTMLImageElement;
                          target.src = fallbackThumbnailUrl;
                          return;
                        }

                        // If no fallback or fallback also failed, show error
                        setThumbnailErrors((prev) =>
                          new Set(prev).add(video.id),
                        );
                        setThumbnailLoading((prev) => {
                          const newSet = new Set(prev);
                          newSet.delete(video.id);
                          return newSet;
                        });
                      }}
                    />
                    {/* Play button overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 hover:bg-opacity-30 transition-all duration-200">
                      <div className="bg-white bg-opacity-90 rounded-full p-3 hover:bg-opacity-100 transition-all duration-200 hover:scale-110">
                        <Play
                          className="h-6 w-6 text-gray-800 ml-1"
                          fill="currentColor"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Play className="h-12 w-12 text-gray-400" />
                  </div>
                )}

                {/* Hover overlay for no video */}
                {isHovered && !previewUrl && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="text-center text-white">
                      <Play className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm">No video available</p>
                      <p className="text-xs text-gray-300">
                        Add video URLs to enable preview
                      </p>
                    </div>
                  </div>
                )}

                {/* Video Type Badge */}
                <div className="absolute top-2 left-2">
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                    <Monitor className="h-3 w-3 mr-1" />
                    <span>Hero Video</span>
                  </span>
                </div>

                {/* Status Badge */}
                <div className="absolute top-2 right-2">
                  <button
                    onClick={() =>
                      handleToggleStatus(video.id, video.is_active)
                    }
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-colors duration-200 ${
                      video.is_active
                        ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/30"
                        : "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-900/30"
                    }`}
                  >
                    {video.is_active ? "Active" : "Inactive"}
                  </button>
                </div>

                {/* Landing Page Active Badge */}
                {video.is_landing_page_active && (
                  <div className="absolute top-2 left-2 z-10">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border border-red-200 dark:border-red-800">
                      🚨 LANDING PAGE ACTIVE
                    </span>
                  </div>
                )}
              </div>

              {/* Video Info */}
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Hero Video
                </h3>

                {/* Page Information */}
                <div className="mb-3">
                  <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400">
                    <span className="mr-1">📄</span>
                    <span>{video.cms_pages?.title || "Unknown Page"}</span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Page: {video.cms_pages?.slug || "unknown"} (
                    {video.cms_pages?.language?.toUpperCase() || "EN"})
                  </div>
                </div>

                <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <Monitor className="h-4 w-4" />
                      <span>
                        {video.desktop_video_url ? "Desktop ✓" : "Desktop ✗"}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Smartphone className="h-4 w-4" />
                      <span>
                        {video.mobile_video_url ? "Mobile ✓" : "Mobile ✗"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Landing Page Toggle */}
                <div className="mb-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={video.is_landing_page_active || false}
                      onChange={() => handleLandingPageToggle(video)}
                      disabled={landingPageLoading === video.id}
                      className="w-4 h-4 text-red-600 border-red-300 rounded focus:ring-red-500 focus:ring-2"
                    />
                    <span className="text-sm font-medium text-red-600 dark:text-red-400">
                      🚨 Landing Page Active
                    </span>
                    {landingPageLoading === video.id && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                    )}
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {video.is_landing_page_active
                      ? "This video is currently displayed on the landing page"
                      : "Click to set this video as the landing page hero video"}
                  </p>
                </div>

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
                      className={
                        video.loop ? "text-green-600" : "text-gray-400"
                      }
                    >
                      {video.loop ? "On" : "Off"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Muted</span>
                    <span
                      className={
                        video.muted ? "text-green-600" : "text-gray-400"
                      }
                    >
                      {video.muted ? "On" : "Off"}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handlePreview(video)}
                      className="p-2 text-gray-400 hover:text-blue-600 transition-colors duration-200"
                      title="Preview Video"
                    >
                      <Play className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(video)}
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
                    ID: {video.id.slice(0, 8)}...
                  </div>
                </div>
              </div>
            </div>
          );
        })}
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

      {/* Create Hero Video Modal */}
      <CreateHeroVideoModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          fetchVideos(); // Refresh the videos list
        }}
      />

      {/* Video Preview Modal */}
      <VideoPreviewModal
        isOpen={isPreviewModalOpen}
        onClose={() => {
          setIsPreviewModalOpen(false);
          setSelectedVideo(null);
        }}
        video={selectedVideo}
      />

      {/* Edit Hero Video Modal */}
      <EditHeroVideoModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedVideo(null);
        }}
        onSuccess={() => {
          fetchVideos(); // Refresh the videos list
        }}
        video={selectedVideo}
      />

      {/* Landing Page Change Confirmation Modal */}
      {isLandingPageModalOpen && selectedLandingPageVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md mx-4">
            <div className="flex items-center mb-4">
              <div className="text-red-500 text-2xl mr-3">⚠️</div>
              <h3 className="text-lg font-semibold text-red-600 dark:text-red-400">
                {selectedLandingPageVideo.is_landing_page_active
                  ? "Remove Landing Page Hero Video"
                  : "Set Landing Page Hero Video"}
              </h3>
            </div>

            <div className="mb-4">
              <p className="text-gray-700 dark:text-gray-300 mb-2">
                {selectedLandingPageVideo.is_landing_page_active
                  ? "You are about to remove this video from the landing page."
                  : "You are about to set this video as the landing page hero video."}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                <strong>Video:</strong>{" "}
                {selectedLandingPageVideo.cms_pages?.title || "Unknown Page"}
              </p>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded p-3">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  ⚠️ This change will be visible immediately to all website
                  visitors.
                </p>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setIsLandingPageModalOpen(false);
                  setSelectedLandingPageVideo(null);
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={confirmLandingPageChange}
                disabled={landingPageLoading === selectedLandingPageVideo.id}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {landingPageLoading === selectedLandingPageVideo.id && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                )}
                <span>
                  {selectedLandingPageVideo.is_landing_page_active
                    ? "Remove from Landing Page"
                    : "Set as Landing Page Video"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
