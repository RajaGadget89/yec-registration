/**
 * Footer Configuration Management
 * Handles server-side caching and data fetching for footer content
 */

import { getSupabaseServerClient } from "./supabase/server";
import { z } from "zod";

// TypeScript interfaces for footer data structures
export interface FooterCompanyInfo {
  title: string;
  description: string;
}

export interface FooterSocialLink {
  platform: string;
  url: string;
  icon_name: string;
}

export interface FooterQuickLink {
  label: string;
  url: string;
  type: "internal" | "external";
}

export interface FooterContactInfo {
  email: string;
  phone: string;
  address: string;
}

export interface FooterCopyright {
  main_text: string;
  credit_text: string;
}

export interface FooterConfig {
  footer_company_info?: FooterCompanyInfo;
  footer_social_links?: FooterSocialLink[];
  footer_quick_links?: FooterQuickLink[];
  footer_contact_info?: FooterContactInfo;
  footer_copyright?: FooterCopyright;
}

// Validation schemas
export const FooterCompanyInfoSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
});

export const FooterSocialLinkSchema = z.object({
  platform: z.string().min(1).max(50),
  url: z.string().url(),
  icon_name: z.string().min(1).max(50),
});

export const FooterQuickLinkSchema = z.object({
  label: z.string().min(1).max(100),
  url: z.string().min(1).max(500),
  type: z.enum(["internal", "external"]),
});

export const FooterContactInfoSchema = z.object({
  email: z.string().email(),
  phone: z.string().min(1).max(50),
  address: z.string().min(1).max(500),
});

export const FooterCopyrightSchema = z.object({
  main_text: z.string().min(1).max(200),
  credit_text: z.string().min(1).max(200),
});

export const FooterConfigSchema = z.object({
  footer_company_info: FooterCompanyInfoSchema.optional(),
  footer_social_links: z.array(FooterSocialLinkSchema).optional(),
  footer_quick_links: z.array(FooterQuickLinkSchema).optional(),
  footer_contact_info: FooterContactInfoSchema.optional(),
  footer_copyright: FooterCopyrightSchema.optional(),
});

// Cache management
let footerConfigCache: FooterConfig | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get footer configuration with server-side caching
 */
export async function getFooterConfig(): Promise<FooterConfig | null> {
  const now = Date.now();

  // Return cached data if still valid
  if (footerConfigCache && now - cacheTimestamp < CACHE_TTL) {
    return footerConfigCache;
  }

  try {
    const supabase = await getSupabaseServerClient();

    const { data, error } = await supabase
      .from("cms_branding")
      .select(
        `
        footer_company_info,
        footer_social_links,
        footer_quick_links,
        footer_contact_info,
        footer_copyright
      `,
      )
      .eq("is_active", true)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No active branding found
        return null;
      }
      console.error("Error fetching footer config:", error);
      return null;
    }

    // Update cache
    footerConfigCache = data as FooterConfig;
    cacheTimestamp = now;

    return footerConfigCache;
  } catch (error) {
    console.error("Error in getFooterConfig:", error);
    return null;
  }
}

/**
 * Clear footer configuration cache
 */
export function clearFooterConfigCache() {
  footerConfigCache = null;
  cacheTimestamp = 0;
}

/**
 * Validate footer configuration data
 */
export function validateFooterConfig(data: unknown): FooterConfig {
  return FooterConfigSchema.parse(data);
}

/**
 * Get default footer configuration (fallback values)
 */
export function getDefaultFooterConfig(): FooterConfig {
  return {
    footer_company_info: {
      title: "YEC Day 2025",
      description:
        "Empowering young entrepreneurs through networking, learning, and growth opportunities. Join us for an unforgettable experience.",
    },
    footer_social_links: [
      {
        platform: "Facebook",
        url: "https://www.facebook.com/YECsongkhla",
        icon_name: "Facebook",
      },
      {
        platform: "Instagram",
        url: "https://www.instagram.com/yec_songkhla?igsh=MTlmdWR3NG90N3BnZQ==",
        icon_name: "Instagram",
      },
      {
        platform: "Website",
        url: "https://www.songkhlachamber.org/",
        icon_name: "Globe",
      },
    ],
    footer_quick_links: [
      {
        label: "About Us",
        url: "https://www.facebook.com/YECsongkhla",
        type: "external",
      },
      {
        label: "Event Schedule",
        url: "event-schedule",
        type: "internal",
      },
      {
        label: "Speakers",
        url: "#",
        type: "external",
      },
      {
        label: "Registration",
        url: "form",
        type: "internal",
      },
    ],
    footer_contact_info: {
      email: "yecsongkhla.official@gmail.com",
      phone: "074 246 388",
      address:
        "29 ถนนโชติวิทยะกุล 4 ตำบล หาดใหญ่ อำเภอ หาดใหญ่ จังหวัด สงขลา 90110",
    },
    footer_copyright: {
      main_text: "2025 YEC Day. All rights reserved.",
      credit_text: "© Power By: Mr. Pisut Khungkamano",
    },
  };
}
