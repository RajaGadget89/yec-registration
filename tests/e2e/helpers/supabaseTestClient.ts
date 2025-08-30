import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { assertDbRouting } from '../../../app/lib/env-guards';
import { getE2EConfig } from '../e2e-env-config';

// Load E2E environment configuration
const e2eConfig = getE2EConfig();

/**
 * Supabase test client for querying audit logs
 * Only used in Playwright test runner (node context), never in browser
 */
export class SupabaseTestClient {
  private client: SupabaseClient<any, 'public', any>;
  private auditClient: SupabaseClient<any, 'audit', any>;

  constructor() {
    // Validate database routing
    assertDbRouting();
    
    const supabaseUrl = e2eConfig.supabase.url;
    const supabaseServiceKey = e2eConfig.supabase.serviceRoleKey;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables for test client');
    }

    // Use service role key (Node only) for public schema (default)
    this.client = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Create separate client for audit schema
    this.auditClient = createClient(supabaseUrl, supabaseServiceKey, {
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
   * Get database client for public schema operations
   */
  db() {
    return this.client;
  }

  /**
   * Get database client for audit schema operations
   */
  auditDb() {
    return this.auditClient;
  }

  /**
   * Query access logs by request_id
   */
  async getAccessLogsByRequestId(requestId: string, startTs?: Date): Promise<any[]> {
    try {
      let query = this.auditDb()
        .from('access_log')
        .select('*')
        .eq('request_id', requestId);

      if (startTs) {
        query = query.gte('created_at', startTs.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error querying access logs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAccessLogsByRequestId:', error);
      return [];
    }
  }

  /**
   * Query event logs by correlation_id
   */
  async getEventLogsByCorrelationId(correlationId: string, startTs?: Date): Promise<any[]> {
    try {
      let query = this.auditDb()
        .from('event_log')
        .select('*')
        .eq('correlation_id', correlationId);

      if (startTs) {
        query = query.gte('created_at', startTs.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error querying event logs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getEventLogsByCorrelationId:', error);
      return [];
    }
  }

  /**
   * Query admin audit logs
   */
  async getAdminAuditLogs(limit: number = 50, offset: number = 0): Promise<any[]> {
    try {
      const { data, error } = await this.client
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error('Error querying admin audit logs:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAdminAuditLogs:', error);
      return [];
    }
  }

  /**
   * Query admin invitations
   */
  async getAdminInvitations(email?: string): Promise<any[]> {
    try {
      let query = this.client
        .from('admin_invitations')
        .select('*')
        .order('created_at', { ascending: false });

      if (email) {
        query = query.eq('email', email);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error querying admin invitations:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAdminInvitations:', error);
      return [];
    }
  }

  /**
   * Query admin users
   */
  async getAdminUsers(email?: string): Promise<any[]> {
    try {
      let query = this.client
        .from('admin_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (email) {
        query = query.eq('email', email);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error querying admin users:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getAdminUsers:', error);
      return [];
    }
  }

  /**
   * Clean up test data by tag
   */
  async cleanupTestData(tag: string): Promise<void> {
    try {
      // Clean up admin invitations
      const { error: inviteError } = await this.client
        .from('admin_invitations')
        .delete()
        .ilike('email', `%${tag}%`);

      if (inviteError) {
        console.error('Error cleaning up admin invitations:', inviteError);
      }

      // Clean up admin users
      const { error: userError } = await this.client
        .from('admin_users')
        .delete()
        .ilike('email', `%${tag}%`);

      if (userError) {
        console.error('Error cleaning up admin users:', userError);
      }

      console.log(`[supabaseTestClient] Cleaned up test data for tag: ${tag}`);
    } catch (error) {
      console.error('Error in cleanupTestData:', error);
    }
  }
}

export const supabaseTestClient = new SupabaseTestClient();
