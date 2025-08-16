# YEC Registration System - Project Overview

## 📋 System Overview

The YEC (Young Entrepreneurs Chamber) Day Registration System is a comprehensive web application built with Next.js 15, TypeScript, and Supabase for managing event registrations. The system provides a modern, responsive interface for user registration, an administrative dashboard for managing registrations, and comprehensive audit logging with role-based access control.

## 🏗️ Architecture

### Technology Stack

#### Frontend
- **Framework**: Next.js 15.4.5 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **UI Components**: Custom components with modern design system
- **State Management**: React hooks and context
- **Form Handling**: Custom form validation with TypeScript schemas

#### Backend
- **Database**: Supabase (PostgreSQL) with audit logging
- **Authentication**: Supabase Auth with role-based access control (admin, super_admin)
- **File Storage**: Supabase Storage for images and documents
- **Email Service**: Resend for automated email notifications
- **API**: Next.js API routes with TypeScript
- **Audit System**: Dual-layer audit logging (access + event logs)

#### Development & Deployment
- **Containerization**: Docker with development and production configurations
- **Environment**: Node.js with TypeScript compilation
- **Linting**: ESLint with Next.js configuration
- **Testing**: Playwright (E2E), Vitest (Unit), comprehensive test suite
- **CI/CD**: GitHub Actions with quality gates and error handling framework

### System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (Next.js)     │◄──►│   (API Routes)  │◄──►│   (Supabase)    │
│                 │    │                 │    │                 │
│ • Registration  │    │ • Authentication│    │ • PostgreSQL    │
│ • Admin Dashboard│   │ • File Upload   │    │ • Storage       │
│ • Email Service │    │ • Email Service │    │ • Auth          │
│ • Audit System  │    │ • Audit Logging │    │ • Audit Logs    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🎯 Core Features

### User Registration
- **Multi-step Registration Form**: Comprehensive registration with validation
- **File Upload**: Profile images, chamber cards, and payment slips with security validation
- **Email Verification**: Automated email notifications with inline badge images
- **Badge Generation**: QR code badges for event attendees with high-resolution output
- **Responsive Design**: Mobile-first approach with desktop optimization
- **Timezone Support**: Thailand timezone (GMT+7) throughout the system

### Administrative Dashboard
- **Registration Management**: View, approve, reject, and request updates
- **Advanced Filtering**: Status, province, date range, and search filters
- **Export Functionality**: CSV export with filtered data
- **Real-time Updates**: Live status tracking and notifications
- **Access Control**: Role-based admin authentication (admin, super_admin)
- **User Management**: Comprehensive admin user management with 4 different methods

### Audit System
- **Dual-layer Logging**: Access logs and event logs for comprehensive tracking
- **Real-time Monitoring**: Live audit log viewing with filtering and search
- **Export Capabilities**: CSV export for audit logs
- **Security Compliance**: PDPA-compliant audit trail
- **Performance Optimization**: Efficient querying and indexing

### Technical Features
- **Type Safety**: Full TypeScript implementation
- **Form Validation**: Client and server-side validation with comprehensive error handling
- **Error Handling**: Comprehensive error management with CI/CD error classification framework
- **Performance**: Optimized loading and caching with file utility security
- **Security**: Authentication, authorization, data protection, and file security validation
- **CI/CD Pipeline**: Fully operational with quality gates and pre-deployment checks

## 📁 Project Structure

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
│   │   ├── animations/           # Animation components
│   │   └── ...                   # Other UI components
│   ├── contexts/                 # React contexts
│   ├── hooks/                    # Custom React hooks
│   ├── lib/                      # Utility libraries
│   │   ├── admin-guard.ts        # Admin authentication
│   │   ├── audit/                # Audit system utilities
│   │   ├── auth-client.ts        # Client-side auth
│   │   ├── auth-utils.server.ts  # Server-side auth
│   │   ├── badgeGenerator.ts     # Badge generation
│   │   ├── emailService.ts       # Email service
│   │   ├── filenameUtils.ts      # File security utilities
│   │   └── ...                   # Other utilities
│   ├── types/                    # TypeScript type definitions
│   └── utils/                    # Utility functions
├── docs/                         # Comprehensive documentation
│   ├── ADMIN_USER_MANAGEMENT_GUIDE.md  # NEW: Complete admin user guide
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

## 🔄 Data Flow

### Registration Process
1. **User Input**: User fills out registration form with real-time validation
2. **File Upload**: Secure file upload with type and size validation
3. **Preview**: Form review with PDPA consent
4. **Submission**: Server-side validation and processing
5. **Badge Generation**: Dynamic badge creation with QR codes
6. **Email Delivery**: Automated email with inline badge images
7. **Audit Logging**: Comprehensive audit trail creation
8. **Success Confirmation**: User receives confirmation with badge download

### Admin Workflow
1. **Authentication**: Admin login with role-based access control
2. **Dashboard Access**: View filtered registration data with real-time updates
3. **Action Processing**: Approve, reject, or request updates with audit logging
4. **Export Operations**: Generate CSV reports with filtered data
5. **User Management**: Add and manage admin users using multiple methods
6. **Audit Monitoring**: View comprehensive audit logs and system activity

### Audit System Flow
1. **Event Capture**: All user actions and system events captured
2. **Dual Logging**: Access logs and event logs created simultaneously
3. **Real-time Processing**: Immediate log processing and storage
4. **Admin Interface**: Real-time audit log viewing with filtering
5. **Export Capabilities**: CSV export for audit analysis
6. **Compliance**: PDPA-compliant audit trail maintenance

## 🔒 Security Architecture

### Authentication & Authorization
- **Supabase Auth**: Secure authentication with JWT tokens
- **Role-based Access**: admin and super_admin roles with granular permissions
- **Session Management**: Secure cookie-based sessions
- **Route Protection**: Middleware-based route guards
- **API Security**: Token-based API authentication

### Data Protection
- **Input Validation**: Comprehensive form validation with security checks
- **File Security**: Type validation, size limits, and filename sanitization
- **SQL Injection Prevention**: Parameterized queries throughout
- **XSS Protection**: Content Security Policy and input sanitization
- **Audit Logging**: Complete audit trail for all operations

### Admin User Management
- **Four Methods**: Environment variables, direct API, Supabase dashboard, development testing
- **Role Management**: Granular role assignment and management
- **Security Best Practices**: Password policies, access control, user lifecycle management
- **Troubleshooting**: Comprehensive troubleshooting guide and debugging tools

## 🚀 Deployment Architecture

### Development Environment
- **Docker Compose**: Local development with hot reload
- **Environment Variables**: Local configuration management
- **Database**: Local Supabase instance with audit schema
- **Testing**: Comprehensive test suite with E2E and unit tests

### Production Environment
- **Container Deployment**: Docker-based production deployment
- **Environment Configuration**: Production environment variables
- **Database**: Production Supabase instance with full audit logging
- **CI/CD Pipeline**: GitHub Actions with quality gates and error handling
- **Monitoring**: Comprehensive monitoring and alerting

### CI/CD Pipeline
- **Quality Gates**: Linting, TypeScript, security tests, and comprehensive testing
- **Error Classification**: 3-tier error classification framework (Critical/Warning/Ignorable)
- **Pre-deployment Checks**: Automated pre-CI/CD validation script
- **Deployment Safety**: Comprehensive error handling and decision-making framework

## 📊 Performance Considerations

### Frontend Optimization
- **Code Splitting**: Automatic Next.js code splitting
- **Image Optimization**: Next.js image optimization with Supabase CDN
- **Caching**: Browser and CDN caching strategies
- **Bundle Size**: Optimized JavaScript bundles with tree shaking

### Backend Optimization
- **Database Indexing**: Optimized query performance with comprehensive indexing
- **Connection Pooling**: Efficient database connections
- **Caching**: API response caching and file caching
- **Rate Limiting**: API rate limiting for security and performance

### Audit System Performance
- **Efficient Logging**: Optimized audit log storage and retrieval
- **Indexing Strategy**: Comprehensive indexing for audit queries
- **Real-time Processing**: Immediate log processing without performance impact
- **Export Optimization**: Efficient CSV export for large datasets

## 🔗 Related Documentation

- **[Admin User Management Guide](ADMIN_USER_MANAGEMENT_GUIDE.md)** - Complete guide for adding administrators
- **[CI/CD Error Handling Guide](CI_CD_ERROR_HANDLING_GUIDE.md)** - Error classification framework
- **[Pre-CI/CD Best Practices Guide](PRE_CICD_BEST_PRACTICES_GUIDE.md)** - Deployment workflow
- **[Session Tracking System](SESSION_TRACKING_SYSTEM.md)** - Complete project history
- **[Database Design](database/database-design.md)** - Complete database schema
- **[API Documentation](API_DOCUMENTATION.md)** - API endpoints and usage
- **[Security & Access Control](security/security-access.md)** - Security implementation
- **[Design System](ux-ui/design-system.md)** - UI/UX guidelines
- **[Operational Configuration](ops/operational-config.md)** - Deployment guide
- **[System Workflow](logic/System_Workflow.md)** - Business logic flows

## 🆕 Recent Updates

- **2025-01-27**: ✅ **COMPLETE DOCUMENTATION** - All documentation updated and comprehensive
- **2025-01-27**: ✅ **ADMIN USER MANAGEMENT GUIDE** - Complete comprehensive guide created
- **2025-01-27**: ✅ **CI/CD PIPELINE** - Fully operational with error handling framework
- **2025-01-27**: ✅ **AUDIT SYSTEM** - Dual-layer audit logging with real-time monitoring
- **2025-01-27**: ✅ **SECURITY ENHANCEMENTS** - File utility security and comprehensive validation
- **2025-01-27**: ✅ **ROLE-BASED ACCESS** - Admin and super_admin roles with granular permissions
- **2025-01-27**: ✅ **PRODUCTION READY** - All critical issues resolved, ready for deployment

## 📈 Future Roadmap

- **Real-time Notifications**: WebSocket integration for live updates
- **Advanced Analytics**: Registration analytics and reporting
- **Multi-language Support**: Internationalization (i18n)
- **Mobile App**: React Native mobile application
- **API Rate Limiting**: Enhanced API security measures
- **Advanced Audit Features**: Machine learning-based anomaly detection

---

*Last updated: 2025-01-27*
*Architecture version: 2.0.0*

**Related Links:**
- [Admin User Management Guide](ADMIN_USER_MANAGEMENT_GUIDE.md)
- [CI/CD Error Handling Guide](CI_CD_ERROR_HANDLING_GUIDE.md)
- [Pre-CI/CD Best Practices Guide](PRE_CICD_BEST_PRACTICES_GUIDE.md)
- [Session Tracking System](SESSION_TRACKING_SYSTEM.md)
- [Database Design](database/database-design.md)
- [API Documentation](API_DOCUMENTATION.md)
- [Security & Access Control](security/security-access.md)
- [Design System](ux-ui/design-system.md)
- [System Workflow](logic/System_Workflow.md) 