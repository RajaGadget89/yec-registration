// CMS Types for FAQ and other content management features

export interface FAQGroup {
  id: string;
  title: string;
  description?: string;
  language: "th" | "en";
  is_active: boolean;
  display_config: FAQDisplayConfig;
  published_at?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface FAQItem {
  id: string;
  group_id: string;
  question: string;
  answer: string;
  item_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FAQDisplayConfig {
  links: Array<{
    text: string;
    url: string;
    icon?: string;
  }>;
  hashtags: string[];
  share_enabled: boolean;
  share_title: string;
  share_text: string;
}

export interface FAQGroupWithItems extends FAQGroup {
  items?: FAQItem[];
}

// Existing CMS types (if not already defined elsewhere)
export interface CMSPage {
  id: string;
  slug: string;
  title: string;
  meta_description?: string;
  language: "th" | "en";
  is_active: boolean;
  published_at?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface CMSPageSection {
  id: string;
  page_id: string;
  section_type:
    | "hero"
    | "banner"
    | "content"
    | "activity_cards"
    | "news_showcase"
    | "faq";
  section_order: number;
  title?: string;
  content?: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CMSNews {
  id: string;
  headline: string;
  content: string;
  image_url?: string;
  external_links: any[];
  hashtags: string[];
  meta_description?: string;
  language: "th" | "en";
  is_active: boolean;
  published_at?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}
