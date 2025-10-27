<!-- 40ae8ff8-9346-4e9d-be12-0357c7a5bf61 d19e2e2d-37a4-4540-b4f1-b46cf4aae33c -->
# Dynamic SEO Configuration System

## Overview

Replace hardcoded "YEC Day" branding and SEO metadata with dynamic, database-driven configuration that can be managed through the admin interface. This makes the platform white-labelable for resale to other organizations.

## Phase 1: Database Schema Extension

### 1.1 Extend cms_branding Table

Create migration to add SEO fields to existing `cms_branding` table:

```sql
-- Add SEO configuration fields to cms_branding
ALTER TABLE cms_branding ADD COLUMN IF NOT EXISTS seo_site_name TEXT DEFAULT 'YEC Day';
ALTER TABLE cms_branding ADD COLUMN IF NOT EXISTS seo_site_title_suffix TEXT DEFAULT 'YEC Day';
ALTER TABLE cms_branding ADD COLUMN IF NOT EXISTS seo_default_description TEXT;
ALTER TABLE cms_branding ADD COLUMN IF NOT EXISTS seo_og_image_url TEXT;
ALTER TABLE cms_branding ADD COLUMN IF NOT EXISTS seo_twitter_handle TEXT;

-- Per-content-type defaults
ALTER TABLE cms_branding ADD COLUMN IF NOT EXISTS seo_activities_title TEXT DEFAULT 'Activities';
ALTER TABLE cms_branding ADD COLUMN IF NOT EXISTS seo_activities_description TEXT DEFAULT 'Explore all available activities and events';
ALTER TABLE cms_branding ADD COLUMN IF NOT EXISTS seo_news_title TEXT DEFAULT 'News';
ALTER TABLE cms_branding ADD COLUMN IF NOT EXISTS seo_news_description TEXT DEFAULT 'Latest news and updates';
ALTER TABLE cms_branding ADD COLUMN IF NOT EXISTS seo_faq_title TEXT DEFAULT 'FAQ';
ALTER TABLE cms_branding ADD COLUMN IF NOT EXISTS seo_faq_description TEXT DEFAULT 'Frequently asked questions and answers';

-- Robots.txt and sitemap configuration
ALTER TABLE cms_branding ADD COLUMN IF NOT EXISTS seo_robots_allow JSONB DEFAULT '["/" ,"/activities", "/news", "/faq"]'::jsonb;
ALTER TABLE cms_branding ADD COLUMN IF NOT EXISTS seo_robots_disallow JSONB DEFAULT '["/admin/", "/api/", "/checker/", "/preview/", "/_next/"]'::jsonb;
```

File: `sql/2025-10-26_add_seo_config_to_branding.staging.sql`

## Phase 2: Server-Side SEO Configuration Utility

### 2.1 Create SEO Config Helper

Create centralized helper to fetch SEO configuration with fallbacks:

```typescript
// app/lib/seo-config.ts
import { maybeServiceClient } from './supabase/server';

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
  siteName: 'YEC Day',
  siteTitleSuffix: 'YEC Day',
  defaultDescription: '',
  activitiesTitle: 'Activities',
  activitiesDescription: 'Explore all available activities and events',
  newsTitle: 'News',
  newsDescription: 'Latest news and updates',
  faqTitle: 'FAQ',
  faqDescription: 'Frequently asked questions and answers',
  robotsAllow: ['/', '/activities', '/news', '/faq'],
  robotsDisallow: ['/admin/', '/api/', '/checker/', '/preview/', '/_next/'],
};

let cachedConfig: SEOConfig | null = null;
let cacheTime: number = 0;
const CACHE_TTL = 60000; // 1 minute

export async function getSEOConfig(): Promise<SEOConfig> {
  const now = Date.now();
  if (cachedConfig && (now - cacheTime) < CACHE_TTL) {
    return cachedConfig;
  }

  try {
    const supabase = await maybeServiceClient();
    const { data } = await supabase
      .from('cms_branding')
      .select(`
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
      `)
      .eq('is_active', true)
      .single();

    if (data) {
      cachedConfig = {
        siteName: data.seo_site_name || DEFAULT_SEO_CONFIG.siteName,
        siteTitleSuffix: data.seo_site_title_suffix || DEFAULT_SEO_CONFIG.siteTitleSuffix,
        defaultDescription: data.seo_default_description || DEFAULT_SEO_CONFIG.defaultDescription,
        ogImageUrl: data.seo_og_image_url,
        twitterHandle: data.seo_twitter_handle,
        activitiesTitle: data.seo_activities_title || DEFAULT_SEO_CONFIG.activitiesTitle,
        activitiesDescription: data.seo_activities_description || DEFAULT_SEO_CONFIG.activitiesDescription,
        newsTitle: data.seo_news_title || DEFAULT_SEO_CONFIG.newsTitle,
        newsDescription: data.seo_news_description || DEFAULT_SEO_CONFIG.newsDescription,
        faqTitle: data.seo_faq_title || DEFAULT_SEO_CONFIG.faqTitle,
        faqDescription: data.seo_faq_description || DEFAULT_SEO_CONFIG.faqDescription,
        robotsAllow: data.seo_robots_allow || DEFAULT_SEO_CONFIG.robotsAllow,
        robotsDisallow: data.seo_robots_disallow || DEFAULT_SEO_CONFIG.robotsDisallow,
      };
      cacheTime = now;
      return cachedConfig;
    }
  } catch (error) {
    console.error('Failed to fetch SEO config:', error);
  }

  return DEFAULT_SEO_CONFIG;
}

export function clearSEOConfigCache() {
  cachedConfig = null;
  cacheTime = 0;
}
```

### 2.2 Update SEO Utils to Use Dynamic Config

Update `app/lib/seo-utils.ts`:

```typescript
import { getSEOConfig } from './seo-config';

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
  const canonical = canonicalPath ? buildCanonicalUrl(canonicalPath) : undefined;
  
  const meta: Metadata = {
    title: `${title} - ${seoConfig.siteTitleSuffix}`,
    description: description || seoConfig.defaultDescription,
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      title,
      description: description || seoConfig.defaultDescription,
      url: canonical,
      images: image ? [image] : seoConfig.ogImageUrl ? [seoConfig.ogImageUrl] : undefined,
      type: 'website',
      siteName: seoConfig.siteName,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: description || seoConfig.defaultDescription,
      images: image ? [image] : seoConfig.ogImageUrl ? [seoConfig.ogImageUrl] : undefined,
      site: seoConfig.twitterHandle,
    },
  };
  return meta;
}
```

## Phase 3: Update Page Metadata to Use Dynamic Config

### 3.1 Update Activities Page

Modify `app/activities/page.tsx`:

```typescript
export async function generateMetadata(): Promise<Metadata> {
  const seoConfig = await getSEOConfig();
  return buildDynamicPageMetadata({
    title: seoConfig.activitiesTitle,
    description: seoConfig.activitiesDescription,
    canonicalPath: '/activities',
  });
}
```

### 3.2 Update News Page

Modify `app/news/page.tsx`:

```typescript
export async function generateMetadata(): Promise<Metadata> {
  const seoConfig = await getSEOConfig();
  return buildDynamicPageMetadata({
    title: seoConfig.newsTitle,
    description: seoConfig.newsDescription,
    canonicalPath: '/news',
  });
}
```

### 3.3 Update FAQ Page

Modify `app/faq/page.tsx`:

```typescript
export async function generateMetadata(): Promise<Metadata> {
  const seoConfig = await getSEOConfig();
  return buildDynamicPageMetadata({
    title: seoConfig.faqTitle,
    description: seoConfig.faqDescription,
    canonicalPath: '/faq',
  });
}
```

### 3.4 Update Detail Pages

Update dynamic metadata generation in:

- `app/activities/[slug]/page.tsx` - Use `seoConfig.siteTitleSuffix` instead of "YEC Registration"
- `app/news/[id]/page.tsx` - Use `seoConfig.siteTitleSuffix` instead of "YEC Day News"
- `app/faq/[id]/page.tsx` - Use `seoConfig.siteTitleSuffix` instead of "YEC Day"

## Phase 4: Dynamic Robots.txt and Sitemap

### 4.1 Convert robots.txt to Dynamic Route

Replace `public/robots.txt` with `app/robots.ts`:

```typescript
import { MetadataRoute } from 'next';
import { getSEOConfig } from './lib/seo-config';

export default async function robots(): Promise<MetadataRoute.Robots> {
  const seoConfig = await getSEOConfig();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://yec-registration.com';

  return {
    rules: {
      userAgent: '*',
      allow: seoConfig.robotsAllow,
      disallow: seoConfig.robotsDisallow,
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
```

### 4.2 Update Sitemap to Use Config

Modify `app/sitemap.ts` to use dynamic config for page names.

## Phase 5: Admin UI - SEO Configuration Tab

### 5.1 Update SEO Tools Component

Modify `app/admin/content-management/seo/_components/SEOTools.tsx` to add tabs:

```typescript
export default function SEOTools() {
  const [activeTab, setActiveTab] = useState<'analyzer' | 'settings'>('analyzer');

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('analyzer')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'analyzer'
                ? 'border-yec-primary text-yec-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            SEO Analyzer
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'settings'
                ? 'border-yec-primary text-yec-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            SEO Settings
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'analyzer' && <SEOAnalyzer />}
      {activeTab === 'settings' && <SEOSettings />}
    </div>
  );
}
```

### 5.2 Create SEO Settings Component

Create `app/admin/content-management/seo/_components/SEOSettings.tsx`:

Component should include forms for:

- Site Name and Title Suffix
- Default Description
- Open Graph Default Image
- Twitter Handle
- Per-content-type titles and descriptions (Activities, News, FAQ)
- Robots.txt configuration (allow/disallow paths)

API calls to: `/api/admin/cms/seo-config` (new endpoint)

## Phase 6: API Endpoints for SEO Config

### 6.1 Create SEO Config API

Create `app/api/admin/cms/seo-config/route.ts`:

```typescript
// GET - Fetch current SEO config
// PUT - Update SEO config (updates cms_branding table)
```

Schema validation with zod for all SEO fields.

Clear cache after updates by calling `clearSEOConfigCache()`.

## Phase 7: Update Existing Implementations

Update the original SEO implementation plan (Phases 1-5) to use the new dynamic config system instead of hardcoded values.

## Testing Checklist

1. Test SEO config fetching with cache validation
2. Verify fallback to defaults when database has no config
3. Test all pages render with dynamic metadata
4. Verify robots.txt and sitemap.xml use dynamic config
5. Test admin UI for updating SEO settings
6. Confirm cache clears after updates
7. Test white-labeling by changing brand name

## Safety Notes

- Extends existing cms_branding table (no new tables)
- Backwards compatible with fallback defaults
- Cache prevents performance impact
- All changes are CMS-scoped (no backend system changes)
- Original plan's SEO features remain intact

### To-dos

- [ ] Create database migration to extend cms_branding with SEO fields
- [ ] Create app/lib/seo-config.ts with getSEOConfig() and caching
- [ ] Add buildDynamicPageMetadata() to app/lib/seo-utils.ts
- [ ] Update app/activities/page.tsx to use dynamic SEO config
- [ ] Update app/news/page.tsx to use dynamic SEO config
- [ ] Update app/faq/page.tsx to use dynamic SEO config
- [ ] Update all detail pages ([slug], [id]) to use siteTitleSuffix from config
- [ ] Convert public/robots.txt to app/robots.ts with dynamic config
- [ ] Update app/sitemap.ts to use dynamic config
- [ ] Add tab navigation to SEOTools.tsx (Analyzer/Settings tabs)
- [ ] Create SEOSettings.tsx component with configuration forms
- [ ] Create /api/admin/cms/seo-config route (GET/PUT)
- [ ] Update original SEO plan todos to use dynamic config instead of hardcoded values
- [ ] Test dynamic SEO configuration end-to-end