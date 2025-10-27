import type { Metadata } from "next";
import { getSEOConfig } from "./seo-config";

export function buildCanonicalUrl(path: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "";
  return `${baseUrl}${path}`;
}

export function buildPageMetadata({
  title,
  description,
  image,
  canonicalPath,
}: {
  title: string;
  description?: string;
  image?: string;
  canonicalPath?: string;
}): Metadata {
  const canonical = canonicalPath
    ? buildCanonicalUrl(canonicalPath)
    : undefined;

  const meta: Metadata = {
    title,
    description,
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      title,
      description,
      url: canonical,
      images: image ? [image] : undefined,
      type: "website",
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

export async function buildDynamicPageMetadata({
  title,
  description,
  image,
  canonicalPath,
}: {
  title: string;
  description?: string;
  image?: string;
  canonicalPath?: string;
}): Promise<Metadata> {
  const seoConfig = await getSEOConfig();
  const canonical = canonicalPath
    ? buildCanonicalUrl(canonicalPath)
    : undefined;

  const meta: Metadata = {
    title: `${title} - ${seoConfig.siteTitleSuffix}`,
    description: description || seoConfig.defaultDescription,
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      title,
      description: description || seoConfig.defaultDescription,
      url: canonical,
      images: image
        ? [image]
        : seoConfig.ogImageUrl
          ? [seoConfig.ogImageUrl]
          : undefined,
      type: "website",
      siteName: seoConfig.siteName,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: description || seoConfig.defaultDescription,
      images: image
        ? [image]
        : seoConfig.ogImageUrl
          ? [seoConfig.ogImageUrl]
          : undefined,
      site: seoConfig.twitterHandle,
    },
  };
  return meta;
}
