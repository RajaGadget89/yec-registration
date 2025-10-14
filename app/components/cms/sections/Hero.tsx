"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";

type HeroProps = {
  title?: string;
  content?: any;
};

export default function HeroSection({ title, content }: HeroProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Extract content properties
  const subtitle =
    typeof content?.subtitle === "string" ? content.subtitle : undefined;
  const desktopVideoUrl = content?.desktop_video_url;
  const mobileVideoUrl = content?.mobile_video_url;
  const fallbackImageUrl = content?.fallback_image_url;
  const autoplay = content?.autoplay !== false; // Default to true
  const muted = content?.muted !== false; // Default to true
  const loop = content?.loop !== false; // Default to true

  // Device detection
  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkDevice = () => {
      const userAgent = navigator.userAgent || "";
      const isMobileDevice =
        /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
          userAgent.toLowerCase(),
        );
      const isSmallScreen = window.innerWidth < 1024;
      const shouldShowMobile = isMobileDevice || isSmallScreen;

      setIsMobile(shouldShowMobile);
      setIsLoaded(true);
    };

    checkDevice();
    window.addEventListener("resize", checkDevice);
    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  // Determine which video to show
  const getVideoUrl = () => {
    if (isMobile && mobileVideoUrl) return mobileVideoUrl;
    if (desktopVideoUrl) return desktopVideoUrl;
    return mobileVideoUrl || desktopVideoUrl;
  };

  const videoUrl = getVideoUrl();
  const hasVideo = !!videoUrl;
  const hasFallbackImage = !!fallbackImageUrl;

  // Build a YouTube embed URL with correct params for autoplay and looping
  const getYouTubeEmbedSrc = () => {
    if (!videoUrl) return undefined;

    const url = new URL(
      videoUrl,
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost",
    );
    let videoId: string | null = null;

    const href = url.href;
    if (href.includes("/embed/")) {
      videoId = href.split("/embed/")[1]?.split("?")[0] || null;
    } else if (href.includes("watch?v=")) {
      videoId = href.split("v=")[1]?.split("&")[0] || null;
    } else if (href.includes("youtu.be/")) {
      videoId = href.split("youtu.be/")[1]?.split("?")[0] || null;
    }

    // Fallback if no id
    if (!videoId) return `${href}`;

    const base = `https://www.youtube.com/embed/${videoId}`;
    const params = new URLSearchParams({
      autoplay: autoplay ? "1" : "0",
      mute: muted ? "1" : "0",
      controls: "0",
      loop: loop ? "1" : "0",
      playlist: videoId, // required by YouTube for looping
      modestbranding: "1",
      showinfo: "0",
      rel: "0",
      playsinline: "1",
      vq: "hd1080",
      enablejsapi: "1",
      origin: typeof window !== "undefined" ? window.location.origin : "",
    });
    return `${base}?${params.toString()}`;
  };

  // Proactively trigger autoplay via YouTube Iframe API after mount/visibility
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const postYouTubeCommand = (func: string, args: any[] = []) => {
    try {
      const win = iframeRef.current?.contentWindow;
      if (!win) return;
      if (process.env.NODE_ENV !== "production") {
        // Debug log in dev only
        console.debug("[Hero] postMessage", { func, args });
      }
      win.postMessage(JSON.stringify({ event: "command", func, args }), "*");
    } catch {
      // no-op
    }
  };

  useEffect(() => {
    if (!hasVideo || !autoplay) return;

    // Small delay lets the iframe initialize its API
    const t = setTimeout(() => {
      if (muted) postYouTubeCommand("mute");
      postYouTubeCommand("playVideo");
    }, 400);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        if (muted) postYouTubeCommand("mute");
        postYouTubeCommand("playVideo");
      }
    };
    const onPageShow = () => {
      // Trigger on back/forward cache restores
      if (muted) postYouTubeCommand("mute");
      postYouTubeCommand("playVideo");
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pageshow", onPageShow);

    return () => {
      clearTimeout(t);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [hasVideo, autoplay, muted, videoUrl]);

  // If no video content, render as regular hero section
  if (!hasVideo && !hasFallbackImage) {
    return (
      <section className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8">
        <div className="absolute inset-0 bg-gradient-to-r from-yec-primary/10 via-blue-400/10 to-yec-accent/10" />
        <div className="relative">
          {title && (
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {title}
            </h2>
          )}
          {subtitle && (
            <p className="text-gray-700 dark:text-gray-300">{subtitle}</p>
          )}
        </div>
      </section>
    );
  }

  // Render video hero section
  return (
    <section className="relative w-full h-screen bg-black flex items-center justify-center overflow-hidden">
      {/* Video Background */}
      {hasVideo && isLoaded && (
        <div className="absolute inset-0 w-full h-full">
          <iframe
            key={`${videoUrl}-${autoplay}-${muted}-${loop}`}
            className="w-full h-full object-cover"
            src={getYouTubeEmbedSrc()}
            ref={iframeRef}
            title={`Hero Video - ${title || "Hero Section"}`}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            style={{
              transform: "scale(1.1)",
              transformOrigin: "center",
            }}
            onLoad={() => {
              // As soon as iframe reports load, ensure playback starts
              if (autoplay) {
                setTimeout(() => {
                  if (muted) postYouTubeCommand("mute");
                  postYouTubeCommand("playVideo");
                }, 200);
              }
            }}
          />
        </div>
      )}

      {/* Fallback Image */}
      {!hasVideo && hasFallbackImage && (
        <div className="absolute inset-0 w-full h-full">
          <Image
            src={fallbackImageUrl}
            alt={title || "Hero Image"}
            fill
            className="object-cover"
            priority
          />
        </div>
      )}

      {/* Loading State */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
          <div className="text-white">Loading...</div>
        </div>
      )}

      {/* Content Overlay */}
      <div className="relative z-10 text-center text-white px-4 max-w-4xl mx-auto">
        {title && (
          <h1 className="text-4xl md:text-6xl font-bold mb-4 drop-shadow-lg">
            {title}
          </h1>
        )}
        {subtitle && (
          <p className="text-lg md:text-xl mb-8 drop-shadow-lg">{subtitle}</p>
        )}

        {/* CTA Button (optional) */}
        {content?.cta_text && content?.cta_url && (
          <button
            onClick={() => {
              if (content.cta_url.startsWith("#")) {
                // Scroll to section
                const target = document.getElementById(
                  content.cta_url.slice(1),
                );
                if (target) {
                  target.scrollIntoView({ behavior: "smooth" });
                }
              } else {
                // External link
                window.open(content.cta_url, "_blank");
              }
            }}
            className="bg-yec-accent hover:bg-yec-primary text-white font-semibold px-8 py-3 rounded-full shadow-lg transition-all text-lg transform hover:scale-105 active:scale-95"
          >
            {content.cta_text}
          </button>
        )}
      </div>

      {/* Debug Info (remove in production) */}
      {process.env.NODE_ENV === "development" && (
        <div className="absolute top-4 left-4 z-50 bg-black/80 text-white p-2 rounded text-xs">
          Device: {isMobile ? "Mobile" : "Desktop"} | Video:{" "}
          {hasVideo ? "Yes" : "No"} | Image: {hasFallbackImage ? "Yes" : "No"}
        </div>
      )}
    </section>
  );
}
