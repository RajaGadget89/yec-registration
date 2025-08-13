import { NextRequest, NextResponse } from 'next/server';
import { 
  renderEmailTemplate, 
  getEmailSubject, 
  getAvailableTemplates, 
  isValidTemplate,
  EmailTemplateProps 
} from '../../../lib/emails/registry';
import { sendEmail } from '../../../lib/emails/provider';

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

export async function POST(request: NextRequest) {
  // Dev guard
  if (!isDevAllowed()) {
    return new NextResponse(
      JSON.stringify({ error: 'Access denied' }), 
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await request.json();
    const { template, to, props } = body;
    
    if (!template) {
      return new NextResponse(
        JSON.stringify({ 
          error: 'Template parameter is required',
          availableTemplates: getAvailableTemplates()
        }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    if (!to) {
      return new NextResponse(
        JSON.stringify({ error: 'To email address is required' }), 
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

    // Merge with sample props
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

    const emailProps = { ...sampleProps, ...props };
    const subject = getEmailSubject(template);
    const html = renderEmailTemplate(template, emailProps);
    
    // Send the email
    const success = await sendEmail({
      to,
      subject,
      html
    });
    
    if (success) {
      return new NextResponse(
        JSON.stringify({ 
          success: true,
          message: `Test email sent successfully to ${to}`,
          template,
          subject
        }), 
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      return new NextResponse(
        JSON.stringify({ 
          success: false,
          error: 'Failed to send email'
        }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Email test error:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: 'Failed to send test email',
        details: error instanceof Error ? error.message : 'Unknown error'
      }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
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
  const to = searchParams.get('to');
  
  if (!template || !to) {
    return new NextResponse(
      JSON.stringify({ 
        error: 'Template and to parameters are required',
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

  try {
    // Sample props for test
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

    const subject = getEmailSubject(template);
    const html = renderEmailTemplate(template, sampleProps);
    
    // Send the email
    const success = await sendEmail({
      to,
      subject,
      html
    });
    
    if (success) {
      return new NextResponse(
        JSON.stringify({ 
          success: true,
          message: `Test email sent successfully to ${to}`,
          template,
          subject
        }), 
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      return new NextResponse(
        JSON.stringify({ 
          success: false,
          error: 'Failed to send email'
        }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Email test error:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: 'Failed to send test email',
        details: error instanceof Error ? error.message : 'Unknown error'
      }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

