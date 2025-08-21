import { test, expect } from '@playwright/test';
import { spawn, execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';

/**
 * CD Reproduction Test - Exact CD Environment Simulation
 * 
 * This test exactly reproduces the GitHub Actions CD environment and workflow
 * to diagnose the Supabase CLI connection issue that's failing in production.
 * 
 * REQUIRED ENVIRONMENT VARIABLES:
 * - SUPABASE_ACCESS_TOKEN: Your Supabase access token (sbp_...)
 * - SUPABASE_PROJECT_REF: Your Supabase project reference ID
 * - SUPABASE_DB_PASSWORD: Your database password
 * 
 * This test simulates the exact steps from the GitHub Actions workflow:
 * 1. Setup Supabase CLI (same version as CD)
 * 2. Link to project (same command as CD)
 * 3. Test connection (same method as CD)
 * 4. Attempt auto-repair (same logic as CD)
 */

interface CDEnvironment {
  supabaseAccessToken: string;
  projectRef: string;
  dbPassword: string;
  dbUrl: string;
  cliVersion: string;
}

class CDReproductionTester {
  private env: CDEnvironment;
  private testResults: any[] = [];

  constructor(env: CDEnvironment) {
    this.env = env;
  }

  /**
   * Execute a shell command and capture detailed output
   */
  private async executeCommand(command: string, args: string[] = [], env: any = {}): Promise<{ success: boolean; output: string; error: string; exitCode: number }> {
    return new Promise((resolve) => {
      const fullCommand = `${command} ${args.join(' ')}`;
      console.log(`🔧 Executing: ${fullCommand}`);
      
      const childProcess = spawn(command, args, {
        env: { ...process.env, ...env },
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
      });

      let output = '';
      let error = '';

      childProcess.stdout?.on('data', (data) => {
        const text = data.toString();
        output += text;
        console.log(`📤 STDOUT: ${text.trim()}`);
      });

      childProcess.stderr?.on('data', (data) => {
        const text = data.toString();
        error += text;
        console.log(`📤 STDERR: ${text.trim()}`);
      });

      childProcess.on('close', (code) => {
        const exitCode = code || 0;
        const success = exitCode === 0;
        
        console.log(`✅ Command completed with exit code: ${exitCode}`);
        
        resolve({
          success,
          output: output.trim(),
          error: error.trim(),
          exitCode
        });
      });
    });
  }

  /**
   * Test 1: Setup Supabase CLI (exact CD version)
   */
  async testSupabaseCLISetup(): Promise<void> {
    console.log('\n🔧 Test 1: Setting up Supabase CLI (CD version)');
    
    // Check current Supabase CLI version
    const versionResult = await this.executeCommand('supabase', ['--version']);
    console.log(`📊 Current Supabase CLI version: ${versionResult.output}`);
    
    // Test if we can access Supabase CLI
    const helpResult = await this.executeCommand('supabase', ['--help']);
    
    this.testResults.push({
      test: 'Supabase CLI Setup',
      success: helpResult.success,
      output: helpResult.output,
      error: helpResult.error,
      exitCode: helpResult.exitCode
    });
  }

  /**
   * Test 2: Link to project (exact CD command)
   */
  async testProjectLinking(): Promise<void> {
    console.log('\n🔧 Test 2: Linking to Supabase project (CD method)');
    
    // Set environment variables exactly as CD does
    const env = {
      SUPABASE_ACCESS_TOKEN: this.env.supabaseAccessToken
    };
    
    // Execute the exact CD command
    const linkResult = await this.executeCommand('supabase', [
      'link', 
      '--project-ref', this.env.projectRef, 
      '--password', this.env.dbPassword
    ], env);
    
    this.testResults.push({
      test: 'Project Linking',
      success: linkResult.success,
      output: linkResult.output,
      error: linkResult.error,
      exitCode: linkResult.exitCode
    });
  }

  /**
   * Test 3: Test database connection (exact CD method)
   */
  async testDatabaseConnection(): Promise<void> {
    console.log('\n🔧 Test 3: Testing database connection (CD method)');
    
    // Test 3a: Try the exact CD command that's failing
    console.log('📋 Test 3a: Testing with exact CD command (supabase db ping --password)');
    const pingResult = await this.executeCommand('supabase', [
      'db', 'ping', 
      '--password', this.env.dbPassword
    ]);
    
    this.testResults.push({
      test: 'Database Ping (CD Method)',
      success: pingResult.success,
      output: pingResult.output,
      error: pingResult.error,
      exitCode: pingResult.exitCode
    });
    
    // Test 3b: Try alternative connection methods
    console.log('📋 Test 3b: Testing with alternative methods');
    
    // Method 1: Using db diff (our fix)
    const diffResult = await this.executeCommand('supabase', [
      'db', 'diff', 
      '--schema', 'public', 
      '--linked'
    ]);
    
    this.testResults.push({
      test: 'Database Diff (Alternative Method)',
      success: diffResult.success,
      output: diffResult.output,
      error: diffResult.error,
      exitCode: diffResult.exitCode
    });
    
    // Method 2: Using db query
    const queryResult = await this.executeCommand('supabase', [
      'db', 'query', 
      'SELECT version();'
    ]);
    
    this.testResults.push({
      test: 'Database Query (Alternative Method)',
      success: queryResult.success,
      output: queryResult.output,
      error: queryResult.error,
      exitCode: queryResult.exitCode
    });
  }

  /**
   * Test 4: Test auto-repair functionality (exact CD logic)
   */
  async testAutoRepair(): Promise<void> {
    console.log('\n🔧 Test 4: Testing auto-repair functionality (CD logic)');
    
    // Test 4a: Migration repair command
    console.log('📋 Test 4a: Testing migration repair command');
    const repairResult = await this.executeCommand('supabase', [
      'migration', 'repair', 
      '--status', 'reverted'
    ]);
    
    this.testResults.push({
      test: 'Migration Repair',
      success: repairResult.success,
      output: repairResult.output,
      error: repairResult.error,
      exitCode: repairResult.exitCode
    });
    
    // Test 4b: Direct database query for remote_schema cleanup
    console.log('📋 Test 4b: Testing direct remote_schema cleanup');
    const cleanupResult = await this.executeCommand('supabase', [
      'db', 'query',
      "UPDATE supabase_migrations.schema_migrations SET status = 'reverted' WHERE name = 'remote_schema' AND status != 'reverted';"
    ]);
    
    this.testResults.push({
      test: 'Remote Schema Cleanup',
      success: cleanupResult.success,
      output: cleanupResult.output,
      error: cleanupResult.error,
      exitCode: cleanupResult.exitCode
    });
  }

  /**
   * Test 5: Environment validation
   */
  async testEnvironmentValidation(): Promise<void> {
    console.log('\n🔧 Test 5: Environment validation');
    
    // Check if all required environment variables are set
    const requiredVars = [
      'SUPABASE_ACCESS_TOKEN',
      'SUPABASE_PROJECT_REF', 
      'SUPABASE_DB_PASSWORD'
    ];
    
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    this.testResults.push({
      test: 'Environment Variables',
      success: missingVars.length === 0,
      output: `Required variables: ${requiredVars.join(', ')}\nMissing: ${missingVars.join(', ')}`,
      error: missingVars.length > 0 ? `Missing variables: ${missingVars.join(', ')}` : '',
      exitCode: missingVars.length === 0 ? 0 : 1
    });
    
    // Test Supabase CLI configuration
    const configResult = await this.executeCommand('supabase', ['status']);
    
    this.testResults.push({
      test: 'Supabase Configuration',
      success: configResult.success,
      output: configResult.output,
      error: configResult.error,
      exitCode: configResult.exitCode
    });
  }

  /**
   * Run all tests
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 Starting CD Reproduction Test Suite');
    console.log('=' .repeat(60));
    
    await this.testEnvironmentValidation();
    await this.testSupabaseCLISetup();
    await this.testProjectLinking();
    await this.testDatabaseConnection();
    await this.testAutoRepair();
    
    this.generateReport();
  }

  /**
   * Generate comprehensive test report
   */
  private generateReport(): void {
    console.log('\n📊 CD Reproduction Test Report');
    console.log('=' .repeat(60));
    
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    
    console.log(`📈 Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`📊 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    console.log('\n📋 Detailed Results:');
    this.testResults.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      console.log(`${index + 1}. ${status} ${result.test}`);
      console.log(`   Exit Code: ${result.exitCode}`);
      if (result.output) {
        console.log(`   Output: ${result.output.substring(0, 200)}${result.output.length > 200 ? '...' : ''}`);
      }
      if (result.error) {
        console.log(`   Error: ${result.error.substring(0, 200)}${result.error.length > 200 ? '...' : ''}`);
      }
      console.log('');
    });
    
    // Save detailed report to file
    const reportPath = 'test-results/cd-reproduction-report.json';
    mkdirSync('test-results', { recursive: true });
    writeFileSync(reportPath, JSON.stringify(this.testResults, null, 2));
    console.log(`📄 Detailed report saved to: ${reportPath}`);
  }
}

test.describe('CD Reproduction Test Suite', () => {
  let tester: CDReproductionTester;

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
    const config: CDEnvironment = {
      supabaseAccessToken: requiredEnvVars.SUPABASE_ACCESS_TOKEN!,
      projectRef: requiredEnvVars.SUPABASE_PROJECT_REF!,
      dbPassword: requiredEnvVars.SUPABASE_DB_PASSWORD!,
      dbUrl: `postgresql://postgres:${requiredEnvVars.SUPABASE_DB_PASSWORD}@db.${requiredEnvVars.SUPABASE_PROJECT_REF}.supabase.co:5432/postgres`,
      cliVersion: 'latest' // Same as CD
    };
    
    tester = new CDReproductionTester(config);
  });

  test('CD Environment Reproduction Test', async () => {
    await tester.runAllTests();
    
    // Assert that at least some critical tests passed
    const criticalTests = ['Project Linking', 'Database Diff (Alternative Method)'];
    const criticalResults = tester['testResults'].filter(r => 
      criticalTests.includes(r.test) && r.success
    );
    
    expect(criticalResults.length).toBeGreaterThan(0);
  });
});
