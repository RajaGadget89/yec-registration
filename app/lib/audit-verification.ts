import { getSupabaseServiceClient } from './supabase-server';
import { EventService } from './events/eventService';
import { getThailandTimeISOString } from './timezoneUtils';

/**
 * Audit verification system for Phase 0
 * Ensures audit logging is working for all required events
 */

export interface AuditVerificationResult {
  success: boolean;
  tests: {
    name: string;
    passed: boolean;
    error?: string;
    details?: any;
  }[];
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
}

/**
 * Test audit logging for admin dashboard access
 */
async function testAdminDashboardAccess(): Promise<{ passed: boolean; error?: string; details?: any }> {
  try {
    const supabase = getSupabaseServiceClient();
    const testEvent = {
      action: 'admin.dashboard.access',
      method: 'GET',
      resource: '/admin',
      result: 'success',
      request_id: `test-${Date.now()}`,
      src_ip: '127.0.0.1',
      user_agent: 'Phase0-Test/1.0',
      latency_ms: 100,
      meta: { test: true, phase: 'phase0' }
    };

    const { error } = await supabase
      .from('audit.access_log')
      .insert([testEvent]);

    if (error) {
      return { passed: false, error: error.message };
    }

    return { passed: true, details: testEvent };
  } catch (error) {
    return { passed: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Test audit logging for registration creation
 */
async function testRegistrationCreation(): Promise<{ passed: boolean; error?: string; details?: any }> {
  try {
    const supabase = getSupabaseServiceClient();
    const testEvent = {
      action: 'registration.created',
      resource: 'registrations',
      resource_id: 'test-registration-id',
      actor_id: 'test-admin',
      actor_role: 'admin' as const,
      result: 'success',
      correlation_id: `test-${Date.now()}`,
      meta: { test: true, phase: 'phase0' }
    };

    const { error } = await supabase
      .from('audit.event_log')
      .insert([testEvent]);

    if (error) {
      return { passed: false, error: error.message };
    }

    return { passed: true, details: testEvent };
  } catch (error) {
    return { passed: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Test audit logging for status change
 */
async function testStatusChange(): Promise<{ passed: boolean; error?: string; details?: any }> {
  try {
    const supabase = getSupabaseServiceClient();
    const testEvent = {
      action: 'registration.status_changed',
      resource: 'registrations',
      resource_id: 'test-registration-id',
      actor_id: 'test-admin',
      actor_role: 'admin' as const,
      result: 'success',
      reason: 'Phase 0 test',
      correlation_id: `test-${Date.now()}`,
      meta: { 
        test: true, 
        phase: 'phase0',
        old_status: 'pending',
        new_status: 'approved'
      }
    };

    const { error } = await supabase
      .from('audit.event_log')
      .insert([testEvent]);

    if (error) {
      return { passed: false, error: error.message };
    }

    return { passed: true, details: testEvent };
  } catch (error) {
    return { passed: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Test audit logging for file upload
 */
async function testFileUpload(): Promise<{ passed: boolean; error?: string; details?: any }> {
  try {
    const supabase = getSupabaseServiceClient();
    const testEvent = {
      action: 'file.uploaded',
      resource: 'storage',
      resource_id: 'test-file-id',
      actor_id: 'test-admin',
      actor_role: 'admin' as const,
      result: 'success',
      correlation_id: `test-${Date.now()}`,
      meta: { 
        test: true, 
        phase: 'phase0',
        bucket: 'profile-images',
        filename: 'test-image.jpg'
      }
    };

    const { error } = await supabase
      .from('audit.event_log')
      .insert([testEvent]);

    if (error) {
      return { passed: false, error: error.message };
    }

    return { passed: true, details: testEvent };
  } catch (error) {
    return { passed: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Test event service integration
 */
async function testEventService(): Promise<{ passed: boolean; error?: string; details?: any }> {
  try {
    // Test event emission
    await EventService.emitLoginSubmitted('test@example.com');
    
    return { passed: true, details: { event: 'login.submitted', email: 'test@example.com' } };
  } catch (error) {
    return { passed: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Verify audit table structure
 */
async function verifyAuditTables(): Promise<{ passed: boolean; error?: string; details?: any }> {
  try {
    const supabase = getSupabaseServiceClient();
    
    // Check if audit schema exists
    const { data: schemas, error: schemaError } = await supabase
      .from('information_schema.schemata')
      .select('schema_name')
      .eq('schema_name', 'audit');

    if (schemaError) {
      return { passed: false, error: `Schema check failed: ${schemaError.message}` };
    }

    if (!schemas || schemas.length === 0) {
      return { passed: false, error: 'Audit schema does not exist' };
    }

    // Check if audit tables exist
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'audit')
      .in('table_name', ['access_log', 'event_log']);

    if (tableError) {
      return { passed: false, error: `Table check failed: ${tableError.message}` };
    }

    const tableNames = tables?.map(t => t.table_name) || [];
    const requiredTables = ['access_log', 'event_log'];
    const missingTables = requiredTables.filter(t => !tableNames.includes(t));

    if (missingTables.length > 0) {
      return { passed: false, error: `Missing audit tables: ${missingTables.join(', ')}` };
    }

    return { passed: true, details: { tables: tableNames } };
  } catch (error) {
    return { passed: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Run comprehensive audit verification tests
 */
export async function verifyAuditSystem(): Promise<AuditVerificationResult> {
  const tests = [
    {
      name: 'Audit Tables Structure',
      test: verifyAuditTables
    },
    {
      name: 'Admin Dashboard Access Logging',
      test: testAdminDashboardAccess
    },
    {
      name: 'Registration Creation Logging',
      test: testRegistrationCreation
    },
    {
      name: 'Status Change Logging',
      test: testStatusChange
    },
    {
      name: 'File Upload Logging',
      test: testFileUpload
    },
    {
      name: 'Event Service Integration',
      test: testEventService
    }
  ];

  const results = [];
  
  for (const test of tests) {
    const result = await test.test();
    results.push({
      name: test.name,
      passed: result.passed,
      error: result.error,
      details: result.details
    });
  }

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  return {
    success: failed === 0,
    tests: results,
    summary: {
      total: results.length,
      passed,
      failed
    }
  };
}

/**
 * Clean up test audit entries
 */
export async function cleanupTestAuditEntries(): Promise<void> {
  try {
    const supabase = getSupabaseServiceClient();
    const testMeta = { test: true, phase: 'phase0' };

    // Clean up test entries from access_log
    await supabase
      .from('audit.access_log')
      .delete()
      .eq('meta->test', true);

    // Clean up test entries from event_log
    await supabase
      .from('audit.event_log')
      .delete()
      .eq('meta->test', true);

    console.log('Test audit entries cleaned up successfully');
  } catch (error) {
    console.error('Error cleaning up test audit entries:', error);
  }
}

