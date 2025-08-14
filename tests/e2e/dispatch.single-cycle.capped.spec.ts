import { test, expect } from '@playwright/test';
import { getTestEnv, printTestEnv, isCappedMode } from './utils/env';
import { dispatchEmails, assertCappedCounters, printCounters } from './utils/dispatch';

test.describe('Dispatch: Single Cycle Capped', () => {
  const env = getTestEnv();
  
  test.beforeAll(() => {
    printTestEnv();
  });

  test('Single dispatch cycle with capped real-send mode', async () => {
    // Only run when DISPATCH_DRY_RUN=false and EMAIL_MODE=CAPPED
    if (!isCappedMode()) {
      test.skip();
      return;
    }

    console.log('\n=== Starting Single Cycle Capped Dispatch Test ===');
    console.log(`EMAIL_MODE: ${env.EMAIL_MODE}`);
    console.log(`EMAIL_CAP_MAX_PER_RUN: ${env.EMAIL_CAP_MAX_PER_RUN}`);
    console.log(`EMAIL_ALLOWLIST: ${env.EMAIL_ALLOWLIST}`);
    console.log(`BLOCK_NON_ALLOWLIST: ${env.BLOCK_NON_ALLOWLIST}`);
    console.log('==================================================\n');

    // Step 1: Call dispatch emails once
    console.log('Calling dispatch-emails endpoint...');
    const counters = await dispatchEmails();
    printCounters(counters, 'Single Cycle Capped Dispatch');

    // Step 2: Assert counters precisely match the report schema
    assertCappedCounters(counters);

    // Step 3: Additional specific assertions for capped mode
    expect(counters.sent).toBe(1); // Exactly 1 email sent (cap enforced)
    expect(counters.wouldSend).toBe(0); // No would-send in real mode
    expect(counters.capped).toBeGreaterThanOrEqual(1); // At least 1 capped
    expect(counters.blocked).toBeGreaterThanOrEqual(0); // Some emails may be blocked
    expect(counters.errors).toBeGreaterThanOrEqual(0); // May have rate limiting errors
    expect(counters.remaining).toBeGreaterThanOrEqual(0);
    expect(counters.rateLimited).toBeGreaterThanOrEqual(0); // May have rate limiting
    expect(counters.retries).toBeGreaterThanOrEqual(0); // May have retries

    // Step 4: Validate timestamp format
    expect(typeof counters.timestamp).toBe('string');
    const timestamp = new Date(counters.timestamp);
    expect(timestamp).toBeInstanceOf(Date);
    expect(timestamp.getTime()).toBeGreaterThan(0);

    // Step 5: Validate boolean fields
    expect(typeof counters.ok).toBe('boolean');
    expect(typeof counters.dryRun).toBe('boolean');
    expect(counters.ok).toBe(true);
    expect(counters.dryRun).toBe(false);

    // Step 6: Validate numeric fields
    expect(typeof counters.sent).toBe('number');
    expect(typeof counters.wouldSend).toBe('number');
    expect(typeof counters.capped).toBe('number');
    expect(typeof counters.blocked).toBe('number');
    expect(typeof counters.errors).toBe('number');
    expect(typeof counters.remaining).toBe('number');
    expect(typeof counters.rateLimited).toBe('number');
    expect(typeof counters.retries).toBe('number');

    // Step 7: Validate all fields are non-negative
    expect(counters.sent).toBeGreaterThanOrEqual(0);
    expect(counters.wouldSend).toBeGreaterThanOrEqual(0);
    expect(counters.capped).toBeGreaterThanOrEqual(0);
    expect(counters.blocked).toBeGreaterThanOrEqual(0);
    expect(counters.errors).toBeGreaterThanOrEqual(0);
    expect(counters.remaining).toBeGreaterThanOrEqual(0);
    expect(counters.rateLimited).toBeGreaterThanOrEqual(0);
    expect(counters.retries).toBeGreaterThanOrEqual(0);

    console.log('✅ Single cycle capped dispatch test completed successfully');
    console.log(`📧 Email sent: ${counters.sent}`);
    console.log(`🚫 Emails blocked: ${counters.blocked}`);
    console.log(`⏹️  Emails capped: ${counters.capped}`);
    console.log(`❌ Errors: ${counters.errors}`);
    console.log(`⏱️  Rate limited: ${counters.rateLimited}`);
    console.log(`🔄 Retries: ${counters.retries}`);
  });
});
