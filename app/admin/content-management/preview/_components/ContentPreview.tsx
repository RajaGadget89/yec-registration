"use client";

import { useState, useEffect } from "react";
import { Monitor, Smartphone, Tablet, RefreshCw, Eye, Settings, Globe, Lock } from "lucide-react";

interface PreviewContent {
  id: string;
  type: "page" | "news" | "activity-card" | "hero-video";
  title: string;
  content: any;
  device_type: "desktop" | "tablet" | "mobile";
  is_published: boolean;
  last_updated: string;
}

export default function ContentPreview() {
  const [selectedDevice, setSelectedDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [selectedContent, setSelectedContent] = useState<PreviewContent | null>(null);
  const [contentList, setContentList] = useState<PreviewContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    fetchContentList();
  }, []);

  const fetchContentList = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/cms/preview");
      if (!response.ok) {
        throw new Error("Failed to fetch content list");
      }

      const data = await response.json();
      setContentList(data.content || []);
    } catch (error) {
      console.error("Error fetching content list:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleContentSelect = (content: PreviewContent) => {
    setSelectedContent(content);
    // Generate preview URL based on content type and device
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const previewUrl = `${baseUrl}/preview/${content.type}/${content.id}?device=${selectedDevice}`;
    setPreviewUrl(previewUrl);
  };

  const handleDeviceChange = (device: "desktop" | "tablet" | "mobile") => {
    setSelectedDevice(device);
    if (selectedContent) {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
      const previewUrl = `${baseUrl}/preview/${selectedContent.type}/${selectedContent.id}?device=${device}`;
      setPreviewUrl(previewUrl);
    }
  };

  const getDeviceIcon = (device: string) => {
    switch (device) {
      case "desktop":
        return <Monitor className="h-5 w-5" />;
      case "tablet":
        return <Tablet className="h-5 w-5" />;
      case "mobile":
        return <Smartphone className="h-5 w-5" />;
      default:
        return <Monitor className="h-5 w-5" />;
    }
  };

  const getDeviceDimensions = (device: string) => {
    switch (device) {
      case "desktop":
        return "w-full h-[600px]";
      case "tablet":
        return "w-[768px] h-[1024px] mx-auto";
      case "mobile":
        return "w-[375px] h-[667px] mx-auto";
      default:
        return "w-full h-[600px]";
    }
  };

  const getContentTypeIcon = (type: string) => {
    switch (type) {
      case "page":
        return "📄";
      case "news":
        return "📰";
      case "activity-card":
        return "🎯";
      case "hero-video":
        return "🎥";
      default:
        return "📄";
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
      {/* Device Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Device Preview</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => fetchContentList()}
              className="p-2 text-gray-400 hover:text-yec-primary transition-colors duration-200"
              title="Refresh Content"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 text-gray-400 hover:text-yec-primary transition-colors duration-200"
              title="Toggle Fullscreen"
            >
              <Eye className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex space-x-2">
          {(["desktop", "tablet", "mobile"] as const).map((device) => (
            <button
              key={device}
              onClick={() => handleDeviceChange(device)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors duration-200 ${
                selectedDevice === device
                  ? "bg-yec-primary text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              {getDeviceIcon(device)}
              <span className="capitalize">{device}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Content List */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Select Content</h3>
            
            <div className="space-y-3">
              {contentList.map((content) => (
                <div
                  key={content.id}
                  onClick={() => handleContentSelect(content)}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors duration-200 ${
                    selectedContent?.id === content.id
                      ? "border-yec-primary bg-yec-primary/10"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="text-2xl">{getContentTypeIcon(content.type)}</div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {content.title}
                      </h4>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                          {content.type}
                        </span>
                        {content.is_published ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                            <Globe className="h-3 w-3 mr-1" />
                            Published
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400">
                            <Lock className="h-3 w-3 mr-1" />
                            Draft
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Updated: {new Date(content.last_updated).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {contentList.length === 0 && (
              <div className="text-center py-8">
                <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">No content available</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Create some content to preview it here.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Preview Area */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Preview</h3>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedDevice === "desktop" ? "1920x1080" : selectedDevice === "tablet" ? "768x1024" : "375x667"}
                </span>
              </div>
            </div>

            {selectedContent ? (
              <div className="space-y-4">
                {/* Preview Frame */}
                <div className={`border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden ${getDeviceDimensions(selectedDevice)}`}>
                  {previewUrl ? (
                    <iframe
                      src={previewUrl}
                      className="w-full h-full border-0"
                      title={`Preview of ${selectedContent.title}`}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700">
                      <div className="text-center">
                        <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Loading preview...
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Content Info */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    {selectedContent.title}
                  </h4>
                  <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                    <span className="capitalize">{selectedContent.type}</span>
                    <span>•</span>
                    <span>Device: {selectedDevice}</span>
                    <span>•</span>
                    <span>
                      {selectedContent.is_published ? "Published" : "Draft"}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Select content to preview
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Choose content from the list to see how it looks on different devices.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen Preview Modal */}
      {isFullscreen && selectedContent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedContent.title} - {selectedDevice} Preview
              </h3>
              <button
                onClick={() => setIsFullscreen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              <div className={`border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden ${getDeviceDimensions(selectedDevice)}`}>
                {previewUrl ? (
                  <iframe
                    src={previewUrl}
                    className="w-full h-full border-0"
                    title={`Fullscreen preview of ${selectedContent.title}`}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-700">
                    <div className="text-center">
                      <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Loading preview...
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
