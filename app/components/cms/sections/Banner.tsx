"use client";

import { useMemo } from "react";
import EventCarousel from "../../../components/EventCarousel";

type BannerProps = {
  title?: string;
  content?: any;
};

export default function BannerSection({ title, content }: BannerProps) {
  // Normalize images for the shared EventCarousel component
  const images = useMemo(
    () =>
      (Array.isArray(content?.images) ? content.images : [])
        .filter((i: any) => i && typeof i.url === "string" && i.url.length > 0)
        .map((i: any, index: number) => ({
          url: i.url,
          alt: i.alt || title || "Banner Image",
          order: index,
        })),
    [content?.images, title],
  );

  if (images.length === 0) {
    return (
      <section className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 shadow-lg">
        {title && (
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
            {title}
          </h2>
        )}
        <p className="text-gray-500 dark:text-gray-400 text-lg">
          No banner images configured.
        </p>
      </section>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <EventCarousel
        images={images}
        carouselEnabled={
          (content?.carousel_enabled ?? true) && images.length > 1
        }
        carouselInterval={Number(content?.carousel_interval) || 5}
        className="mb-0"
        ariaLabel={title || "Banner carousel"}
      />
    </div>
  );
}
