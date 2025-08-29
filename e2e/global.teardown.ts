import { FullConfig } from '@playwright/test';
import { clearStorageStates } from './fixtures/auth';
import fs from 'fs';
import path from 'path';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up global test environment...');

  try {
    // Clear authentication storage states
    clearStorageStates();
    console.log('🗑️  Cleared authentication storage states');

    // Clean up test artifacts
    const testArtifacts = [
      'test-results',
      'playwright-report',
      'test-artifacts'
    ];

    for (const artifact of testArtifacts) {
      if (fs.existsSync(artifact)) {
        fs.rmSync(artifact, { recursive: true, force: true });
        console.log(`🗑️  Cleared ${artifact} directory`);
      }
    }

    // Clean up temporary files
    const tempFiles = [
      '.auth',
      'tmp'
    ];

    for (const tempDir of tempFiles) {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
        console.log(`🗑️  Cleared ${tempDir} directory`);
      }
    }

    console.log('✅ Global teardown complete');
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw error in teardown to avoid masking test failures
  }
}

export default globalTeardown;
