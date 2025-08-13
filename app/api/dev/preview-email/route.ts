import { NextRequest, NextResponse } from 'next/server';
import { 
  renderEmailTemplate, 
  getAvailableTemplates, 
  isValidTemplate,
  EmailTemplateProps 
} from '../../../lib/emails/registry';

// Dev guard function
function isDevAllowed(): boolean {
  // Check if in development mode
  if (process.env.NODE_ENV !== 'production') {
    return true;
  }
  
  // Check admin emails allowlist
  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(email => email.trim().toLowerCase()) || [];
  const requestEmail = 'dev@example.com'; // In real implementation, get from auth
  
  return adminEmails.includes(requestEmail.toLowerCase());
}

export async function GET(request: NextRequest) {
  // Dev guard
  if (!isDevAllowed()) {
    return new NextResponse(
      JSON.stringify({ error: 'Access denied' }), 
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { searchParams } = new URL(request.url);
  const template = searchParams.get('template');
  
  if (!template) {
    return new NextResponse(
      JSON.stringify({ 
        error: 'Template parameter is required',
        availableTemplates: getAvailableTemplates()
      }), 
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  if (!isValidTemplate(template)) {
    return new NextResponse(
      JSON.stringify({ 
        error: `Template '${template}' not found`,
        availableTemplates: getAvailableTemplates()
      }), 
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Sample props for preview
  const sampleProps: EmailTemplateProps = {
    applicantName: 'สมชาย ใจดี',
    trackingCode: 'YEC2025-001234',
    ctaUrl: 'https://example.com/update',
    deadlineLocal: '2025-02-15 23:59',
    priceApplied: '2,500',
    packageName: 'Early Bird Package',
    rejectedReason: 'deadline_missed',
    badgeUrl: 'https://example.com/badge.png',
    supportEmail: 'info@yecday.com'
  };

  try {
    const html = renderEmailTemplate(template, sampleProps);
    
    return new NextResponse(html, {
      status: 200,
      headers: { 
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-cache'
      }
    });
  } catch (error) {
    console.error('Email preview error:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: 'Failed to render email template',
        details: error instanceof Error ? error.message : 'Unknown error'
      }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

