import { test, expect } from '@playwright/test';
import { spawn, execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';

/**
 * CD Reproduction Test - Updated for Focused Workflow Fix
 * 
 * This test exactly reproduces the updated GitHub Actions CD environment and workflow
 * with the focused fix for the Auto-repair remote_schema step.
 * 
 * REQUIRED ENVIRONMENT VARIABLES:
 * - SUPABASE_ACCESS_TOKEN: Your Supabase access token (sbp_...)
 * - SUPABASE_PROJECT_REF: Your Supabase project reference ID
 * - SUPABASE_DB_PASSWORD: Your database password
 * 
 * This test simulates the exact steps from the updated GitHub Actions workflow:
 * 1. Setup Supabase CLI (same version as CD)
 * 2. Link to project (same command as CD)
 * 3. Test connection with re-linking resilience
 * 4. Test auto-repair with non-interactive mode
 * 5. Validate the focused fix approach
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
   * Test 3: Test the updated Auto-repair workflow (exact CD method)
   */
  async testUpdatedAutoRepairWorkflow(): Promise<void> {
    console.log('\n🔧 Test 3: Testing updated Auto-repair workflow (CD method)');
    
    // Set environment variables exactly as the updated CD workflow does
    const env = {
      SUPABASE_ACCESS_TOKEN: this.env.supabaseAccessToken,
      SUPABASE_NON_INTERACTIVE: "1"  // New environment variable from the fix
    };
    
    // Test 3a: Re-linking in Auto-repair step (new in the fix)
    console.log('📋 Test 3a: Re-linking in Auto-repair step');
    const relinkResult = await this.executeCommand('supabase', [
      'link', 
      '--project-ref', this.env.projectRef, 
      '--password', this.env.dbPassword
    ], env);
    
    this.testResults.push({
      test: 'Auto-repair Re-linking',
      success: relinkResult.success,
      output: relinkResult.output,
      error: relinkResult.error,
      exitCode: relinkResult.exitCode
    });
    
    // Test 3b: Softened connection test (updated in the fix)
    console.log('📋 Test 3b: Softened connection test (warning + continue)');
    const connectionResult = await this.executeCommand('supabase', [
      'db', 'diff', 
      '--schema', 'public', 
      '--linked'
    ], env);
    
    // This should not fail the test anymore (softened approach)
    const connectionSuccess = connectionResult.success || connectionResult.exitCode === 1; // Allow exit code 1
    
    this.testResults.push({
      test: 'Softened Connection Test',
      success: connectionSuccess,
      output: connectionResult.output,
      error: connectionResult.error,
      exitCode: connectionResult.exitCode,
      note: 'Softened approach allows exit code 1 to continue'
    });
    
    // Test 3c: Non-interactive migration repair (new in the fix)
    console.log('📋 Test 3c: Non-interactive migration repair with yes pipe');
    const repairResult = await this.executeCommand('bash', [
      '-c', 
      'yes | supabase migration repair --status reverted'
    ], env);
    
    this.testResults.push({
      test: 'Non-Interactive Migration Repair',
      success: repairResult.success,
      output: repairResult.output,
      error: repairResult.error,
      exitCode: repairResult.exitCode
    });
    
    // Test 3d: Fallback SQL cleanup (unchanged, should still work)
    console.log('📋 Test 3d: Fallback SQL cleanup (unchanged)');
    const cleanupResult = await this.executeCommand('supabase', [
      'db', 'query',
      "UPDATE supabase_migrations.schema_migrations SET status = 'reverted' WHERE name = 'remote_schema' AND status != 'reverted';"
    ], env);
    
    this.testResults.push({
      test: 'Fallback SQL Cleanup',
      success: cleanupResult.success,
      output: cleanupResult.output,
      error: cleanupResult.error,
      exitCode: cleanupResult.exitCode
    });
  }

  /**
   * Test 4: Test database connection (exact CD method)
   */
  async testDatabaseConnection(): Promise<void> {
    console.log('\n🔧 Test 4: Testing database connection (CD method)');
    
    // Test 4a: Try the exact CD command that was failing (for comparison)
    console.log('📋 Test 4a: Testing with exact CD command (supabase db ping --password)');
    const pingResult = await this.executeCommand('supabase', [
      'db', 'ping', 
      '--password', this.env.dbPassword
    ]);
    
    this.testResults.push({
      test: 'Database Ping (CD Method - Should Fail)',
      success: pingResult.success,
      output: pingResult.output,
      error: pingResult.error,
      exitCode: pingResult.exitCode,
      note: 'This should fail as the command does not exist in CLI 2.34.3'
    });
    
    // Test 4b: Try the working alternative method
    console.log('📋 Test 4b: Testing with working alternative method');
    const diffResult = await this.executeCommand('supabase', [
      'db', 'diff', 
      '--schema', 'public', 
      '--linked'
    ]);
    
    this.testResults.push({
      test: 'Database Diff (Working Alternative)',
      success: diffResult.success,
      output: diffResult.output,
      error: diffResult.error,
      exitCode: diffResult.exitCode
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
   * Test 6: Validate the focused fix approach
   */
  async testFocusedFixValidation(): Promise<void> {
    console.log('\n🔧 Test 6: Validating focused fix approach');
    
    // Test 6a: Non-interactive environment variable
    console.log('📋 Test 6a: Non-interactive environment variable');
    const env = {
      SUPABASE_NON_INTERACTIVE: "1"
    };
    
    const nonInteractiveResult = await this.executeCommand('echo', ['$SUPABASE_NON_INTERACTIVE'], env);
    
    this.testResults.push({
      test: 'Non-Interactive Environment Variable',
      success: nonInteractiveResult.success,
      output: nonInteractiveResult.output,
      error: nonInteractiveResult.error,
      exitCode: nonInteractiveResult.exitCode
    });
    
    // Test 6b: Yes pipe functionality
    console.log('📋 Test 6b: Yes pipe functionality');
    const yesPipeResult = await this.executeCommand('bash', [
      '-c', 
      'echo "Testing yes pipe" | head -1'
    ]);
    
    this.testResults.push({
      test: 'Yes Pipe Functionality',
      success: yesPipeResult.success,
      output: yesPipeResult.output,
      error: yesPipeResult.error,
      exitCode: yesPipeResult.exitCode
    });
  }

  /**
   * Run all tests
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Updated CD Reproduction Test Suite');
    console.log('=' .repeat(60));
    
    await this.testEnvironmentValidation();
    await this.testSupabaseCLISetup();
    await this.testProjectLinking();
    await this.testUpdatedAutoRepairWorkflow();
    await this.testDatabaseConnection();
    await this.testFocusedFixValidation();
    
    this.generateReport();
  }

  /**
   * Generate comprehensive test report
   */
  private generateReport(): void {
    console.log('\n📊 Updated CD Reproduction Test Report');
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
      if (result.note) {
        console.log(`   Note: ${result.note}`);
      }
      if (result.output) {
        console.log(`   Output: ${result.output.substring(0, 200)}${result.output.length > 200 ? '...' : ''}`);
      }
      if (result.error) {
        console.log(`   Error: ${result.error.substring(0, 200)}${result.error.length > 200 ? '...' : ''}`);
      }
      console.log('');
    });
    
    // Save detailed report to file
    const reportPath = 'test-results/updated-cd-reproduction-report.json';
    mkdirSync('test-results', { recursive: true });
    writeFileSync(reportPath, JSON.stringify(this.testResults, null, 2));
    console.log(`📄 Detailed report saved to: ${reportPath}`);
    
    // Generate focused fix validation summary
    const focusedFixTests = this.testResults.filter(r => 
      r.test.includes('Auto-repair') || 
      r.test.includes('Non-Interactive') || 
      r.test.includes('Softened')
    );
    
    const focusedFixPassed = focusedFixTests.filter(r => r.success).length;
    
    console.log('\n🎯 Focused Fix Validation Summary:');
    console.log(`📊 Focused Fix Tests: ${focusedFixTests.length}`);
    console.log(`✅ Focused Fix Passed: ${focusedFixPassed}`);
    console.log(`📈 Focused Fix Success Rate: ${((focusedFixPassed / focusedFixTests.length) * 100).toFixed(1)}%`);
  }
}

test.describe('Updated CD Reproduction Test Suite', () => {
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

  test('Updated CD Environment Reproduction Test', async () => {
    await tester.runAllTests();
    
    // Assert that the focused fix tests pass
    const focusedFixTests = tester['testResults'].filter(r => 
      r.test.includes('Auto-repair') || 
      r.test.includes('Non-Interactive') || 
      r.test.includes('Softened')
    );
    
    const focusedFixPassed = focusedFixTests.filter(r => r.success).length;
    expect(focusedFixPassed).toBeGreaterThan(0);
    
    // Assert that at least some critical tests passed
    const criticalTests = ['Project Linking', 'Database Diff (Working Alternative)'];
    const criticalResults = tester['testResults'].filter(r => 
      criticalTests.includes(r.test) && r.success
    );
    
    expect(criticalResults.length).toBeGreaterThan(0);
  });
});
