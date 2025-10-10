"use client";

import Image from "next/image";

type GalleryProps = {
  title?: string;
  content?: any;
};

export default function GallerySection({ title, content }: GalleryProps) {
  const images: Array<{ url: string; alt?: string }> = Array.isArray(
    content?.images,
  )
    ? content.images
    : [];
  return (
    <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      {title && (
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
          {title}
        </h3>
      )}
      {images.length ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {images.map((img, i) => (
            <Image
              key={i}
              src={img.url}
              alt={img.alt || ""}
              width={200}
              height={128}
              className="rounded-lg object-cover w-full h-32"
            />
          ))}
        </div>
      ) : (
        <p className="text-gray-500 dark:text-gray-400">No images.</p>
      )}
    </section>
  );
}
