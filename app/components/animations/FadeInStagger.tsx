'use client';

import React, { useEffect, useRef, useState } from 'react';

interface FadeInStaggerProps {
  children: React.ReactNode;
  delay?: number; // Delay between each child in milliseconds
  duration?: number; // Animation duration in milliseconds
  className?: string;
}

export default function FadeInStagger({ 
  children, 
  delay = 50, 
  duration = 500,
  className = '' 
}: FadeInStaggerProps) {
  const [visibleChildren, setVisibleChildren] = useState<number[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const childrenArray = React.Children.toArray(children);
            childrenArray.forEach((_, index) => {
              setTimeout(() => {
                setVisibleChildren(prev => [...prev, index]);
              }, index * delay);
            });
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1 }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [children, delay]);

  return (
    <div ref={containerRef} className={className}>
      {React.Children.map(children, (child, index) => (
        <div
          key={index}
          className={`transition-all duration-${duration} ease-out ${
            visibleChildren.includes(index)
              ? 'opacity-100 translate-y-0'
              : 'opacity-0 translate-y-4'
          }`}
          style={{
            transitionDelay: `${index * delay}ms`,
            transitionDuration: `${duration}ms`
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
} 