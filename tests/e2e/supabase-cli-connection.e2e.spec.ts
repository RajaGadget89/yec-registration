import { test, expect } from '@playwright/test';
import { spawn } from 'child_process';

/**
 * E2E Test for Supabase CLI Connection to Production Database
 * 
 * This test simulates the exact steps from the GitHub Actions workflow
 * to test the Supabase CLI connection functionality that's failing in CI/CD.
 * 
 * REQUIRED ENVIRONMENT VARIABLES:
 * - SUPABASE_ACCESS_TOKEN: Your Supabase access token (sbp_...)
 * - SUPABASE_PROJECT_REF: Your Supabase project reference ID
 * - SUPABASE_DB_PASSWORD: Your database password
 * 
 * Example usage:
 * SUPABASE_ACCESS_TOKEN=sbp_your_token SUPABASE_PROJECT_REF=your_project_ref SUPABASE_DB_PASSWORD=your_password npm test
 */

interface TestConfig {
  supabaseAccessToken: string;
  projectRef: string;
  dbPassword: string;
  dbUrl: string;
}

class SupabaseCLITester {
  private config: TestConfig;

  constructor(config: TestConfig) {
    this.config = config;
  }

  /**
   * Execute a shell command and return the result
   */
  private async executeCommand(command: string, args: string[] = []): Promise<{ success: boolean; output: string; error: string }> {
    return new Promise((resolve) => {
      const envVars = Object.assign({}, process.env, {
        SUPABASE_ACCESS_TOKEN: this.config.supabaseAccessToken
      });
      
      const childProcess = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: envVars
      });

      let output = '';
      let error = '';

      childProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      childProcess.stderr.on('data', (data) => {
        error += data.toString();
      });

      childProcess.on('close', (code) => {
        resolve({
          success: code === 0,
          output: output.trim(),
          error: error.trim()
        });
      });
    });
  }

  /**
   * Test 1: Check Supabase CLI version
   */
  async testCLIVersion(): Promise<{ success: boolean; version: string }> {
    console.log('🔍 Testing Supabase CLI version...');
    
    const result = await this.executeCommand('supabase', ['--version']);
    
    if (result.success) {
      console.log(`✅ Supabase CLI version: ${result.output}`);
      return { success: true, version: result.output };
    } else {
      console.log(`❌ Failed to get Supabase CLI version: ${result.error}`);
      return { success: false, version: '' };
    }
  }

  /**
   * Test 2: Link to production project
   */
  async testProjectLinking(): Promise<{ success: boolean; output: string }> {
    console.log('🔗 Testing project linking...');
    
    const result = await this.executeCommand('supabase', [
      'link',
      '--project-ref',
      this.config.projectRef,
      '--password',
      this.config.dbPassword
    ]);
    
    if (result.success) {
      console.log('✅ Project linking successful');
      return { success: true, output: result.output };
    } else {
      console.log(`❌ Project linking failed: ${result.error}`);
      return { success: false, output: result.error };
    }
  }

  /**
   * Test 3: Test database ping (the failing command)
   */
  async testDatabasePing(): Promise<{ success: boolean; output: string }> {
    console.log('🏓 Testing database ping...');
    
    const result = await this.executeCommand('supabase', [
      'db',
      'ping',
      '--password',
      this.config.dbPassword
    ]);
    
    if (result.success) {
      console.log('✅ Database ping successful');
      return { success: true, output: result.output };
    } else {
      console.log(`❌ Database ping failed: ${result.error}`);
      return { success: false, output: result.error };
    }
  }

  /**
   * Test 4: Test database diff (alternative connection test)
   */
  async testDatabaseDiff(): Promise<{ success: boolean; output: string }> {
    console.log('🔍 Testing database diff...');
    
    const result = await this.executeCommand('supabase', [
      'db',
      'diff',
      '--schema',
      'public',
      '--linked',
      '--password',
      this.config.dbPassword
    ]);
    
    if (result.success) {
      console.log('✅ Database diff successful');
      return { success: true, output: result.output };
    } else {
      console.log(`❌ Database diff failed: ${result.error}`);
      return { success: false, output: result.error };
    }
  }

  /**
   * Test 5: Test database query (direct SQL execution)
   */
  async testDatabaseQuery(): Promise<{ success: boolean; output: string }> {
    console.log('📝 Testing database query...');
    
    const result = await this.executeCommand('supabase', [
      'db',
      'query',
      '--password',
      this.config.dbPassword,
      'SELECT version();'
    ]);
    
    if (result.success) {
      console.log('✅ Database query successful');
      return { success: true, output: result.output };
    } else {
      console.log(`❌ Database query failed: ${result.error}`);
      return { success: false, output: result.error };
    }
  }

  /**
   * Test 6: Test migration repair (the actual functionality)
   */
  async testMigrationRepair(): Promise<{ success: boolean; output: string }> {
    console.log('🔧 Testing migration repair...');
    
    const result = await this.executeCommand('supabase', [
      'migration',
      'repair',
      '--status',
      'reverted',
      '--password',
      this.config.dbPassword
    ]);
    
    if (result.success) {
      console.log('✅ Migration repair successful');
      return { success: true, output: result.output };
    } else {
      console.log(`❌ Migration repair failed: ${result.error}`);
      return { success: false, output: result.error };
    }
  }

  /**
   * Run all tests and generate a comprehensive report
   */
  async runAllTests(): Promise<{
    summary: { total: number; passed: number; failed: number };
    results: Record<string, { success: boolean; output: string }>;
  }> {
    console.log('🚀 Starting Supabase CLI Connection Tests...\n');
    
    const results: Record<string, { success: boolean; output: string }> = {};
    
    // Test 1: CLI Version
    const versionTest = await this.testCLIVersion();
    results.cliVersion = { success: versionTest.success, output: versionTest.version };
    
    // Test 2: Project Linking
    const linkingTest = await this.testProjectLinking();
    results.projectLinking = linkingTest;
    
    // Test 3: Database Ping (the failing command)
    const pingTest = await this.testDatabasePing();
    results.databasePing = pingTest;
    
    // Test 4: Database Diff
    const diffTest = await this.testDatabaseDiff();
    results.databaseDiff = diffTest;
    
    // Test 5: Database Query
    const queryTest = await this.testDatabaseQuery();
    results.databaseQuery = queryTest;
    
    // Test 6: Migration Repair
    const repairTest = await this.testMigrationRepair();
    results.migrationRepair = repairTest;
    
    // Calculate summary
    const total = Object.keys(results).length;
    const passed = Object.values(results).filter(r => r.success).length;
    const failed = total - passed;
    
    const summary = { total, passed, failed };
    
    // Generate detailed report
    this.generateReport(summary, results);
    
    return { summary, results };
  }

  /**
   * Generate a detailed test report
   */
  private generateReport(summary: { total: number; passed: number; failed: number }, results: Record<string, { success: boolean; output: string }>): void {
    console.log('\n📊 Test Results Summary:');
    console.log(`Total Tests: ${summary.total}`);
    console.log(`Passed: ${summary.passed}`);
    console.log(`Failed: ${summary.failed}`);
    console.log(`Success Rate: ${((summary.passed / summary.total) * 100).toFixed(1)}%`);
    
    console.log('\n📋 Detailed Results:');
    Object.entries(results).forEach(([testName, result]) => {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${testName}`);
      if (!result.success && result.output) {
        console.log(`   Error: ${result.output}`);
      }
    });
  }
}

// Main test suite
test.describe('Supabase CLI Connection Tests', () => {
  let tester: SupabaseCLITester;
  
  test.beforeAll(async () => {
    // Validate required environment variables
    const requiredEnvVars = {
      SUPABASE_ACCESS_TOKEN: process.env.SUPABASE_ACCESS_TOKEN,
      SUPABASE_PROJECT_REF: process.env.SUPABASE_PROJECT_REF,
      SUPABASE_DB_PASSWORD: process.env.SUPABASE_DB_PASSWORD,
    };

    const missingVars = Object.entries(requiredEnvVars)
      .filter(([key, value]) => !value)
      .map(([key]) => key);

    if (missingVars.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missingVars.join(', ')}\n` +
        'Please set these variables before running the test:\n' +
        '- SUPABASE_ACCESS_TOKEN: Your Supabase access token\n' +
        '- SUPABASE_PROJECT_REF: Your Supabase project reference\n' +
        '- SUPABASE_DB_PASSWORD: Your database password'
      );
    }

    // Configuration using environment variables
    const config: TestConfig = {
      supabaseAccessToken: requiredEnvVars.SUPABASE_ACCESS_TOKEN!,
      projectRef: requiredEnvVars.SUPABASE_PROJECT_REF!,
      dbPassword: requiredEnvVars.SUPABASE_DB_PASSWORD!,
      dbUrl: `postgresql://postgres:${requiredEnvVars.SUPABASE_DB_PASSWORD}@db.${requiredEnvVars.SUPABASE_PROJECT_REF}.supabase.co:5432/postgres`
    };
    
    tester = new SupabaseCLITester(config);
  });

  test('should test all Supabase CLI connection methods', async () => {
    const { summary, results } = await tester.runAllTests();
    
    // Assertions based on the results
    expect(summary.total).toBeGreaterThan(0);
    expect(summary.passed).toBeGreaterThan(0);
    
    // The CLI version should always work
    expect(results.cliVersion.success).toBe(true);
    
    // Project linking should work
    expect(results.projectLinking.success).toBe(true);
    
    // At least one database connection method should work
    const connectionMethods = [
      results.databasePing,
      results.databaseDiff,
      results.databaseQuery
    ];
    
    const workingConnections = connectionMethods.filter(method => method.success);
    expect(workingConnections.length).toBeGreaterThan(0);
    
    // If ping fails but other methods work, that's the issue we're investigating
    if (!results.databasePing.success && workingConnections.length > 0) {
      console.log('\n🔍 DIAGNOSIS: Database ping is failing but other connection methods work.');
      console.log('This suggests the issue is with the `supabase db ping` command specifically.');
      console.log('Recommendation: Use `supabase db diff` or `supabase db query` for connection testing.');
    }
    
    // Migration repair should work if we can connect
    if (workingConnections.length > 0) {
      expect(results.migrationRepair.success).toBe(true);
    }
  });

  test('should identify the specific connection issue', async () => {
    // This test focuses on diagnosing the exact issue
    const pingTest = await tester.testDatabasePing();
    const diffTest = await tester.testDatabaseDiff();
    const queryTest = await tester.testDatabaseQuery();
    
    if (!pingTest.success) {
      console.log('\n🔍 CONNECTION ISSUE ANALYSIS:');
      console.log('Database ping failed, but let\'s check alternatives...');
      
      if (diffTest.success) {
        console.log('✅ Database diff works - this can replace ping for connection testing');
      }
      
      if (queryTest.success) {
        console.log('✅ Database query works - this can replace ping for connection testing');
      }
      
      if (!diffTest.success && !queryTest.success) {
        console.log('❌ All connection methods failed - this is a broader connectivity issue');
        throw new Error('All database connection methods failed');
      }
    }
  });
});
