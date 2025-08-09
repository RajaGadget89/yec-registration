"use client";

import { useState, useEffect } from "react";
import DesktopVideo from "./DesktopVideo";
import MobileVideo from "./MobileVideo";

export default function HeroSection() {
  const [isMobile, setIsMobile] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      // Check if it's a mobile device using user agent
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
      
      // Also check screen size as backup
      const isSmallScreen = window.innerWidth < 1024;
      
      const shouldShowMobile = isMobileDevice || isSmallScreen;
      setIsMobile(shouldShowMobile);
      setIsLoaded(true);
      
      console.log('Device Detection:', {
        userAgent: userAgent,
        isMobileDevice,
        screenWidth: window.innerWidth,
        isSmallScreen,
        shouldShowMobile
      });
    };

    checkDevice();
    
    // Listen for window resize
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  const handleScroll = () => {
    const target = document.getElementById("event-schedule");
    if (target) {
      const header = document.querySelector('header');
      const headerHeight = header ? header.offsetHeight : 96;
      const targetPosition = target.offsetTop - headerHeight;
      window.scrollTo({ top: targetPosition, behavior: "smooth" });
    }
  };

  // Show loading state while detecting device
  if (!isLoaded) {
    return (
      <section className="relative w-full h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </section>
    );
  }

  return (
    <section className="relative w-full">
      {/* Responsive Background Videos */}
      {isMobile ? (
        /* Mobile Video (9:16) */
        <MobileVideo videoUrl="https://www.youtube.com/embed/wXHkqvzggPU?autoplay=1&mute=1&controls=1&loop=1&playlist=wXHkqvzggPU&modestbranding=1&showinfo=0&rel=0&playsinline=1&vq=hd1080&enablejsapi=1" />
      ) : (
        /* Desktop Video (21:9) */
        <DesktopVideo videoUrl="https://www.youtube.com/embed/JZ2ISKMv2ww?autoplay=1&mute=1&controls=1&loop=1&playlist=JZ2ISKMv2ww&modestbranding=1&showinfo=0&rel=0&playsinline=1&vq=hd1080&enablejsapi=1" />
      )}
      
      {/* Debug Info - Remove in production */}
      <div className="absolute top-4 left-4 z-50 bg-black/80 text-white p-2 rounded text-xs">
        Device: {isMobile ? 'Mobile' : 'Desktop'} | Width: {typeof window !== 'undefined' ? window.innerWidth : 'N/A'}px
      </div>
      
      {/* CTA Button */}
      <div
        className="absolute inset-0 flex items-center justify-center z-35 px-4"
        style={{ transform: 'translateY(40%)', pointerEvents: 'none' }}
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
