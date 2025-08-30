/**
 * DB Preflight Check Utility
 * Validates database target and required functions before running E2E tests
 */

import { APIRequestContext } from '@playwright/test';
import { getTestHeaders } from './testRequestHelper';

export interface DBFingerprint {
  dbTarget: string;
  projectRef: string;
  supabaseHost: string;
  objects: Record<string, { exists: boolean; hash?: string }>;
  event_settings_count: number;
  update_reason_distribution: { profile: number; info: number; other: number };
  migrations?: Array<{ version: string; name: string; statements_count: number }> | null;
  timestamp: string;
}

export interface PreflightOptions {
  expectedDBTarget?: string;
  expectedProjectRef?: string;
  requireFunctions?: string[];
  tolerateLegacyUpdateReasons?: boolean;
}

/**
 * Perform DB preflight check
 * Validates database target and required functions exist
 */
export async function performDBPreflightCheck(
  request: APIRequestContext,
  options: PreflightOptions = {}
): Promise<DBFingerprint> {
  console.log('[DB Preflight] Starting database fingerprint check...');

  // Get fingerprint from server
  const fingerprintRes = await request.get('/api/test/db-fingerprint', {
    headers: getTestHeaders(),
  });

  if (!fingerprintRes.ok()) {
    const errorText = await fingerprintRes.text();
    throw new Error(`DB fingerprint check failed: ${fingerprintRes.status()} - ${errorText}`);
  }

  const fingerprint: DBFingerprint = await fingerprintRes.json();
  console.log('[DB Preflight] Fingerprint received:', {
    dbTarget: fingerprint.dbTarget,
    projectRef: fingerprint.projectRef,
    supabaseHost: fingerprint.supabaseHost,
    objectsCount: Object.keys(fingerprint.objects).length,
  });

  // Validate DB target
  const expectedDBTarget = options.expectedDBTarget || process.env.E2E_DB_TARGET || process.env.EXPECTED_DB_REF;
  if (expectedDBTarget && fingerprint.dbTarget !== expectedDBTarget) {
    throw new Error(
      `DB fingerprint mismatch: expected target "${expectedDBTarget}" but got "${fingerprint.dbTarget}". ` +
      `Fix E2E_DB_TARGET environment variable or apply correct migrations.`
    );
  }

  // Validate project ref if specified
  if (options.expectedProjectRef && fingerprint.projectRef !== options.expectedProjectRef) {
    throw new Error(
      `DB fingerprint mismatch: expected project ref "${options.expectedProjectRef}" but got "${fingerprint.projectRef}". ` +
      `Fix environment configuration or apply correct migrations.`
    );
  }

  // Validate required functions
  const requiredFunctions = options.requireFunctions || [
    'fn_user_resubmit',
    'validate_and_consume_deep_link_token',
    'generate_deep_link_token',
    'trigger_update_registration_status'
  ];

  const missingFunctions: string[] = [];
  for (const funcName of requiredFunctions) {
    const func = fingerprint.objects[funcName];
    if (!func || !func.exists) {
      missingFunctions.push(funcName);
    }
  }

  if (missingFunctions.length > 0) {
    throw new Error(
      `DB fingerprint mismatch: missing required functions: ${missingFunctions.join(', ')}. ` +
      `Apply AC3 migrations to fix update_reason handling, then retry.`
    );
  }

  // Validate update_reason distribution
  const { update_reason_distribution } = fingerprint;
  const tolerateLegacy = options.tolerateLegacyUpdateReasons || false;
  
  if (update_reason_distribution.info > 0 && !tolerateLegacy) {
    // Check if fn_user_resubmit can handle legacy 'info' values
    const resubmitFunc = fingerprint.objects.fn_user_resubmit;
    if (!resubmitFunc || !resubmitFunc.exists) {
      throw new Error(
        `DB fingerprint mismatch: found ${update_reason_distribution.info} legacy 'info' update_reason values ` +
        `but fn_user_resubmit function is missing. Apply AC3 migrations to fix update_reason handling.`
      );
    }
    
    console.log(`[DB Preflight] Warning: Found ${update_reason_distribution.info} legacy 'info' update_reason values, but fn_user_resubmit exists and should handle them.`);
  }

  console.log('[DB Preflight] ✅ All checks passed');
  return fingerprint;
}

/**
 * Quick preflight check for AC tests
 * Uses default validation rules for AC1→AC3 tests
 */
export async function performACPreflightCheck(request: APIRequestContext): Promise<DBFingerprint> {
  return performDBPreflightCheck(request, {
    requireFunctions: [
      'fn_user_resubmit',
      'validate_and_consume_deep_link_token', 
      'generate_deep_link_token',
      'trigger_update_registration_status'
    ],
    tolerateLegacyUpdateReasons: true // AC3 function should handle legacy values
  });
}

/**
 * Validate server readiness for E2E tests
 */
export async function validateServerReadiness(request: APIRequestContext): Promise<void> {
  console.log('[Server Preflight] Checking server readiness...');

  const readyRes = await request.get('/api/test/ready');
  if (!readyRes.ok()) {
    const errorText = await readyRes.text();
    throw new Error(`Server readiness check failed: ${readyRes.status()} - ${errorText}`);
  }

  const ready = await readyRes.json();
  
  if (!ready.e2e) {
    throw new Error('Server not configured for E2E tests (E2E_TESTS != true)');
  }

  if (!ready.helpers) {
    throw new Error('Server test helpers not enabled (TEST_HELPERS_ENABLED != 1)');
  }

  if (!ready.dbTarget || ready.dbTarget === 'unknown') {
    throw new Error('Server DB target not configured (E2E_DB_TARGET not set)');
  }

  console.log('[Server Preflight] ✅ Server ready for E2E tests');
  console.log(`[Server Preflight] DB Target: ${ready.dbTarget}`);
  console.log(`[Server Preflight] Base URL: ${ready.baseUrl}`);
}

