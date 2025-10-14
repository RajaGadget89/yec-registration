"use client";

import { useState, useEffect } from "react";
import DesktopVideo from "./DesktopVideo";
import MobileVideo from "./MobileVideo";

interface LandingPageHeroVideo {
  id: string;
  title: string;
  desktop_video_url: string;
  mobile_video_url: string;
  fallback_image_url?: string;
  autoplay: boolean;
  muted: boolean;
  loop: boolean;
  is_active: boolean;
}

export default function HeroSection() {
  const [isMobile, setIsMobile] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [heroVideo, setHeroVideo] = useState<LandingPageHeroVideo | null>(null);
  const [videoLoading, setVideoLoading] = useState(true);
  const [shouldShowHero, setShouldShowHero] = useState(false);

  // Function to clear cache and force refresh
  const clearCacheAndRefresh = () => {
    localStorage.removeItem("hero-video-cache");
    window.location.reload();
  };

  // Add global function for debugging
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).clearHeroVideoCache = clearCacheAndRefresh;
    }
  }, []);

  // Fetch landing page hero video with smart hide/show logic and caching
  useEffect(() => {
    const fetchHeroVideo = async () => {
      try {
        setVideoLoading(true);

        // Always fetch fresh data to avoid cache issues
        // TODO: Re-enable caching once cache invalidation is properly implemented
        const now = Date.now();
        console.log(
          "Fetching fresh hero video data (cache disabled for debugging)",
        );

        // Fetch fresh data with cache-busting
        const response = await fetch(
          `/api/cms/hero-videos/landing-page/active?t=${now}`,
        );

        if (response.ok) {
          const data = await response.json();

          // Don't cache for now to avoid stale data issues
          // localStorage.setItem(cacheKey, JSON.stringify({
          //   data,
          //   timestamp: now
          // }));

          if (data.video) {
            setHeroVideo(data.video);
            setShouldShowHero(true);
            console.log("Active hero video found, showing hero section");
          } else {
            setHeroVideo(null);
            setShouldShowHero(false);
            console.log("No active hero video found, hiding hero section");
          }
        } else {
          console.warn("No active landing page hero video found");
          setHeroVideo(null);
          setShouldShowHero(false);
        }
      } catch (error) {
        console.error("Error fetching landing page hero video:", error);
        setHeroVideo(null);
        setShouldShowHero(false);
      } finally {
        setVideoLoading(false);
      }
    };

    fetchHeroVideo();
  }, []);

  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") return;

    const checkDevice = () => {
      // Check if it's a mobile device using user agent
      const userAgent = navigator.userAgent || "";
      const isMobileDevice =
        /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
          userAgent.toLowerCase(),
        );

      // Also check screen size as backup
      const isSmallScreen = window.innerWidth < 1024;
      const shouldShowMobile = isMobileDevice || isSmallScreen;

      setIsMobile(shouldShowMobile);
      setIsLoaded(true);

      console.log("Device Detection:", {
        userAgent: userAgent,
        isMobileDevice,
        screenWidth: window.innerWidth,
        isSmallScreen,
        shouldShowMobile,
      });
    };

    checkDevice();

    // Listen for window resize
    window.addEventListener("resize", checkDevice);
    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  const handleScroll = () => {
    // Scroll directly to the registration form section
    const target = document.getElementById("form");
    if (target) {
      const header = document.querySelector("header");
      const headerHeight = header ? header.offsetHeight : 96;
      const targetPosition = target.offsetTop - headerHeight;
      window.scrollTo({ top: targetPosition, behavior: "smooth" });
    }
  };

  // Show loading state while detecting device or fetching video
  if (!isLoaded || videoLoading) {
    return (
      <section className="relative w-full h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </section>
    );
  }

  // Build video URLs with proper parameters
  const getVideoUrl = (videoUrl: string) => {
    if (!videoUrl) return null;

    const baseUrl = videoUrl.includes("embed/")
      ? videoUrl
      : `https://www.youtube.com/embed/${videoUrl}`;
    const params = new URLSearchParams({
      autoplay: heroVideo?.autoplay ? "1" : "0",
      mute: heroVideo?.muted ? "1" : "0",
      loop: heroVideo?.loop ? "1" : "0",
      controls: "1",
      modestbranding: "1",
      showinfo: "0",
      rel: "0",
      playsinline: "1",
      vq: "hd1080",
      enablejsapi: "1",
    });

    // Add playlist for loop functionality
    if (heroVideo?.loop) {
      const videoId = videoUrl.includes("embed/")
        ? videoUrl.split("/embed/")[1]?.split("?")[0]
        : videoUrl;
      if (videoId) {
        params.set("playlist", videoId);
      }
    }

    return `${baseUrl}?${params.toString()}`;
  };

  const desktopVideoUrl = heroVideo?.desktop_video_url
    ? getVideoUrl(heroVideo.desktop_video_url)
    : null;
  const mobileVideoUrl = heroVideo?.mobile_video_url
    ? getVideoUrl(heroVideo.mobile_video_url)
    : null;

  // Fallback to default videos if no hero video is set
  const fallbackDesktopUrl =
    "https://www.youtube.com/embed/JZ2ISKMv2ww?autoplay=1&mute=1&controls=1&loop=1&playlist=JZ2ISKMv2ww&modestbranding=1&showinfo=0&rel=0&playsinline=1&vq=hd1080&enablejsapi=1";
  const fallbackMobileUrl =
    "https://www.youtube.com/embed/wXHkqvzggPU?autoplay=1&mute=1&controls=1&loop=1&playlist=wXHkqvzggPU&modestbranding=1&showinfo=0&rel=0&playsinline=1&vq=hd1080&enablejsapi=1";

  // Don't render anything if no active hero video
  if (!shouldShowHero) {
    console.log("No active hero video - hero section hidden");
    return null;
  }

  return (
    <section className="relative w-full">
      {/* Responsive Background Videos */}
      {isMobile ? (
        /* Mobile Video (9:16) */
        <MobileVideo videoUrl={mobileVideoUrl || fallbackMobileUrl} />
      ) : (
        /* Desktop Video (21:9) */
        <DesktopVideo videoUrl={desktopVideoUrl || fallbackDesktopUrl} />
      )}

      {/* Debug Info - Remove in production */}
      <div className="absolute top-4 left-4 z-50 bg-black/80 text-white p-2 rounded text-xs">
        Device: {isMobile ? "Mobile" : "Desktop"} | Width:{" "}
        {typeof window !== "undefined" ? window.innerWidth : "N/A"}px
        {heroVideo && (
          <div className="mt-1">
            Hero Video: {heroVideo.title || "Untitled"} |
            {heroVideo.is_active ? " Active" : " Inactive"}
          </div>
        )}
      </div>

      {/* CTA Button */}
      <div
        className="absolute inset-0 flex items-center justify-center z-35 px-4"
        style={{
          transform: `translateY(${isMobile ? "20%" : "30%"})`,
          pointerEvents: "none",
        }}
      >
        <button
          onClick={handleScroll}
          className="bg-yec-accent hover:bg-yec-primary text-white font-semibold px-6 py-3 md:px-8 md:py-3 rounded-full shadow-lg transition-all text-sm md:text-lg transform hover:scale-105 active:scale-95 pointer-events-auto min-h-[44px] min-w-[120px] touch-manipulation focus:outline-none focus:ring-2 focus:ring-yec-primary focus:ring-offset-2"
          aria-label="View event schedule and activities"
        >
          ลงทะเบียน!!
        </button>
      </div>
    </section>
  );
}
