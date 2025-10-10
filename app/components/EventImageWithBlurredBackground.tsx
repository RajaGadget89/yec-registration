"use client";

import BlurredBackgroundFill from "./BlurredBackgroundFill";

interface EventImageWithBlurredBackgroundProps {
  src: string;
  alt: string;
  className?: string;
  aspectRatio?: string;
  priority?: boolean;
  sizes?: string;
  quality?: number;
  blurIntensity?: number;
  overlayOpacity?: number;
}

export default function EventImageWithBlurredBackground({
  src,
  alt,
  className = "",
  aspectRatio = "21/9", // Ultra-wide for event banners
  priority = false,
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
  quality = 95,
  blurIntensity = 25,
  overlayOpacity = 0.4,
}: EventImageWithBlurredBackgroundProps) {
  return (
    <BlurredBackgroundFill
      src={src}
      alt={alt}
      className={`rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 ${className}`}
      aspectRatio={aspectRatio}
      priority={priority}
      sizes={sizes}
      quality={quality}
      blurIntensity={blurIntensity}
      overlayOpacity={overlayOpacity}
      foregroundClassName="drop-shadow-lg"
      backgroundClassName="brightness-110"
    />
  );
}
