import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import path from 'path';

// Load environment variables
const envPath = path.join(process.cwd(), '.env.local');
config({ path: envPath });

/**
 * Supabase test client for querying audit logs
 * Only used in Playwright test runner (node context), never in browser
 */
export class SupabaseTestClient {
  private client: SupabaseClient<any, 'audit', any>;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables for test client');
    }

    // Use service role key (Node only) and set schema to 'audit'
    this.client = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      db: {
        schema: 'audit'
      }
    });
  }

  /**
   * Query access logs by request_id
   */
  async getAccessLogsByRequestId(requestId: string, startTs?: Date): Promise<any[]> {
    let query = this.client
      .from('access_log')
      .select('id, occurred_at_utc, action, resource, result, request_id, meta')
      .eq('request_id', requestId);
    
    // Apply time window filter if startTs is provided
    if (startTs) {
      const startTsMinus5Min = new Date(startTs.getTime() - 5 * 60 * 1000); // 5 minutes before
      query = query.gte('occurred_at_utc', startTsMinus5Min.toISOString());
    }
    
    const { data, error } = await query.order('occurred_at_utc', { ascending: true });

    if (error) {
      throw new Error(`Failed to query access logs for request_id ${requestId}: ${error.message}`);
    }

    return Array.isArray(data) ? data : [];
  }

  /**
   * Query event logs by correlation_id
   */
  async getEventLogsByCorrelationId(correlationId: string, startTs?: Date): Promise<any[]> {
    let query = this.client
      .from('event_log')
      .select('id, occurred_at_utc, action, resource, resource_id, actor_role, result, reason, correlation_id, meta')
      .eq('correlation_id', correlationId);
    
    // Apply time window filter if startTs is provided
    if (startTs) {
      const startTsMinus5Min = new Date(startTs.getTime() - 5 * 60 * 1000); // 5 minutes before
      query = query.gte('occurred_at_utc', startTsMinus5Min.toISOString());
    }
    
    const { data, error } = await query.order('occurred_at_utc', { ascending: true });

    if (error) {
      throw new Error(`Failed to query event logs for correlation_id ${correlationId}: ${error.message}`);
    }

    return Array.isArray(data) ? data : [];
  }

  /**
   * Debug helper to dump audit logs for a specific request
   */
  async debugDump(requestId: string): Promise<void> {
    if (process.env.NODE_ENV !== 'test') return;

    try {
      const cutoffTime = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
      
      const [accessLogs, eventLogs] = await Promise.all([
        this.getAccessLogsByRequestId(requestId, cutoffTime),
        this.getEventLogsByCorrelationId(requestId, cutoffTime)
      ]);

      console.log(`[debug] Request ${requestId}:`);
      console.log(`  Access logs: ${accessLogs.length} rows`);
      accessLogs.forEach((log, i) => {
        console.log(`    [${i}] action="${log.action}", result="${log.result}", occurred="${log.occurred_at_utc}"`);
      });

      console.log(`  Event logs: ${eventLogs.length} rows`);
      eventLogs.forEach((log, i) => {
        console.log(`    [${i}] action="${log.action}", resource="${log.resource}", actor_role="${log.actor_role}", occurred="${log.occurred_at_utc}"`);
      });
    } catch (error) {
      console.error(`[debug] Error dumping logs for ${requestId}:`, error);
    }
  }

  /**
   * Query audit logs by time window (for debugging)
   */
  async getRecentLogs(minutes: number = 10) {
    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000);

    const [accessLogs, eventLogs] = await Promise.all([
      this.client
        .from('access_log')
        .select('*')
        .gte('occurred_at_utc', cutoffTime.toISOString())
        .order('occurred_at_utc', { ascending: false })
        .limit(20),
      this.client
        .from('event_log')
        .select('*')
        .gte('occurred_at_utc', cutoffTime.toISOString())
        .order('occurred_at_utc', { ascending: false })
        .limit(20)
    ]);

    if (accessLogs.error) {
      throw new Error(`Failed to query recent access logs: ${accessLogs.error.message}`);
    }

    if (eventLogs.error) {
      throw new Error(`Failed to query recent event logs: ${eventLogs.error.message}`);
    }

    return {
      accessLogs: accessLogs.data || [],
      eventLogs: eventLogs.data || []
    };
  }

  /**
   * Create a test admin user for authentication
   */
  async createTestAdmin(email: string) {
    const { data, error } = await this.client.auth.admin.createUser({
      email,
      password: 'test-password-123',
      email_confirm: true,
      user_metadata: { role: 'admin' }
    });

    if (error) {
      throw new Error(`Failed to create test admin: ${error.message}`);
    }

    return data.user;
  }

  /**
   * Create a test registration for testing
   */
  async createTestRegistration(registrationData: any) {
    const { data, error } = await this.client
      .from('registrations')
      .insert(registrationData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create test registration: ${error.message}`);
    }

    return data;
  }

  /**
   * Clean up test data
   */
  async cleanupTestData(testTag: string) {
    await this.client
      .from('registrations')
      .delete()
      .like('email', `%${testTag}%`);

    console.log(`Test cleanup completed for tag: ${testTag}`);
  }
}

export const supabaseTestClient = new SupabaseTestClient();
