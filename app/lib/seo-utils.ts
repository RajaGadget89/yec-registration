import type { Metadata } from "next";

export function buildPageMetadata({
  title,
  description,
  image,
}: {
  title: string;
  description?: string;
  image?: string;
}): Metadata {
  const meta: Metadata = {
    title,
    description,
    openGraph: {
      title,
      description,
      images: image ? [image] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
  return meta;
}
