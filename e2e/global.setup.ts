import { execSync } from 'child_process';
import { existsSync } from 'fs';

async function globalSetup() {
  console.log('🌍 Starting E2E Global Setup...');

  try {
    // 1. Run Supabase E2E setup
    console.log('📦 Setting up Supabase...');
    execSync('tsx scripts/supabase-e2e-setup.ts', {
      stdio: 'inherit',
      env: { ...process.env }
    });

    // 2. Start the app unless SKIP_APP_START is set
    if (!process.env.SKIP_APP_START) {
      console.log('🚀 Starting application...');
      execSync('tsx scripts/app-start.ts', {
        stdio: 'inherit',
        env: { ...process.env }
      });
    } else {
      console.log('⏭️  Skipping app start (SKIP_APP_START=1)');
    }

    console.log('✅ E2E Global Setup completed successfully!');
  } catch (error) {
    console.error('❌ E2E Global Setup failed:', error);
    throw error;
  }
}

export default globalSetup;
