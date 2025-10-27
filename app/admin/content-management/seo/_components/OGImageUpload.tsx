"use client";

import { useState, useRef } from "react";
import { X, AlertCircle, CheckCircle, Image as ImageIcon } from "lucide-react";
import Image from "next/image";
import {
  uploadOGImage,
  validateOGImageDimensions,
  OG_IMAGE_DIMENSIONS,
} from "../../../../lib/og-image-upload";

interface OGImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
}

export default function OGImageUpload({
  value,
  onChange,
  disabled = false,
}: OGImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploading(true);

    try {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        throw new Error("Please select a valid image file");
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        throw new Error("Image size must be less than 5MB");
      }

      // Validate dimensions
      const dimensionValidation = await validateOGImageDimensions(file);
      if (!dimensionValidation.valid) {
        throw new Error(
          dimensionValidation.error || "Invalid image dimensions",
        );
      }

      // Upload image
      const result = await uploadOGImage(file);
      if (!result.success) {
        throw new Error(result.error || "Upload failed");
      }

      // Update parent component
      onChange(result.publicUrl!);
      setPreview(result.publicUrl!);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    onChange("");
    setPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        onClick={handleClick}
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
          ${
            disabled
              ? "border-gray-300 bg-gray-50 cursor-not-allowed"
              : "border-gray-300 hover:border-yec-primary hover:bg-yec-primary/5"
          }
          ${error ? "border-red-300 bg-red-50" : ""}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled}
        />

        {uploading ? (
          <div className="flex flex-col items-center space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-yec-primary"></div>
            <p className="text-sm text-gray-600">Uploading image...</p>
          </div>
        ) : preview ? (
          <div className="flex flex-col items-center space-y-2">
            <div className="relative">
              <Image
                src={preview}
                alt="Open Graph preview"
                width={128}
                height={64}
                className="w-32 h-16 object-cover rounded border"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove();
                }}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <p className="text-xs text-gray-500">Click to change image</p>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-2">
            <ImageIcon className="w-8 h-8 text-gray-400" />
            <div>
              <p className="text-sm font-medium text-gray-900">
                Upload Open Graph Image
              </p>
              <p className="text-xs text-gray-500">
                {OG_IMAGE_DIMENSIONS.width}×{OG_IMAGE_DIMENSIONS.height}px
                recommended
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center space-x-2 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
        </div>
      )}

      {/* Success Message */}
      {preview && !error && (
        <div className="flex items-center space-x-2 text-green-600 text-sm">
          <CheckCircle className="w-4 h-4" />
          <span>Image uploaded successfully</span>
        </div>
      )}

      {/* Current URL Display */}
      {value && (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
            Current URL:
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 break-all">
            {value}
          </p>
        </div>
      )}

      {/* Guidelines */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>
          • Recommended size: {OG_IMAGE_DIMENSIONS.width}×
          {OG_IMAGE_DIMENSIONS.height}px
        </p>
        <p>• Aspect ratio: {OG_IMAGE_DIMENSIONS.aspectRatio}</p>
        <p>• Supported formats: JPG, PNG, WebP</p>
        <p>• Maximum file size: 5MB</p>
        <p>• Image will be stored in Supabase public storage</p>
      </div>
    </div>
  );
}
