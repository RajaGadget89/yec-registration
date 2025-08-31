/**
 * Admin Invitations - Minimal Code Hooks
 * 
 * This module provides minimal plumbing for admin invitation functionality
 * as specified in Job 1 requirements. It does not implement full API endpoints
 * (that belongs to Job 2) but provides the necessary utilities for token
 * generation, TTL management, and status lifecycle mapping.
 */

import { getSupabaseServiceClient } from './supabase-server';
import { randomUUID } from 'crypto';

export interface AdminInvitation {
  id: number;
  email: string;
  roles: string[];
  token: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expires_at: string;
  created_at: string;
  created_by: string;
  accepted_at?: string;
  accepted_by?: string;
  correlation_id: string;
}

export interface CreateInvitationParams {
  email: string;
  roles?: string[];
  created_by: string;
  ttl_hours?: number;
}

export interface InvitationTokenValidation {
  valid: boolean;
  invitation?: AdminInvitation;
  error?: string;
}

/**
 * Generate a cryptographically secure invitation token
 * Uses the database function for consistency
 */
export async function generateInvitationToken(): Promise<string> {
  const supabase = getSupabaseServiceClient();
  
  const { data, error } = await supabase.rpc('generate_admin_invitation_token');
  
  if (error) {
    throw new Error(`Failed to generate invitation token: ${error.message}`);
  }
  
  return data;
}

/**
 * Create a new admin invitation with 48-hour TTL
 */
export async function createAdminInvitation(params: CreateInvitationParams): Promise<AdminInvitation> {
  const supabase = getSupabaseServiceClient();
  
  const ttlHours = params.ttl_hours || 48;
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();
  const token = await generateInvitationToken();
  const correlationId = randomUUID();
  
  const { data, error } = await supabase
    .from('admin_invitations')
    .insert({
      email: params.email.toLowerCase(),
      roles: params.roles || [],
      token,
      expires_at: expiresAt,
      created_by: params.created_by,
      correlation_id: correlationId
    })
    .select()
    .single();
  
  if (error) {
    throw new Error(`Failed to create admin invitation: ${error.message}`);
  }
  
  return data;
}

/**
 * Validate an invitation token and return invitation details
 */
export async function validateInvitationToken(token: string): Promise<InvitationTokenValidation> {
  const supabase = getSupabaseServiceClient();
  
  const { data, error } = await supabase
    .from('admin_invitations')
    .select('*')
    .eq('token', token)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .single();
  
  if (error || !data) {
    return {
      valid: false,
      error: 'Invalid or expired invitation token'
    };
  }
  
  return {
    valid: true,
    invitation: data
  };
}

/**
 * Map invitation status lifecycle
 * pending → accepted|expired|revoked
 */
export function mapInvitationStatus(currentStatus: string, newStatus: 'accepted' | 'expired' | 'revoked'): string {
  if (currentStatus !== 'pending') {
    throw new Error(`Cannot change status from ${currentStatus} to ${newStatus}. Only pending invitations can be modified.`);
  }
  
  return newStatus;
}

/**
 * Check if invitation is expired
 */
export function isInvitationExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date();
}

/**
 * Get default TTL in hours (48 hours as specified)
 */
export function getDefaultTTL(): number {
  return 48;
}

/**
 * Clean up expired invitations
 * This function can be called periodically or as part of a cron job
 */
export async function cleanupExpiredInvitations(): Promise<number> {
  const supabase = getSupabaseServiceClient();
  
  const { data, error } = await supabase.rpc('cleanup_expired_admin_invitations');
  
  if (error) {
    throw new Error(`Failed to cleanup expired invitations: ${error.message}`);
  }
  
  // Return the number of invitations that were expired
  // Note: The function doesn't return a count, so we'll need to check separately
  const { count } = await supabase
    .from('admin_invitations')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'expired');
  
  return count || 0;
}

/**
 * Ensure admin_users status is reflected in whoami
 * This hook ensures any existing whoami reflects status and roles
 */
export async function getAdminUserWithStatus(adminId: string): Promise<{
  id: string;
  email: string;
  role: string;
  status: 'active' | 'suspended';
  is_active: boolean;
  created_at: string;
  last_login_at?: string;
} | null> {
  const supabase = getSupabaseServiceClient();
  
  const { data, error } = await supabase
    .from('admin_users')
    .select('id, email, role, status, is_active, created_at, last_login_at')
    .eq('id', adminId)
    .single();
  
  if (error || !data) {
    return null;
  }
  
  return data;
}
