<!-- 2066a9d8-4654-4a1b-b785-a318985b2b2f 76e6b196-5926-4459-96bd-227b540232e9 -->
# MCP RAG System Integration Plan (Enhanced with Content Management)

## Overview

Implement an extensible RAG (Retrieval-Augmented Generation) system that exposes YEC Registration data to n8n's MCP server through dedicated API endpoints. The system includes a management interface for controlling content exposure, supporting future content types like Travel Packages, and serving two separate LineOA accounts (public and admin) with appropriate data access controls.

## Enhanced Architecture

```
┌──────────────────┐         ┌────────────────────────┐         ┌──────────────┐
│  n8n MCP Server  │  HTTP   │  YEC Website           │   DB    │  Supabase    │
│                  │ ──────► │  /api/mcp/*            │ ──────► │  Database    │
│                  │         │  + Management UI       │         │              │
└──────────────────┘         └────────────────────────┘         └──────────────┘
       │                              │                                 │
       ▼                              ▼                                 ▼
┌──────────────┐           ┌──────────────────────┐      ┌──────────────────────┐
│  LineOA      │           │  Content Registry    │      │  mcp_content_types   │
│  Public      │           │  (Exposure Control)  │      │  mcp_content_exposure│
└──────────────┘           └──────────────────────┘      │  mcp_access_logs     │
       ▼                              │                   └──────────────────────┘
┌──────────────┐           ┌──────────────────────┐
│  LineOA      │           │  Rate Limiting       │
│  Admin       │           │  & Caching           │
└──────────────┘           └──────────────────────┘
```

## Implementation Steps

### Phase 1: Foundation & Security

#### 1.1 Add New Role: `istm-admin` (Information Services Team)

**Files to modify:**

- `app/lib/rbac.ts` - Add `"admin_istm"` to Role type and create ISTM_ADMIN_EMAILS allowlist
- `app/types/database.ts` - Add `"istm_admin"` to BusinessRole type
- `.env.example` - Add `ADMIN_ISTM_EMAILS` documentation

**Rationale:** ISTM admins need full access to sensitive registration data for Line chatbot queries without granting full super_admin privileges.

#### 1.2 Database Schema for MCP Content Management

**New migration:** `supabase/migrations/YYYYMMDD_create_mcp_content_config.sql`

```sql
-- MCP content types registry (extensible for future content types)
CREATE TABLE mcp_content_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_key VARCHAR(100) UNIQUE NOT NULL, -- 'faq', 'activities', 'news', 'travel_packages'
  type_name VARCHAR(255) NOT NULL,
  description TEXT,
  endpoint_path VARCHAR(255) NOT NULL,
  is_enabled BOOLEAN DEFAULT false,
  access_level VARCHAR(50) NOT NULL DEFAULT 'public', -- 'public' or 'admin'
  source_table VARCHAR(255), -- e.g., 'cms_faq_groups'
  schema_definition JSONB, -- Field mappings and data structure
  query_config JSONB, -- Query parameters and filters
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(255),
  updated_by VARCHAR(255)
);

-- MCP content exposure rules (granular control over specific items)
CREATE TABLE mcp_content_exposure (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type_id UUID REFERENCES mcp_content_types(id) ON DELETE CASCADE,
  content_id UUID NOT NULL, -- Reference to actual content
  is_exposed BOOLEAN DEFAULT true,
  exposure_metadata JSONB, -- Field filtering, transformations
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(255),
  updated_by VARCHAR(255),
  UNIQUE(content_type_id, content_id)
);

-- MCP API access logs (enhanced audit trail)
CREATE TABLE mcp_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_type_id UUID REFERENCES mcp_content_types(id),
  api_key_type VARCHAR(50),
  endpoint VARCHAR(255),
  method VARCHAR(10),
  query_params JSONB,
  response_size INTEGER,
  response_time_ms INTEGER,
  status_code INTEGER,
  ip_address VARCHAR(45),
  user_agent TEXT,
  correlation_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_mcp_content_types_enabled ON mcp_content_types(is_enabled, access_level);
CREATE INDEX idx_mcp_content_exposure_lookup ON mcp_content_exposure(content_type_id, content_id, is_exposed);
CREATE INDEX idx_mcp_access_logs_timestamp ON mcp_access_logs(created_at DESC);
```

#### 1.3 Create MCP API Authentication System

**New files:**

- `app/lib/mcp/auth.ts` - MCP-specific authentication with API key validation
- `app/lib/mcp/rate-limiter.ts` - Rate limiting (1000 req/min)
- `app/lib/mcp/types.ts` - TypeScript types for MCP requests/responses

**Key features:**

```typescript
// API Key structure: mcp_public_xxx or mcp_admin_xxx
// Authentication via Bearer token or x-mcp-api-key header
```

#### 1.4 Create MCP Content Registry System

**New file:** `app/lib/mcp/content-registry.ts`

```typescript
// Central registry for managing MCP-exposed content types
class MCPContentRegistry {
  // Register new content type dynamically
  async registerContentType(config: MCPContentTypeConfig): Promise<void>;
  
  // Get all enabled content types
  async getEnabledTypes(accessLevel: 'public' | 'admin'): Promise<MCPContentType[]>;
  
  // Check if specific content item is exposed
  async isContentExposed(typeKey: string, contentId: string): Promise<boolean>;
  
  // Get content with exposure filtering
  async getExposedContent(typeKey: string, params: any): Promise<any>;
  
  // Query builder factory for each content type
  async buildQuery(typeKey: string, params: any): Promise<SupabaseQuery>;
}
```

### Phase 2: MCP Management Interface (Admin UI)

#### 2.1 Management Dashboard Page

**New file:** `app/admin/mcp-management/page.tsx`

Main dashboard with tabs:

- **Content Types:** Enable/disable content types for MCP exposure
- **Exposure Rules:** Configure which specific items are exposed
- **API Keys:** Manage and rotate API keys
- **Access Logs:** Monitor MCP API usage
- **Analytics:** Usage statistics and popular queries

#### 2.2 Content Types Management

**New files:**

- `app/admin/mcp-management/content-types/page.tsx` - Content types list/management
- `app/admin/mcp-management/content-types/[id]/page.tsx` - Edit content type config
- `app/admin/mcp-management/content-types/new/page.tsx` - Add new content type

**Features:**

- Enable/disable content types
- Configure endpoint paths
- Define schema mappings (which fields to expose)
- Set access level (public/admin)
- Preview generated API response
- Test endpoint with sample queries

#### 2.3 Exposure Rules Management

**New files:**

- `app/admin/mcp-management/exposure/[typeKey]/page.tsx` - Manage exposure for specific content type

**Features:**

- Bulk enable/disable items
- Individual item exposure toggle
- Field-level filtering (expose only certain fields)
- Preview what n8n will see
- Search and filter content items

#### 2.4 API Keys Management

**New file:** `app/admin/mcp-management/api-keys/page.tsx`

**Features:**

- Generate new API keys
- Rotate existing keys
- Set expiration dates
- View key usage statistics
- Revoke compromised keys
- Test API key authentication

#### 2.5 Management API Routes

**New files:**

- `app/api/admin/mcp/content-types/route.ts` - List/create content types
- `app/api/admin/mcp/content-types/[id]/route.ts` - Update/delete content type
- `app/api/admin/mcp/exposure-rules/route.ts` - List exposure rules
- `app/api/admin/mcp/exposure-rules/[id]/route.ts` - Update exposure rule
- `app/api/admin/mcp/exposure-rules/bulk/route.ts` - Bulk operations
- `app/api/admin/mcp/api-keys/route.ts` - Manage API keys
- `app/api/admin/mcp/api-keys/rotate/route.ts` - Rotate API keys
- `app/api/admin/mcp/access-logs/route.ts` - View access logs
- `app/api/admin/mcp/analytics/route.ts` - Usage analytics

**Security:** All management routes require super_admin or istm_admin role

### Phase 3: Public API Endpoints (`/api/mcp/public/*`)

#### 3.1 FAQ Endpoint (with Exposure Control)

**New file:** `app/api/mcp/public/faq/route.ts`

```typescript
GET /api/mcp/public/faq
GET /api/mcp/public/faq/[id]
Query params: ?language=th|en|all&search=keyword
Response: { groups: FAQGroup[], items: FAQItem[] }

// Filters:
// 1. Published (existing logic)
// 2. Content type 'faq' is enabled in mcp_content_types
// 3. Specific FAQ group exposed in mcp_content_exposure
```

#### 3.2 Activities Endpoint (with Exposure Control)

**New file:** `app/api/mcp/public/activities/route.ts`

```typescript
GET /api/mcp/public/activities
GET /api/mcp/public/activities/[slug]
Query params: ?language=th|en&page=1&limit=20&sort=newest
Response: { activities: ActivityCard[], pagination: {...} }
```

#### 3.3 News Endpoint (with Exposure Control)

**New file:** `app/api/mcp/public/news/route.ts`

```typescript
GET /api/mcp/public/news
Query params: ?limit=10&offset=0
Response: { news: NewsCard[] }
```

#### 3.4 Pages/Slugs Endpoint (with Exposure Control)

**New file:** `app/api/mcp/public/pages/route.ts`

```typescript
GET /api/mcp/public/pages/[slug]
Response: { slug, title, content, metadata }
```

#### 3.5 Dynamic Content Endpoint (Future-Proof)

**New file:** `app/api/mcp/public/content/[type]/route.ts`

```typescript
GET /api/mcp/public/content/[type]
GET /api/mcp/public/content/[type]/[id]

// Generic endpoint for ANY registered content type
// Example: /api/mcp/public/content/travel_packages
// Automatically works when admin adds new content type in management UI
```

**This is the key extensibility feature!**

#### 3.6 System Status Endpoint

**New file:** `app/api/mcp/public/status/route.ts`

```typescript
GET /api/mcp/public/status
Response: { 
  system: "operational",
  registration_open: boolean,
  event_dates: {...},
  statistics: { total_registered: number },
  available_content_types: ['faq', 'activities', 'news', ...]
}
```

### Phase 4: Admin API Endpoints (`/api/mcp/admin/*`)

#### 4.1 Registration Data Endpoint

**New file:** `app/api/mcp/admin/registrations/route.ts`

```typescript
GET /api/mcp/admin/registrations
GET /api/mcp/admin/registrations/[id]
Query params: ?status=approved|pending|rejected&search=email|name&page=1
Response: { registrations: Registration[], pagination: {...} }
```

**Security:** Requires MCP_ADMIN_API_KEY, audit logged

#### 4.2 User Profile Lookup

**New file:** `app/api/mcp/admin/users/lookup/route.ts`

```typescript
POST /api/mcp/admin/users/lookup
Body: { email?, line_id?, registration_id? }
Response: { user: {...}, registrations: [...], status: {...} }
```

#### 4.3 Registration Statistics

**New file:** `app/api/mcp/admin/stats/route.ts`

```typescript
GET /api/mcp/admin/stats
Query params: ?period=today|week|month|all
Response: { total, by_status, recent_activity, trends }
```

#### 4.4 Audit Logs Query

**New file:** `app/api/mcp/admin/audit/query/route.ts`

```typescript
GET /api/mcp/admin/audit/query
Query params: ?actor=email&action=type&resource=id&from=date&to=date
Response: { logs: AuditLog[], total: number }
```

### Phase 5: Core Infrastructure

#### 5.1 Rate Limiting Implementation

**File:** `app/lib/mcp/rate-limiter.ts`

- 1000 req/min per API key
- Burst allowance: 150 requests
- Response headers: X-RateLimit-*

#### 5.2 Caching Strategy

**File:** `app/lib/mcp/cache.ts`

- Real-time data for admin endpoints
- Optional short-lived cache for public endpoints
- Query optimization with proper indexes

#### 5.3 Response Sanitization

**File:** `app/lib/mcp/sanitizer.ts`

- Remove internal system fields
- Apply field-level filtering from exposure rules
- Sanitize based on schema_definition

#### 5.4 MCP Audit Logger

**File:** `app/lib/mcp/audit.ts`

- Log all MCP API access to mcp_access_logs
- Integration with existing audit system
- Correlation IDs for request tracking

### Phase 6: Documentation & Testing

#### 6.1 API Documentation

**New file:** `docs/MCP_API_REFERENCE.md`

Complete documentation with:

- Authentication methods
- All endpoints with examples
- Rate limit specifications
- Management UI guide

#### 6.2 Content Type Registration Guide

**New file:** `docs/MCP_CONTENT_TYPE_GUIDE.md`

Step-by-step guide for adding new content types (e.g., Travel Packages):

1. Create content type in management UI
2. Define schema mappings
3. Configure exposure rules
4. Test endpoint
5. Enable for production

#### 6.3 Integration Tests

**New file:** `e2e/mcp-api.spec.ts`

Test scenarios:

- Public/admin endpoint access control
- Rate limiting
- Content exposure filtering
- Dynamic content type endpoints
- Management UI operations

#### 6.4 Security Testing

**New file:** `tests/security/mcp-security.test.ts`

- SQL injection attempts
- API key security
- Data exposure verification
- CORS configuration

## Key Extensibility Features

### Adding New Content Type (e.g., Travel Packages)

**No code changes required!** Admin can:

1. Go to MCP Management > Content Types
2. Click "Add New Content Type"
3. Fill in:

   - Type Key: `travel_packages`
   - Type Name: "Travel Packages"
   - Source Table: `cms_travel_packages`
   - Endpoint Path: `/api/mcp/public/travel_packages`
   - Schema Definition: Define which fields to expose
   - Access Level: Public or Admin

4. Enable the content type
5. Configure exposure rules (which packages to expose)
6. Test the endpoint: `/api/mcp/public/content/travel_packages`
7. n8n can immediately start querying this new content type!

### Schema Definition Example

```json
{
  "fields": {
    "id": { "expose": true, "alias": "packageId" },
    "title": { "expose": true },
    "description": { "expose": true },
    "price": { "expose": true },
    "internal_cost": { "expose": false },
    "internal_notes": { "expose": false }
  },
  "relations": {
    "destinations": { "table": "destinations", "expose": true }
  }
}
```

## Security Checklist

- [ ] API keys stored in environment variables
- [ ] All admin endpoints audit logged
- [ ] Rate limiting prevents abuse
- [ ] No sensitive data in public endpoints
- [ ] CORS configured for n8n origin only
- [ ] SQL injection prevention
- [ ] Response size limits
- [ ] API key rotation procedure documented
- [ ] Content exposure rules properly enforced
- [ ] Management UI requires super_admin/istm_admin role

## Files Summary

### New Files (35)

**Core:**

- `app/lib/mcp/auth.ts`
- `app/lib/mcp/rate-limiter.ts`
- `app/lib/mcp/types.ts`
- `app/lib/mcp/content-registry.ts`
- `app/lib/mcp/cache.ts`
- `app/lib/mcp/sanitizer.ts`
- `app/lib/mcp/audit.ts`

**Management UI:**

- `app/admin/mcp-management/page.tsx`
- `app/admin/mcp-management/content-types/page.tsx`
- `app/admin/mcp-management/content-types/[id]/page.tsx`
- `app/admin/mcp-management/content-types/new/page.tsx`
- `app/admin/mcp-management/exposure/[typeKey]/page.tsx`
- `app/admin/mcp-management/api-keys/page.tsx`

**Management API:**

- `app/api/admin/mcp/content-types/route.ts`
- `app/api/admin/mcp/content-types/[id]/route.ts`
- `app/api/admin/mcp/exposure-rules/route.ts`
- `app/api/admin/mcp/exposure-rules/[id]/route.ts`
- `app/api/admin/mcp/exposure-rules/bulk/route.ts`
- `app/api/admin/mcp/api-keys/route.ts`
- `app/api/admin/mcp/api-keys/rotate/route.ts`
- `app/api/admin/mcp/access-logs/route.ts`
- `app/api/admin/mcp/analytics/route.ts`

**Public API:**

- `app/api/mcp/public/faq/route.ts`
- `app/api/mcp/public/activities/route.ts`
- `app/api/mcp/public/news/route.ts`
- `app/api/mcp/public/pages/route.ts`
- `app/api/mcp/public/content/[type]/route.ts` (dynamic)
- `app/api/mcp/public/status/route.ts`

**Admin API:**

- `app/api/mcp/admin/registrations/route.ts`
- `app/api/mcp/admin/users/lookup/route.ts`
- `app/api/mcp/admin/stats/route.ts`
- `app/api/mcp/admin/audit/query/route.ts`

**Documentation:**

- `docs/MCP_API_REFERENCE.md`
- `docs/MCP_CONTENT_TYPE_GUIDE.md`
- `docs/MCP_INTEGRATION_GUIDE.md`

**Tests:**

- `e2e/mcp-api.spec.ts`
- `tests/security/mcp-security.test.ts`

### Modified Files (3)

- `app/lib/rbac.ts` - Add istm-admin role
- `app/types/database.ts` - Add istm_admin to BusinessRole  
- `.env.example` - Add MCP configuration

### Database Migrations (1)

- `supabase/migrations/20251017_create_mcp_content_config.sql` (applied in Staging & Prod)

## Next Steps After Approval

1. Create feature branch: `feature/mcp-rag-integration`
2. Implement database schema (Phase 1.2)
3. Implement istm-admin role (Phase 1.1)
4. Implement core infrastructure (Phase 1.3-1.4, Phase 5)
5. Implement management UI (Phase 2)
6. Implement public endpoints (Phase 3)
7. Implement admin endpoints (Phase 4)
8. Create documentation (Phase 6)
9. Testing and security review
10. Deploy to staging for n8n integration testing
11. Production deployment with monitoring

### To-dos

- [x] Database migration applied: 20251017_create_mcp_content_config.sql
- [x] Add istm-admin role to RBAC system and database types
- [x] Create MCP authentication system with API key validation
- [x] Implement rate limiting infrastructure for MCP endpoints
- [x] Create data classification system for public vs sensitive data
- [x] Implement public FAQ API endpoint
- [x] Implement public activities API endpoint
- [x] Implement public news API endpoint
- [x] Implement public pages/slugs API endpoint
- [x] Implement public system status API endpoint
- [x] Implement admin registrations API endpoint with full audit logging
- [x] Implement admin user lookup API endpoint
- [x] Implement admin statistics API endpoint
- [x] Implement admin audit logs query API endpoint
- [x] Implement caching strategy for public endpoints with real-time admin data
- [x] Create response sanitization system to remove sensitive internal fields
- [x] Integrate MCP API access logging with existing audit system
- [x] Create comprehensive API reference documentation
- [ ] Create integration guide for n8n setup
- [ ] Write E2E integration tests for all MCP endpoints
- [ ] Write security tests including SQL injection, rate limit bypass, data leakage
- [ ] Update environment configuration and .env.example with MCP settings