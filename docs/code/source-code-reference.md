# YEC Registration System - Source Code Reference

## 📋 Overview

This document provides a comprehensive reference for the YEC Registration System source code structure, components, and implementation details. The system is built with Next.js 15, TypeScript, and follows modern React patterns with a focus on maintainability, scalability, security, and comprehensive audit logging.

## 🏗️ Project Structure

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
│   │   ├── audit/                # Audit system
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
│   │   ├── test-badge/           # Badge testing
│   │   ├── test-email/           # Email testing
│   │   └── verify-registration/  # Registration verification
│   ├── components/               # Shared components
│   │   ├── RegistrationForm/     # Registration form components
│   │   │   ├── FormField.tsx     # Reusable form field
│   │   │   ├── FormSchema.ts     # Form validation schema
│   │   │   ├── formValidation.ts # Validation logic
│   │   │   ├── index.tsx         # Form entry point
│   │   │   └── RegistrationForm.tsx # Main form component
│   │   ├── animations/           # Animation components
│   │   │   ├── FadeInStagger.tsx
│   │   │   └── SlideUp.tsx
│   │   ├── BannerSection.tsx     # Information banner
│   │   ├── ClientPageHandler.tsx # Client-side page handling
│   │   ├── DesktopVideo.tsx      # Desktop video component
│   │   ├── Footer.tsx            # Page footer
│   │   ├── HeroSection.tsx       # Landing page hero
│   │   ├── MobileVideo.tsx       # Mobile video component
│   │   ├── Modal.tsx             # Modal dialog
│   │   ├── ThemeToggle.tsx       # Theme switching
│   │   └── TopMenuBar.tsx        # Navigation bar
│   ├── contexts/                 # React contexts
│   │   └── ThemeContext.tsx      # Theme management
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
│   ├── utils/                    # Utility functions
│   │   └── validation.ts         # Validation utilities
│   ├── favicon.ico               # Site favicon
│   ├── fonts/                    # Custom fonts
│   │   ├── NotoSansThai-Regular.ttf
│   │   └── Sarabun-Regular.ttf
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Landing page
│   ├── preview/                  # Form preview page
│   │   └── page.tsx
│   └── success/                  # Success page
│       └── page.tsx
├── docs/                         # Comprehensive documentation
│   ├── ADMIN_USER_MANAGEMENT_GUIDE.md  # Complete admin user guide
│   ├── CI_CD_ERROR_HANDLING_GUIDE.md   # Error classification framework
│   ├── PRE_CICD_BEST_PRACTICES_GUIDE.md # Pre-deployment workflow
│   ├── SESSION_TRACKING_SYSTEM.md      # Complete project history
│   └── ...                       # Other documentation
├── public/                       # Static assets
├── tests/                        # Comprehensive test suite
│   └── e2e/                      # End-to-end tests
├── Dockerfile                    # Production Docker configuration
├── docker-compose.dev.yml        # Development Docker configuration
├── pre-cicd-check.sh            # Pre-CI/CD automation script
└── package.json                  # Dependencies and scripts
```

## 🧩 Core Components

### Registration Form Components

#### `RegistrationForm.tsx`
Main registration form component with multi-step functionality and comprehensive validation.

**Key Features:**
- Multi-step form progression with validation
- File upload handling with security checks
- Form validation with real-time feedback
- Preview functionality with PDPA consent
- Success state management with audit logging

**Props:**
```typescript
interface RegistrationFormProps {
  onSubmit: (data: RegistrationData) => void;
  onFileUpload: (file: File, type: string) => Promise<string>;
  isSubmitting: boolean;
}
```

#### `FormField.tsx`
Reusable form field component with validation, error handling, and security features.

**Key Features:**
- Dynamic field rendering with validation
- Error display with user-friendly messages
- File upload support with security validation
- Conditional field logic with business rules
- Accessibility features and ARIA support

**Props:**
```typescript
interface FormFieldProps {
  field: FormField;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  isSubmitting: boolean;
}
```

#### `FormSchema.ts`
TypeScript schema definitions for comprehensive form validation with security checks.

**Key Schemas:**
- Personal information validation with Thai ID support
- Business information validation with conditional logic
- Accommodation validation with business rules
- File upload validation with security checks

### Admin Dashboard Components

#### `AdminDashboard.tsx`
Main admin dashboard component with comprehensive data management and audit capabilities.

**Key Features:**
- Registration listing with advanced filtering
- Filter management with persistence
- Pagination with performance optimization
- Export functionality with CSV generation
- Real-time updates with audit logging

#### `Filters.tsx`
Advanced filtering component for registration data with comprehensive search capabilities.

**Key Features:**
- Status filtering with multiple selection
- Province filtering with search
- Date range filtering with validation
- Search functionality with real-time results
- Filter persistence with user preferences

#### `ResultsTable.tsx`
Data table component for displaying registrations with comprehensive functionality.

**Key Features:**
- Sortable columns with performance optimization
- Pagination with configurable page sizes
- Row actions with audit logging
- Empty state handling with user guidance
- Responsive design with mobile optimization

#### `AuditTable.tsx`
Audit log display component with comprehensive filtering and export capabilities.

**Key Features:**
- Dual-layer audit log display (access + event logs)
- Advanced filtering by user, action, and time
- Real-time log updates
- Export functionality for compliance
- Security-focused data display

### UI Components

#### `ThemeToggle.tsx`
Dark/light theme switching component with smooth transitions and accessibility.

**Key Features:**
- Theme persistence with localStorage
- Smooth transitions with CSS animations
- Icon animations with state changes
- System preference detection
- Accessibility support with ARIA labels

#### `Modal.tsx`
Reusable modal dialog component with comprehensive functionality.

**Key Features:**
- Backdrop handling with click outside
- Keyboard navigation with ESC key support
- Focus management with trap focus
- Animation support with smooth transitions
- Responsive design with mobile optimization

#### `TopMenuBar.tsx`
Navigation bar component with comprehensive features.

**Key Features:**
- Responsive navigation with mobile menu
- Theme toggle integration
- Logo display with branding
- Mobile menu with hamburger icon
- Accessibility support with keyboard navigation

## 🔧 Utility Libraries

### Authentication (`lib/auth-utils.ts`)
Authentication utilities for admin access with role-based permissions.

**Key Functions:**
```typescript
export function getCurrentUser(): Promise<User | null>;
export function isAuthenticated(): boolean;
export function logout(): void;
export function hasRole(role: 'admin' | 'super_admin'): boolean;
```

### Audit System (`lib/audit/`)
Comprehensive audit logging system with dual-layer tracking.

**Key Functions:**
```typescript
export async function logAccessEvent(requestData: AccessLogData): Promise<void>;
export async function logBusinessEvent(eventData: BusinessEventData): Promise<void>;
export function generateEventId(): string;
export function sanitizePII(data: any): any;
```

### Badge Generation (`lib/badgeGenerator.ts`)
Dynamic badge generation with QR codes and high-resolution output.

**Key Functions:**
```typescript
export async function generateYECBadge(
  registrationData: RegistrationData,
  profileImage?: string
): Promise<Buffer>;
```

### Email Service (`lib/emailService.ts`)
Email delivery service using Resend with comprehensive tracking.

**Key Functions:**
```typescript
export async function sendBadgeEmail(
  email: string,
  registrationData: RegistrationData,
  badgeUrl: string
): Promise<boolean>;
```

### File Upload (`lib/uploadFileToSupabase.ts`)
File upload utilities for Supabase Storage with comprehensive security validation.

**Key Functions:**
```typescript
export async function uploadFileToSupabase(
  file: File | Buffer,
  bucket: string,
  path: string
): Promise<string>;
```

### File Security (`lib/filenameUtils.ts`)
Comprehensive file security utilities with validation and sanitization.

**Key Functions:**
```typescript
export function sanitizeFilename(filename: string): string;
export function validateFilename(filename: string): ValidationResult;
export function ensureFileExtension(filename: string, extension: string): string;
```

### Timezone Utilities (`lib/timezoneUtils.ts`)
Thailand timezone handling utilities with comprehensive support.

**Key Functions:**
```typescript
export function getThailandTimeISOString(): string;
export function convertToThailandTime(date: Date): string;
export function formatThailandDateTime(date: Date): string;
```

## 📊 Type Definitions

### Database Types (`types/database.ts`)
Complete TypeScript definitions for database schema with audit system.

**Key Interfaces:**
```typescript
export interface Registration {
  id: number;
  registration_id: string;
  title: string;
  first_name: string;
  last_name: string;
  nickname: string;
  phone: string;
  line_id: string;
  email: string;
  company_name: string;
  business_type: string;
  business_type_other: string | null;
  yec_province: string;
  hotel_choice: 'in-quota' | 'out-of-quota';
  room_type: 'single' | 'double' | 'suite' | 'no-accommodation' | null;
  roommate_info: string | null;
  roommate_phone: string | null;
  external_hotel_name: string | null;
  travel_type: 'private-car' | 'van';
  profile_image_url: string | null;
  chamber_card_url: string | null;
  payment_slip_url: string | null;
  badge_url: string | null;
  email_sent: boolean;
  email_sent_at: string | null;
  status: string;
  ip_address: string | null;
  user_agent: string | null;
  form_data: any;
  created_at: string;
  updated_at: string;
}

export interface AdminUser {
  id: string;
  email: string;
  role: 'admin' | 'super_admin';
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditAccessLog {
  id: number;
  request_id: string;
  user_id: string | null;
  email: string | null;
  action: string;
  resource: string | null;
  method: string;
  path: string;
  status_code: number;
  request_data: any;
  response_data: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AuditEventLog {
  id: number;
  event_id: string;
  event_type: string;
  user_id: string | null;
  email: string | null;
  action: string;
  resource: string | null;
  resource_id: string | null;
  event_data: any;
  metadata: any;
  created_at: string;
}
```

### Form Types (`types/index.ts`)
Shared type definitions for forms and components with comprehensive validation.

**Key Interfaces:**
```typescript
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'select' | 'file' | 'textarea';
  required: boolean;
  validation?: ValidationRule[];
  options?: string[];
  conditional?: ConditionalLogic;
}

export interface ValidationRule {
  type: 'required' | 'email' | 'phone' | 'minLength' | 'maxLength' | 'pattern';
  value?: any;
  message: string;
}

export interface AuditData {
  accessLogs: AuditAccessLog[];
  eventLogs: AuditEventLog[];
}
```

## 🔌 API Routes

### Registration API (`api/register/route.ts`)
Main registration endpoint with comprehensive processing and audit logging.

**Key Features:**
- Form validation with comprehensive security checks
- File upload processing with security validation
- Badge generation with QR codes and high resolution
- Email delivery with inline badge images
- Database storage with audit logging
- Error handling with user feedback

### Admin APIs (`api/admin/`)
Administrative endpoints for data management with role-based access control.

**Key Endpoints:**
- `GET /api/admin/registrations` - List registrations with filtering and audit logging
- `POST /api/admin/registrations/[id]/approve` - Approve registration with audit trail
- `POST /api/admin/registrations/[id]/reject` - Reject registration with audit trail
- `POST /api/admin/registrations/[id]/request-update` - Request update with audit trail
- `GET /api/admin/export-csv` - Export data to CSV with filtering
- `POST /api/admin/seed-users` - Seed admin users with role assignment

### Authentication APIs (`api/auth/`)
Authentication endpoints with Supabase Auth integration.

**Key Endpoints:**
- `POST /api/auth/login` - Admin login with role validation
- `POST /api/auth/logout` - Secure logout with session cleanup
- `GET /api/auth/callback` - OAuth callback handling
- `POST /api/auth/set-session` - Session management

### Development APIs (`api/dev/`)
Development and testing endpoints with comprehensive functionality.

**Key Endpoints:**
- `POST /api/dev/login` - Development login for testing
- `POST /api/dev/logout` - Development logout
- `GET /api/test-email` - Email service testing
- `GET /api/test-badge` - Badge generation testing

### Diagnostic APIs (`api/diag/`)
Diagnostic endpoints for system monitoring and troubleshooting.

**Key Endpoints:**
- `GET /api/diag/audit-e2e` - E2E audit testing
- `GET /api/diag/audit-rpc` - RPC audit testing
- `GET /api/diag/audit-schema-test` - Audit schema testing
- `GET /api/diag/audit-smoke` - Smoke testing for audit system

## 🎨 Styling and Design

### Tailwind CSS Configuration (`tailwind.config.ts`)
Custom Tailwind configuration with YEC branding and comprehensive design system.

**Key Features:**
- Custom color palette with YEC branding
- Typography configuration with Thai font support
- Animation utilities with smooth transitions
- Responsive breakpoints with mobile-first design
- Custom components with design system integration

### Global Styles (`globals.css`)
Global CSS with custom utilities, animations, and comprehensive styling.

**Key Features:**
- Custom CSS variables with theme support
- Animation keyframes with smooth transitions
- Utility classes with comprehensive coverage
- Font loading with Thai font support
- Responsive design with mobile optimization

### Component Styling
Components use Tailwind CSS with custom design system and comprehensive styling.

**Design Principles:**
- Mobile-first responsive design with comprehensive breakpoints
- Consistent spacing and typography with design system
- Smooth animations and transitions with performance optimization
- Accessibility compliance with WCAG 2.1 AA standards
- Dark/light theme support with seamless switching

## 🔒 Security Implementation

### Middleware (`middleware.ts`)
Route protection and authentication middleware with comprehensive security.

**Key Features:**
- Admin route protection with role validation
- Authentication verification with JWT tokens
- Role-based access control with granular permissions
- Development mode handling with security bypass
- Audit logging for all protected routes

### Admin Guard (`lib/admin-guard.ts`)
Admin authentication and authorization utilities with comprehensive security.

**Key Functions:**
```typescript
export function isAdmin(email: string): boolean;
export function getDevEmailFromCookies(request: NextRequest): string | null;
export function hasRole(user: User, role: 'admin' | 'super_admin'): boolean;
```

### File Security (`lib/filenameUtils.ts`)
Comprehensive file security utilities with validation and sanitization.

**Key Functions:**
```typescript
export function sanitizeFilename(filename: string): string;
export function validateFilename(filename: string): ValidationResult;
export function ensureFileExtension(filename: string, extension: string): string;
```

## 🧪 Testing

### Test Structure (`tests/`)
Comprehensive test suite for API endpoints, components, and security features.

**Test Categories:**
- API endpoint testing with comprehensive coverage
- Form validation testing with security checks
- File upload testing with security validation
- Authentication testing with role validation
- Audit system testing with comprehensive coverage

### Test Files
- `tests/api/register.spec.ts` - Registration API tests with security validation
- `tests/api/admin.approval-flow.spec.ts` - Admin approval tests with audit logging
- `tests/api/register.duplicates-by-name.spec.ts` - Duplicate handling tests
- `tests/e2e/audit.spec.ts` - E2E audit system tests
- `tests/security/filenameUtils.test.ts` - File security utility tests

## 🚀 Deployment Configuration

### Docker Configuration
- `Dockerfile` - Production container configuration with optimization
- `Dockerfile.dev` - Development container configuration with hot reload
- `docker-compose.dev.yml` - Development environment setup with services

### Environment Configuration
- Environment variables for Supabase, Resend, and application settings
- Development and production configurations with security
- Security key management with rotation policies
- CI/CD configuration with quality gates

### Pre-CI/CD Script (`pre-cicd-check.sh`)
Automated pre-deployment validation script with comprehensive checks.

**Key Features:**
- Quality gates with linting and TypeScript checks
- Security tests with file utility validation
- Test execution with comprehensive coverage
- Error classification with decision framework
- Deployment readiness validation

## 📝 Code Standards

### TypeScript
- Strict type checking enabled with comprehensive coverage
- Comprehensive type definitions with interface-first design
- Type safety throughout the application with compile-time validation
- Advanced TypeScript features with proper configuration

### React Patterns
- Functional components with hooks and modern patterns
- Custom hooks for reusable logic with comprehensive functionality
- Context for state management with performance optimization
- Component composition with proper separation of concerns

### Code Organization
- Feature-based file organization with clear structure
- Clear separation of concerns with proper abstraction
- Consistent naming conventions with comprehensive coverage
- Comprehensive documentation with inline comments

## 🔗 Related Documentation

- **[Project Overview](architecture/project-overview.md)** - System architecture
- **[Admin User Management Guide](ADMIN_USER_MANAGEMENT_GUIDE.md)** - Admin user management
- **[API Documentation](API_DOCUMENTATION.md)** - API endpoints and usage
- **[Database Design](database/database-design.md)** - Database schema
- **[Design System](ux-ui/design-system.md)** - UI/UX guidelines
- **[Security & Access Control](security/security-access.md)** - Security implementation

## 🆕 Recent Updates

- **2025-01-27**: ✅ **COMPREHENSIVE UPDATES** - All documentation updated and current
- **2025-01-27**: ✅ **AUDIT SYSTEM** - Dual-layer audit logging implemented
- **2025-01-27**: ✅ **ADMIN USER MANAGEMENT** - Role-based access control implemented
- **2025-01-27**: ✅ **SECURITY ENHANCEMENTS** - File utility security and comprehensive validation
- **2025-01-27**: ✅ **CI/CD PIPELINE** - Fully operational with quality gates
- **2025-01-27**: ✅ **PRODUCTION READY** - All features complete and tested

---

*Last updated: 2025-01-27*
*Code version: 2.0.0*

**Related Links:**
- [Project Overview](architecture/project-overview.md)
- [Admin User Management Guide](ADMIN_USER_MANAGEMENT_GUIDE.md)
- [API Documentation](API_DOCUMENTATION.md)
- [Database Design](database/database-design.md)
- [Design System](ux-ui/design-system.md)
- [Security & Access Control](security/security-access.md) 