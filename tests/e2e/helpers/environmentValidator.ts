/**
 * Environment Validator
 * 
 * Comprehensive environment validation tool for magic link authentication.
 * Validates all required environment variables and configurations.
 */

export class EnvironmentValidator {
  /**
   * Validate environment configuration
   */
  async validateEnvironment() {
    console.log('[EnvironmentValidator] 🔍 Validating environment configuration');
    
    const validation = {
      valid: true,
      errors: [] as string[],
      warnings: [] as string[],
      config: {
        nodeEnv: process.env.NODE_ENV,
        appUrl: process.env.NEXT_PUBLIC_APP_URL,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        adminEmails: process.env.ADMIN_EMAILS,
        emailMode: process.env.EMAIL_MODE,
        cronSecret: process.env.CRON_SECRET,
        vercelUrl: process.env.VERCEL_URL,
        vercelEnv: process.env.VERCEL_ENV
      }
    };

    // Check required environment variables
    const required = [
      'NEXT_PUBLIC_APP_URL',
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY'
    ];

    for (const envVar of required) {
      if (!process.env[envVar]) {
        validation.valid = false;
        validation.errors.push(`Missing required environment variable: ${envVar}`);
      }
    }

    // Validate URL formats
    if (process.env.NEXT_PUBLIC_APP_URL) {
      try {
        const appUrl = new URL(process.env.NEXT_PUBLIC_APP_URL);
        if (appUrl.protocol !== 'http:' && appUrl.protocol !== 'https:') {
          validation.valid = false;
          validation.errors.push('Invalid NEXT_PUBLIC_APP_URL protocol');
        }
      } catch {
        validation.valid = false;
        validation.errors.push('Invalid NEXT_PUBLIC_APP_URL format');
      }
    }

    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      try {
        const supabaseUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
        if (!supabaseUrl.hostname.includes('supabase.co')) {
          validation.valid = false;
          validation.errors.push('Invalid Supabase URL format - must be *.supabase.co');
        }
      } catch {
        validation.valid = false;
        validation.errors.push('Invalid NEXT_PUBLIC_SUPABASE_URL format');
      }
    }

    // Check for common configuration issues
    if (process.env.NEXT_PUBLIC_APP_URL?.includes('localhost') && process.env.NODE_ENV === 'production') {
      validation.warnings.push('Using localhost URL in production environment');
    }

    if (!process.env.ADMIN_EMAILS) {
      validation.warnings.push('ADMIN_EMAILS not configured - admin access may be restricted');
    }

    if (!process.env.CRON_SECRET) {
      validation.warnings.push('CRON_SECRET not configured - cron jobs may not work');
    }

    // Check Supabase key formats
    if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.startsWith('eyJ')) {
        validation.warnings.push('NEXT_PUBLIC_SUPABASE_ANON_KEY format may be invalid (should start with eyJ)');
      }
    }

    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      if (!process.env.SUPABASE_SERVICE_ROLE_KEY.startsWith('eyJ')) {
        validation.warnings.push('SUPABASE_SERVICE_ROLE_KEY format may be invalid (should start with eyJ)');
      }
    }

    // Check email configuration
    if (process.env.EMAIL_MODE) {
      const validModes = ['DRY_RUN', 'FULL', 'CAPPED'];
      if (!validModes.includes(process.env.EMAIL_MODE)) {
        validation.warnings.push(`EMAIL_MODE should be one of: ${validModes.join(', ')}`);
      }
    }

    // Check Vercel environment
    if (process.env.VERCEL_ENV) {
      const validEnvs = ['production', 'preview', 'development'];
      if (!validEnvs.includes(process.env.VERCEL_ENV)) {
        validation.warnings.push(`VERCEL_ENV should be one of: ${validEnvs.join(', ')}`);
      }
    }

    console.log('[EnvironmentValidator] Environment validation result:', validation);
    return validation;
  }

  /**
   * Validate Supabase project configuration
   */
  async validateSupabaseConfig() {
    console.log('[EnvironmentValidator] 🔧 Validating Supabase configuration');
    
    const validation = {
      valid: true,
      errors: [] as string[],
      warnings: [] as string[],
      config: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY
      }
    };

    // Check if Supabase URL is accessible
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
          headers: {
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`
          }
        });

        if (response.status === 401) {
          // This is expected for anonymous access
          validation.valid = true;
        } else if (response.status >= 400) {
          validation.valid = false;
          validation.errors.push(`Supabase URL not accessible: ${response.status}`);
        }
      } catch (error) {
        validation.warnings.push(`Could not verify Supabase URL accessibility: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    console.log('[EnvironmentValidator] Supabase validation result:', validation);
    return validation;
  }

  /**
   * Validate admin email configuration
   */
  async validateAdminEmails() {
    console.log('[EnvironmentValidator] 👥 Validating admin email configuration');
    
    const validation = {
      valid: true,
      errors: [] as string[],
      warnings: [] as string[],
      emails: [] as string[]
    };

    if (!process.env.ADMIN_EMAILS) {
      validation.valid = false;
      validation.errors.push('ADMIN_EMAILS environment variable is not set');
      return validation;
    }

    const emails = process.env.ADMIN_EMAILS.split(',').map(email => email.trim()).filter(Boolean);
    validation.emails = emails;

    if (emails.length === 0) {
      validation.valid = false;
      validation.errors.push('No admin emails found in ADMIN_EMAILS');
      return validation;
    }

    // Validate email formats
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    for (const email of emails) {
      if (!emailRegex.test(email)) {
        validation.valid = false;
        validation.errors.push(`Invalid email format: ${email}`);
      }
    }

    // Check for test email
    const testEmail = 'raja.gadgets89@gmail.com';
    if (!emails.includes(testEmail)) {
      validation.warnings.push(`Test email ${testEmail} not found in admin allowlist`);
    }

    console.log('[EnvironmentValidator] Admin email validation result:', validation);
    return validation;
  }

  /**
   * Validate redirect URL configuration
   */
  async validateRedirectUrls() {
    console.log('[EnvironmentValidator] 🔗 Validating redirect URL configuration');
    
    const validation = {
      valid: true,
      errors: [] as string[],
      warnings: [] as string[],
      urls: {
        appUrl: process.env.NEXT_PUBLIC_APP_URL,
        expectedCallback: null as string | null,
        expectedRedirect: null as string | null
      }
    };

    if (process.env.NEXT_PUBLIC_APP_URL) {
      try {
        const appUrl = new URL(process.env.NEXT_PUBLIC_APP_URL);
        validation.urls.expectedCallback = `${appUrl.origin}/auth/callback`;
        validation.urls.expectedRedirect = `${appUrl.origin}/admin`;
        
        // Check for common issues
        if (appUrl.hostname.includes('localhost') && process.env.NODE_ENV === 'production') {
          validation.errors.push('Using localhost in production environment');
        }

        if (appUrl.protocol !== 'https:' && appUrl.hostname !== 'localhost') {
          validation.warnings.push('Using non-HTTPS protocol in non-localhost environment');
        }

        if (appUrl.hostname.includes('%2A') || appUrl.hostname.includes('*')) {
          validation.errors.push('URL contains wildcard characters');
        }

      } catch (error) {
        validation.valid = false;
        validation.errors.push(`Invalid app URL format: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    console.log('[EnvironmentValidator] Redirect URL validation result:', validation);
    return validation;
  }

  /**
   * Comprehensive environment validation
   */
  async validateAll() {
    console.log('[EnvironmentValidator] 🔍 Performing comprehensive environment validation');
    
    const results = {
      valid: true,
      errors: [] as string[],
      warnings: [] as string[],
      validations: {
        environment: await this.validateEnvironment(),
        supabase: await this.validateSupabaseConfig(),
        adminEmails: await this.validateAdminEmails(),
        redirectUrls: await this.validateRedirectUrls()
      }
    };

    // Aggregate results
    for (const [key, validation] of Object.entries(results.validations)) {
      if (!validation.valid) {
        results.valid = false;
        results.errors.push(...validation.errors.map(error => `[${key}] ${error}`));
      }
      results.warnings.push(...validation.warnings.map(warning => `[${key}] ${warning}`));
    }

    console.log('[EnvironmentValidator] Comprehensive validation result:', {
      valid: results.valid,
      errorCount: results.errors.length,
      warningCount: results.warnings.length
    });

    return results;
  }
}
