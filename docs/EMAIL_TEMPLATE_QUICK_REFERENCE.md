# Email Template Quick Reference
*Version: 1.0*  
*Created: 2025-01-27*

## 🚀 Quick Start

### File Structure
```
app/lib/emails/
├── BaseLayout.tsx          # Header/Footer wrapper
├── templates/              # Individual templates
├── theme.ts               # Colors, fonts, spacing
└── render.tsx             # Template registry
```

### Template Types
- `tracking` - Registration confirmation
- `update-payment` - Payment update request  
- `update-info` - Profile update request
- `update-tcc` - TCC card update request
- `approval-badge` - Registration approval
- `rejection` - Registration rejection

## 🎨 Layout Rules

### ✅ DO (Email Client Compatible)
```tsx
// Table-based layout
<table style={{ width: '100%', borderCollapse: 'collapse' }}>
  <tr>
    <td style={{ padding: '20px' }}>Content</td>
  </tr>
</table>

// Inline styles only
<div style={{ 
  backgroundColor: '#ffffff',
  padding: '20px',
  fontSize: '14px',
  fontFamily: 'Arial, sans-serif'
}}>
```

### ❌ DON'T (Not Email Client Compatible)
```tsx
// CSS Grid
<div style={{ display: 'grid' }}>

// Flexbox gaps
<div style={{ display: 'flex', gap: '20px' }}>

// External CSS classes
<div className="email-header">
```

## 🎯 Header Spacing (CRITICAL)

**Use table-based layout for header:**
```tsx
<table style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
  <tr>
    <td style={{ paddingRight: '48px' }}>Logo</td>
    <td style={{ paddingLeft: '48px' }}>Text</td>
  </tr>
</table>
```

**Spacing Guidelines:**
- Logo-Text Gap: `48px` total (24px each side)
- Header Padding: `20px 24px`
- Content Padding: `24px`
- Section Margins: `20px`

## 🎨 Theme Colors

```tsx
primary: '#1A237E'     // YEC Primary
accent: '#4285C5'      // YEC Accent  
highlight: '#4CD1E0'   // YEC Highlight
background: '#ffffff'
gray: { 50: '#f9fafb', 500: '#6b7280', 700: '#374151' }
```

## 🔧 Development Commands

### Preview Template
```bash
curl "http://localhost:8080/api/dev/preview-email?template=tracking"
```

### Send Test Email
```bash
curl -X POST \
  -H "Authorization: Bearer local-secret" \
  -H "X-Test-Helpers-Enabled: 1" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","trackingCode":"TEST-123"}' \
  http://localhost:8080/api/test/send-tracking-email
```

### Run Tests
```bash
npm run test:e2e:email-header-spacing
```

## 🐛 Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Layout broken | Unsupported CSS | Use table layouts |
| Images not loading | Blocked by email client | Use absolute URLs |
| Fonts not rendering | Limited font support | Use Arial, Helvetica |
| Spacing inconsistent | CSS interpretation | Use explicit padding |

## 📋 Testing Checklist

- [ ] Gmail (Web & Mobile)
- [ ] Outlook (Web & Desktop)  
- [ ] Apple Mail
- [ ] Thunderbird
- [ ] Mobile email clients
- [ ] Dark mode compatibility

## 📞 Quick Help

1. **Layout Issues**: Check `BaseLayout.tsx` for header structure
2. **Styling Issues**: Use `theme.ts` colors and spacing
3. **Testing Issues**: Use preview endpoint and test commands
4. **Email Client Issues**: Use table-based layouts only

---

*For detailed documentation, see `docs/EMAIL_TEMPLATE_SYSTEM.md`*

