"use client";

import { useState, useEffect } from "react";
import { X, Play, Smartphone, Monitor } from "lucide-react";

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
}

interface EditHeroVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  video: HeroVideo | null;
}

export default function EditHeroVideoModal({
  isOpen,
  onClose,
  onSuccess,
  video,
}: EditHeroVideoModalProps) {
  const [_pages, setPages] = useState<CmsPage[]>([]);
  const [_loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    desktop_video_url: "",
    mobile_video_url: "",
    fallback_image_url: "",
    autoplay: true,
    muted: true,
    loop: true,
    is_active: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data when video changes
  useEffect(() => {
    if (video) {
      setFormData({
        desktop_video_url: video.desktop_video_url || "",
        mobile_video_url: video.mobile_video_url || "",
        fallback_image_url: video.fallback_image_url || "",
        autoplay: video.autoplay,
        muted: video.muted,
        loop: video.loop,
        is_active: video.is_active,
      });
    }
  }, [video]);

  // Fetch available CMS pages
  useEffect(() => {
    if (isOpen) {
      fetchPages();
    }
  }, [isOpen]);

  const fetchPages = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/cms/pages?limit=100");
      if (!response.ok) {
        throw new Error("Failed to fetch pages");
      }
      const data = await response.json();
      setPages(data.pages || []);
    } catch (error) {
      console.error("Error fetching pages:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.desktop_video_url && !formData.mobile_video_url) {
      newErrors.video_urls =
        "At least one video URL (desktop or mobile) must be provided";
    }

    if (formData.desktop_video_url && !isValidUrl(formData.desktop_video_url)) {
      newErrors.desktop_video_url = "Please enter a valid URL";
    }

    if (formData.mobile_video_url && !isValidUrl(formData.mobile_video_url)) {
      newErrors.mobile_video_url = "Please enter a valid URL";
    }

    if (
      formData.fallback_image_url &&
      !isValidUrl(formData.fallback_image_url)
    ) {
      newErrors.fallback_image_url = "Please enter a valid URL";
    }

    // Additional validation for fallback image URL
    if (
      formData.fallback_image_url &&
      formData.fallback_image_url.trim() !== ""
    ) {
      if (formData.fallback_image_url.includes("/edit/")) {
        newErrors.fallback_image_url =
          "Invalid image URL detected. Please use a direct image URL or leave empty for auto-generated thumbnail.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url: string) => {
    if (!url || url.trim() === "") return true; // Allow empty URLs for optional fields

    try {
      const urlObj = new URL(url);
      // Allow YouTube embed URLs and other valid URLs
      return urlObj.protocol === "http:" || urlObj.protocol === "https:";
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!video) return;

    if (!validateForm()) {
      return;
    }

    try {
      setSubmitting(true);
      const response = await fetch(`/api/admin/cms/hero-videos/${video.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Handle validation errors with specific field messages
        if (errorData.details && Array.isArray(errorData.details)) {
          const fieldErrors: Record<string, string> = {};
          errorData.details.forEach((detail: any) => {
            fieldErrors[detail.field] = detail.message;
          });
          setErrors(fieldErrors);
          return;
        }

        throw new Error(errorData.error || "Failed to update hero video");
      }

      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error updating hero video:", error);
      setErrors({
        submit:
          error instanceof Error
            ? error.message
            : "Failed to update hero video",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !video) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Edit Hero Video
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Page Info (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Page (Cannot be changed)
            </label>
            <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
              {video.page_id}
            </div>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              The page cannot be changed after creation. Create a new hero video
              for a different page.
            </p>
          </div>

          {/* Video URLs */}
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                <strong>YouTube URL Format:</strong> Use the embed URL format:{" "}
                <code>https://www.youtube.com/embed/VIDEO_ID</code>
                <br />
                Example: <code>https://www.youtube.com/embed/JZ2ISKMv2ww</code>
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Desktop Video */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Monitor className="inline h-4 w-4 mr-1" />
                  Desktop Video URL
                </label>
                <input
                  type="url"
                  name="desktop_video_url"
                  value={formData.desktop_video_url}
                  onChange={handleInputChange}
                  placeholder="https://www.youtube.com/embed/VIDEO_ID"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent dark:bg-gray-700 dark:text-white ${
                    errors.desktop_video_url
                      ? "border-red-500 dark:border-red-500"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                />
                {errors.desktop_video_url && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.desktop_video_url}
                  </p>
                )}
              </div>

              {/* Mobile Video */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  <Smartphone className="inline h-4 w-4 mr-1" />
                  Mobile Video URL
                </label>
                <input
                  type="url"
                  name="mobile_video_url"
                  value={formData.mobile_video_url}
                  onChange={handleInputChange}
                  placeholder="https://www.youtube.com/embed/VIDEO_ID"
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent dark:bg-gray-700 dark:text-white ${
                    errors.mobile_video_url
                      ? "border-red-500 dark:border-red-500"
                      : "border-gray-300 dark:border-gray-600"
                  }`}
                />
                {errors.mobile_video_url && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.mobile_video_url}
                  </p>
                )}
              </div>
            </div>

            {errors.video_urls && (
              <p className="text-sm text-red-600">{errors.video_urls}</p>
            )}
          </div>

          {/* Fallback Image */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Fallback Image URL (Optional)
            </label>
            <input
              type="url"
              name="fallback_image_url"
              value={formData.fallback_image_url}
              onChange={handleInputChange}
              placeholder="https://example.com/fallback-image.jpg"
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent dark:bg-gray-700 dark:text-white ${
                errors.fallback_image_url
                  ? "border-red-500 dark:border-red-500"
                  : "border-gray-300 dark:border-gray-600"
              }`}
            />
            {errors.fallback_image_url && (
              <p className="mt-1 text-sm text-red-600">
                {errors.fallback_image_url}
              </p>
            )}
          </div>

          {/* Video Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Video Settings
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="autoplay"
                    checked={formData.autoplay}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 text-yec-primary focus:ring-yec-primary"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Autoplay
                  </span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="muted"
                    checked={formData.muted}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 text-yec-primary focus:ring-yec-primary"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Muted
                  </span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="loop"
                    checked={formData.loop}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 text-yec-primary focus:ring-yec-primary"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Loop
                  </span>
                </label>
              </div>

              <div className="space-y-3">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                    className="rounded border-gray-300 text-yec-primary focus:ring-yec-primary"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Active Status
                  </span>
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Enable this video to be displayed on the page
                </p>
              </div>
            </div>
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-600 dark:text-red-400">
                {errors.submit}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-yec-primary text-white rounded-lg hover:bg-yec-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  <span>Update Video</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
