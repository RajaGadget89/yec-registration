import { getSupabaseServiceClient } from "./supabase/server";

interface SEOConfig {
  siteName: string;
  siteTitleSuffix: string;
  defaultDescription: string;
  ogImageUrl?: string;
  twitterHandle?: string;
  activitiesTitle: string;
  activitiesDescription: string;
  newsTitle: string;
  newsDescription: string;
  faqTitle: string;
  faqDescription: string;
  robotsAllow: string[];
  robotsDisallow: string[];
}

const DEFAULT_SEO_CONFIG: SEOConfig = {
  siteName: "YEC Day",
  siteTitleSuffix: "YEC Day",
  defaultDescription: "",
  activitiesTitle: "Activities",
  activitiesDescription: "Explore all available activities and events",
  newsTitle: "News",
  newsDescription: "Latest news and updates",
  faqTitle: "FAQ",
  faqDescription: "Frequently asked questions and answers",
  robotsAllow: ["/", "/activities", "/news", "/faq"],
  robotsDisallow: ["/admin/", "/api/", "/checker/", "/preview/", "/_next/"],
};

let cachedConfig: SEOConfig | null = null;
let cacheTime: number = 0;
const CACHE_TTL = 60000; // 1 minute

export async function getSEOConfig(): Promise<SEOConfig> {
  const now = Date.now();
  if (cachedConfig && now - cacheTime < CACHE_TTL) {
    return cachedConfig;
  }

  try {
    const supabase = getSupabaseServiceClient();
    const { data } = await supabase
      .from("cms_branding")
      .select(
        `
        seo_site_name,
        seo_site_title_suffix,
        seo_default_description,
        seo_og_image_url,
        seo_twitter_handle,
        seo_activities_title,
        seo_activities_description,
        seo_news_title,
        seo_news_description,
        seo_faq_title,
        seo_faq_description,
        seo_robots_allow,
        seo_robots_disallow
      `,
      )
      .eq("is_active", true)
      .single();

    if (data) {
      cachedConfig = {
        siteName: data.seo_site_name || DEFAULT_SEO_CONFIG.siteName,
        siteTitleSuffix:
          data.seo_site_title_suffix || DEFAULT_SEO_CONFIG.siteTitleSuffix,
        defaultDescription:
          data.seo_default_description || DEFAULT_SEO_CONFIG.defaultDescription,
        ogImageUrl: data.seo_og_image_url,
        twitterHandle: data.seo_twitter_handle,
        activitiesTitle:
          data.seo_activities_title || DEFAULT_SEO_CONFIG.activitiesTitle,
        activitiesDescription:
          data.seo_activities_description ||
          DEFAULT_SEO_CONFIG.activitiesDescription,
        newsTitle: data.seo_news_title || DEFAULT_SEO_CONFIG.newsTitle,
        newsDescription:
          data.seo_news_description || DEFAULT_SEO_CONFIG.newsDescription,
        faqTitle: data.seo_faq_title || DEFAULT_SEO_CONFIG.faqTitle,
        faqDescription:
          data.seo_faq_description || DEFAULT_SEO_CONFIG.faqDescription,
        robotsAllow: data.seo_robots_allow || DEFAULT_SEO_CONFIG.robotsAllow,
        robotsDisallow:
          data.seo_robots_disallow || DEFAULT_SEO_CONFIG.robotsDisallow,
      };
      cacheTime = now;
      return cachedConfig;
    }
  } catch (error) {
    console.error("Failed to fetch SEO config:", error);
  }

  return DEFAULT_SEO_CONFIG;
}

export function clearSEOConfigCache() {
  cachedConfig = null;
  cacheTime = 0;
}
