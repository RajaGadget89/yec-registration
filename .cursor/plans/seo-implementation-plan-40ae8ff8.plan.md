<!-- 40ae8ff8-9346-4e9d-be12-0357c7a5bf61 e4623671-72df-4996-84a0-01ace05ce06f -->
# SEO Implementation for Public Content Zones

## Overview

Implement SEO optimization for all public-facing content without modifying backend systems or authentication.

## CRITICAL PRIORITY: LineOA Integration

**The most critical issue**: MCP_Fetch endpoints for Activities and FAQ are missing base URLs in their `full_url` generation, causing LineOA users to receive incomplete URLs that cannot be navigated to.

**Impact**: LineOA chatbot users cannot access full content because URLs are missing the domain (e.g., `/activities/slug` instead of `https://yec-registration.com/activities/slug`).

**Solution**: Fix the `full_url` generation in Activities and FAQ APIs to include the complete domain URL.

## Phase 1: Critical MCP_Fetch URL Fixes (LineOA Integration)

### 1.1 Fix Activities API full_url Generation

**CRITICAL ISSUE**: Activities API missing base URL in full_url

Update `app/api/cms/activities/route.ts`:

```typescript
// Line 78: Fix missing base URL
full_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://yec-registration.com'}/activities/${activity.card_slug}`,
```

### 1.2 Fix FAQ API full_url Generation

**CRITICAL ISSUE**: FAQ API missing base URL in full_url

Update `app/api/cms/faq/route.ts`:

```typescript
// Line 126: Fix missing base URL
full_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://yec-registration.com'}/faq/${group.slug}/${item.slug}`,
```

### 1.3 Verify News API full_url Generation

**STATUS**: News API already has correct full_url generation

```typescript
// Line 58: Already correct
full_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://yec-registration.com'}/news/${row.id}`
```

### 1.4 Verify Pages API full_url Generation

**STATUS**: Pages API already has correct full_url generation

```typescript
// Line 42: Already correct
full_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://yec-registration.com'}/pages/${row.slug}`
```

## Phase 2: Enhanced SEO Utilities

### 2.1 Update `app/lib/seo-utils.ts`

Add canonical URL helper function:

```typescript
export function buildCanonicalUrl(path: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
  return `${baseUrl}${path}`;
}
```

Update `buildPageMetadata` to support canonical URLs:

```typescript
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
  const canonical = canonicalPath ? buildCanonicalUrl(canonicalPath) : undefined;
  
  const meta: Metadata = {
    title,
    description,
    alternates: canonical ? { canonical } : undefined,
    openGraph: {
      title,
      description,
      url: canonical,
      images: image ? [image] : undefined,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
  return meta;
}
```

## Phase 3: Update Listing Pages

### 3.1 Update `app/activities/page.tsx`

Enhance metadata with canonical URL and Open Graph:

```typescript
export const metadata: Metadata = {
  title: "Activities - YEC Day",
  description: "Explore all available activities and events from YEC Day",
  alternates: {
    canonical: buildCanonicalUrl('/activities'),
  },
  openGraph: {
    title: "Activities - YEC Day",
    description: "Explore all available activities and events from YEC Day",
    url: buildCanonicalUrl('/activities'),
    type: 'website',
  },
};
```

### 3.2 Update `app/news/page.tsx`

Enhance metadata with canonical URL and Open Graph:

```typescript
export const metadata: Metadata = {
  title: "News - YEC Day",
  description: "Latest news and updates from YEC Day",
  alternates: {
    canonical: buildCanonicalUrl('/news'),
  },
  openGraph: {
    title: "News - YEC Day",
    description: "Latest news and updates from YEC Day",
    url: buildCanonicalUrl('/news'),
    type: 'website',
  },
};
```

### 3.3 Update `app/faq/page.tsx`

Enhance metadata with canonical URL and Open Graph:

```typescript
export const metadata: Metadata = {
  title: "FAQ - YEC Day",
  description: "Frequently asked questions and answers about YEC Day",
  alternates: {
    canonical: buildCanonicalUrl('/faq'),
  },
  openGraph: {
    title: "FAQ - YEC Day",
    description: "Frequently asked questions and answers about YEC Day",
    url: buildCanonicalUrl('/faq'),
    type: 'website',
  },
};
```

## Phase 4: Update Detail Pages

### 4.1 Update `app/activities/[slug]/page.tsx`

Enhance `generateMetadata` with canonical URL and complete Open Graph:

```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  const { slug } = await params;
  const activity = await fetchActivity(slug);

  if (!activity) {
    return {
      title: "Activity Not Found",
      description: "The requested activity could not be found.",
    };
  }

  const canonicalUrl = buildCanonicalUrl(`/activities/${slug}`);

  return {
    title: `${activity.title} - YEC Registration`,
    description: activity.summary || activity.description || `Learn more about ${activity.title}`,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: activity.title,
      description: activity.summary || activity.description || `Learn more about ${activity.title}`,
      url: canonicalUrl,
      images: activity.image_url ? [activity.image_url] : undefined,
      type: 'article',
    },
  };
}
```

### 4.2 Update `app/news/[id]/page.tsx`

Enhance `generateMetadata` with canonical URL, Open Graph, and image handling:

```typescript
export async function generateMetadata({ params }: NewsDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = await getSupabaseServerClient();

  const { data: article } = await supabase
    .from("cms_news")
    .select("headline, meta_description, image_url, content")
    .eq("id", id)
    .eq("is_active", true)
    .single();

  if (!article) {
    return {
      title: "Article Not Found - YEC Day",
    };
  }

  const canonicalUrl = buildCanonicalUrl(`/news/${id}`);
  const description = article.meta_description || article.content?.substring(0, 160) || "Read the latest news from YEC Day";

  return {
    title: `${article.headline} - YEC Day News`,
    description,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: article.headline,
      description,
      url: canonicalUrl,
      images: article.image_url ? [article.image_url] : undefined,
      type: 'article',
    },
  };
}
```

### 4.3 Update `app/faq/[id]/page.tsx`

Enhance `generateMetadata` with canonical URL and Open Graph:

```typescript
export async function generateMetadata({ params }: FAQPageProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const supabase = getSupabaseServiceClient();
    const { data: group } = await supabase
      .from("cms_faq_groups")
      .select("title, description")
      .eq("id", id)
      .eq("is_active", true)
      .not("published_at", "is", null)
      .single();

    if (!group) {
      return {
        title: "FAQ Not Found - YEC Day",
        description: "The requested FAQ group could not be found.",
      };
    }

    const canonicalUrl = buildCanonicalUrl(`/faq/${id}`);
    const description = group.description || `Frequently asked questions about ${group.title}`;

    return {
      title: `${group.title} - YEC Day`,
      description,
      alternates: {
        canonical: canonicalUrl,
      },
      openGraph: {
        title: group.title,
        description,
        url: canonicalUrl,
        type: 'article',
      },
    };
  } catch (_error) {
    return {
      title: "FAQ - YEC Day",
      description: "Frequently asked questions",
    };
  }
}
```

### 4.4 Update `app/[slug]/page.tsx`

Enhance `generateMetadata` to use canonical URL:

```typescript
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { slug } = await params;
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/cms/pages/${slug}`,
      { cache: "no-store" },
    );
    if (!res.ok) return { title: "Page not found" };
    const { page } = await res.json();
    return buildPageMetadata({
      title: page?.title || slug,
      description: page?.meta_description,
      canonicalPath: `/${slug}`,
    });
  } catch {
    const { slug } = await params;
    return { title: slug };
  }
}
```

## Phase 5: Create Static SEO Files

### 5.1 Create `public/robots.txt`

Create new file with content:

```txt
User-agent: *
Allow: /
Allow: /activities
Allow: /activities/
Allow: /news
Allow: /news/
Allow: /faq
Allow: /faq/
Disallow: /admin/
Disallow: /api/
Disallow: /checker/
Disallow: /preview/
Disallow: /_next/

Sitemap: https://yec-registration.com/sitemap.xml
```

Note: Update the Sitemap URL with actual production domain from `NEXT_PUBLIC_BASE_URL`

### 5.2 Create `app/sitemap.ts`

Create new file for static sitemap generation:

```typescript
import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://yec-registration.com'
  
  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/activities`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/news`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/faq`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ]
}
```

## Testing Checklist

1. Verify canonical URLs render correctly on all pages
2. Test Open Graph tags with social media debuggers (Facebook, Twitter)
3. Confirm robots.txt is accessible at `/robots.txt`
4. Confirm sitemap.xml is accessible at `/sitemap.xml`
5. Validate no backend systems are affected
6. Test all 4 content types (Pages, Activities, News, FAQ)

## Safety Notes

- No changes to database schema
- No changes to API endpoints
- No changes to authentication system
- No changes to admin functionality
- Only metadata and static files modified

### To-dos

- [ ] Fix Activities API full_url generation (missing base URL)
- [ ] Fix FAQ API full_url generation (missing base URL)
- [ ] Verify News API full_url generation (already correct)
- [ ] Verify Pages API full_url generation (already correct)
- [ ] Enhance app/lib/seo-utils.ts with canonical URL support
- [ ] Update app/activities/page.tsx metadata with canonical and OG tags
- [ ] Update app/news/page.tsx metadata with canonical and OG tags
- [ ] Update app/faq/page.tsx metadata with canonical and OG tags
- [ ] Update app/activities/[slug]/page.tsx generateMetadata with canonical and enhanced OG
- [ ] Update app/news/[id]/page.tsx generateMetadata with canonical and image handling
- [ ] Update app/faq/[id]/page.tsx generateMetadata with canonical and OG
- [ ] Update app/[slug]/page.tsx generateMetadata to use canonical path
- [ ] Create public/robots.txt with proper directives
- [ ] Create app/sitemap.ts for static sitemap generation
- [ ] Test all pages for SEO metadata and validate functionality
- [ ] Test MCP_Fetch endpoints return complete URLs
- [ ] Verify LineOA integration works with fixed URLs
- [ ] Test canonical URLs render correctly on all pages
- [ ] Test Open Graph tags with social media debuggers
- [ ] Confirm robots.txt and sitemap.xml accessibility