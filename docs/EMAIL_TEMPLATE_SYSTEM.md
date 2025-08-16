# Email Template System Documentation
*Version: 1.0*  
*Created: 2025-01-27*  
*Last Updated: 2025-01-27T18:00:00Z*

## 📧 Overview

The YEC Registration System uses a comprehensive email template system built with React Email components. This system handles all email communications including registration confirmations, update requests, approvals, and rejections.

## 🏗️ Architecture

### Core Components

```
app/lib/emails/
├── components/
│   └── BaseLayout.tsx          # Main email layout wrapper
├── templates/
│   ├── tracking.tsx            # Registration confirmation
│   ├── update-payment.tsx      # Payment update request
│   ├── update-info.tsx         # Profile update request
│   ├── update-tcc.tsx          # TCC card update request
│   ├── approval-badge.tsx      # Registration approval
│   └── rejection.tsx           # Registration rejection
├── theme.ts                    # Email styling configuration
├── registry.ts                 # Template registration
├── render.tsx                  # HTML rendering engine
└── enhancedEmailService.ts     # Email sending service
```

### Template Flow

1. **Event Trigger** → Email Service → Template Selection → HTML Rendering → Email Delivery
2. **Template Registry** maps logical names to React components
3. **BaseLayout** provides consistent header/footer structure
4. **Theme System** ensures consistent styling across all templates

## 🎨 Layout Guidelines

### Email Client Compatibility

**⚠️ CRITICAL**: Email clients have limited CSS support. Always use:

#### ✅ **Recommended (Email Client Compatible)**
```tsx
// Table-based layouts
<table style={{ width: '100%', borderCollapse: 'collapse' }}>
  <tr>
    <td style={{ padding: '20px' }}>Content</td>
  </tr>
</table>

// Inline styles (no external CSS)
<div style={{ 
  backgroundColor: '#ffffff',
  padding: '20px',
  fontSize: '14px',
  fontFamily: 'Arial, sans-serif'
}}>

// Simple flexbox (limited support)
<div style={{ display: 'flex', alignItems: 'center' }}>
```

#### ❌ **Avoid (Not Email Client Compatible)**
```tsx
// CSS Grid
<div style={{ display: 'grid' }}>

// Complex flexbox with gaps
<div style={{ display: 'flex', gap: '20px' }}>

// External CSS classes
<div className="email-header">

// CSS animations/transitions
<div style={{ transition: 'all 0.3s' }}>
```

### Header Layout Structure

The email header uses a **table-based layout** for maximum compatibility:

```tsx
<table style={{
  width: '100%',
  maxWidth: '800px',
  margin: '0 auto',
  borderCollapse: 'collapse'
}}>
  <tr>
    {/* Logo Cell */}
    <td style={{
      width: '120px',
      verticalAlign: 'middle',
      textAlign: 'left',
      paddingRight: '48px'  // Spacing between logo and text
    }}>
      <img src="logo.png" alt="Logo" style={{ width: '120px' }} />
    </td>
    
    {/* Text Cell */}
    <td style={{
      verticalAlign: 'middle',
      textAlign: 'left',
      paddingLeft: '48px'   // Spacing between logo and text
    }}>
      <div style={{ fontSize: '24px', fontWeight: 'bold' }}>YEC Day</div>
      <div style={{ fontSize: '14px' }}>Young Entrepreneurs Chamber</div>
    </td>
  </tr>
</table>
```

### Spacing Guidelines

- **Header Padding**: `20px 24px`
- **Logo-Text Gap**: `48px` (24px padding on each side)
- **Content Padding**: `24px`
- **Section Margins**: `20px` between major sections
- **Text Line Height**: `1.4` for readability

## 🎯 Template Types

### 1. Tracking Template (`tracking.tsx`)
**Purpose**: Registration confirmation with tracking code
**Trigger**: `registration.submitted` event
**Key Elements**:
- Welcome message
- Tracking code display
- Next steps information

### 2. Update Payment Template (`update-payment.tsx`)
**Purpose**: Request payment slip update
**Trigger**: `admin.request_update` with `dimension: 'payment'`
**Key Elements**:
- Update request message
- Payment details
- Deep-link CTA button

### 3. Update Info Template (`update-info.tsx`)
**Purpose**: Request profile information update
**Trigger**: `admin.request_update` with `dimension: 'profile'`
**Key Elements**:
- Update request message
- Deep-link CTA button

### 4. Update TCC Template (`update-tcc.tsx`)
**Purpose**: Request TCC card update
**Trigger**: `admin.request_update` with `dimension: 'tcc'`
**Key Elements**:
- Update request message
- Deep-link CTA button

### 5. Approval Badge Template (`approval-badge.tsx`)
**Purpose**: Registration approval with badge
**Trigger**: `admin.approved` event
**Key Elements**:
- Approval message
- Badge image
- Event details

### 6. Rejection Template (`rejection.tsx`)
**Purpose**: Registration rejection notification
**Trigger**: `admin.rejected` event
**Key Elements**:
- Rejection message
- Reason explanation
- Support contact

## 🎨 Theme System

### Color Palette
```tsx
const colors = {
  primary: '#1A237E',    // YEC Primary - PANTONE 3591
  accent: '#4285C5',     // YEC Accent - PANTONE 2394
  highlight: '#4CD1E0',  // YEC Highlight - PANTONE 3105
  background: '#ffffff',
  foreground: '#171717',
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  }
};
```

### Typography
```tsx
const fonts = {
  sans: 'Arial, Helvetica, sans-serif',
  thai: 'Sarabun, Arial, sans-serif',
};
```

### Spacing Scale
```tsx
const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
};
```

## 🔧 Development Workflow

### Creating a New Template

1. **Create Template Component**:
```tsx
// app/lib/emails/templates/new-template.tsx
import React from 'react';
import { emailTheme } from '../theme';
import { EmailTemplateProps } from '../registry';

export const NewTemplate: React.FC<EmailTemplateProps> = ({
  applicantName,
  trackingCode,
  supportEmail
}) => {
  const { colors } = emailTheme;
  
  return (
    <div style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
      {/* Template content */}
    </div>
  );
};
```

2. **Register Template**:
```tsx
// app/lib/emails/render.tsx
const emailTemplates = {
  'new-template': {
    renderer: (props: EmailTemplateProps) => (
      <BaseLayout supportEmail={props.supportEmail}>
        <NewTemplate {...props} />
      </BaseLayout>
    ),
    subject: '[YEC Day] New Template Subject'
  },
  // ... other templates
};
```

3. **Add to Email Service**:
```tsx
// app/lib/emails/enhancedEmailService.ts
export async function sendNewTemplateEmail(
  registration: Registration,
  brandTokens?: EmailTemplateProps['brandTokens']
): Promise<EmailSendResult> {
  // Implementation
}
```

### Testing Templates

#### 1. Preview Template
```bash
# View template in browser
curl "http://localhost:8080/api/dev/preview-email?template=tracking"
```

#### 2. Send Test Email
```bash
# Send test email
curl -X POST \
  -H "Authorization: Bearer local-secret" \
  -H "X-Test-Helpers-Enabled: 1" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","trackingCode":"TEST-123"}' \
  http://localhost:8080/api/test/send-tracking-email
```

#### 3. Run E2E Tests
```bash
# Test email system
npm run test:e2e:email-header-spacing
```

## 🐛 Common Issues & Solutions

### Issue: Email Layout Broken in Email Clients
**Cause**: Using unsupported CSS features
**Solution**: Use table-based layouts and inline styles

### Issue: Images Not Loading
**Cause**: Email clients block external images
**Solution**: Use absolute URLs and ensure images are publicly accessible

### Issue: Fonts Not Rendering
**Cause**: Email clients have limited font support
**Solution**: Use web-safe fonts (Arial, Helvetica, sans-serif)

### Issue: Spacing Inconsistent
**Cause**: Email clients interpret CSS differently
**Solution**: Use table cells with explicit padding

## 📋 Maintenance Checklist

### Before Deploying Email Changes

- [ ] **Test in Multiple Email Clients**:
  - Gmail (Web & Mobile)
  - Outlook (Web & Desktop)
  - Apple Mail
  - Thunderbird

- [ ] **Validate HTML Structure**:
  - Use email validation tools
  - Check for broken links
  - Verify image accessibility

- [ ] **Test Responsive Design**:
  - Mobile email clients
  - Different screen sizes
  - Dark mode compatibility

- [ ] **Verify Content**:
  - Grammar and spelling
  - Brand consistency
  - Legal compliance (PDPA)

### Performance Optimization

- [ ] **Image Optimization**:
  - Compress images (max 200KB)
  - Use appropriate formats (PNG for logos, JPEG for photos)
  - Provide alt text for accessibility

- [ ] **Code Optimization**:
  - Remove unused CSS
  - Minimize inline styles
  - Use semantic HTML

## 🔗 Related Files

- `app/lib/emails/` - Email template system
- `app/lib/events/handlers/emailNotificationHandler.ts` - Email event handling
- `tests/e2e/email-header-spacing.spec.ts` - Email template tests
- `docs/SESSION_TRACKING_SYSTEM.md` - Session tracking documentation

## 📞 Support

For questions about email templates:
1. Check this documentation first
2. Review existing templates for examples
3. Test thoroughly in multiple email clients
4. Consult the session tracking system for recent changes

---

*This documentation should be updated whenever email templates are modified to ensure consistency and maintainability.*

