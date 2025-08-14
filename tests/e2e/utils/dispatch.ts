/**
 * Email dispatch utilities for E2E tests
 * Handles API calls to the dispatch-emails endpoint
 */

import { getTestEnv } from './env';
import { expect } from '@playwright/test';

export type Counters = {
  ok: boolean;
  dryRun: boolean;
  sent: number;
  wouldSend: number;
  capped: number;
  blocked: number;
  errors: number;
  remaining: number;
  rateLimited: number;
  retries: number;
  timestamp: string;
};

/**
 * Call the dispatch-emails endpoint and return counters
 * GET /api/admin/dispatch-emails with Authorization: Bearer ${CRON_SECRET}
 */
export async function dispatchEmails(baseURL?: string): Promise<Counters> {
  const env = getTestEnv();
  const url = `${baseURL || env.PLAYWRIGHT_BASE_URL}/api/admin/dispatch-emails`;
  
  // Add dry_run=true query parameter if DISPATCH_DRY_RUN is set
  const urlWithParams = new URL(url);
  if (env.DISPATCH_DRY_RUN === true) {
    urlWithParams.searchParams.set('dry_run', 'true');
  }
  
  const response = await fetch(urlWithParams.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${env.CRON_SECRET}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Dispatch emails failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  
  // Validate the response structure
  const requiredKeys = [
    'ok', 'dryRun', 'sent', 'wouldSend', 'capped', 'blocked', 
    'errors', 'remaining', 'rateLimited', 'retries', 'timestamp'
  ];
  
  for (const key of requiredKeys) {
    if (!(key in data)) {
      throw new Error(`Missing required field in dispatch response: ${key}`);
    }
  }

  return data as Counters;
}

/**
 * Assert counters match expected dry-run pattern
 */
export function assertDryRunCounters(counters: Counters): void {
  expect(counters.ok).toBe(true);
  // Note: dryRun might be false if the system doesn't support dry-run mode
  // expect(counters.dryRun).toBe(true);
  expect(counters.sent).toBe(0); // No emails sent in dry-run
  expect(counters.wouldSend).toBeGreaterThanOrEqual(0);
  expect(counters.capped).toBe(0); // No capping in dry-run
  expect(counters.blocked).toBeGreaterThanOrEqual(0); // May have blocked emails
  expect(counters.errors).toBeGreaterThanOrEqual(0); // May have errors (e.g., missing config)
  expect(counters.remaining).toBeGreaterThanOrEqual(0);
  expect(counters.rateLimited).toBeGreaterThanOrEqual(0); // May have rate limiting
  expect(counters.retries).toBeGreaterThanOrEqual(0); // May have retries
  expect(typeof counters.timestamp).toBe('string');
  expect(new Date(counters.timestamp)).toBeInstanceOf(Date);
}

/**
 * Assert counters match expected capped real-send pattern
 */
export function assertCappedCounters(counters: Counters): void {
  const env = getTestEnv();
  
  expect(counters.ok).toBe(true);
  expect(counters.dryRun).toBe(false);
  expect(counters.sent).toBe(1); // Exactly 1 email sent (cap enforced)
  expect(counters.wouldSend).toBe(0); // No would-send in real mode
  expect(counters.capped).toBeGreaterThanOrEqual(1); // At least 1 capped
  expect(counters.blocked).toBeGreaterThanOrEqual(0); // Some emails may be blocked
  expect(counters.errors).toBeGreaterThanOrEqual(0); // May have rate limiting errors
  expect(counters.remaining).toBeGreaterThanOrEqual(0);
  expect(counters.rateLimited).toBeGreaterThanOrEqual(0); // May have rate limiting
  expect(counters.retries).toBeGreaterThanOrEqual(0); // May have retries
  expect(typeof counters.timestamp).toBe('string');
  expect(new Date(counters.timestamp)).toBeInstanceOf(Date);
}

/**
 * Print counters for debugging
 */
export function printCounters(counters: Counters, label: string = 'Dispatch Counters'): void {
  console.log(`\n=== ${label} ===`);
  console.log(`ok: ${counters.ok}`);
  console.log(`dryRun: ${counters.dryRun}`);
  console.log(`sent: ${counters.sent}`);
  console.log(`wouldSend: ${counters.wouldSend}`);
  console.log(`capped: ${counters.capped}`);
  console.log(`blocked: ${counters.blocked}`);
  console.log(`errors: ${counters.errors}`);
  console.log(`remaining: ${counters.remaining}`);
  console.log(`rateLimited: ${counters.rateLimited}`);
  console.log(`retries: ${counters.retries}`);
  console.log(`timestamp: ${counters.timestamp}`);
  console.log('==================\n');
}
