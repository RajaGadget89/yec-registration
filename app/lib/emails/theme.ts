/**
 * Email Theme Configuration
 * Reads brand tokens from CSS variables and provides consistent styling
 */

export const emailTheme = {
  // Brand Colors (from globals.css)
  colors: {
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
    },
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
  },
  
  // Typography
  fonts: {
    sans: 'Arial, Helvetica, sans-serif',
    thai: 'Sarabun, Arial, sans-serif',
  },
  
  // Spacing
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
  },
  
  // Border radius
  borderRadius: {
    sm: '4px',
    md: '8px',
    lg: '12px',
  },
  
  // Container width
  containerWidth: '600px',
  
  // Email-specific styles
  email: {
    backgroundColor: '#f9fafb',
    padding: '20px',
  },
  
  // Button styles
  button: {
    primary: {
      backgroundColor: '#1A237E',
      color: '#ffffff',
      padding: '12px 24px',
      borderRadius: '8px',
      textDecoration: 'none',
      display: 'inline-block',
      fontWeight: '600',
    },
    secondary: {
      backgroundColor: '#4285C5',
      color: '#ffffff',
      padding: '12px 24px',
      borderRadius: '8px',
      textDecoration: 'none',
      display: 'inline-block',
      fontWeight: '600',
    },
  },
  
  // Card styles
  card: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  },
  
  // Header styles
  header: {
    backgroundColor: '#1A237E',
    color: '#ffffff',
    padding: '24px',
    textAlign: 'center' as const,
  },
  
  // Footer styles
  footer: {
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
    padding: '16px 24px',
    fontSize: '14px',
    textAlign: 'center' as const,
  },
};

export type EmailTheme = typeof emailTheme;

