"use client";

import BlurredBackgroundFill from "./BlurredBackgroundFill";

export default function BlurredBackgroundDemo() {
  const demoImages = [
    {
      src: "/assets/YEC-DAY2_cre.png",
      alt: "YEC Day 2025 Event Banner",
      aspectRatio: "21/9",
      blurIntensity: 30,
      overlayOpacity: 0.3,
      title: "Ultra-Wide Event Banner",
    },
    {
      src: "/assets/YEC-Networking.png",
      alt: "Networking Activity",
      aspectRatio: "4/3",
      blurIntensity: 20,
      overlayOpacity: 0.2,
      title: "Square Activity Card",
    },
    {
      src: "/assets/YEC-Learning.png",
      alt: "Learning Activity",
      aspectRatio: "16/9",
      blurIntensity: 25,
      overlayOpacity: 0.25,
      title: "Standard Video Format",
    },
  ];

  return (
    <div className="py-16 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-yec-primary mb-4">
            Blurred Background Fill Demo
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            Showcasing the enhanced image display technique with blurred
            background fill
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {demoImages.map((image, index) => (
            <div key={index} className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center">
                {image.title}
              </h3>
              <div className="relative">
                <BlurredBackgroundFill
                  src={image.src}
                  alt={image.alt}
                  className="rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
                  aspectRatio={image.aspectRatio}
                  blurIntensity={image.blurIntensity}
                  overlayOpacity={image.overlayOpacity}
                  foregroundClassName="drop-shadow-lg"
                  backgroundClassName="brightness-110"
                />
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 text-center">
                <p>Aspect Ratio: {image.aspectRatio}</p>
                <p>Blur: {image.blurIntensity}px</p>
                <p>Overlay: {Math.round(image.overlayOpacity * 100)}%</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-8">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              How It Works
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-600 dark:text-gray-400">
              <div className="text-center">
                <div className="w-12 h-12 bg-yec-primary/20 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-yec-primary font-bold">1</span>
                </div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                  Background Layer
                </h4>
                <p>
                  Same image, heavily blurred and scaled to fill the entire
                  frame
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-yec-accent/20 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-yec-accent font-bold">2</span>
                </div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                  Overlay
                </h4>
                <p>Subtle dark overlay for depth and visual harmony</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-yec-highlight/20 rounded-full flex items-center justify-center mx-auto mb-2">
                  <span className="text-yec-highlight font-bold">3</span>
                </div>
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                  Foreground
                </h4>
                <p>Sharp, centered image maintaining natural proportions</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
