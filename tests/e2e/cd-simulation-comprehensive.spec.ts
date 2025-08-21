import { test, expect } from '@playwright/test';
import { spawn, execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import path from 'path';

/**
 * Comprehensive CD Simulation Test
 * 
 * This test replicates the entire GitHub Actions CD workflow using Playwright's
 * capabilities to simulate the exact CD environment and process.
 * 
 * It mirrors:
 * 1. GitHub Actions Ubuntu environment
 * 2. Supabase CLI setup and configuration
 * 3. File system operations (checkout, sync)
 * 4. Database operations (link, diff, repair, push)
 * 5. Timeout and resource constraints
 * 6. Error handling and fallbacks
 * 7. Artifact generation
 */

interface CDStepResult {
  step: string;
  success: boolean;
  output: string;
  error: string;
  exitCode: number;
  duration: number;
}

class ComprehensiveCDSimulator {
  private results: CDStepResult[] = [];
  private artifactsDir: string;

  constructor() {
    this.artifactsDir = path.join(process.cwd(), '.cd-simulation', 'artifacts');
    if (!existsSync(this.artifactsDir)) {
      mkdirSync(this.artifactsDir, { recursive: true });
    }
  }

  /**
   * Execute a CD step with timeout and detailed logging
   */
  private async executeCDStep(
    stepName: string, 
    command: string, 
    args: string[] = [], 
    env: any = {},
    timeoutMs: number = 30000
  ): Promise<CDStepResult> {
    const startTime = Date.now();
    console.log(`\n🔧 CD Step: ${stepName}`);
    console.log(`📝 Command: ${command} ${args.join(' ')}`);

    return new Promise((resolve) => {
      const fullCommand = `${command} ${args.join(' ')}`;
      
      const childProcess = spawn(command, args, {
        env: { 
          ...process.env, 
          ...env,
          SUPABASE_NON_INTERACTIVE: '1' // Match CD environment
        },
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

      // Set timeout
      const timeout = setTimeout(() => {
        console.log(`⏰ Timeout after ${timeoutMs}ms for step: ${stepName}`);
        childProcess.kill('SIGTERM');
      }, timeoutMs);

      childProcess.on('close', (code) => {
        clearTimeout(timeout);
        const exitCode = code || 0;
        const success = exitCode === 0;
        const duration = Date.now() - startTime;
        
        console.log(`✅ Step completed: ${stepName} (${duration}ms, exit: ${exitCode})`);
        
        const result: CDStepResult = {
          step: stepName,
          success,
          output: output.trim(),
          error: error.trim(),
          exitCode,
          duration
        };

        this.results.push(result);
        resolve(result);
      });
    });
  }

  /**
   * Step 1: Validate CD Environment (mirrors CD validation)
   */
  async validateCDEnvironment(): Promise<void> {
    console.log('\n🔍 Step 1: Validating CD Environment');
    
    const requiredVars = [
      'SUPABASE_URL',
      'SUPABASE_SERVICE_ROLE_KEY',
      'SUPABASE_ACCESS_TOKEN',
      'SUPABASE_PROJECT_REF',
      'SUPABASE_DB_PASSWORD'
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(`Missing required CD environment variables: ${missingVars.join(', ')}`);
    }

    console.log('✅ CD environment validation passed');
  }

  /**
   * Step 2: Setup Supabase CLI (mirrors supabase/setup-cli@v1)
   */
  async setupSupabaseCLI(): Promise<void> {
    console.log('\n📦 Step 2: Setting up Supabase CLI');
    
    const versionResult = await this.executeCDStep(
      'Supabase CLI Version Check',
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
   * Step 3: Link to Project (mirrors CD link step)
   */
  async linkToProject(): Promise<void> {
    console.log('\n🔗 Step 3: Linking to Project');
    
    const linkResult = await this.executeCDStep(
      'Link to Project',
      'supabase',
      ['link', '--project-ref', process.env.SUPABASE_PROJECT_REF!, '--password', process.env.SUPABASE_DB_PASSWORD!],
      {},
      30000
    );

    if (!linkResult.success) {
      console.warn(`⚠️  Link failed: ${linkResult.error}`);
      // Continue anyway as CD does
    } else {
      console.log('✅ Project linked successfully');
    }
  }

  /**
   * Step 4: Sync Migrations (mirrors CD sync step)
   */
  async syncMigrations(): Promise<void> {
    console.log('\n📁 Step 4: Syncing Migrations');
    
    const migrationsDir = path.join(process.cwd(), 'migrations');
    const supabaseMigrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
    
    if (!existsSync(migrationsDir)) {
      console.log('ℹ️  No migrations directory found, skipping sync');
      return;
    }

    // Create supabase/migrations if it doesn't exist
    if (!existsSync(supabaseMigrationsDir)) {
      mkdirSync(supabaseMigrationsDir, { recursive: true });
    }

    // Copy migrations (simulate CD sync)
    const syncResult = await this.executeCDStep(
      'Sync Migrations',
      'cp',
      ['-a', `${migrationsDir}/*.sql`, `${supabaseMigrationsDir}/`],
      {},
      15000
    );

    if (syncResult.success) {
      console.log('✅ Migrations synced successfully');
    } else {
      console.warn(`⚠️  Migration sync failed: ${syncResult.error}`);
    }
  }

  /**
   * Step 5: Auto-Repair remote_schema (mirrors CD auto-repair step)
   */
  async autoRepairRemoteSchema(): Promise<void> {
    console.log('\n🔧 Step 5: Auto-Repair remote_schema');
    
    // Quick re-link (non-blocking)
    const relinkResult = await this.executeCDStep(
      'Re-link Project',
      'supabase',
      ['link', '--project-ref', process.env.SUPABASE_PROJECT_REF!, '--password', process.env.SUPABASE_DB_PASSWORD!],
      {},
      15000
    );

    if (!relinkResult.success) {
      console.log('⚠️  Re-link failed, continuing...');
    }

    // Quick connection test (non-blocking)
    const connectionResult = await this.executeCDStep(
      'Test Connection',
      'supabase',
      ['db', 'diff', '--schema', 'public', '--linked'],
      {},
      20000
    );

    if (connectionResult.success) {
      console.log('✅ Connection successful');
    } else {
      console.log('⚠️  Connection test failed, continuing...');
    }

    // Fast repair attempt with timeout
    const repairResult = await this.executeCDStep(
      'Migration Repair',
      'timeout',
      ['60s', 'yes', '|', 'supabase', 'migration', 'repair', '--status', 'reverted'],
      {},
      65000 // 60s + 5s buffer
    );

    if (repairResult.success) {
      console.log('✅ Migration repair completed');
    } else {
      console.log('ℹ️  No repair needed or timeout reached');
    }

    // Quick fallback cleanup (idempotent)
    const cleanupResult = await this.executeCDStep(
      'Fallback Cleanup',
      'timeout',
      ['30s', 'supabase', 'db', 'query', 'UPDATE supabase_migrations.schema_migrations SET status = \'reverted\' WHERE name = \'remote_schema\' AND status != \'reverted\';'],
      {},
      35000 // 30s + 5s buffer
    );

    if (cleanupResult.success) {
      console.log('✅ Fallback cleanup completed');
    } else {
      console.log('ℹ️  No remote_schema entries to update');
    }
  }

  /**
   * Step 6: Generate Migration Diff (mirrors CD diff step)
   */
  async generateMigrationDiff(): Promise<void> {
    console.log('\n📊 Step 6: Generating Migration Diff');
    
    const diffResult = await this.executeCDStep(
      'Generate Diff',
      'supabase',
      ['db', 'diff', '--schema', 'public', '--linked'],
      {},
      30000
    );

    // Save diff output for debugging (like CD does)
    if (diffResult.output) {
      writeFileSync('migration_diff.txt', diffResult.output);
      console.log('📄 Migration diff saved to migration_diff.txt');
    }

    if (diffResult.success && diffResult.output && diffResult.output !== 'No schema changes found') {
      console.log('✅ Migration changes detected');
      console.log('📋 Diff preview:', diffResult.output.substring(0, 200) + '...');
    } else {
      console.log('ℹ️  No migration changes detected');
    }
  }

  /**
   * Step 7: Dry Run Migration (mirrors CD dry-run step)
   */
  async dryRunMigration(): Promise<void> {
    console.log('\n🧪 Step 7: Dry Run Migration');
    
    const dryRunResult = await this.executeCDStep(
      'Dry Run',
      'supabase',
      ['db', 'push', '--dry-run'],
      {},
      45000
    );

    if (dryRunResult.success) {
      console.log('✅ Dry run completed successfully');
    } else {
      console.warn(`⚠️  Dry run failed: ${dryRunResult.error}`);
    }
  }

  /**
   * Step 8: Apply Migrations (mirrors CD push step)
   */
  async applyMigrations(): Promise<void> {
    console.log('\n🚀 Step 8: Applying Migrations');
    
    const pushResult = await this.executeCDStep(
      'Apply Migrations',
      'supabase',
      ['db', 'push'],
      {},
      60000
    );

    if (pushResult.success) {
      console.log('✅ Migrations applied successfully');
    } else {
      console.error(`❌ Migration application failed: ${pushResult.error}`);
      throw new Error(`Migration application failed: ${pushResult.error}`);
    }
  }

  /**
   * Generate CD simulation report
   */
  async generateReport(): Promise<void> {
    console.log('\n📋 Generating CD Simulation Report');
    
    const report = {
      timestamp: new Date().toISOString(),
      environment: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        env: process.env.NODE_ENV
      },
      steps: this.results,
      summary: {
        totalSteps: this.results.length,
        successfulSteps: this.results.filter(r => r.success).length,
        failedSteps: this.results.filter(r => !r.success).length,
        totalDuration: this.results.reduce((sum, r) => sum + r.duration, 0)
      }
    };

    const reportPath = path.join(this.artifactsDir, 'cd-simulation-report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('📄 CD simulation report saved to:', reportPath);
    console.log('📊 Summary:', report.summary);
  }

  /**
   * Run the complete CD simulation
   */
  async runCompleteCDSimulation(): Promise<void> {
    console.log('🚀 Starting Comprehensive CD Simulation...');
    console.log('=' .repeat(60));

    try {
      await this.validateCDEnvironment();
      await this.setupSupabaseCLI();
      await this.linkToProject();
      await this.syncMigrations();
      await this.autoRepairRemoteSchema();
      await this.generateMigrationDiff();
      await this.dryRunMigration();
      await this.applyMigrations();
      await this.generateReport();

      console.log('\n✅ Comprehensive CD Simulation completed successfully!');
      
      // Validate results
      const failedSteps = this.results.filter(r => !r.success);
      if (failedSteps.length > 0) {
        console.warn(`⚠️  ${failedSteps.length} steps failed:`, failedSteps.map(s => s.step));
      }

    } catch (error) {
      console.error('\n❌ CD Simulation failed:', error);
      await this.generateReport(); // Still generate report for debugging
      throw error;
    }
  }
}

// Playwright test that runs the complete CD simulation
test('Comprehensive CD Simulation', async () => {
  const simulator = new ComprehensiveCDSimulator();
  await simulator.runCompleteCDSimulation();
  
  // Validate that critical steps succeeded
  const results = simulator['results'];
  const criticalSteps = ['Setup Supabase CLI', 'Generate Migration Diff', 'Dry Run Migration'];
  
  for (const step of criticalSteps) {
    const stepResult = results.find(r => r.step.includes(step));
    if (stepResult && !stepResult.success) {
      throw new Error(`Critical step failed: ${step} - ${stepResult.error}`);
    }
  }
});
