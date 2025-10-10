"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

interface BlurredBackgroundFillProps {
  src: string;
  alt: string;
  className?: string;
  foregroundClassName?: string;
  backgroundClassName?: string;
  blurIntensity?: number;
  overlayOpacity?: number;
  aspectRatio?: string;
  priority?: boolean;
  sizes?: string;
  quality?: number;
}

export default function BlurredBackgroundFill({
  src,
  alt,
  className = "",
  foregroundClassName = "",
  backgroundClassName = "",
  blurIntensity = 20,
  overlayOpacity = 0.3,
  aspectRatio = "16/9",
  priority = false,
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
  quality = 90,
}: BlurredBackgroundFillProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Reset states when src changes
  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
  }, [src]);

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  if (imageError) {
    // Fallback for broken images
    return (
      <div
        className={`relative overflow-hidden bg-gradient-to-br from-yec-primary to-yec-accent ${className}`}
        style={{ aspectRatio }}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-white text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-2xl font-bold">📷</span>
            </div>
            <p className="text-sm font-medium">Image unavailable</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ aspectRatio }}
    >
      {/* Blurred Background Layer */}
      <div className="absolute inset-0">
        <Image
          src={src}
          alt=""
          fill
          className={`object-cover transition-opacity duration-500 ${
            imageLoaded ? "opacity-100" : "opacity-0"
          } ${backgroundClassName}`}
          style={{
            filter: `blur(${blurIntensity}px)`,
            transform: "scale(1.1)", // Slight scale to avoid edge artifacts
          }}
          sizes={sizes}
          quality={quality}
          priority={priority}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />

        {/* Overlay for depth and harmony */}
        <div
          className="absolute inset-0 bg-black"
          style={{ opacity: overlayOpacity }}
        />
      </div>

      {/* Foreground Image Layer */}
      <div className="relative z-10 flex items-center justify-center h-full p-4">
        <div className="relative max-w-full max-h-full">
          <Image
            src={src}
            alt={alt}
            width={800}
            height={600}
            className={`object-contain transition-opacity duration-500 ${
              imageLoaded ? "opacity-100" : "opacity-0"
            } ${foregroundClassName}`}
            style={{
              maxWidth: "100%",
              maxHeight: "100%",
              width: "auto",
              height: "auto",
            }}
            sizes={sizes}
            quality={quality}
            priority={priority}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        </div>
      </div>

      {/* Loading State */}
      {!imageLoaded && !imageError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <div className="flex flex-col items-center space-y-2">
            <div className="w-8 h-8 border-2 border-yec-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Loading image...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
