'use client';

import React, { useEffect, useRef, useState } from 'react';

interface SlideUpProps {
  children: React.ReactNode;
  delay?: number; // Delay before animation starts in milliseconds
  duration?: number; // Animation duration in milliseconds
  className?: string;
  threshold?: number; // Intersection observer threshold
}

export default function SlideUp({ 
  children, 
  delay = 0, 
  duration = 600,
  className = '',
  threshold = 0.1
}: SlideUpProps) {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              setIsVisible(true);
            }, delay);
            observer.disconnect();
          }
        });
      },
      { threshold }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [delay, threshold]);

  return (
    <div
      ref={elementRef}
      className={`transition-all ease-out ${className} ${
        isVisible
          ? 'opacity-100 translate-y-0'
          : 'opacity-0 translate-y-8'
      }`}
      style={{
        transitionDelay: `${delay}ms`,
        transitionDuration: `${duration}ms`
      }}
    >
      {children}
    </div>
  );
} 