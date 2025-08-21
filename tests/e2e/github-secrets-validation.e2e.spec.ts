import { test, expect } from '@playwright/test';
import { spawn } from 'child_process';

/**
 * GitHub Secrets Validation E2E Test
 * 
 * This test simulates the exact GitHub Actions workflow steps to identify
 * which GitHub secrets need to be updated after password changes.
 * 
 * The test replicates the failing CI workflow steps:
 * 1. Setup Supabase CLI
 * 2. Link to staging project (failing step)
 * 3. Test database connection
 * 4. Validate all required secrets
 * 
 * REQUIRED ENVIRONMENT VARIABLES (mirror GitHub secrets):
 * - SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
 * - SB_STAGING_REF: ${{ secrets.SB_STAGING_REF }}
 * - STAGING_DB_PASSWORD: ${{ secrets.STAGING_DB_PASSWORD }}
 * - SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
 * - SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
 * 
 * Usage:
 * SUPABASE_ACCESS_TOKEN=sbp_xxx SB_STAGING_REF=xxx STAGING_DB_PASSWORD=xxx SUPABASE_URL=xxx SUPABASE_SERVICE_ROLE_KEY=xxx npm test tests/e2e/github-secrets-validation.e2e.spec.ts
 */

interface GitHubSecrets {
  supabaseAccessToken: string;
  sbStagingRef: string;
  stagingDbPassword: string;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
}

interface ValidationResult {
  secret: string;
  status: 'valid' | 'invalid' | 'missing';
  error?: string;
  details?: string;
}

class GitHubSecretsValidator {
  private secrets: GitHubSecrets;
  private results: ValidationResult[] = [];

  constructor(secrets: GitHubSecrets) {
    this.secrets = secrets;
  }

  private async runCommand(command: string, args: string[] = [], env: Record<string, string> = {}): Promise<{ success: boolean; output: string; error: string }> {
    return new Promise((resolve) => {
      const child = spawn(command, args, {
        env: { ...process.env, ...env },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let error = '';

      child.stdout?.on('data', (data) => {
        output += data.toString();
      });

      child.stderr?.on('data', (data) => {
        error += data.toString();
      });

      child.on('close', (code) => {
        resolve({
          success: code === 0,
          output: output.trim(),
          error: error.trim()
        });
      });
    });
  }

  private addResult(secret: string, status: 'valid' | 'invalid' | 'missing', error?: string, details?: string): void {
    this.results.push({ secret, status, error, details });
  }

  async validateSupabaseAccessToken(): Promise<void> {
    console.log('🔍 Validating SUPABASE_ACCESS_TOKEN...');
    
    if (!this.secrets.supabaseAccessToken) {
      this.addResult('SUPABASE_ACCESS_TOKEN', 'missing', 'Secret is not set');
      return;
    }

    if (!this.secrets.supabaseAccessToken.startsWith('sbp_')) {
      this.addResult('SUPABASE_ACCESS_TOKEN', 'invalid', 'Token does not start with sbp_');
      return;
    }

    // Test token by trying to list projects
    const result = await this.runCommand('supabase', ['projects', 'list'], {
      SUPABASE_ACCESS_TOKEN: this.secrets.supabaseAccessToken
    });

    if (result.success) {
      this.addResult('SUPABASE_ACCESS_TOKEN', 'valid', undefined, 'Token can list projects');
    } else {
      this.addResult('SUPABASE_ACCESS_TOKEN', 'invalid', result.error, 'Token cannot list projects');
    }
  }

  async validateSbStagingRef(): Promise<void> {
    console.log('🔍 Validating SB_STAGING_REF...');
    
    if (!this.secrets.sbStagingRef) {
      this.addResult('SB_STAGING_REF', 'missing', 'Secret is not set');
      return;
    }

    // Check if it looks like a valid project ref (alphanumeric, typically 20-25 chars)
    if (!/^[a-zA-Z0-9]{20,25}$/.test(this.secrets.sbStagingRef)) {
      this.addResult('SB_STAGING_REF', 'invalid', 'Project ref format appears invalid');
      return;
    }

    this.addResult('SB_STAGING_REF', 'valid', undefined, `Project ref: ${this.secrets.sbStagingRef}`);
  }

  async validateStagingDbPassword(): Promise<void> {
    console.log('🔍 Validating STAGING_DB_PASSWORD...');
    
    if (!this.secrets.stagingDbPassword) {
      this.addResult('STAGING_DB_PASSWORD', 'missing', 'Secret is not set');
      return;
    }

    // Test password by trying to link to the project
    const result = await this.runCommand('supabase', [
      'link', 
      '--project-ref', this.secrets.sbStagingRef,
      '--password', this.secrets.stagingDbPassword
    ], {
      SUPABASE_ACCESS_TOKEN: this.secrets.supabaseAccessToken
    });

    if (result.success) {
      this.addResult('STAGING_DB_PASSWORD', 'valid', undefined, 'Password works for project linking');
    } else {
      // Check for specific password authentication error
      if (result.error.includes('password authentication failed') || result.error.includes('SQLSTATE 28P01')) {
        this.addResult('STAGING_DB_PASSWORD', 'invalid', result.error, 'Password authentication failed - this is the main issue');
      } else {
        this.addResult('STAGING_DB_PASSWORD', 'invalid', result.error, 'Project linking failed');
      }
    }
  }

  async validateSupabaseUrl(): Promise<void> {
    console.log('🔍 Validating SUPABASE_URL...');
    
    if (!this.secrets.supabaseUrl) {
      this.addResult('SUPABASE_URL', 'missing', 'Secret is not set');
      return;
    }

    try {
      const url = new URL(this.secrets.supabaseUrl);
      if (url.hostname.includes('supabase.co')) {
        this.addResult('SUPABASE_URL', 'valid', undefined, `URL: ${url.hostname}`);
      } else {
        this.addResult('SUPABASE_URL', 'invalid', 'URL does not point to Supabase');
      }
    } catch (error) {
      this.addResult('SUPABASE_URL', 'invalid', 'Invalid URL format');
    }
  }

  async validateSupabaseServiceRoleKey(): Promise<void> {
    console.log('🔍 Validating SUPABASE_SERVICE_ROLE_KEY...');
    
    if (!this.secrets.supabaseServiceRoleKey) {
      this.addResult('SUPABASE_SERVICE_ROLE_KEY', 'missing', 'Secret is not set');
      return;
    }

    if (!this.secrets.supabaseServiceRoleKey.startsWith('eyJ')) {
      this.addResult('SUPABASE_SERVICE_ROLE_KEY', 'invalid', 'Service role key does not appear to be a valid JWT');
      return;
    }

    this.addResult('SUPABASE_SERVICE_ROLE_KEY', 'valid', undefined, 'Service role key format appears valid');
  }

  async testDatabaseConnection(): Promise<void> {
    console.log('🔍 Testing database connection...');
    
    // Try to connect to the database using the staging credentials
    const dbUrl = `postgresql://postgres:${this.secrets.stagingDbPassword}@db.${this.secrets.sbStagingRef}.supabase.co:5432/postgres`;
    
    const result = await this.runCommand('psql', [dbUrl, '-c', 'SELECT version();'], {
      PGPASSWORD: this.secrets.stagingDbPassword
    });

    if (result.success) {
      this.addResult('DATABASE_CONNECTION', 'valid', undefined, 'Direct database connection successful');
    } else {
      this.addResult('DATABASE_CONNECTION', 'invalid', result.error, 'Direct database connection failed');
    }
  }

  async testSupabaseCLILink(): Promise<void> {
    console.log('🔍 Testing Supabase CLI link (exact CI step)...');
    
    // This is the exact step that's failing in CI
    const result = await this.runCommand('supabase', [
      'link', 
      '--project-ref', this.secrets.sbStagingRef,
      '--password', this.secrets.stagingDbPassword
    ], {
      SUPABASE_ACCESS_TOKEN: this.secrets.supabaseAccessToken
    });

    if (result.success) {
      this.addResult('SUPABASE_CLI_LINK', 'valid', undefined, 'CLI link successful');
    } else {
      this.addResult('SUPABASE_CLI_LINK', 'invalid', result.error, 'CLI link failed - this is the CI failure');
    }
  }

  async testDatabaseDiff(): Promise<void> {
    console.log('🔍 Testing database diff command...');
    
    const result = await this.runCommand('supabase', [
      'db', 'diff', '--schema', 'public', '--linked', '--password', this.secrets.stagingDbPassword
    ], {
      SUPABASE_ACCESS_TOKEN: this.secrets.supabaseAccessToken
    });

    if (result.success) {
      this.addResult('DATABASE_DIFF', 'valid', undefined, 'Database diff command successful');
    } else {
      this.addResult('DATABASE_DIFF', 'invalid', result.error, 'Database diff command failed');
    }
  }

  async validateAllSecrets(): Promise<void> {
    console.log('🚀 Starting GitHub Secrets Validation...\n');

    // Validate individual secrets
    await this.validateSupabaseAccessToken();
    await this.validateSbStagingRef();
    await this.validateStagingDbPassword();
    await this.validateSupabaseUrl();
    await this.validateSupabaseServiceRoleKey();

    // Test actual connections
    await this.testDatabaseConnection();
    await this.testSupabaseCLILink();
    await this.testDatabaseDiff();

    this.generateReport();
  }

  private generateReport(): void {
    console.log('\n📊 GitHub Secrets Validation Report');
    console.log('=====================================\n');

    const valid = this.results.filter(r => r.status === 'valid').length;
    const invalid = this.results.filter(r => r.status === 'invalid').length;
    const missing = this.results.filter(r => r.status === 'missing').length;

    console.log(`✅ Valid: ${valid}`);
    console.log(`❌ Invalid: ${invalid}`);
    console.log(`⚠️  Missing: ${missing}\n`);

    // Group results by status
    const missingSecrets = this.results.filter(r => r.status === 'missing');
    const invalidSecrets = this.results.filter(r => r.status === 'invalid');
    const validSecrets = this.results.filter(r => r.status === 'valid');

    if (missingSecrets.length > 0) {
      console.log('❌ MISSING SECRETS:');
      missingSecrets.forEach(result => {
        console.log(`   ${result.secret}: ${result.error}`);
      });
      console.log('');
    }

    if (invalidSecrets.length > 0) {
      console.log('❌ INVALID SECRETS:');
      invalidSecrets.forEach(result => {
        console.log(`   ${result.secret}: ${result.error}`);
        if (result.details) {
          console.log(`      Details: ${result.details}`);
        }
      });
      console.log('');
    }

    if (validSecrets.length > 0) {
      console.log('✅ VALID SECRETS:');
      validSecrets.forEach(result => {
        console.log(`   ${result.secret}: ${result.details || 'Valid'}`);
      });
      console.log('');
    }

    // Provide specific recommendations
    console.log('🔧 RECOMMENDATIONS:');
    
    const passwordIssue = invalidSecrets.find(r => r.secret === 'STAGING_DB_PASSWORD');
    if (passwordIssue) {
      console.log('   1. Update STAGING_DB_PASSWORD in GitHub repository secrets');
      console.log('      - Go to Settings > Secrets and variables > Actions');
      console.log('      - Find STAGING_DB_PASSWORD and update with the new password');
      console.log('      - Ensure the password format is correct (no extra spaces, quotes, etc.)');
    }

    const tokenIssue = invalidSecrets.find(r => r.secret === 'SUPABASE_ACCESS_TOKEN');
    if (tokenIssue) {
      console.log('   2. Update SUPABASE_ACCESS_TOKEN in GitHub repository secrets');
      console.log('      - Go to https://supabase.com/dashboard/account/tokens');
      console.log('      - Generate a new access token');
      console.log('      - Update the secret in GitHub repository settings');
    }

    const cliLinkIssue = invalidSecrets.find(r => r.secret === 'SUPABASE_CLI_LINK');
    if (cliLinkIssue) {
      console.log('   3. The main CI failure is in the Supabase CLI link step');
      console.log('      - This is likely due to STAGING_DB_PASSWORD being incorrect');
      console.log('      - Update the password secret and re-run the workflow');
    }

    if (invalidSecrets.length === 0 && missingSecrets.length === 0) {
      console.log('   All secrets are valid! The CI workflow should work correctly.');
    }

    console.log('\n📝 NEXT STEPS:');
    console.log('   1. Update any invalid/missing secrets in GitHub repository settings');
    console.log('   2. Re-run the CI workflow to verify the fix');
    console.log('   3. If issues persist, check the Supabase project settings');
  }

  getResults(): ValidationResult[] {
    return this.results;
  }
}

test.describe('GitHub Secrets Validation', () => {
  let validator: GitHubSecretsValidator;

  test.beforeAll(async () => {
    // Validate required environment variables (mirror GitHub secrets)
    const requiredEnvVars = {
      SUPABASE_ACCESS_TOKEN: process.env.SUPABASE_ACCESS_TOKEN,
      SB_STAGING_REF: process.env.SB_STAGING_REF,
      STAGING_DB_PASSWORD: process.env.STAGING_DB_PASSWORD,
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    };

    const missingVars = Object.entries(requiredEnvVars)
      .filter(([key, value]) => !value)
      .map(([key]) => key);

    if (missingVars.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missingVars.join(', ')}\n` +
        'Please set these variables before running the test:\n' +
        '- SUPABASE_ACCESS_TOKEN: Your Supabase access token (sbp_...)\n' +
        '- SB_STAGING_REF: Your staging project reference\n' +
        '- STAGING_DB_PASSWORD: Your staging database password\n' +
        '- SUPABASE_URL: Your Supabase project URL\n' +
        '- SUPABASE_SERVICE_ROLE_KEY: Your service role key\n' +
        '\nThese should match your GitHub repository secrets.'
      );
    }

    // Configuration using environment variables
    const secrets: GitHubSecrets = {
      supabaseAccessToken: requiredEnvVars.SUPABASE_ACCESS_TOKEN!,
      sbStagingRef: requiredEnvVars.SB_STAGING_REF!,
      stagingDbPassword: requiredEnvVars.STAGING_DB_PASSWORD!,
      supabaseUrl: requiredEnvVars.SUPABASE_URL!,
      supabaseServiceRoleKey: requiredEnvVars.SUPABASE_SERVICE_ROLE_KEY!,
    };
    
    validator = new GitHubSecretsValidator(secrets);
  });

  test('should validate all GitHub secrets and identify CI issues', async () => {
    await validator.validateAllSecrets();
    
    const results = validator.getResults();
    const invalidSecrets = results.filter(r => r.status === 'invalid');
    const missingSecrets = results.filter(r => r.status === 'missing');
    
    // Test passes if we can identify the issues, even if secrets are invalid
    expect(results.length).toBeGreaterThan(0);
    
    // Log the results for manual review
    console.log('\n🎯 Test Summary:');
    console.log(`Total validations: ${results.length}`);
    console.log(`Invalid secrets: ${invalidSecrets.length}`);
    console.log(`Missing secrets: ${missingSecrets.length}`);
    
    // The test is designed to help identify issues, so it passes regardless
    // of validation results - the important thing is the detailed report
  });
});
