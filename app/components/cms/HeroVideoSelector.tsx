"use client";

import { useState, useEffect } from "react";
import { Search, Play, Eye, Check, X } from "lucide-react";
import Image from "next/image";

interface HeroVideo {
  id: string;
  page_id: string;
  desktop_video_url?: string;
  mobile_video_url?: string;
  fallback_image_url?: string;
  autoplay: boolean;
  muted: boolean;
  loop: boolean;
  is_active: boolean;
  is_landing_page_active?: boolean;
  created_at: string;
  updated_at: string;
  cms_pages: {
    id: string;
    slug: string;
    title: string;
    language: string;
  };
}

interface HeroVideoSelectorProps {
  onSelect: (heroVideo: HeroVideo | null) => void;
  selectedHeroVideoId?: string;
  disabled?: boolean;
}

export default function HeroVideoSelector({
  onSelect,
  selectedHeroVideoId,
  disabled = false,
}: HeroVideoSelectorProps) {
  const [heroVideos, setHeroVideos] = useState<HeroVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedVideo, setSelectedVideo] = useState<HeroVideo | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [previewVideo, setPreviewVideo] = useState<HeroVideo | null>(null);

  // Fetch hero videos
  useEffect(() => {
    const fetchHeroVideos = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/admin/cms/hero-videos");

        if (response.ok) {
          const data = await response.json();
          setHeroVideos(data.videos || []);
        } else {
          console.error("Failed to fetch hero videos");
        }
      } catch (error) {
        console.error("Error fetching hero videos:", error);
      } finally {
        setLoading(false);
      }
    };

    // Fetch hero videos when component mounts or when modal opens
    if (isOpen || heroVideos.length === 0) {
      fetchHeroVideos();
    }
  }, [isOpen, heroVideos.length]);

  // Set selected video when selectedHeroVideoId changes
  useEffect(() => {
    if (selectedHeroVideoId && heroVideos.length > 0) {
      const video = heroVideos.find((v) => v.id === selectedHeroVideoId);
      setSelectedVideo(video || null);
    }
  }, [selectedHeroVideoId, heroVideos]);

  const filteredVideos = heroVideos.filter((video) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      video.cms_pages.title.toLowerCase().includes(searchLower) ||
      video.cms_pages.slug.toLowerCase().includes(searchLower)
    );
  });

  const getVideoThumbnailUrl = (video: HeroVideo) => {
    if (video.fallback_image_url) {
      return video.fallback_image_url;
    }

    const videoUrl = video.desktop_video_url || video.mobile_video_url;
    if (!videoUrl) return null;

    try {
      let videoId = null;
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

      if (videoId && /^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
        return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      }
    } catch (error) {
      console.warn("Error extracting video ID:", error);
    }

    return null;
  };

  const handleSelect = (video: HeroVideo) => {
    setSelectedVideo(video);
    onSelect(video);
    setIsOpen(false);
  };

  const handleClear = () => {
    setSelectedVideo(null);
    onSelect(null);
  };

  const handlePreview = (video: HeroVideo) => {
    setPreviewVideo(video);
  };

  return (
    <div className="space-y-4">
      {/* Selected Video Display */}
      {loading && heroVideos.length === 0 ? (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
              Loading hero videos...
            </span>
          </div>
        </div>
      ) : selectedVideo ? (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <div className="w-20 h-11 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden flex-shrink-0">
                {getVideoThumbnailUrl(selectedVideo) && (
                  <Image
                    src={getVideoThumbnailUrl(selectedVideo)!}
                    alt="Hero video thumbnail"
                    width={80}
                    height={44}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                      {selectedVideo.cms_pages.title}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {selectedVideo.cms_pages.slug}
                    </p>
                    <div className="flex items-center space-x-2 mt-2">
                      {selectedVideo.is_landing_page_active && (
                        <span className="px-2 py-1 text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded">
                          🚨 Landing Page Active
                        </span>
                      )}
                      {selectedVideo.is_active && (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded">
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Video Settings Display */}
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center space-x-1">
                    <span className="text-gray-500 dark:text-gray-400">
                      Desktop:
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-xs ${
                        selectedVideo.desktop_video_url
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                      }`}
                    >
                      {selectedVideo.desktop_video_url ? "Set" : "Not set"}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-gray-500 dark:text-gray-400">
                      Mobile:
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-xs ${
                        selectedVideo.mobile_video_url
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                      }`}
                    >
                      {selectedVideo.mobile_video_url ? "Set" : "Not set"}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-gray-500 dark:text-gray-400">
                      Autoplay:
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-xs ${
                        selectedVideo.autoplay
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                      }`}
                    >
                      {selectedVideo.autoplay ? "On" : "Off"}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-gray-500 dark:text-gray-400">
                      Muted:
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-xs ${
                        selectedVideo.muted
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                      }`}
                    >
                      {selectedVideo.muted ? "On" : "Off"}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="text-gray-500 dark:text-gray-400">
                      Loop:
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-xs ${
                        selectedVideo.loop
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                      }`}
                    >
                      {selectedVideo.loop ? "On" : "Off"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2 ml-3">
              <button
                onClick={() => handlePreview(selectedVideo)}
                className="p-1.5 text-gray-400 hover:text-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Preview selected video"
                disabled={disabled}
              >
                <Eye className="h-4 w-4" />
              </button>
              <button
                onClick={handleClear}
                disabled={disabled}
                className="p-1.5 text-gray-400 hover:text-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Remove selected hero video"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
          <Play className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-gray-500 dark:text-gray-400 mb-2">
            No hero video selected
          </p>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            Click &quot;Browse Hero Videos&quot; to select one
          </p>
        </div>
      )}

      {/* Browse/Change Button */}
      <button
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        className={`w-full px-4 py-2 border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 ${
          selectedVideo
            ? "border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            : "border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
        }`}
      >
        <Search className="h-4 w-4" />
        <span>
          {selectedVideo ? "Change Hero Video" : "Browse Hero Videos"}
        </span>
      </button>

      {/* Selection Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full mx-4 max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Select Hero Video
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Search */}
              <div className="mt-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search hero videos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : filteredVideos.length === 0 ? (
                <div className="text-center py-8">
                  <Play className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    {searchTerm
                      ? "No hero videos found matching your search"
                      : "No hero videos available"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredVideos.map((video) => (
                    <div
                      key={video.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start space-x-3">
                        {/* Thumbnail */}
                        <div className="w-20 h-11 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden flex-shrink-0">
                          {getVideoThumbnailUrl(video) && (
                            <Image
                              src={getVideoThumbnailUrl(video)!}
                              alt="Hero video thumbnail"
                              width={80}
                              height={44}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                {video.cms_pages.title}
                              </h4>
                              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                {video.cms_pages.slug}
                              </p>
                              <div className="flex items-center space-x-2 mt-2">
                                {video.is_landing_page_active && (
                                  <span className="px-2 py-1 text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded">
                                    🚨 Landing Page Active
                                  </span>
                                )}
                                {video.is_active && (
                                  <span className="px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded">
                                    Active
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center space-x-2 mt-3">
                            <button
                              onClick={() => handlePreview(video)}
                              className="flex items-center space-x-1 px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                              <Eye className="h-3 w-3" />
                              <span>Preview</span>
                            </button>
                            <button
                              onClick={() => handleSelect(video)}
                              className="flex items-center space-x-1 px-3 py-1 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded"
                            >
                              <Check className="h-3 w-3" />
                              <span>Select</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewVideo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full mx-4">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Preview: {previewVideo.cms_pages.title}
                </h3>
                <button
                  onClick={() => setPreviewVideo(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden">
                {previewVideo.desktop_video_url && (
                  <iframe
                    className="w-full h-full"
                    src={`${previewVideo.desktop_video_url}?autoplay=0&mute=1&controls=1&modestbranding=1&showinfo=0&rel=0`}
                    title={`Preview: ${previewVideo.cms_pages.title}`}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                )}
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  <p>
                    Desktop:{" "}
                    {previewVideo.desktop_video_url ? "Available" : "Not set"}
                  </p>
                  <p>
                    Mobile:{" "}
                    {previewVideo.mobile_video_url ? "Available" : "Not set"}
                  </p>
                </div>
                <button
                  onClick={() => handleSelect(previewVideo)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Select This Video
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
