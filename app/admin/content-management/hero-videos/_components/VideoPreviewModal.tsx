"use client";

import { useState } from "react";
import {
  X,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Monitor,
  Smartphone,
} from "lucide-react";

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
  muted: boolean;
  loop: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  cms_pages: CmsPage;
}

interface VideoPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: HeroVideo | null;
}

export default function VideoPreviewModal({
  isOpen,
  onClose,
  video,
}: VideoPreviewModalProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(video?.muted ?? true);
  const [currentDevice, setCurrentDevice] = useState<"desktop" | "mobile">(
    "desktop",
  );
  const [hasError, setHasError] = useState(false);

  if (!isOpen || !video) return null;

  const getVideoUrl = () => {
    let baseUrl = "";
    if (currentDevice === "desktop" && video.desktop_video_url) {
      baseUrl = video.desktop_video_url;
    } else if (currentDevice === "mobile" && video.mobile_video_url) {
      baseUrl = video.mobile_video_url;
    } else {
      // Fallback to available video
      baseUrl = video.desktop_video_url || video.mobile_video_url || "";
    }

    if (!baseUrl) return "";

    // If it's already a complete YouTube embed URL, return as is
    if (baseUrl.includes("youtube.com/embed/")) {
      return baseUrl;
    }

    // If it's a regular YouTube URL, convert to embed format
    if (baseUrl.includes("youtube.com/watch?v=")) {
      const videoId = baseUrl.split("v=")[1]?.split("&")[0];
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }

    return baseUrl;
  };

  const videoUrl = getVideoUrl();
  const hasDesktopVideo = !!video.desktop_video_url;
  const hasMobileVideo = !!video.mobile_video_url;

  // Validate URL format
  const isValidYouTubeUrl = (url: string) => {
    if (!url) return false;
    return (
      url.includes("youtube.com/embed/") || url.includes("youtube.com/watch?v=")
    );
  };

  const currentVideoUrl =
    currentDevice === "desktop"
      ? video.desktop_video_url
      : video.mobile_video_url;
  const isCurrentUrlValid = isValidYouTubeUrl(currentVideoUrl || "");

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
  };

  const handleDeviceSwitch = (device: "desktop" | "mobile") => {
    setCurrentDevice(device);
    setIsPlaying(false); // Reset play state when switching devices
    setHasError(false); // Reset error state when switching devices
  };

  const handleIframeError = () => {
    setHasError(true);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Video Preview
            </h2>
            {/* Page Information */}
            <div className="flex items-center space-x-2">
              <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400">
                <span className="mr-1">📄</span>
                <span>{video.cms_pages?.title || "Unknown Page"}</span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {video.cms_pages?.slug || "unknown"} (
                {video.cms_pages?.language?.toUpperCase() || "EN"})
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleDeviceSwitch("desktop")}
                className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-sm transition-colors ${
                  currentDevice === "desktop"
                    ? "bg-yec-primary text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                } ${!hasDesktopVideo ? "opacity-50 cursor-not-allowed" : ""}`}
                disabled={!hasDesktopVideo}
              >
                <Monitor className="h-4 w-4" />
                <span>Desktop</span>
              </button>
              <button
                onClick={() => handleDeviceSwitch("mobile")}
                className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-sm transition-colors ${
                  currentDevice === "mobile"
                    ? "bg-yec-primary text-white"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                } ${!hasMobileVideo ? "opacity-50 cursor-not-allowed" : ""}`}
                disabled={!hasMobileVideo}
              >
                <Smartphone className="h-4 w-4" />
                <span>Mobile</span>
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Video Content */}
        <div className="p-6">
          {videoUrl ? (
            <div className="relative bg-black rounded-lg overflow-hidden">
              <div className="aspect-video relative">
                {!isCurrentUrlValid ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                    <div className="text-center text-white">
                      <div className="text-6xl mb-4">🔗</div>
                      <h3 className="text-lg font-semibold mb-2">
                        Invalid Video URL
                      </h3>
                      <p className="text-sm text-gray-300 mb-4">
                        The {currentDevice} video URL is not a valid YouTube
                        URL.
                      </p>
                      <div className="text-xs text-gray-400 max-w-md mx-auto">
                        <p className="mb-2">Expected format:</p>
                        <code className="bg-gray-700 px-2 py-1 rounded text-green-400">
                          https://www.youtube.com/embed/VIDEO_ID
                        </code>
                        <p className="mt-2">Current URL:</p>
                        <code className="bg-gray-700 px-2 py-1 rounded text-red-400 break-all">
                          {currentVideoUrl}
                        </code>
                      </div>
                    </div>
                  </div>
                ) : hasError ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                    <div className="text-center text-white">
                      <div className="text-6xl mb-4">⚠️</div>
                      <h3 className="text-lg font-semibold mb-2">
                        Video Playback Error
                      </h3>
                      <p className="text-sm text-gray-300 mb-4">
                        Unable to load the video. This might be due to:
                      </p>
                      <ul className="text-xs text-gray-400 text-left max-w-md mx-auto">
                        <li>• Video is private or restricted</li>
                        <li>• Network connectivity issues</li>
                        <li>• YouTube API restrictions</li>
                        <li>• Video has been removed</li>
                      </ul>
                      <button
                        onClick={() => setHasError(false)}
                        className="mt-4 px-4 py-2 bg-yec-primary text-white rounded-lg hover:bg-yec-accent transition-colors"
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                ) : (
                  <iframe
                    className="absolute inset-0 w-full h-full"
                    src={`${videoUrl}?autoplay=${isPlaying ? 1 : 0}&mute=${isMuted ? 1 : 0}&controls=1&loop=${video.loop ? 1 : 0}&modestbranding=1&showinfo=0&rel=0&playsinline=1&enablejsapi=1`}
                    title={`Hero Video Preview - ${currentDevice}`}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    onError={handleIframeError}
                  />
                )}
              </div>

              {/* Video Controls Overlay */}
              <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-75 rounded-lg p-3">
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={handlePlayPause}
                      className="flex items-center space-x-2 px-3 py-1 bg-yec-primary rounded-lg hover:bg-yec-accent transition-colors"
                    >
                      {isPlaying ? (
                        <>
                          <Pause className="h-4 w-4" />
                          <span>Pause</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" />
                          <span>Play</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleMuteToggle}
                      className="flex items-center space-x-2 px-3 py-1 bg-gray-600 rounded-lg hover:bg-gray-500 transition-colors"
                    >
                      {isMuted ? (
                        <>
                          <VolumeX className="h-4 w-4" />
                          <span>Unmute</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="h-4 w-4" />
                          <span>Mute</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="text-sm text-gray-300">
                    {currentDevice === "desktop"
                      ? "Desktop View"
                      : "Mobile View"}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <div className="text-gray-500 dark:text-gray-400 mb-2">
                  <Monitor className="h-12 w-12 mx-auto" />
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  No video available for {currentDevice} view
                </p>
              </div>
            </div>
          )}

          {/* Video Settings Info */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                Video Settings
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Autoplay:
                  </span>
                  <span
                    className={`font-medium ${video.autoplay ? "text-green-600" : "text-red-600"}`}
                  >
                    {video.autoplay ? "On" : "Off"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Muted:
                  </span>
                  <span
                    className={`font-medium ${video.muted ? "text-green-600" : "text-red-600"}`}
                  >
                    {video.muted ? "On" : "Off"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Loop:
                  </span>
                  <span
                    className={`font-medium ${video.loop ? "text-green-600" : "text-red-600"}`}
                  >
                    {video.loop ? "On" : "Off"}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                Video URLs
              </h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600 dark:text-gray-400">
                    Desktop:
                  </span>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 break-all">
                    {video.desktop_video_url ? "✓ Available" : "✗ Not set"}
                  </div>
                </div>
                <div>
                  <span className="text-gray-600 dark:text-gray-400">
                    Mobile:
                  </span>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 break-all">
                    {video.mobile_video_url ? "✓ Available" : "✗ Not set"}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                Fallback Image
              </h3>
              <div className="text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  Status:
                </span>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {video.fallback_image_url ? "✓ Available" : "✗ Not set"}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}
