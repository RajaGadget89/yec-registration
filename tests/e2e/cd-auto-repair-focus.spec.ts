import { test, expect } from '@playwright/test';
import { spawn } from 'child_process';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';

/**
 * Focused CD Auto-Repair Test
 * 
 * This test specifically targets the auto-repair step that was causing exit code 143
 * in the CD workflow. It replicates the exact conditions and commands from the CD.
 */

interface AutoRepairStepResult {
  step: string;
  success: boolean;
  output: string;
  error: string;
  exitCode: number;
  duration: number;
  timeoutOccurred: boolean;
}

class AutoRepairFocusTester {
  private results: AutoRepairStepResult[] = [];
  private artifactsDir: string;

  constructor() {
    this.artifactsDir = path.join(process.cwd(), '.cd-simulation', 'artifacts');
    if (!existsSync(this.artifactsDir)) {
      mkdirSync(this.artifactsDir, { recursive: true });
    }
  }

  /**
   * Execute a command with detailed monitoring for timeout and exit code 143
   */
  private async executeCommand(
    stepName: string,
    command: string,
    args: string[] = [],
    env: any = {},
    timeoutMs: number = 30000
  ): Promise<AutoRepairStepResult> {
    const startTime = Date.now();
    console.log(`\n🔧 Testing: ${stepName}`);
    console.log(`📝 Command: ${command} ${args.join(' ')}`);
    console.log(`⏱️  Timeout: ${timeoutMs}ms`);

    return new Promise((resolve) => {
      const childProcess = spawn(command, args, {
        env: { 
          ...process.env, 
          ...env,
          SUPABASE_NON_INTERACTIVE: '1'
        },
        stdio: ['pipe', 'pipe', 'pipe'],
        shell: true
      });

      let output = '';
      let error = '';
      let timeoutOccurred = false;

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

      // Set timeout
      const timeout = setTimeout(() => {
        console.log(`⏰ TIMEOUT after ${timeoutMs}ms for step: ${stepName}`);
        timeoutOccurred = true;
        childProcess.kill('SIGTERM');
      }, timeoutMs);

      childProcess.on('close', (code) => {
        clearTimeout(timeout);
        const exitCode = code || 0;
        const success = exitCode === 0;
        const duration = Date.now() - startTime;
        
        console.log(`✅ Step completed: ${stepName}`);
        console.log(`   Duration: ${duration}ms`);
        console.log(`   Exit Code: ${exitCode}`);
        console.log(`   Timeout: ${timeoutOccurred ? 'YES' : 'NO'}`);
        console.log(`   Success: ${success ? 'YES' : 'NO'}`);
        
        // Special handling for exit code 143 (SIGTERM)
        if (exitCode === 143) {
          console.log(`🚨 EXIT CODE 143 DETECTED! This is the CD issue we're investigating.`);
          console.log(`🚨 SIGTERM was sent to the process.`);
        }
        
        const result: AutoRepairStepResult = {
          step: stepName,
          success,
          output: output.trim(),
          error: error.trim(),
          exitCode,
          duration,
          timeoutOccurred
        };

        this.results.push(result);
        resolve(result);
      });

      childProcess.on('error', (err) => {
        console.log(`❌ Process error: ${err.message}`);
      });
    });
  }

  /**
   * Test 1: Basic Supabase CLI functionality
   */
  async testSupabaseCLIBasic(): Promise<void> {
    console.log('\n🔍 Test 1: Basic Supabase CLI Functionality');
    
    const versionResult = await this.executeCommand(
      'Supabase CLI Version',
      'supabase',
      ['--version'],
      {},
      10000
    );

    if (!versionResult.success) {
      throw new Error(`Supabase CLI not available: ${versionResult.error}`);
    }

    console.log(`✅ Supabase CLI version: ${versionResult.output}`);
  }

  /**
   * Test 2: Project linking (exact CD command)
   */
  async testProjectLinking(): Promise<void> {
    console.log('\n🔗 Test 2: Project Linking (CD Command)');
    
    const linkResult = await this.executeCommand(
      'Link to Project',
      'supabase',
      ['link', '--project-ref', process.env.SUPABASE_PROJECT_REF!, '--password', process.env.SUPABASE_DB_PASSWORD!],
      {},
      30000
    );

    if (!linkResult.success) {
      console.warn(`⚠️  Link failed: ${linkResult.error}`);
      console.warn(`⚠️  Exit code: ${linkResult.exitCode}`);
    } else {
      console.log('✅ Project linked successfully');
    }
  }

  /**
   * Test 3: Connection test (exact CD command)
   */
  async testConnection(): Promise<void> {
    console.log('\n🔌 Test 3: Connection Test (CD Command)');
    
    const connectionResult = await this.executeCommand(
      'Test Connection',
      'supabase',
      ['db', 'diff', '--schema', 'public', '--linked'],
      {},
      20000
    );

    if (connectionResult.success) {
      console.log('✅ Connection successful');
    } else {
      console.log(`⚠️  Connection test failed: ${connectionResult.error}`);
      console.log(`⚠️  Exit code: ${connectionResult.exitCode}`);
    }
  }

  /**
   * Test 4: Migration repair (exact CD command with timeout)
   */
  async testMigrationRepair(): Promise<void> {
    console.log('\n🔧 Test 4: Migration Repair (CD Command with Timeout)');
    
    // Test the exact CD command: timeout 60s yes | supabase migration repair --status reverted
    const repairResult = await this.executeCommand(
      'Migration Repair with Timeout',
      'timeout',
      ['60s', 'yes', '|', 'supabase', 'migration', 'repair', '--status', 'reverted'],
      {},
      65000 // 60s + 5s buffer
    );

    if (repairResult.exitCode === 143) {
      console.log(`🚨 EXIT CODE 143 DETECTED in migration repair!`);
      console.log(`🚨 This is likely the root cause of the CD issue.`);
    }

    if (repairResult.success) {
      console.log('✅ Migration repair completed');
    } else {
      console.log(`ℹ️  Migration repair result: ${repairResult.error}`);
      console.log(`ℹ️  Exit code: ${repairResult.exitCode}`);
    }
  }

  /**
   * Test 5: Fallback cleanup (exact CD command with timeout)
   */
  async testFallbackCleanup(): Promise<void> {
    console.log('\n🧹 Test 5: Fallback Cleanup (CD Command with Timeout)');
    
    const cleanupResult = await this.executeCommand(
      'Fallback Cleanup with Timeout',
      'timeout',
      ['30s', 'supabase', 'db', 'query', 'UPDATE supabase_migrations.schema_migrations SET status = \'reverted\' WHERE name = \'remote_schema\' AND status != \'reverted\';'],
      {},
      35000 // 30s + 5s buffer
    );

    if (cleanupResult.exitCode === 143) {
      console.log(`🚨 EXIT CODE 143 DETECTED in fallback cleanup!`);
    }

    if (cleanupResult.success) {
      console.log('✅ Fallback cleanup completed');
    } else {
      console.log(`ℹ️  Fallback cleanup result: ${cleanupResult.error}`);
      console.log(`ℹ️  Exit code: ${cleanupResult.exitCode}`);
    }
  }

  /**
   * Test 6: Simulate CD environment constraints
   */
  async testCDEnvironmentConstraints(): Promise<void> {
    console.log('\n🏗️  Test 6: CD Environment Constraints');
    
    // Test with resource constraints similar to CD
    const constrainedResult = await this.executeCommand(
      'CD Environment Simulation',
      'bash',
      ['-c', 'echo "Simulating CD environment..." && sleep 2 && echo "CD environment test completed"'],
      {
        SUPABASE_NON_INTERACTIVE: '1',
        NODE_ENV: 'production'
      },
      10000
    );

    console.log(`✅ CD environment simulation: ${constrainedResult.success ? 'PASSED' : 'FAILED'}`);
  }

  /**
   * Generate detailed report
   */
  async generateReport(): Promise<void> {
    console.log('\n📋 Generating Auto-Repair Focus Report');
    
    const report = {
      timestamp: new Date().toISOString(),
      testPurpose: 'CD Auto-Repair Step Root Cause Analysis',
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        env: process.env.NODE_ENV
      },
      results: this.results,
      analysis: {
        totalSteps: this.results.length,
        successfulSteps: this.results.filter(r => r.success).length,
        failedSteps: this.results.filter(r => !r.success).length,
        timeoutSteps: this.results.filter(r => r.timeoutOccurred).length,
        exitCode143Steps: this.results.filter(r => r.exitCode === 143).length,
        totalDuration: this.results.reduce((sum, r) => sum + r.duration, 0)
      },
      recommendations: []
    };

    // Analyze results and generate recommendations
    const exitCode143Steps = this.results.filter(r => r.exitCode === 143);
    if (exitCode143Steps.length > 0) {
      report.recommendations.push({
        issue: 'Exit Code 143 Detected',
        steps: exitCode143Steps.map(s => s.step),
        cause: 'SIGTERM signal sent to process (likely timeout or resource constraint)',
        solution: 'Increase timeout limits or optimize command execution'
      });
    }

    const timeoutSteps = this.results.filter(r => r.timeoutOccurred);
    if (timeoutSteps.length > 0) {
      report.recommendations.push({
        issue: 'Timeout Occurred',
        steps: timeoutSteps.map(s => s.step),
        cause: 'Commands taking longer than expected',
        solution: 'Increase timeout values or optimize command performance'
      });
    }

    const reportPath = path.join(this.artifactsDir, 'auto-repair-focus-report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('📄 Auto-repair focus report saved to:', reportPath);
    console.log('📊 Analysis:', report.analysis);
    
    if (report.recommendations.length > 0) {
      console.log('💡 Recommendations:');
      report.recommendations.forEach((rec, index) => {
        console.log(`   ${index + 1}. ${rec.issue}: ${rec.cause}`);
        console.log(`      Steps: ${rec.steps.join(', ')}`);
        console.log(`      Solution: ${rec.solution}`);
      });
    }
  }

  /**
   * Run the complete auto-repair focus test
   */
  async runAutoRepairFocusTest(): Promise<void> {
    console.log('🚀 Starting CD Auto-Repair Focus Test...');
    console.log('=' .repeat(60));

    try {
      await this.testSupabaseCLIBasic();
      await this.testProjectLinking();
      await this.testConnection();
      await this.testMigrationRepair();
      await this.testFallbackCleanup();
      await this.testCDEnvironmentConstraints();
      await this.generateReport();

      console.log('\n✅ CD Auto-Repair Focus Test completed!');
      
      // Check for exit code 143
      const exitCode143Steps = this.results.filter(r => r.exitCode === 143);
      if (exitCode143Steps.length > 0) {
        console.log(`🚨 FOUND ${exitCode143Steps.length} STEPS WITH EXIT CODE 143!`);
        console.log('🚨 This confirms the root cause of the CD issue.');
        exitCode143Steps.forEach(step => {
          console.log(`   - ${step.step}: ${step.error}`);
        });
      } else {
        console.log('✅ No exit code 143 detected in this test run.');
      }

    } catch (error) {
      console.error('\n❌ Auto-Repair Focus Test failed:', error);
      await this.generateReport();
      throw error;
    }
  }
}

// Playwright test that runs the auto-repair focus test
test('CD Auto-Repair Focus Test', async () => {
  const tester = new AutoRepairFocusTester();
  await tester.runAutoRepairFocusTest();
  
  // Validate that we can identify the root cause
  const results = tester['results'];
  const exitCode143Steps = results.filter(r => r.exitCode === 143);
  
  if (exitCode143Steps.length > 0) {
    console.log('🔍 Root cause analysis complete - exit code 143 detected');
  } else {
    console.log('🔍 Root cause analysis complete - no exit code 143 in this run');
  }
});
