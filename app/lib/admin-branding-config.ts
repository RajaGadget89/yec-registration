/**
 * Admin Branding Configuration Utility
 * Fetches and caches admin-specific branding settings from the database.
 */

import { getSupabaseServiceClient } from "./supabase/server";

export interface AdminBrandingConfig {
  adminSiteName: string;
  adminLogoUrl?: string;
  adminFaviconUrl?: string;
}

const DEFAULT_ADMIN_BRANDING_CONFIG: AdminBrandingConfig = {
  adminSiteName: "YEC Day",
  adminLogoUrl: undefined,
  adminFaviconUrl: undefined,
};

let cachedAdminConfig: AdminBrandingConfig | null = null;
let cacheAdminTime: number = 0;
const CACHE_ADMIN_TTL = 60000; // 1 minute

export async function getAdminBrandingConfig(): Promise<AdminBrandingConfig> {
  const now = Date.now();
  if (cachedAdminConfig && now - cacheAdminTime < CACHE_ADMIN_TTL) {
    return cachedAdminConfig;
  }

  try {
    const supabase = getSupabaseServiceClient();
    const { data } = await supabase
      .from("cms_branding")
      .select(
        `
        admin_site_name,
        admin_logo_url,
        admin_favicon_url
      `,
      )
      .eq("is_active", true)
      .single();

    if (data) {
      cachedAdminConfig = {
        adminSiteName:
          data.admin_site_name || DEFAULT_ADMIN_BRANDING_CONFIG.adminSiteName,
        adminLogoUrl: data.admin_logo_url || undefined,
        adminFaviconUrl: data.admin_favicon_url || undefined,
      };
      cacheAdminTime = now;
      return cachedAdminConfig;
    }
  } catch (error) {
    console.error("Failed to fetch admin branding config:", error);
  }

  return DEFAULT_ADMIN_BRANDING_CONFIG;
}

export function clearAdminBrandingConfigCache() {
  cachedAdminConfig = null;
  cacheAdminTime = 0;
}
