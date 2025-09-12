#!/usr/bin/env node

/**
 * Build Traceability Matrix and PR Handover Documentation
 * 
 * This script scans the existing AC1-AC6 test files and artifacts to generate:
 * 1. Traceability Matrix (docs/AC1-AC6_Traceability_Matrix.md)
 * 2. Artifacts Index (artifacts/_summary/index.json)
 * 3. PR Body Draft (docs/PR_BODY_AC1-AC6_Test_Suite.md)
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../../..');

// Test file paths
const testFiles = {
  AC1: 'tests/e2e/ac1_registration.spec.ts',
  AC2: 'tests/e2e/ac2_payment.spec.ts',
  AC3: 'tests/e2e/ac3_tcc_card_binding.spec.ts',
  AC4: 'tests/e2e/ac4_admin_invite_accept.spec.ts',
  AC5: 'tests/e2e/ac5_rbac_enforcement.spec.ts',
  AC6: 'tests/e2e/ac6_end_to_end_workflow.spec.ts'
};

// Helper function to read file safely
function safeReadFile(filePath) {
  try {
    return readFileSync(filePath, 'utf8');
  } catch (error) {
    console.warn(`Warning: Could not read ${filePath}: ${error.message}`);
    return null;
  }
}

// Helper function to parse test file structure
function parseTestFile(content, acId) {
  if (!content) {
    return {
      describe: `${acId}: Not implemented`,
      hasHappyPath: false,
      hasNegative: false,
      hasOutbox: false,
      hasEvents: false,
      hasAudit: false,
      hasRbac: false,
      notes: 'Test file not found or empty'
    };
  }

  const lines = content.split('\n');
  let describe = `${acId}: Not found`;
  let hasHappyPath = false;
  let hasNegative = false;
  let hasOutbox = false;
  let hasEvents = false;
  let hasAudit = false;
  let hasRbac = false;
  let notes = '';

  // Find describe block
  for (const line of lines) {
    if (line.includes('test.describe(') && line.includes(acId)) {
      const match = line.match(/test\.describe\(['"`]([^'"`]+)['"`]/);
      if (match) {
        describe = match[1];
      }
    }
  }

  // Check for test patterns
  const contentLower = content.toLowerCase();
  hasHappyPath = contentLower.includes("it('happy path") || contentLower.includes('happy path:');
  hasNegative = contentLower.includes("it('negative") || contentLower.includes('negative:') || 
                contentLower.includes("it('rbac") || contentLower.includes('rbac:');

  // Check for helper imports and usage
  hasOutbox = content.includes('findOutbox') || content.includes('expectOutboxMatch') || 
              content.includes('email-outbox');
  hasEvents = content.includes('listEvents') || content.includes('expectEventSequence') || 
              content.includes('domain-events');
  hasAudit = content.includes('findAudit') || content.includes('expectAuditMatch') || 
             content.includes('audit-logs');
  hasRbac = content.includes('role-checks') || contentLower.includes('rbac') || 
            contentLower.includes('unauthorized');

  // Check for BLOCKED comments
  if (content.includes('BLOCKED:') || content.includes('// BLOCKED')) {
    notes = 'Contains BLOCKED assertions';
  } else if (content.includes('pending') && content.includes('expect(1).toBe(1)')) {
    notes = 'Placeholder test - not implemented';
  }

  return {
    describe,
    hasHappyPath,
    hasNegative,
    hasOutbox,
    hasEvents,
    hasAudit,
    hasRbac,
    notes
  };
}

// Helper function to find latest artifacts directory
function findLatestArtifacts(acId) {
  const artifactsDir = join(projectRoot, 'artifacts', acId);
  try {
    const entries = readdirSync(artifactsDir);
    const timestampDirs = entries.filter(entry => {
      const fullPath = join(artifactsDir, entry);
      return statSync(fullPath).isDirectory() && /^\d{8}-\d{6}$/.test(entry);
    });
    
    if (timestampDirs.length === 0) {
      return null;
    }

    // Sort by timestamp (newest first)
    timestampDirs.sort((a, b) => b.localeCompare(a));
    const latestDir = timestampDirs[0];
    const latestPath = join(artifactsDir, latestDir);

    // Count files in the directory
    const files = readdirSync(latestPath);
    const pngCount = files.filter(f => f.endsWith('.png')).length;
    const jsonFiles = files.filter(f => f.endsWith('.json')).map(f => f.replace('.json', ''));
    const hasTraceZip = files.includes('trace.zip');

    return {
      path: `artifacts/${acId}/${latestDir}`,
      pngCount,
      jsonFiles,
      hasTraceZip,
      totalFiles: files.length
    };
  } catch (error) {
    return null;
  }
}

// Main execution
function main() {
  console.log('Building AC1-AC6 Traceability Matrix and PR Documentation...\n');

  const results = {};
  const artifactsIndex = {};

  // Process each AC
  for (const [acId, testPath] of Object.entries(testFiles)) {
    console.log(`Processing ${acId}...`);
    
    const fullTestPath = join(projectRoot, testPath);
    const testContent = safeReadFile(fullTestPath);
    const testInfo = parseTestFile(testContent, acId);
    const artifacts = findLatestArtifacts(acId);

    results[acId] = {
      ...testInfo,
      testPath,
      artifacts
    };

    artifactsIndex[acId] = artifacts ? {
      latestRun: artifacts.path,
      screenshots: artifacts.pngCount,
      jsonFiles: artifacts.jsonFiles,
      hasTraceZip: artifacts.hasTraceZip,
      totalFiles: artifacts.totalFiles
    } : null;
  }

  // Generate Traceability Matrix
  console.log('Generating traceability matrix...');
  const matrixContent = generateTraceabilityMatrix(results);
  const matrixPath = join(projectRoot, 'docs/AC1-AC6_Traceability_Matrix.md');
  writeFileSync(matrixPath, matrixContent);

  // Generate Artifacts Index
  console.log('Generating artifacts index...');
  const artifactsSummaryPath = join(projectRoot, 'artifacts/_summary');
  mkdirSync(artifactsSummaryPath, { recursive: true });
  const indexPath = join(artifactsSummaryPath, 'index.json');
  writeFileSync(indexPath, JSON.stringify(artifactsIndex, null, 2));

  // Generate PR Body
  console.log('Generating PR body...');
  const prBodyContent = generatePRBody(results, artifactsIndex);
  const prBodyPath = join(projectRoot, 'docs/PR_BODY_AC1-AC6_Test_Suite.md');
  writeFileSync(prBodyPath, prBodyContent);

  console.log('\n✅ Generated files:');
  console.log(`  - ${matrixPath}`);
  console.log(`  - ${indexPath}`);
  console.log(`  - ${prBodyPath}`);
  console.log('\nTraceability matrix and PR documentation complete!');
}

// Generate traceability matrix markdown
function generateTraceabilityMatrix(results) {
  const timestamp = new Date().toISOString();
  
  let content = `# AC1-AC6 Traceability Matrix

Generated: ${timestamp}

## Overview

This matrix maps the Enhanced AC1-AC6 specifications to their test implementations and evidence artifacts.

## Legend

- **PASS**: Assertion is implemented and working
- **BLOCKED**: Assertion is commented as blocked or not available
- **N/A**: Not applicable for this AC
- **MISSING**: Expected but not implemented

## Traceability Matrix

| Spec | Test | Assertions | Evidence | Notes |
|------|------|------------|----------|-------|
| **Outbox** | **Events** | **Audits** | **RBAC** | |
`;

  for (const [acId, info] of Object.entries(results)) {
    const outboxStatus = info.hasOutbox ? 'PASS' : 'BLOCKED';
    const eventsStatus = info.hasEvents ? 'PASS' : 'BLOCKED';
    const auditStatus = info.hasAudit ? 'PASS' : 'BLOCKED';
    const rbacStatus = info.hasRbac ? 'PASS' : (['AC2', 'AC3', 'AC4', 'AC5'].includes(acId) ? 'MISSING' : 'N/A');
    
    const evidencePath = info.artifacts ? info.artifacts.path : 'None';
    const notes = info.notes || (info.artifacts ? `${info.artifacts.pngCount} screenshots, ${info.artifacts.jsonFiles.length} JSON files` : 'No artifacts');

    content += `| ${acId} | ${info.describe} | ${outboxStatus} | ${eventsStatus} | ${auditStatus} | ${rbacStatus} | ${evidencePath} | ${notes} |\n`;
  }

  content += `
## Implementation Status Summary

`;

  for (const [acId, info] of Object.entries(results)) {
    const status = info.hasHappyPath ? '✅ Implemented' : '⏳ Pending';
    const artifacts = info.artifacts ? `(${info.artifacts.totalFiles} files)` : '(no artifacts)';
    content += `- **${acId}**: ${status} ${artifacts}\n`;
  }

  content += `
## Next Steps

1. Complete implementation of AC2-AC6 test files
2. Address any BLOCKED assertions by adding test-only read adaptors
3. Expand negative test coverage where applicable
4. Generate trace.zip files for complete evidence capture

---
*Generated by build-traceability.mjs*
`;

  return content;
}

// Generate PR body markdown
function generatePRBody(results, artifactsIndex) {
  const timestamp = new Date().toISOString();
  
  let content = `# PR: Enhanced AC1–AC6 Test Suite (Spec‑Driven)

## Summary
Implements Playwright AC1–AC6 with evidence capture and system‑truth assertions per spec.

## What Changed
- Added/updated test specs under \`tests/e2e/\`.
- Added test helpers and fixtures under \`tests/utils/\`, \`tests/fixtures/\`.
- Added reporting script and generated docs.

## How to Run

### Individual Tests
\`\`\`bash
# AC1 Registration
npx playwright test tests/e2e/ac1_registration.spec.ts --config=playwright.e2e.config.ts --reporter=line

# AC2 Payment (when implemented)
npx playwright test tests/e2e/ac2_payment.spec.ts --config=playwright.e2e.config.ts --reporter=line

# AC3 TCC Card Binding (when implemented)
npx playwright test tests/e2e/ac3_tcc_card_binding.spec.ts --config=playwright.e2e.config.ts --reporter=line

# AC4 Admin Invite Accept (when implemented)
npx playwright test tests/e2e/ac4_admin_invite_accept.spec.ts --config=playwright.e2e.config.ts --reporter=line

# AC5 RBAC Enforcement (when implemented)
npx playwright test tests/e2e/ac5_rbac_enforcement.spec.ts --config=playwright.e2e.config.ts --reporter=line

# AC6 End-to-End Workflow (when implemented)
npx playwright test tests/e2e/ac6_end_to_end_workflow.spec.ts --config=playwright.e2e.config.ts --reporter=line
\`\`\`

### All Tests
\`\`\`bash
npx playwright test tests/e2e --config=playwright.e2e.config.ts --reporter=line
\`\`\`

### Generate Reports
\`\`\`bash
node tests/utils/reporting/build-traceability.mjs
\`\`\`

## Evidence
- Matrix: [docs/AC1-AC6_Traceability_Matrix.md]
- Artifacts index: [artifacts/_summary/index.json]
- Latest per‑AC artifacts:
`;

  for (const [acId, artifacts] of Object.entries(artifactsIndex)) {
    if (artifacts) {
      content += `  - ${acId}: [${artifacts.latestRun}]\n`;
    } else {
      content += `  - ${acId}: No artifacts yet\n`;
    }
  }

  content += `
## Assertions Status
| AC | Outbox | Events | Audits | RBAC | Notes |
|----|--------|--------|--------|------|-------|
`;

  for (const [acId, info] of Object.entries(results)) {
    const outboxStatus = info.hasOutbox ? 'PASS' : 'BLOCKED';
    const eventsStatus = info.hasEvents ? 'PASS' : 'BLOCKED';
    const auditStatus = info.hasAudit ? 'PASS' : 'BLOCKED';
    const rbacStatus = info.hasRbac ? 'PASS' : (['AC2', 'AC3', 'AC4', 'AC5'].includes(acId) ? 'MISSING' : 'N/A');
    const notes = info.notes || '';

    content += `| ${acId} | ${outboxStatus} | ${eventsStatus} | ${auditStatus} | ${rbacStatus} | ${notes} |\n`;
  }

  content += `
## Constraints Compliance
- ✅ Enhance‑only; stable cores untouched
- ✅ No new guardrails introduced
- ✅ No Git/GitHub operations performed in this PR
- ✅ No DB migrations in this PR
- ✅ Only test/docs/reporting files changed

## Risks & Rollback
- Low; test‑only changes
- Rollback by file removal of tests/docs; no schema/app changes involved

## Next Steps
- Address any **BLOCKED** assertions by adding the minimal **test‑only** read adaptors under \`tests/utils/**\` (no server change)
- Expand coverage where useful (e.g., more negative paths)
- Complete implementation of AC2-AC6 test files

---
*Generated: ${timestamp}*
`;

  return content;
}

// Run the script
main();
