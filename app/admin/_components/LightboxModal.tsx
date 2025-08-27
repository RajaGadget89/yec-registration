"use client";

import { useEffect, useState } from "react";
import NextImage from "next/image";
import {
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Download,
  ZoomIn,
} from "lucide-react";
import { t } from "@/app/lib/i18n";

interface LightboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  images: Array<{
    url: string;
    label: string;
    type: "image" | "pdf" | "document";
  }>;
  currentIndex: number;
  onIndexChange: (index: number) => void;
}

export default function LightboxModal({
  isOpen,
  onClose,
  images,
  currentIndex,
  onIndexChange,
}: LightboxModalProps) {
  const [isLoading, setIsLoading] = useState(true);

  const currentImage = images[currentIndex];

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          e.preventDefault();
          onIndexChange((currentIndex - 1 + images.length) % images.length);
          break;
        case "ArrowRight":
          e.preventDefault();
          onIndexChange((currentIndex + 1) % images.length);
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex, images.length, onClose, onIndexChange]);

  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
  };

  const goToPrevious = () => {
    onIndexChange((currentIndex - 1 + images.length) % images.length);
  };

  const goToNext = () => {
    onIndexChange((currentIndex + 1) % images.length);
  };

  if (!isOpen || !currentImage) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
        aria-label="Close"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Navigation arrows */}
      {images.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
            aria-label="Previous image"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-10 p-3 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
            aria-label="Next image"
          >
            <ChevronRight className="h-8 w-8" />
          </button>
        </>
      )}

      {/* Image counter */}
      <div className="absolute top-4 left-4 z-10 px-3 py-1 bg-white/20 rounded-full text-white text-sm">
        {currentIndex + 1} / {images.length}
      </div>

      {/* Main content */}
      <div className="relative w-full h-full flex items-center justify-center p-8">
        {currentImage.type === "image" ? (
          <div className="relative max-w-full max-h-full">
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
              </div>
            )}
            <NextImage
              src={currentImage.url}
              alt={currentImage.label}
              width={800}
              height={600}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onLoad={handleImageLoad}
              onError={handleImageError}
              style={{ opacity: isLoading ? 0 : 1 }}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 60vw"
            />
          </div>
        ) : (
          <div className="text-center text-white">
            <div className="mb-4">
              <ZoomIn className="h-16 w-16 mx-auto mb-4 text-white/60" />
              <h3 className="text-xl font-semibold mb-2">
                {currentImage.label}
              </h3>
              <p className="text-white/80">
                {currentImage.type === "pdf" ? "PDF Document" : "Document"}
              </p>
            </div>
            <div className="flex justify-center space-x-4">
              <a
                href={currentImage.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-colors"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                {t("open")}
              </a>
              <a
                href={currentImage.url}
                download
                className="inline-flex items-center px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-colors"
              >
                <Download className="h-4 w-4 mr-2" />
                {t("download")}
              </a>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons for images */}
      {currentImage.type === "image" && (
        <div className="absolute bottom-4 right-4 z-10 flex space-x-2">
          <a
            href={currentImage.url}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-colors"
            title={t("open_in_new_tab")}
          >
            <ExternalLink className="h-5 w-5" />
          </a>
          <a
            href={currentImage.url}
            download
            className="p-2 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-colors"
            title={t("download")}
          >
            <Download className="h-5 w-5" />
          </a>
        </div>
      )}

      {/* Image label */}
      <div className="absolute bottom-4 left-4 z-10 px-3 py-1 bg-white/20 rounded-lg text-white text-sm">
        {currentImage.label}
      </div>
    </div>
  );
}
