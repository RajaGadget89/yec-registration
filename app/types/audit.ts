/**
 * TypeScript types for audit RPC functions
 * These types define the expected parameters for log_access and log_event RPCs
 */

export interface LogAccessParams {
  p_action: string;
  p_request_id: string;
  p_user_agent?: string | null;
  p_ip_address?: string | null;
  p_path?: string | null;
  p_method?: string | null;
  p_status_code?: number | null;
  p_response_time_ms?: number | null;
  p_metadata?: Record<string, any> | null;
}

export interface LogEventParams {
  p_action: string;
  p_resource: string;
  p_correlation_id: string;
  p_user_id?: string | null;
  p_admin_email?: string | null;
  p_registration_id?: string | null;
  p_before_state?: Record<string, any> | null;
  p_after_state?: Record<string, any> | null;
  p_metadata?: Record<string, any> | null;
}

/**
 * Audit log input types for the convenience functions
 */
export interface LogAccessInput {
  action: string;
  request_id: string;
  user_agent?: string;
  ip_address?: string;
  path?: string;
  method?: string;
  status_code?: number;
  response_time_ms?: number;
  metadata?: Record<string, any>;
}

export interface LogEventInput {
  action: string;
  resource: string;
  correlation_id: string;
  user_id?: string;
  admin_email?: string;
  registration_id?: string;
  before_state?: Record<string, any>;
  after_state?: Record<string, any>;
  metadata?: Record<string, any>;
}
