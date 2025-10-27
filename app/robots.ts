import { MetadataRoute } from "next";
import { getSEOConfig } from "./lib/seo-config";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const seoConfig = await getSEOConfig();
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL || "https://yec-registration.com";

  return {
    rules: {
      userAgent: "*",
      allow: seoConfig.robotsAllow,
      disallow: seoConfig.robotsDisallow,
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
