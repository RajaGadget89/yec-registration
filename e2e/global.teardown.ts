import { execSync } from 'child_process';

async function globalTeardown() {
  console.log('🧹 Starting E2E Global Teardown...');

  try {
    // Run Supabase E2E teardown
    console.log('🛑 Stopping Supabase and cleaning up...');
    execSync('tsx scripts/supabase-e2e-teardown.ts', {
      stdio: 'inherit',
      env: { ...process.env }
    });

    console.log('✅ E2E Global Teardown completed successfully!');
  } catch (error) {
    console.error('❌ E2E Global Teardown failed:', error);
    // Don't throw error as teardown should be best effort
  }
}

export default globalTeardown;
