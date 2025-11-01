import { getSupabaseServiceClient } from "./supabase-server";
import {
  LandingPageSection,
  LandingPageSectionUpdate,
} from "../types/database";

/**
 * Get all landing page sections ordered by section_order
 * @returns Array of landing page sections
 * Returns empty array on error to allow page fallback defaults and prevent build failures
 */
export async function getLandingPageSections(): Promise<LandingPageSection[]> {
  try {
    const supabase = getSupabaseServiceClient();

    const { data, error } = await supabase
      .from("landing_page_sections")
      .select("*")
      .order("section_order", { ascending: true });

    if (error) {
      console.error("Error fetching landing page sections:", error);

      // Return empty array instead of throwing to allow fallback defaults
      // This prevents build failures when env vars are missing/invalid during static generation
      // The page component has fallback defaults that will be used when sections is empty
      console.warn(
        "Returning empty array due to error, page will use fallback defaults",
      );
      return [];
    }

    return (data as LandingPageSection[]) || [];
  } catch (error) {
    // Catch any errors during Supabase client initialization (e.g., missing env vars, invalid keys)
    console.error("Error in getLandingPageSections:", error);

    // Return empty array to allow page fallback and prevent build failures
    // This is safe because app/page.tsx has comprehensive fallback defaults
    console.warn(
      "Returning empty array due to exception, page will use fallback defaults",
    );
    return [];
  }
}

/**
 * Get a single landing page section by section_key
 * @param sectionKey - The section key ('hero', 'news', 'banner', 'activity_cards', 'registration_form', 'registration_cta')
 * @returns Landing page section or null if not found
 */
export async function getLandingPageSection(
  sectionKey:
    | "hero"
    | "news"
    | "banner"
    | "activity_cards"
    | "registration_form"
    | "registration_cta",
): Promise<LandingPageSection | null> {
  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from("landing_page_sections")
    .select("*")
    .eq("section_key", sectionKey)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No rows returned
      return null;
    }
    console.error("Error fetching landing page section:", error);
    throw new Error(`Failed to fetch landing page section: ${error.message}`);
  }

  return (data as LandingPageSection) || null;
}

/**
 * Update a landing page section
 * @param sectionKey - The section key to update
 * @param updates - The fields to update
 * @returns Updated landing page section
 */
export async function updateLandingPageSection(
  sectionKey:
    | "hero"
    | "news"
    | "banner"
    | "activity_cards"
    | "registration_form"
    | "registration_cta",
  updates: LandingPageSectionUpdate,
): Promise<LandingPageSection> {
  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from("landing_page_sections")
    .update(updates)
    .eq("section_key", sectionKey)
    .select()
    .single();

  if (error) {
    console.error("Error updating landing page section:", error);
    throw new Error(`Failed to update landing page section: ${error.message}`);
  }

  if (!data) {
    throw new Error(`Section with key '${sectionKey}' not found`);
  }

  return data as LandingPageSection;
}

/**
 * Update multiple landing page sections' order
 * @param sections - Array of sections with their new orders
 * @returns Updated sections
 */
export async function updateLandingPageSectionOrders(
  sections: Array<{
    section_key: LandingPageSection["section_key"];
    section_order: number;
  }>,
): Promise<LandingPageSection[]> {
  const supabase = getSupabaseServiceClient();

  // Update each section
  const updates = await Promise.all(
    sections.map(async ({ section_key, section_order }) => {
      const { data, error } = await supabase
        .from("landing_page_sections")
        .update({ section_order })
        .eq("section_key", section_key)
        .select()
        .single();

      if (error) {
        console.error(`Error updating section ${section_key}:`, error);
        throw new Error(`Failed to update section order: ${error.message}`);
      }

      return data as LandingPageSection;
    }),
  );

  return updates;
}

/**
 * Create a landing page section if it doesn't exist
 * @param sectionData - The section data to create
 * @returns Created landing page section
 */
export async function createLandingPageSection(sectionData: {
  section_key: LandingPageSection["section_key"];
  section_name: string;
  is_active?: boolean;
  section_order?: number;
}): Promise<LandingPageSection> {
  const supabase = getSupabaseServiceClient();

  // Check if section already exists
  const existing = await getLandingPageSection(sectionData.section_key);
  if (existing) {
    return existing;
  }

  // Create new section
  const { data, error } = await supabase
    .from("landing_page_sections")
    .insert({
      section_key: sectionData.section_key,
      section_name: sectionData.section_name,
      is_active: sectionData.is_active ?? true,
      section_order: sectionData.section_order ?? 6,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating landing page section:", error);
    throw new Error(`Failed to create landing page section: ${error.message}`);
  }

  if (!data) {
    throw new Error("No data returned after creating section");
  }

  return data as LandingPageSection;
}
