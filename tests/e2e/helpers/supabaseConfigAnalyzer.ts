/**
 * Supabase Configuration Analyzer
 * 
 * Analyzes Supabase project configuration for magic link authentication issues.
 * Validates redirect URLs, site URLs, and authentication settings.
 */

export class SupabaseConfigAnalyzer {
  /**
   * Analyze Supabase configuration
   */
  async analyzeConfiguration() {
    console.log('[SupabaseAnalyzer] 🔧 Analyzing Supabase configuration');
    
    const analysis = {
      valid: true,
      issues: [] as string[],
      warnings: [] as string[],
      config: {
        url: process.env.NEXT_PUBLIC_SUPABASE_URL,
        anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY
      },
      redirectUrls: [] as string[],
      siteUrl: null as string | null
    };

    // Basic validation
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      analysis.valid = false;
      analysis.issues.push('NEXT_PUBLIC_SUPABASE_URL is not configured');
      return analysis;
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      analysis.valid = false;
      analysis.issues.push('SUPABASE_SERVICE_ROLE_KEY is not configured');
      return analysis;
    }

    // Analyze URL structure
    try {
      const supabaseUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL);
      
      if (!supabaseUrl.hostname.includes('supabase.co')) {
        analysis.valid = false;
        analysis.issues.push('Invalid Supabase URL format - must be *.supabase.co');
      }

      // Extract project reference
      const projectRef = supabaseUrl.hostname.split('.')[0];
      analysis.config.projectRef = projectRef;

    } catch (error) {
      analysis.valid = false;
      analysis.issues.push(`Invalid Supabase URL format: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Try to fetch project configuration (this would require Supabase API access)
    try {
      const projectConfig = await this.fetchProjectConfiguration();
      if (projectConfig) {
        analysis.redirectUrls = projectConfig.redirectUrls || [];
        analysis.siteUrl = projectConfig.siteUrl;
        
        // Analyze redirect URLs
        const redirectAnalysis = this.analyzeRedirectUrls(analysis.redirectUrls);
        analysis.issues.push(...redirectAnalysis.issues);
        analysis.warnings.push(...redirectAnalysis.warnings);
        
        // Analyze site URL
        const siteUrlAnalysis = this.analyzeSiteUrl(analysis.siteUrl);
        analysis.issues.push(...siteUrlAnalysis.issues);
        analysis.warnings.push(...siteUrlAnalysis.warnings);
      }
    } catch (error) {
      analysis.warnings.push(`Could not fetch project configuration: ${error instanceof Error ? error.message : String(error)}`);
    }

    console.log('[SupabaseAnalyzer] Configuration analysis result:', analysis);
    return analysis;
  }

  /**
   * Validate redirect URLs
   */
  async validateRedirectUrls() {
    console.log('[SupabaseAnalyzer] 🔗 Validating redirect URLs');
    
    const validation = {
      valid: true,
      issues: [] as string[],
      warnings: [] as string[],
      redirectUrls: [] as string[],
      expectedUrls: [] as string[]
    };

    // Get expected redirect URLs based on environment
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (appUrl) {
      try {
        const url = new URL(appUrl);
        validation.expectedUrls = [
          `${url.origin}/auth/callback`,
          `${url.origin}/admin`,
          `${url.origin}/auth/callback?next=/admin`
        ];
      } catch (error) {
        validation.valid = false;
        validation.issues.push(`Invalid app URL format: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Try to fetch actual redirect URLs from Supabase
    try {
      const projectConfig = await this.fetchProjectConfiguration();
      if (projectConfig && projectConfig.redirectUrls) {
        validation.redirectUrls = projectConfig.redirectUrls;
        
        // Check if expected URLs are configured
        for (const expectedUrl of validation.expectedUrls) {
          if (!validation.redirectUrls.includes(expectedUrl)) {
            validation.warnings.push(`Expected redirect URL not configured: ${expectedUrl}`);
          }
        }

        // Check for problematic URLs
        for (const redirectUrl of validation.redirectUrls) {
          if (redirectUrl.includes('%2A') || redirectUrl.includes('*.vercel.app')) {
            validation.valid = false;
            validation.issues.push(`Problematic redirect URL found: ${redirectUrl}`);
          }
        }
      }
    } catch (error) {
      validation.warnings.push(`Could not fetch redirect URLs: ${error instanceof Error ? error.message : String(error)}`);
    }

    console.log('[SupabaseAnalyzer] Redirect URL validation result:', validation);
    return validation;
  }

  /**
   * Analyze redirect URLs for issues
   */
  private analyzeRedirectUrls(redirectUrls: string[]) {
    const analysis = {
      issues: [] as string[],
      warnings: [] as string[]
    };

    for (const url of redirectUrls) {
      try {
        const parsedUrl = new URL(url);
        
        // Check for wildcard domains
        if (parsedUrl.hostname.includes('%2A') || parsedUrl.hostname.includes('*')) {
          analysis.issues.push(`Redirect URL contains wildcard domain: ${parsedUrl.hostname}`);
        }

        // Check for Vercel domains
        if (parsedUrl.hostname.includes('vercel.app') && !parsedUrl.hostname.includes('localhost')) {
          analysis.warnings.push(`Redirect URL points to Vercel domain: ${parsedUrl.hostname}`);
        }

        // Check for localhost in production
        if (parsedUrl.hostname.includes('localhost') && process.env.NODE_ENV === 'production') {
          analysis.issues.push(`Redirect URL uses localhost in production: ${url}`);
        }

        // Check for non-HTTPS
        if (parsedUrl.protocol !== 'https:' && parsedUrl.hostname !== 'localhost') {
          analysis.warnings.push(`Redirect URL uses non-HTTPS protocol: ${url}`);
        }

      } catch (error) {
        analysis.issues.push(`Invalid redirect URL format: ${url}`);
      }
    }

    return analysis;
  }

  /**
   * Analyze site URL for issues
   */
  private analyzeSiteUrl(siteUrl: string | null) {
    const analysis = {
      issues: [] as string[],
      warnings: [] as string[]
    };

    if (!siteUrl) {
      analysis.warnings.push('Site URL is not configured');
      return analysis;
    }

    try {
      const parsedUrl = new URL(siteUrl);
      
      // Check for wildcard domains
      if (parsedUrl.hostname.includes('%2A') || parsedUrl.hostname.includes('*')) {
        analysis.issues.push(`Site URL contains wildcard domain: ${parsedUrl.hostname}`);
      }

      // Check for Vercel domains
      if (parsedUrl.hostname.includes('vercel.app') && !parsedUrl.hostname.includes('localhost')) {
        analysis.warnings.push(`Site URL points to Vercel domain: ${parsedUrl.hostname}`);
      }

      // Check for localhost in production
      if (parsedUrl.hostname.includes('localhost') && process.env.NODE_ENV === 'production') {
        analysis.issues.push(`Site URL uses localhost in production: ${siteUrl}`);
      }

      // Check for non-HTTPS
      if (parsedUrl.protocol !== 'https:' && parsedUrl.hostname !== 'localhost') {
        analysis.warnings.push(`Site URL uses non-HTTPS protocol: ${siteUrl}`);
      }

    } catch (error) {
      analysis.issues.push(`Invalid site URL format: ${siteUrl}`);
    }

    return analysis;
  }

  /**
   * Fetch project configuration from Supabase
   * Note: This is a mock implementation - in reality, you'd need to use Supabase API
   */
  private async fetchProjectConfiguration() {
    console.log('[SupabaseAnalyzer] 📡 Fetching project configuration');
    
    // This is a mock implementation
    // In reality, you would need to use the Supabase Management API
    // to fetch actual project configuration
    
    try {
      // Mock response based on common Supabase configurations
      const mockConfig = {
        redirectUrls: [
          'http://localhost:8080/auth/callback',
          'https://*.vercel.app/auth/callback', // This is the problematic one
          'https://your-domain.com/auth/callback'
        ],
        siteUrl: 'https://*.vercel.app' // This is the problematic one
      };

      console.log('[SupabaseAnalyzer] Mock project configuration:', mockConfig);
      return mockConfig;
    } catch (error) {
      console.error('[SupabaseAnalyzer] Failed to fetch project configuration:', error);
      return null;
    }
  }

  /**
   * Generate recommendations for fixing configuration issues
   */
  async generateRecommendations(analysis: any) {
    console.log('[SupabaseAnalyzer] 💡 Generating recommendations');
    
    const recommendations = [] as string[];

    // Check for wildcard domain issues
    if (analysis.issues.some((issue: string) => issue.includes('wildcard') || issue.includes('%2A'))) {
      recommendations.push('Update Supabase Site URL to use actual domain instead of wildcard (*.vercel.app)');
      recommendations.push('Update Supabase Redirect URLs to use actual domain instead of wildcard');
      recommendations.push('Replace *.vercel.app with your actual domain in Supabase dashboard');
    }

    // Check for localhost in production
    if (analysis.issues.some((issue: string) => issue.includes('localhost') && issue.includes('production'))) {
      recommendations.push('Remove localhost URLs from production Supabase configuration');
      recommendations.push('Use production domain URLs in Supabase dashboard');
    }

    // Check for missing redirect URLs
    if (analysis.warnings.some((warning: string) => warning.includes('Expected redirect URL not configured'))) {
      recommendations.push('Add missing redirect URLs to Supabase dashboard');
      recommendations.push('Ensure /auth/callback and /admin URLs are configured');
    }

    // Check for HTTPS issues
    if (analysis.warnings.some((warning: string) => warning.includes('non-HTTPS'))) {
      recommendations.push('Use HTTPS URLs in production Supabase configuration');
      recommendations.push('Update all redirect URLs to use HTTPS protocol');
    }

    // General recommendations
    if (analysis.issues.length > 0) {
      recommendations.push('Review and fix all configuration issues before testing');
      recommendations.push('Test magic link flow after configuration changes');
    }

    console.log('[SupabaseAnalyzer] Recommendations:', recommendations);
    return recommendations;
  }

  /**
   * Validate magic link generation
   */
  async validateMagicLinkGeneration(email: string) {
    console.log('[SupabaseAnalyzer] 📧 Validating magic link generation for:', email);
    
    const validation = {
      valid: true,
      issues: [] as string[],
      warnings: [] as string[],
      generatedUrl: null as string | null
    };

    try {
      // Try to generate a magic link
      const response = await fetch('http://localhost:8080/api/test/magic-link', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        validation.valid = false;
        validation.issues.push(`Magic link generation failed: ${response.status}`);
        return validation;
      }

      const data = await response.json();
      
      if (!data.ok) {
        validation.valid = false;
        validation.issues.push(`Magic link generation failed: ${data.message}`);
        return validation;
      }

      validation.generatedUrl = data.loginUrl;

      // Analyze the generated URL
      if (data.loginUrl) {
        const urlAnalysis = this.analyzeMagicLinkUrl(data.loginUrl);
        validation.issues.push(...urlAnalysis.issues);
        validation.warnings.push(...urlAnalysis.warnings);
      }

    } catch (error) {
      validation.valid = false;
      validation.issues.push(`Magic link generation error: ${error instanceof Error ? error.message : String(error)}`);
    }

    console.log('[SupabaseAnalyzer] Magic link validation result:', validation);
    return validation;
  }

  /**
   * Analyze magic link URL
   */
  private analyzeMagicLinkUrl(loginUrl: string) {
    const analysis = {
      issues: [] as string[],
      warnings: [] as string[]
    };

    try {
      const url = new URL(loginUrl);
      
      // Check for wildcard domains
      if (url.hostname.includes('%2A') || url.hostname.includes('*')) {
        analysis.issues.push(`Magic link URL contains wildcard domain: ${url.hostname}`);
      }

      // Check for Vercel domains
      if (url.hostname.includes('vercel.app') && !url.hostname.includes('localhost')) {
        analysis.warnings.push(`Magic link URL points to Vercel domain: ${url.hostname}`);
      }

      // Check for localhost in production
      if (url.hostname.includes('localhost') && process.env.NODE_ENV === 'production') {
        analysis.issues.push(`Magic link URL uses localhost in production: ${loginUrl}`);
      }

      // Check for non-HTTPS
      if (url.protocol !== 'https:' && url.hostname !== 'localhost') {
        analysis.warnings.push(`Magic link URL uses non-HTTPS protocol: ${loginUrl}`);
      }

      // Check for authentication tokens
      if (!url.searchParams.has('token') && !url.hash.includes('access_token')) {
        analysis.issues.push('Magic link URL does not contain authentication tokens');
      }

    } catch (error) {
      analysis.issues.push(`Invalid magic link URL format: ${loginUrl}`);
    }

    return analysis;
  }
}
