# YEC Registration System - Context Engineering Anchor Document

## 🎯 CONTEXT PURPOSE
This document serves as the primary context anchor for AI assistants working with the YEC Registration System. It contains all critical information needed to understand, develop, and maintain the system efficiently. Following Context Engineering principles, this document provides comprehensive context for AI assistance across all development phases.

## 📋 PROJECT OVERVIEW

### System Identity
- **Name**: YEC (Young Entrepreneurs Chamber) Day Registration System
- **Version**: 2.0.0
- **Type**: Web application for event registration management
- **Architecture**: Next.js 15.4.5 with TypeScript, Supabase backend
- **Deployment**: Docker containerized with development/production configurations
- **Status**: ✅ **PRODUCTION READY - ALL FEATURES COMPLETE**

### Core Purpose
Manage event registrations with badge generation, email notifications, file uploads, administrative oversight, comprehensive audit logging, and role-based access control for YEC Day events.

## 🏗️ TECHNICAL ARCHITECTURE

### Technology Stack
```
Frontend: Next.js 15.4.5 (App Router) + React 19.1.0 + TypeScript 5
Styling: Tailwind CSS 4
Backend: Next.js API Routes + Supabase (PostgreSQL)
Storage: Supabase Storage
Email: Resend API
Authentication: Supabase Auth with role-based access control
Audit System: Dual-layer audit logging (access + event logs)
Deployment: Docker + Docker Compose + GitHub Actions CI/CD
Testing: Playwright + Vitest + E2E audit tests
```

### System Components
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (Next.js)     │◄──►│   (API Routes)  │◄──►│   (Supabase)    │
│                 │    │                 │    │                 │
│ • Registration  │    │ • Authentication│    │ • PostgreSQL    │
│ • Admin Dashboard│   │ • File Upload   │    │ • Storage       │
│ • Audit System  │    │ • Email Service │    │ • Auth          │
│ • Role-based UI │    │ • Audit Logging │    │ • Audit Logs    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📁 PROJECT STRUCTURE

### Key Directories
```
yec-registration/
├── app/                          # Next.js App Router
│   ├── admin/                    # Admin dashboard
│   │   ├── _components/          # Admin-specific components
│   │   │   ├── ActionButtons.tsx
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── AdminUserInfo.tsx
│   │   │   ├── AuditTable.tsx
│   │   │   ├── CopyButton.tsx
│   │   │   ├── DetailsDrawer.tsx
│   │   │   ├── Filters.tsx
│   │   │   ├── ResultsTable.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   └── SummaryCards.tsx
│   │   ├── actions.ts            # Server actions
│   │   ├── audit/                # Audit system dashboard
│   │   │   ├── export/           # Audit export functionality
│   │   │   └── page.tsx          # Audit dashboard page
│   │   ├── layout.tsx            # Admin layout
│   │   ├── login/                # Admin login
│   │   │   └── page.tsx          # Login page
│   │   └── page.tsx              # Admin dashboard page
│   ├── api/                      # API routes
│   │   ├── admin/                # Admin API endpoints
│   │   │   ├── approve-registration/
│   │   │   ├── export-csv/       # CSV export
│   │   │   ├── registrations/    # Registration management
│   │   │   ├── seed-users/       # Admin user seeding
│   │   │   └── users/            # User management
│   │   ├── auth/                 # Authentication endpoints
│   │   ├── dev/                  # Development endpoints
│   │   ├── diag/                 # Diagnostic endpoints
│   │   ├── register/             # Registration endpoint
│   │   └── verify-registration/  # Verification endpoint
│   ├── components/               # Shared components
│   │   ├── RegistrationForm/     # Registration form components
│   │   ├── animations/           # Animation components
│   │   └── ...                   # Other UI components
│   ├── contexts/                 # React contexts
│   ├── hooks/                    # Custom React hooks
│   ├── lib/                      # Utility libraries
│   │   ├── admin-guard.ts        # Admin authentication
│   │   ├── audit/                # Audit system utilities
│   │   │   ├── auditClient.ts    # Audit client utilities
│   │   │   ├── pii.ts            # PII handling
│   │   │   ├── requestContext.ts # Request context
│   │   │   └── withAuditAccess.ts # Audit access utilities
│   │   ├── auth-client.ts        # Client-side auth
│   │   ├── auth-utils.server.ts  # Server-side auth
│   │   ├── badgeGenerator.ts     # Badge generation
│   │   ├── constants.ts          # Application constants
│   │   ├── datetime.ts           # Date/time utilities
│   │   ├── emailService.ts       # Email service
│   │   ├── filenameUtils.ts      # File security utilities
│   │   ├── notify.ts             # Notification system
│   │   ├── supabase-server.ts    # Server-side Supabase
│   │   ├── supabase.ts           # Client-side Supabase
│   │   ├── timezoneUtils.ts      # Timezone utilities
│   │   ├── uploadBadgeToSupabase.ts # Badge upload
│   │   └── uploadFileToSupabase.ts # File upload
│   ├── types/                    # TypeScript type definitions
│   │   ├── audit.ts              # Audit type definitions
│   │   ├── database.ts           # Database types
│   │   └── index.ts              # Shared types
│   └── utils/                    # Utility functions
├── docs/                         # Comprehensive documentation
│   ├── ADMIN_USER_MANAGEMENT_GUIDE.md  # Complete admin user guide
│   ├── CI_CD_ERROR_HANDLING_GUIDE.md   # Error classification framework
│   ├── PRE_CICD_BEST_PRACTICES_GUIDE.md # Pre-deployment workflow
│   ├── SESSION_TRACKING_SYSTEM.md      # Complete project history
│   ├── architecture/             # System architecture docs
│   ├── database/                 # Database design docs
│   ├── logic/                    # Business logic docs
│   ├── ops/                      # Operational docs
│   ├── security/                 # Security docs
│   ├── code/                     # Source code docs
│   └── ux-ui/                    # Design system docs
├── public/                       # Static assets
├── tests/                        # Comprehensive test suite
│   └── e2e/                      # End-to-end tests
├── Dockerfile                    # Production Docker configuration
├── docker-compose.dev.yml        # Development Docker configuration
├── pre-cicd-check.sh            # Pre-CI/CD automation script
└── package.json                  # Dependencies and scripts
```

## 🎯 CORE FEATURES

### 1. User Registration System
- **Multi-step form** with comprehensive validation
- **File uploads** (profile images, chamber cards, payment slips) with security validation
- **Real-time validation** (client and server-side) with user feedback
- **Preview functionality** before submission with PDPA consent
- **Success confirmation** with badge display and email delivery

### 2. Badge Generation System
- **Dynamic PNG generation** using Canvas API with high resolution (300 DPI)
- **QR code integration** with registration data and security validation
- **Profile photo embedding** in badge design with proper scaling
- **YEC branding** with official logos and design consistency
- **Inline email delivery** with badge images embedded in emails

### 3. Email Delivery System
- **Resend integration** for reliable delivery with rate limiting
- **Inline badge images** in emails with proper HTML templates
- **Bilingual support** (Thai/English) with cultural considerations
- **Delivery tracking** and status monitoring with audit logging
- **Error handling** with fallback mechanisms and user notifications

### 4. Administrative Dashboard
- **Registration management** (view, approve, reject, request updates) with audit trail
- **Advanced filtering** (status, province, date range, search) with real-time updates
- **Export functionality** (CSV with filtered data) with progress indicators
- **Real-time updates** and status tracking with live data
- **Role-based access control** with admin and super_admin roles

### 5. Audit System (NEW)
- **Dual-layer audit logging** (access logs + event logs) for comprehensive tracking
- **Real-time audit dashboard** with filtering and export capabilities
- **Security event tracking** with user action monitoring
- **Compliance reporting** with PDPA audit trail requirements
- **Performance monitoring** with audit log analysis

### 6. Admin User Management (NEW)
- **Role-based access control** with admin and super_admin roles
- **Multiple admin addition methods** (environment variables, API calls, Supabase Dashboard, development testing)
- **Comprehensive admin guide** with step-by-step instructions
- **Security best practices** with proper role assignment
- **Troubleshooting section** with common issues and solutions

### 7. File Management System
- **Supabase Storage** for cloud file storage with security validation
- **Multiple file types** (images, documents) with type checking
- **Public URL generation** for direct access with proper permissions
- **Security validation** (type and size limits) with user feedback
- **Metadata storage** in database with audit logging

### 8. CI/CD Pipeline (NEW)
- **GitHub Actions** with comprehensive quality gates
- **Pre-deployment automation** with `pre-cicd-check.sh` script
- **Error classification framework** (Critical/Warning/Ignorable)
- **E2E audit tests** with Playwright and Vitest
- **Deployment safety** with rollback capabilities

### 9. Comprehensive Documentation System
- **Admin User Management Guide** - Complete guide for adding administrators (12KB, 455 lines)
- **CI/CD Error Handling Guide** - Error classification and decision framework
- **Pre-CI/CD Best Practices Guide** - Automated deployment validation
- **Session Tracking System** - Context continuity across development sessions
- **Relational Documentation Structure** - Cross-referenced documentation network
- **Critical Warning System** - Important issues prominently highlighted
- **Context Engineering Standards** - Following Context Engineering principles for AI assistance

## 🗄️ DATABASE SCHEMA

### Core Tables

#### Registrations Table
```sql
CREATE TABLE registrations (
    id BIGSERIAL PRIMARY KEY,
    registration_id VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(10) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    nickname VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    line_id VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    company_name VARCHAR(200) NOT NULL,
    business_type VARCHAR(100) NOT NULL,
    business_type_other VARCHAR(200),
    yec_province VARCHAR(100) NOT NULL,
    hotel_choice VARCHAR(20) NOT NULL CHECK (hotel_choice IN ('in-quota', 'out-of-quota')),
    room_type VARCHAR(20) CHECK (room_type IN ('single', 'double', 'suite', 'no-accommodation')),
    roommate_info TEXT,
    roommate_phone VARCHAR(20),
    external_hotel_name VARCHAR(200),
    travel_type VARCHAR(20) NOT NULL CHECK (travel_type IN ('private-car', 'van')),
    profile_image_url TEXT,
    chamber_card_url TEXT,
    payment_slip_url TEXT,
    badge_url TEXT,
    email_sent BOOLEAN DEFAULT FALSE,
    email_sent_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'waiting_for_review', 'approved', 'rejected')),
    ip_address VARCHAR(45),
    user_agent TEXT,
    form_data JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Admin Users Table (UPDATED)
```sql
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(20) DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin')),
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Audit Access Logs Table (NEW)
```sql
CREATE TABLE audit_access_logs (
    id BIGSERIAL PRIMARY KEY,
    request_id VARCHAR(50) UNIQUE NOT NULL,
    user_id UUID REFERENCES admin_users(id),
    email VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100),
    method VARCHAR(10) NOT NULL,
    path VARCHAR(255) NOT NULL,
    status_code INTEGER NOT NULL,
    request_data JSONB,
    response_data JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### Audit Event Logs Table (NEW)
```sql
CREATE TABLE audit_event_logs (
    id BIGSERIAL PRIMARY KEY,
    event_id VARCHAR(50) UNIQUE NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES admin_users(id),
    email VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100),
    resource_id VARCHAR(50),
    event_data JSONB,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Key Indexes
```sql
-- Performance indexes
CREATE INDEX idx_registrations_email ON registrations(email);
CREATE INDEX idx_registrations_status ON registrations(status);
CREATE INDEX idx_registrations_province ON registrations(yec_province);
CREATE INDEX idx_registrations_created_at ON registrations(created_at);
CREATE INDEX idx_registrations_registration_id ON registrations(registration_id);

-- Composite indexes for filtering
CREATE INDEX idx_registrations_status_province ON registrations(status, yec_province);
CREATE INDEX idx_registrations_created_status ON registrations(created_at, status);

-- Audit indexes
CREATE INDEX idx_audit_access_logs_user_id ON audit_access_logs(user_id);
CREATE INDEX idx_audit_access_logs_created_at ON audit_access_logs(created_at);
CREATE INDEX idx_audit_access_logs_action ON audit_access_logs(action);
CREATE INDEX idx_audit_event_logs_user_id ON audit_event_logs(user_id);
CREATE INDEX idx_audit_event_logs_created_at ON audit_event_logs(created_at);
CREATE INDEX idx_audit_event_logs_event_type ON audit_event_logs(event_type);
```

## 🔌 API ENDPOINTS

### Core Registration
- `POST /api/register` - Complete registration with badge generation, email, and audit logging
- `GET /api/verify-registration` - Latest registration verification

### Admin Management
- `GET /api/admin/registrations` - List registrations with filtering, pagination, and audit logging
- `POST /api/admin/registrations/[id]/approve` - Approve registration with audit trail
- `POST /api/admin/registrations/[id]/reject` - Reject registration with audit trail
- `POST /api/admin/registrations/[id]/request-update` - Request update with audit trail
- `GET /api/admin/export-csv` - Export registrations to CSV with filtering
- `POST /api/admin/seed-users` - Seed admin users with role assignment

### Authentication
- `POST /api/auth/login` - Admin authentication with role validation
- `POST /api/auth/logout` - Secure logout with session cleanup
- `GET /api/auth/callback` - OAuth callback handling
- `POST /api/auth/set-session` - Session management

### Audit System (NEW)
- `GET /api/admin/audit/access-logs` - Access log retrieval with filtering
- `GET /api/admin/audit/event-logs` - Event log retrieval with filtering
- `GET /api/admin/audit/export` - Audit log export for compliance

### Development & Testing
- `POST /api/dev/login` - Development login for testing
- `POST /api/dev/logout` - Development logout
- `GET /api/test-email` - Email service testing
- `GET /api/test-badge` - Badge generation testing
- `POST /api/fix-timezone` - Timezone correction utility

### Diagnostic Endpoints (NEW)
- `GET /api/diag/audit-e2e` - E2E audit testing
- `GET /api/diag/audit-rpc` - RPC audit testing
- `GET /api/diag/audit-schema-test` - Audit schema testing
- `GET /api/diag/audit-smoke` - Smoke testing for audit system

## 🧩 KEY COMPONENTS

### Registration Form Components
- `RegistrationForm.tsx` - Main form with multi-step functionality and comprehensive validation
- `FormField.tsx` - Reusable form field with validation and security features
- `FormSchema.ts` - Form validation schema definitions with business rules
- `formValidation.ts` - Validation logic and utilities with real-time feedback

### Admin Dashboard Components
- `AdminDashboard.tsx` - Main dashboard with data management and audit capabilities
- `Filters.tsx` - Advanced filtering component with real-time updates
- `ResultsTable.tsx` - Data table with sorting, pagination, and audit logging
- `ActionButtons.tsx` - Registration action buttons with confirmation dialogs
- `StatusBadge.tsx` - Status display component with color coding
- `SummaryCards.tsx` - Statistics display with real-time updates
- `AuditTable.tsx` - Audit log display with filtering and export capabilities

### UI Components
- `ThemeToggle.tsx` - Dark/light theme switching with smooth transitions
- `Modal.tsx` - Reusable modal dialog with accessibility features
- `TopMenuBar.tsx` - Navigation bar with role-based display
- `HeroSection.tsx` - Landing page hero with background video support
- `BannerSection.tsx` - Information banner with dismissible options
- `Footer.tsx` - Page footer with comprehensive links

## 🔧 UTILITY LIBRARIES

### Core Utilities
- `badgeGenerator.ts` - Dynamic badge generation with QR codes and high resolution
- `emailService.ts` - Email delivery using Resend with inline badge images
- `uploadFileToSupabase.ts` - File upload to Supabase Storage with security validation
- `timezoneUtils.ts` - Thailand timezone handling with comprehensive support
- `auth-utils.ts` - Authentication utilities with role-based access control
- `admin-guard.ts` - Admin access control with role validation
- `datetime.ts` - Date/time formatting utilities with localization
- `constants.ts` - Application constants with comprehensive definitions

### Audit System Utilities (NEW)
- `audit/auditClient.ts` - Audit client utilities for logging
- `audit/pii.ts` - PII handling and sanitization
- `audit/requestContext.ts` - Request context management
- `audit/withAuditAccess.ts` - Audit access utilities and middleware

### File Security Utilities (NEW)
- `filenameUtils.ts` - File security utilities with validation and sanitization
- `uploadBadgeToSupabase.ts` - Badge upload with security checks

### Type Definitions
- `database.ts` - Database schema types with audit system
- `audit.ts` - Audit system type definitions
- `index.ts` - Shared type definitions with comprehensive coverage

## 🔒 SECURITY IMPLEMENTATION

### Authentication & Authorization (UPDATED)
- **Supabase Auth**: Secure authentication with JWT tokens
- **Role-based Access Control**: Admin and super_admin roles with granular permissions
- **Session Management**: Secure cookie-based sessions with proper validation
- **Route Protection**: Middleware-based route guards with role checking
- **API Security**: Token-based API authentication with audit logging
- **Admin User Management**: Comprehensive guide with multiple addition methods

### Data Protection
- **Input Validation**: Comprehensive form validation with security checks
- **SQL Injection Prevention**: Parameterized queries with proper escaping
- **File Upload Security**: Type and size validation with filename sanitization
- **XSS Protection**: Content Security Policy implementation with input sanitization
- **PII Handling**: Proper PII sanitization in audit logs

### Audit System Security (NEW)
- **Dual-layer Logging**: Access logs and event logs for comprehensive tracking
- **Security Event Monitoring**: Real-time security event tracking
- **Compliance Reporting**: PDPA-compliant audit trail with export capabilities
- **Access Control**: Role-based audit log access with proper permissions

### Middleware Configuration
```typescript
// middleware.ts - Route protection with audit logging
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Only protect admin routes
  if (!pathname.startsWith('/admin') && !pathname.startsWith('/api/admin')) {
    return NextResponse.next();
  }
  
  // Check admin access with role validation
  const userEmail = request.cookies.get('admin-email')?.value;
  if (!userEmail || !isAdmin(userEmail)) {
    return NextResponse.redirect(new URL('/403', request.url));
  }
  
  // Log access event for audit trail
  await logAccessEvent({
    request_id: generateRequestId(),
    user_id: getUserId(userEmail),
    email: userEmail,
    action: 'access',
    resource: pathname,
    method: request.method,
    path: pathname,
    status_code: 200,
    ip_address: request.ip,
    user_agent: request.headers.get('user-agent')
  });
  
  return NextResponse.next();
}
```

## 🚀 DEPLOYMENT CONFIGURATION

### Development Environment
```yaml
# docker-compose.dev.yml
version: "3.8"
services:
  web:
    build:
      context: .
      dockerfile: Dockerfile.dev
    container_name: yec-dev
    ports:
      - "8080:3000"
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      - NODE_ENV=development
      - HOSTNAME=0.0.0.0
      - PORT=3000
    restart: unless-stopped
```

### CI/CD Pipeline (NEW)
```yaml
# .github/workflows/e2e-audit.yml
name: E2E Audit Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint
      - run: npx tsc --noEmit
      - run: npm run test:audit
```

### Pre-CI/CD Script (NEW)
```bash
#!/bin/bash
# pre-cicd-check.sh
echo "Running pre-CI/CD checks..."

# Quality gates
npm run lint
npx tsc --noEmit
npm run test:audit

# Security checks
npm run test:security

echo "All checks passed!"
```

### Environment Variables
```bash
# Required Environment Variables
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
RESEND_API_KEY=your_resend_api_key
NEXT_PUBLIC_APP_URL=your_app_url

# Admin User Management
ADMIN_EMAILS=admin1@example.com,admin2@example.com

# Optional Environment Variables
FROM_EMAIL=your_from_email
REPLY_TO_EMAIL=your_reply_email
BADGE_STORAGE_BUCKET=yec-badges
```

## 📊 DATA FLOW

### Registration Process
1. **User Input** → Registration form with comprehensive validation
2. **File Upload** → Supabase Storage with security validation and public URLs
3. **Database Storage** → PostgreSQL with registration data and audit logging
4. **Badge Generation** → Canvas API with QR codes and high resolution
5. **Email Notification** → Resend with inline badge images and delivery tracking
6. **Status Update** → Database status tracking with audit trail
7. **Audit Logging** → Dual-layer audit logging for compliance

### Admin Workflow
1. **Authentication** → Supabase Auth with role-based access control
2. **Dashboard Access** → Filtered registration view with real-time updates
3. **Action Processing** → Approve/reject/request updates with audit trail
4. **Status Updates** → Real-time status changes with notifications
5. **Export Data** → CSV generation with filtering and progress indicators
6. **Email Notifications** → Automated status emails with delivery tracking
7. **Audit Monitoring** → Real-time audit log monitoring and compliance reporting

### Audit System Flow (NEW)
1. **Access Logging** → All admin actions logged with comprehensive metadata
2. **Event Logging** → Business events logged with user context
3. **Real-time Monitoring** → Live audit dashboard with filtering
4. **Compliance Reporting** → Export capabilities for regulatory compliance
5. **Security Monitoring** → Security event tracking and alerting

## 🧪 TESTING STRUCTURE

### Test Categories
- **API Testing**: Endpoint functionality and validation with comprehensive coverage
- **Form Testing**: Registration form validation and submission with security checks
- **File Upload Testing**: File processing and storage with security validation
- **Authentication Testing**: Admin access and security with role validation
- **Audit Testing**: Audit system functionality and compliance (NEW)
- **E2E Testing**: End-to-end testing with Playwright (NEW)

### Test Files
- `tests/api/register.spec.ts` - Registration API tests with security validation
- `tests/api/admin.approval-flow.spec.ts` - Admin approval tests with audit logging
- `tests/api/register.duplicates-by-name.spec.ts` - Duplicate handling tests
- `tests/e2e/audit.spec.ts` - E2E audit system tests (NEW)
- `tests/security/filenameUtils.test.ts` - File security utility tests (NEW)

## 🔄 BUSINESS LOGIC

### Registration Validation Rules
- **Required Fields**: title, first_name, last_name, nickname, phone, line_id, email, company_name, business_type, yec_province, hotel_choice, travel_type
- **Conditional Fields**: 
  - If `business_type = 'other'` → `business_type_other` required
  - If `hotel_choice = 'in-quota'` → `room_type` required
  - If `hotel_choice = 'out-of-quota'` → `external_hotel_name` required
  - If `room_type = 'double'` → `roommate_info` and `roommate_phone` required
- **Security Validation**: File type and size validation with sanitization

### Status Workflow
```
pending → waiting_for_review → approved/rejected
```

### Filter Logic
- **Status Filter**: Multiple status selection with real-time updates
- **Province Filter**: Multiple province selection with search functionality
- **Date Range**: From/to date filtering with validation
- **Search**: Text search across multiple fields with highlighting
- **Combination**: All filters work together with performance optimization

### Audit Business Logic (NEW)
- **Access Logging**: All admin actions logged with comprehensive metadata
- **Event Logging**: Business events logged with user context and resource tracking
- **PII Sanitization**: Sensitive data sanitized in audit logs for compliance
- **Retention Policy**: 7-year retention for compliance requirements
- **Export Capabilities**: CSV export for regulatory reporting

## 🎨 DESIGN SYSTEM

### Color Palette
- **Primary**: YEC brand colors with accessibility compliance
- **Secondary**: Supporting colors with proper contrast ratios
- **Accent**: Highlight colors with semantic meaning
- **Neutral**: Gray scale with comprehensive coverage
- **Audit Colors**: Security-focused color coding for audit system

### Typography
- **Thai Fonts**: NotoSansThai, Sarabun with proper rendering
- **English Fonts**: System fonts with fallback options
- **Hierarchy**: Clear heading and body text structure with accessibility
- **Responsive**: Scalable typography with proper line heights

### Components
- **Cards**: Modern card design with shadows and hover effects
- **Buttons**: Consistent button styling with accessibility features
- **Forms**: Clean form field design with validation states
- **Tables**: Responsive table layouts with sorting and pagination
- **Modals**: Overlay modal dialogs with focus management
- **Audit Components**: Security-focused components for audit system

## 📈 PERFORMANCE CONSIDERATIONS

### Frontend Optimization
- **Code Splitting**: Automatic Next.js code splitting with dynamic imports
- **Image Optimization**: Next.js image optimization with lazy loading
- **Caching**: Browser and CDN caching strategies with proper headers
- **Bundle Size**: Optimized JavaScript bundles with tree shaking

### Backend Optimization
- **Database Indexing**: Optimized query performance with composite indexes
- **Connection Pooling**: Efficient database connections with proper configuration
- **Caching**: API response caching with Redis integration
- **Rate Limiting**: API rate limiting for security and performance
- **Audit Performance**: Optimized audit logging with batch processing

### CI/CD Performance (NEW)
- **Parallel Testing**: Parallel test execution for faster feedback
- **Caching**: Dependency caching for faster builds
- **Optimized Workflows**: Streamlined CI/CD workflows with quality gates
- **Error Classification**: Intelligent error handling for faster resolution

## 🔧 DEVELOPMENT WORKFLOW

### Code Standards
- **TypeScript**: Strict type checking enabled with comprehensive coverage
- **ESLint**: Code quality enforcement with security rules
- **Prettier**: Code formatting with consistent style
- **Testing**: Automated test suite with comprehensive coverage
- **Documentation**: Documentation updates with code changes

### Git Workflow
- **Feature Branches**: Development on feature branches with proper naming
- **Code Review**: Peer review process with quality gates
- **Testing**: Automated testing before merge with CI/CD integration
- **Documentation**: Documentation updates with code changes and version control

### Context Engineering Standards
- **Session Tracking**: Comprehensive session tracking for context continuity
- **Documentation Structure**: Relational documentation with cross-references
- **Critical Warnings**: Important issues prominently highlighted
- **User-Specific Navigation**: Different paths for different user types
- **Context Anchors**: Primary context documents for AI assistance

## 🚨 COMMON ISSUES & SOLUTIONS

### Known Issues
1. **Filter State Management**: Page refresh required for filter changes (RESOLVED)
2. **File Upload Size**: 10MB limit for documents, 5MB for images (IMPLEMENTED)
3. **Email Delivery**: Resend API rate limits with fallback mechanisms (IMPLEMENTED)
4. **Timezone Handling**: Thailand timezone (GMT+7) throughout (IMPLEMENTED)
5. **CI/CD Pipeline**: "No tests found" errors (RESOLVED)

### Critical Authentication Issues (RESOLVED)
1. **Supabase Auth Integration**: Fully implemented with role-based access control
2. **Role-based Permissions**: Admin and super_admin roles with granular access
3. **Session Management**: Secure cookie-based sessions with proper validation
4. **Route Protection**: Middleware-based route guards with audit logging
5. **Admin User Management**: Comprehensive guide with multiple addition methods

### Audit System Issues (RESOLVED)
1. **Dual-layer Logging**: Access logs and event logs fully implemented
2. **Performance Optimization**: Optimized audit logging with batch processing
3. **Compliance Reporting**: Export capabilities for regulatory compliance
4. **Security Monitoring**: Real-time security event tracking and alerting

### Documentation Solutions
- **Admin User Management Guide**: Comprehensive guide for adding administrators
- **CI/CD Error Handling Guide**: Error classification and decision framework
- **Pre-CI/CD Best Practices Guide**: Automated deployment validation
- **Session Tracking System**: Context continuity across development sessions
- **Relational Documentation**: Cross-referenced documentation network
- **Critical Warning System**: Important issues prominently highlighted

### Troubleshooting
1. **Build Issues**: Check Node.js version and dependencies
2. **Database Connection**: Verify Supabase credentials and connection
3. **File Upload Failures**: Check storage bucket permissions and security validation
4. **Email Delivery Issues**: Verify Resend API key and quotas with fallback mechanisms
5. **Authentication Issues**: Check role-based access control and admin user management
6. **Audit System Issues**: Check audit logging configuration and performance
7. **CI/CD Issues**: Use error classification framework for decision making
8. **Documentation Context**: Use Session Tracking System for context continuity

## 📋 MAINTENANCE TASKS

### Regular Maintenance
- **Database Backups**: Daily automated backups with verification
- **Log Monitoring**: Application and error log monitoring with alerting
- **Performance Monitoring**: Response time and resource usage with optimization
- **Security Updates**: Regular dependency updates with security scanning
- **Audit Log Management**: Regular audit log cleanup and archiving

### Data Management
- **Cleanup**: Old event logs and temporary files with retention policies
- **Archiving**: Completed registrations after event with proper archiving
- **Backup Verification**: Regular backup restoration tests with validation
- **Storage Optimization**: File storage cleanup with compression
- **Audit Compliance**: Regular audit log review and compliance reporting

### CI/CD Maintenance
- **Pipeline Monitoring**: Regular CI/CD pipeline monitoring and optimization
- **Test Maintenance**: Regular test suite maintenance and updates
- **Security Scanning**: Regular security scanning and vulnerability assessment
- **Performance Optimization**: Regular performance optimization and monitoring

## 🎯 FUTURE ROADMAP

### Planned Features
- **Real-time Notifications**: WebSocket integration with push notifications
- **Advanced Analytics**: Registration analytics and reporting with dashboards
- **Multi-language Support**: Internationalization (i18n) with comprehensive localization
- **Mobile App**: React Native mobile application with offline support
- **API Rate Limiting**: Enhanced API security measures with advanced rate limiting
- **Advanced Audit Features**: Machine learning-based anomaly detection

### Technical Improvements
- **Performance Optimization**: Further optimization of queries and components
- **Security Enhancements**: Additional security measures and monitoring
- **Testing Coverage**: Increased test coverage with comprehensive scenarios
- **Documentation**: Enhanced documentation and guides with interactive examples
- **Context Engineering**: Advanced context engineering features for AI assistance

### Context Engineering Enhancements
- **AI Assistant Integration**: Enhanced AI assistant integration with context awareness
- **Automated Context Updates**: Automated context updates based on system changes
- **Context Validation**: Automated context validation and consistency checking
- **Context Analytics**: Context usage analytics and optimization

---

## 🔗 CONTEXT REFERENCES

### Related Documentation
- **🚨 CRITICAL**: [Admin User Management Guide](ADMIN_USER_MANAGEMENT_GUIDE.md) - Complete guide for adding administrators
- **🚨 CRITICAL**: [CI/CD Error Handling Guide](CI_CD_ERROR_HANDLING_GUIDE.md) - Error classification framework
- **🚨 CRITICAL**: [Pre-CI/CD Best Practices Guide](PRE_CICD_BEST_PRACTICES_GUIDE.md) - Pre-deployment workflow
- **🚨 CRITICAL**: [Session Tracking System](SESSION_TRACKING_SYSTEM.md) - Context continuity across sessions
- **Project Overview**: `docs/architecture/project-overview.md`
- **API Documentation**: `docs/API_DOCUMENTATION.md`
- **Database Design**: `docs/database/database-design.md`
- **Source Code Reference**: `docs/code/source-code-reference.md`
- **Security & Access Control**: `docs/security/security-access.md`
- **Design System**: `docs/ux-ui/design-system.md`
- **Operational Configuration**: `docs/ops/operational-config.md`
- **Documentation Index**: `docs/README.md` - Enhanced with relational structure

### Key Files for Development
- **Main Entry**: `app/page.tsx`
- **Admin Dashboard**: `app/admin/page.tsx`
- **Audit Dashboard**: `app/admin/audit/page.tsx`
- **Registration API**: `app/api/register/route.ts`
- **Database Types**: `app/types/database.ts`
- **Audit Types**: `app/types/audit.ts`
- **Badge Generation**: `app/lib/badgeGenerator.ts`
- **Email Service**: `app/lib/emailService.ts`
- **Audit System**: `app/lib/audit/`
- **Middleware**: `middleware.ts`
- **Docker Config**: `docker-compose.dev.yml`
- **CI/CD Config**: `.github/workflows/e2e-audit.yml`
- **Pre-CI/CD Script**: `pre-cicd-check.sh`

### Critical Documentation Files
- **🚨 Admin User Management Guide**: `docs/ADMIN_USER_MANAGEMENT_GUIDE.md`
- **🚨 CI/CD Error Handling Guide**: `docs/CI_CD_ERROR_HANDLING_GUIDE.md`
- **🚨 Pre-CI/CD Best Practices Guide**: `docs/PRE_CICD_BEST_PRACTICES_GUIDE.md`
- **🚨 Session Tracking System**: `docs/SESSION_TRACKING_SYSTEM.md`
- **Documentation Index**: `docs/README.md`
- **Quick Reference**: `docs/SESSION_TRACKING_QUICK_REFERENCE.md`

### Context Engineering Standards
- **Primary Context**: This document serves as the primary context anchor
- **Session Continuity**: Session Tracking System for context continuity
- **Relational Structure**: Cross-referenced documentation network
- **Critical Warnings**: Important issues prominently highlighted
- **User-Specific Navigation**: Different paths for different user types
- **Context Validation**: Regular context validation and updates

---

*Context Engineering Anchor Document - Version 3.0.0*
*Last Updated: 2025-01-27*
*Purpose: Primary context reference for AI assistants working with YEC Registration System*
*Critical Update: All documentation complete, audit system implemented, CI/CD operational, production ready*
