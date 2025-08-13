import { createClient } from '@supabase/supabase-js';

/**
 * Server-only Supabase client for audit operations
 * IMPORTANT: Never import this file in any Client Component
 * All queries stay on the server to protect the service role key
 */
export function getSupabaseAdminAudit() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables for audit operations');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'audit' // Explicitly set the schema to audit
    }
  });
}

/**
 * Audit log types for the dashboard
 */
export interface AuditAccessLog {
  id: number;
  occurred_at_utc: string;
  action: string;
  resource: string | null;
  result: string;
  request_id: string;
  latency_ms: number | null;
  src_ip: string | null;
  user_agent: string | null;
}

export interface AuditEventLog {
  id: number;
  occurred_at_utc: string;
  action: string;
  resource: string;
  result: string;
  correlation_id: string;
}

/**
 * Filter parameters for audit queries
 */
export interface AuditFilters {
  request_id?: string;
  correlation_id?: string;
  action?: string;
  resource?: string;
  date_from?: string;
  date_to?: string;
}

/**
 * Query audit access logs with filters
 */
export async function getAuditAccessLogs(filters: AuditFilters, limit: number = 100) {
  try {
    const supabase = getSupabaseAdminAudit();
    
    // Use the schema-specific client to query audit tables
    let query = supabase
      .from('access_log') // Remove the schema prefix since we set it in the client
      .select('id, occurred_at_utc, action, resource, result, request_id, latency_ms, src_ip, user_agent')
      .order('occurred_at_utc', { ascending: false })
      .limit(limit);

    // Apply filters
    if (filters.request_id) {
      query = query.eq('request_id', filters.request_id);
    }
    
    if (filters.action) {
      query = query.ilike('action', `%${filters.action}%`);
    }
    
    if (filters.resource) {
      query = query.ilike('resource', `%${filters.resource}%`);
    }
    
    if (filters.date_from) {
      query = query.gte('occurred_at_utc', filters.date_from);
    }
    
    if (filters.date_to) {
      query = query.lte('occurred_at_utc', filters.date_to);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching audit access logs:', error);
      // Return empty array instead of throwing error for better UX
      return [];
    }

    return data as AuditAccessLog[];
  } catch (error) {
    console.error('Unexpected error in getAuditAccessLogs:', error);
    // Return empty array instead of throwing error for better UX
    return [];
  }
}

/**
 * Query audit event logs with filters
 */
export async function getAuditEventLogs(filters: AuditFilters, limit: number = 100) {
  try {
    const supabase = getSupabaseAdminAudit();
    
    let query = supabase
      .from('event_log') // Remove the schema prefix since we set it in the client
      .select('id, occurred_at_utc, action, resource, result, correlation_id')
      .order('occurred_at_utc', { ascending: false })
      .limit(limit);

    // Apply filters
    if (filters.correlation_id) {
      query = query.eq('correlation_id', filters.correlation_id);
    }
    
    if (filters.action) {
      query = query.ilike('action', `%${filters.action}%`);
    }
    
    if (filters.resource) {
      query = query.ilike('resource', `%${filters.resource}%`);
    }
    
    if (filters.date_from) {
      query = query.gte('occurred_at_utc', filters.date_from);
    }
    
    if (filters.date_to) {
      query = query.lte('occurred_at_utc', filters.date_to);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching audit event logs:', error);
      // Return empty array instead of throwing error for better UX
      return [];
    }

    return data as AuditEventLog[];
  } catch (error) {
    console.error('Unexpected error in getAuditEventLogs:', error);
    // Return empty array instead of throwing error for better UX
    return [];
  }
}
