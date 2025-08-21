import { execSync } from 'child_process';
import { existsSync, rmSync } from 'fs';
import path from 'path';

async function cdSimulationTeardown() {
  console.log('🧹 Starting CD Environment Simulation Teardown...');

  try {
    // 1. Clean up CD simulation artifacts
    const cdWorkDir = path.join(process.cwd(), '.cd-simulation');
    if (existsSync(cdWorkDir)) {
      console.log('🗑️  Cleaning up CD simulation artifacts...');
      rmSync(cdWorkDir, { recursive: true, force: true });
      console.log('✅ CD simulation artifacts cleaned up');
    }

    // 2. Clean up temporary CD environment file
    const cdEnvFile = path.join(process.cwd(), '.cd-env');
    if (existsSync(cdEnvFile)) {
      console.log('🗑️  Cleaning up CD environment file...');
      rmSync(cdEnvFile, { force: true });
      console.log('✅ CD environment file cleaned up');
    }

    // 3. Unlink Supabase project (if linked)
    try {
      console.log('🔗 Unlinking Supabase project...');
      execSync('supabase unlink', { stdio: 'pipe' });
      console.log('✅ Supabase project unlinked');
    } catch (error) {
      console.log('ℹ️  No Supabase project linked to unlink');
    }

    // 4. Clean up any temporary files
    const tempFiles = [
      'migration_diff.txt',
      'cd-simulation-report.json',
      'cd-simulation-report.jsonl'
    ];

    tempFiles.forEach(file => {
      const filePath = path.join(process.cwd(), file);
      if (existsSync(filePath)) {
        console.log(`🗑️  Cleaning up temporary file: ${file}`);
        rmSync(filePath, { force: true });
      }
    });

    console.log('✅ CD Environment Simulation Teardown completed successfully!');

  } catch (error) {
    console.error('❌ CD Environment Simulation Teardown failed:', error);
    // Don't throw error in teardown to avoid masking test failures
  }
}

export default cdSimulationTeardown;
