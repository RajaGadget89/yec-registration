#!/usr/bin/env node

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../../../..');

// Required files per AC
const REQUIRED_FILES = {
  AC4: [
    'before.json',
    'accept-first.json', 
    'accepted.json',
    'accept-second.json',
    'token-reuse-second-attempt.png',
    'after.json',
    'token-reuse-test.json'
  ],
  AC7: [
    'deep-link-form-prefilled.png',
    'form-lock-analysis.json',
    'status_after_submit.json'
  ],
  AC8: [
    'approved-badge.png',
    'final-status.json'
  ],
  AC9: [
    'rejection-confirm-dialog.png',
    'final-status.json'
  ]
};

function getLatestArtifactDir(acName) {
  const acDir = join(projectRoot, 'artifacts', acName);
  if (!existsSync(acDir)) return null;
  
  const dirs = readdirSync(acDir)
    .filter(name => statSync(join(acDir, name)).isDirectory())
    .sort()
    .reverse();
    
  return dirs.length > 0 ? join(acDir, dirs[0]) : null;
}

function checkFileExists(filePath) {
  return existsSync(filePath);
}

function scanMissingArtifacts() {
  const missing = {};
  
  for (const [acName, requiredFiles] of Object.entries(REQUIRED_FILES)) {
    const latestDir = getLatestArtifactDir(acName);
    missing[acName] = [];
    
    if (!latestDir) {
      // No artifacts exist for this AC
      missing[acName] = requiredFiles;
      continue;
    }
    
    for (const fileName of requiredFiles) {
      const filePath = join(latestDir, fileName);
      if (!checkFileExists(filePath)) {
        missing[acName].push(fileName);
      }
    }
  }
  
  return missing;
}

function printScanResults(missing) {
  console.log('\n🔍 P0 Delta Scanner Results\n');
  console.log('┌─────┬─────────────────────────────────────────────────────────┐');
  console.log('│ AC  │ Missing Files                                           │');
  console.log('├─────┼─────────────────────────────────────────────────────────┤');
  
  for (const [acName, files] of Object.entries(missing)) {
    const status = files.length === 0 ? '✅ COMPLETE' : `❌ ${files.length} missing`;
    const filesList = files.length > 0 ? files.join(', ') : 'All present';
    
    console.log(`│ ${acName.padEnd(3)} │ ${status.padEnd(51)} │`);
    if (files.length > 0) {
      console.log(`│     │ ${filesList.padEnd(51)} │`);
    }
  }
  
  console.log('└─────┴─────────────────────────────────────────────────────────┘');
  
  const totalMissing = Object.values(missing).reduce((sum, files) => sum + files.length, 0);
  console.log(`\n📊 Total missing files: ${totalMissing}`);
  
  if (totalMissing === 0) {
    console.log('🎉 All P0 evidence is complete!');
  } else {
    console.log('📝 Will collect missing artifacts only.');
  }
}

async function main() {
  console.log('🚀 P0 Delta Evidence Scanner');
  console.log('============================');
  
  const missing = scanMissingArtifacts();
  
  // Write missing artifacts to file
  const outputPath = join(projectRoot, 'artifacts', '_handover', 'p0_missing.json');
  const outputDir = dirname(outputPath);
  
  if (!existsSync(outputDir)) {
    console.log(`Creating output directory: ${outputDir}`);
    mkdirSync(outputDir, { recursive: true });
  }
  
  const output = {
    timestamp: new Date().toISOString(),
    missing,
    summary: {
      totalMissing: Object.values(missing).reduce((sum, files) => sum + files.length, 0),
      acsWithMissing: Object.entries(missing).filter(([, files]) => files.length > 0).map(([ac]) => ac)
    }
  };
  
  try {
    writeFileSync(outputPath, JSON.stringify(output, null, 2));
    console.log(`\n💾 Missing artifacts saved to: ${outputPath}`);
  } catch (error) {
    console.error('❌ Failed to write missing artifacts file:', error.message);
    process.exit(1);
  }
  
  printScanResults(missing);
  
  // Print collection commands
  const acsToCollect = Object.entries(missing).filter(([, files]) => files.length > 0);
  if (acsToCollect.length > 0) {
    console.log('\n🎯 Collection Commands:');
    console.log('======================');
    
    const specs = acsToCollect.map(([ac]) => `tests/e2e/${ac.toLowerCase()}_*_ui_only.spec.ts`).join(' ');
    console.log(`npx playwright test ${specs} --config=playwright.e2e.config.ts --reporter=line --workers=1`);
  }
}

main();
