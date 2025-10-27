<!-- 9810b657-ab0b-4354-9013-eb1af6a7b441 9fd85716-a1b5-4ff8-8ec9-b47bb30d1e34 -->
# Footer Content Management Implementation Plan

## Overview

Extend the existing CMS branding system to support complete footer content management. This includes company information, dynamic social media links, dynamic quick links, contact details, and copyright text - all manageable through the admin interface.

## Database Schema Extension

**Extend `cms_branding` table with JSONB fields:**

Add the following columns to the existing `cms_branding` table:

- `footer_company_info` (JSONB): Contains title, description
- `footer_social_links` (JSONB): Array of social links with platform, url, icon_name
- `footer_quick_links` (JSONB): Array of links with label, url, type (internal/external)
- `footer_contact_info` (JSONB): Contains email, phone, address
- `footer_copyright` (JSONB): Contains main_text, credit_text

**Migration file location:** `sql/2025-10-27_add_footer_content_to_branding.staging.sql`

## Backend API Layer

### 1. Footer Config API

**File:** `app/api/admin/cms/footer-config/route.ts`

Endpoints:

- `GET /api/admin/cms/footer-config` - Fetch current footer configuration
- `PUT /api/admin/cms/footer-config` - Update footer configuration

Features:

- Use existing `withBrandingManagementGuard` for authentication
- Validate JSONB structure with Zod schemas
- Clear cache after updates
- Support partial updates

### 2. Public Footer API

**File:** `app/api/cms/footer/route.ts`

- `GET /api/cms/footer` - Public endpoint returning active footer content
- No-cache headers (similar to branding API)
- Returns null if no active configuration

### 3. Lib Utility

**File:** `app/lib/footer-config.ts`

- `getFooterConfig()` - Server-side fetch with caching
- `clearFooterConfigCache()` - Cache invalidation
- TypeScript interfaces for footer data structures

## Frontend Admin UI

### 1. Footer Management Component

**File:** `app/admin/content-management/footer/_components/FooterManagement.tsx`

Sections:

1. **Company Info Section**

- Title input (e.g., "YEC Day 2025")
- Description textarea

2. **Social Media Links Section**

- Dynamic list with add/remove functionality
- Fields per link: Platform name, URL, Icon selector (from Lucide icons)
- Drag-to-reorder capability
- Default platforms: Facebook, Instagram, Website

3. **Quick Links Section**

- Dynamic list with add/remove functionality
- Fields per link: Label, URL, Type (internal scroll/external URL)
- Drag-to-reorder capability
- Support for scroll-to-section functionality

4. **Contact Info Section**

- Email input
- Phone input
- Address textarea (supports Thai text)

5. **Copyright Section**

- Main text input (e.g., "2025 YEC Day. All rights reserved.")
- Credit text input (e.g., "© Power By: Mr. Pisut Khungkamano")

UI Features:

- Real-time preview button
- Save/Reset functionality
- Validation feedback
- Loading states

### 2. Footer Management Page

**File:** `app/admin/content-management/footer/page.tsx`

- Server-side authentication check
- Renders `FooterManagement` component
- Breadcrumb navigation

### 3. Navigation Integration

**Update:** `app/admin/_components/AdminNavigation.tsx`

Add "Footer Content" link under Content Management section

## Frontend Public Footer Update

### Updated Footer Component

**File:** `app/components/Footer.tsx`

Changes:

1. Fetch footer config from `/api/cms/footer`
2. Dynamically render social media links based on config
3. Dynamically render quick links based on config
4. Use configured contact info
5. Use configured copyright text
6. Maintain existing logo integration from branding
7. Fallback to current hardcoded values if no config exists

Technical approach:

- Client-side fetch with `requestIdleCallback` (consistent with current pattern)
- Handle internal scroll links vs external URLs
- Icon rendering using Lucide React based on icon_name
- Responsive grid layout (keep existing structure)

## Validation Schemas

Zod schemas for:

- `FooterCompanyInfoSchema` - title (string, max 100), description (string, max 500)
- `FooterSocialLinkSchema` - platform (string), url (url), icon_name (string)
- `FooterQuickLinkSchema` - label (string), url (string), type (enum: 'internal', 'external')
- `FooterContactInfoSchema` - email (email), phone (string), address (string, max 500)
- `FooterCopyrightSchema` - main_text (string, max 200), credit_text (string, max 200)

## Key Technical Decisions

1. **Storage Strategy**: Extend `cms_branding` table instead of new table - keeps all branding/appearance config together
2. **Social Links**: Dynamic array to support any social platform with custom icons
3. **Quick Links**: Support both scroll-to-section (internal) and external URLs
4. **Caching**: Follow existing branding pattern with server-side cache + client fetch
5. **Permissions**: Reuse existing branding management guard
6. **Fallbacks**: Footer gracefully degrades to hardcoded values if config missing

## Files to Create

1. `sql/2025-10-27_add_footer_content_to_branding.staging.sql`
2. `app/api/admin/cms/footer-config/route.ts`
3. `app/api/cms/footer/route.ts`
4. `app/lib/footer-config.ts`
5. `app/admin/content-management/footer/_components/FooterManagement.tsx`
6. `app/admin/content-management/footer/page.tsx`

## Files to Modify

1. `app/components/Footer.tsx` - Update to use CMS config
2. `app/admin/_components/AdminNavigation.tsx` - Add footer management link

## Testing Strategy

1. Migration testing: Dry run → shadow DB → staging push
2. API testing: Test GET/PUT endpoints with various payloads
3. UI testing: Add/remove links, validation, save/reset flows
4. Public footer: Verify fallbacks, icon rendering, scroll functionality
5. Responsive: Test footer on mobile/tablet/desktop

## Implementation Order

1. Database migration (dry run first)
2. Backend lib utilities and types
3. Admin API endpoints
4. Public API endpoint
5. Admin UI component
6. Update public Footer component
7. Add navigation link
8. Testing and validation

### To-dos

- [ ] Create and test database migration to extend cms_branding table with footer content fields
- [ ] Create footer-config.ts lib with TypeScript interfaces, cache helpers, and Zod schemas
- [ ] Implement admin footer-config API endpoints (GET/PUT) with authentication and validation
- [ ] Create public footer API endpoint for fetching footer content
- [ ] Build FooterManagement component with all sections (company, social, quick links, contact, copyright)
- [ ] Create footer management page and add navigation link
- [ ] Update public Footer component to fetch and render CMS content dynamically
- [ ] Test end-to-end functionality including edge cases and responsive design