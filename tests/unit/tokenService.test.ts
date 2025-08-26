import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TokenService } from '../../app/lib/tokenService';

// Mock the Supabase client
vi.mock('../../app/lib/supabase-server', () => ({
  getSupabaseServiceClient: vi.fn(() => ({
    rpc: vi.fn(),
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            gt: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve({ data: null, error: null }))
            }))
          }))
        }))
      }))
    }))
  }))
}));

describe('TokenService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createToken', () => {
    it('should create a token and return token_id', async () => {
      const mockSupabase = {
        rpc: vi.fn().mockResolvedValue({
          data: 'test-token-id-123',
          error: null
        })
      };

      vi.mocked(require('../../app/lib/supabase-server').getSupabaseServiceClient)
        .mockReturnValue(mockSupabase);

      const result = await TokenService.createToken(
        'test-registration-id',
        'payment',
        'admin@example.com',
        'Test notes'
      );

      expect(result).toBe('test-token-id-123');
      expect(mockSupabase.rpc).toHaveBeenCalledWith('create_deep_link_token', {
        p_registration_id: 'test-registration-id',
        p_dimension: 'payment',
        p_admin_email: 'admin@example.com',
        p_notes: 'Test notes'
      });
    });

    it('should throw error when token creation fails', async () => {
      const mockSupabase = {
        rpc: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' }
        })
      };

      vi.mocked(require('../../app/lib/supabase-server').getSupabaseServiceClient)
        .mockReturnValue(mockSupabase);

      await expect(TokenService.createToken(
        'test-registration-id',
        'payment',
        'admin@example.com'
      )).rejects.toThrow('Token creation failed');
    });
  });

  describe('validateTokenById', () => {
    it('should validate a valid token', async () => {
      const mockValidation = [{
        success: true,
        registration_id: 'test-registration-id',
        dimension: 'payment',
        admin_email: 'admin@example.com',
        notes: 'Test notes',
        message: 'Token is valid'
      }];

      const mockSupabase = {
        rpc: vi.fn().mockResolvedValue({
          data: mockValidation,
          error: null
        })
      };

      vi.mocked(require('../../app/lib/supabase-server').getSupabaseServiceClient)
        .mockReturnValue(mockSupabase);

      const result = await TokenService.validateTokenById('test-token-id');

      expect(result.success).toBe(true);
      expect(result.registration_id).toBe('test-registration-id');
      expect(result.dimension).toBe('payment');
      expect(result.admin_email).toBe('admin@example.com');
      expect(result.notes).toBe('Test notes');
      expect(result.message).toBe('Token is valid');
    });

    it('should handle expired token', async () => {
      const mockValidation = [{
        success: false,
        registration_id: null,
        dimension: null,
        admin_email: null,
        notes: null,
        message: 'Token has expired'
      }];

      const mockSupabase = {
        rpc: vi.fn().mockResolvedValue({
          data: mockValidation,
          error: null
        })
      };

      vi.mocked(require('../../app/lib/supabase-server').getSupabaseServiceClient)
        .mockReturnValue(mockSupabase);

      const result = await TokenService.validateTokenById('expired-token-id');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Token has expired');
    });

    it('should handle used token', async () => {
      const mockValidation = [{
        success: false,
        registration_id: null,
        dimension: null,
        admin_email: null,
        notes: null,
        message: 'Token has already been used'
      }];

      const mockSupabase = {
        rpc: vi.fn().mockResolvedValue({
          data: mockValidation,
          error: null
        })
      };

      vi.mocked(require('../../app/lib/supabase-server').getSupabaseServiceClient)
        .mockReturnValue(mockSupabase);

      const result = await TokenService.validateTokenById('used-token-id');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Token has already been used');
    });

    it('should handle database error gracefully', async () => {
      const mockSupabase = {
        rpc: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' }
        })
      };

      vi.mocked(require('../../app/lib/supabase-server').getSupabaseServiceClient)
        .mockReturnValue(mockSupabase);

      const result = await TokenService.validateTokenById('invalid-token-id');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Token validation failed');
    });

    it('should handle token not found', async () => {
      const mockSupabase = {
        rpc: vi.fn().mockResolvedValue({
          data: [],
          error: null
        })
      };

      vi.mocked(require('../../app/lib/supabase-server').getSupabaseServiceClient)
        .mockReturnValue(mockSupabase);

      const result = await TokenService.validateTokenById('non-existent-token-id');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Token validation failed');
    });
  });

  describe('markTokenAsUsed', () => {
    it('should mark token as used successfully', async () => {
      const mockSupabase = {
        rpc: vi.fn().mockResolvedValue({
          data: true,
          error: null
        })
      };

      vi.mocked(require('../../app/lib/supabase-server').getSupabaseServiceClient)
        .mockReturnValue(mockSupabase);

      const result = await TokenService.markTokenAsUsed('test-token-id');

      expect(result).toBe(true);
      expect(mockSupabase.rpc).toHaveBeenCalledWith('mark_deep_link_token_used_by_id', {
        p_token_id: 'test-token-id'
      });
    });

    it('should handle marking already used token', async () => {
      const mockSupabase = {
        rpc: vi.fn().mockResolvedValue({
          data: false,
          error: null
        })
      };

      vi.mocked(require('../../app/lib/supabase-server').getSupabaseServiceClient)
        .mockReturnValue(mockSupabase);

      const result = await TokenService.markTokenAsUsed('already-used-token-id');

      expect(result).toBe(false);
    });

    it('should handle database error', async () => {
      const mockSupabase = {
        rpc: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' }
        })
      };

      vi.mocked(require('../../app/lib/supabase-server').getSupabaseServiceClient)
        .mockReturnValue(mockSupabase);

      const result = await TokenService.markTokenAsUsed('test-token-id');

      expect(result).toBe(false);
    });
  });

  describe('getTokenDataForEmail', () => {
    it('should get token data for email generation', async () => {
      const mockTokenData = [{
        token_id: 'test-token-id',
        token: 'actual-token-value',
        registration_id: 'test-registration-id',
        dimension: 'payment',
        admin_email: 'admin@example.com',
        notes: 'Test notes'
      }];

      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                gt: vi.fn(() => ({
                  limit: vi.fn(() => Promise.resolve({
                    data: mockTokenData,
                    error: null
                  }))
                }))
              }))
            }))
          }))
        }))
      };

      vi.mocked(require('../../app/lib/supabase-server').getSupabaseServiceClient)
        .mockReturnValue(mockSupabase);

      const result = await TokenService.getTokenDataForEmail('test-token-id');

      expect(result).toEqual({
        token_id: 'test-token-id',
        token: 'actual-token-value',
        registration_id: 'test-registration-id',
        dimension: 'payment',
        admin_email: 'admin@example.com',
        notes: 'Test notes'
      });
    });

    it('should return null for expired token', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                gt: vi.fn(() => ({
                  limit: vi.fn(() => Promise.resolve({
                    data: [],
                    error: null
                  }))
                }))
              }))
            }))
          }))
        }))
      };

      vi.mocked(require('../../app/lib/supabase-server').getSupabaseServiceClient)
        .mockReturnValue(mockSupabase);

      const result = await TokenService.getTokenDataForEmail('expired-token-id');

      expect(result).toBeNull();
    });

    it('should handle database error gracefully', async () => {
      const mockSupabase = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                gt: vi.fn(() => ({
                  limit: vi.fn(() => Promise.resolve({
                    data: null,
                    error: { message: 'Database error' }
                  }))
                }))
              }))
            }))
          }))
        }))
      };

      vi.mocked(require('../../app/lib/supabase-server').getSupabaseServiceClient)
        .mockReturnValue(mockSupabase);

      const result = await TokenService.getTokenDataForEmail('test-token-id');

      expect(result).toBeNull();
    });
  });

  describe('hashToken', () => {
    it('should generate consistent hash for same token and salt', () => {
      const token = 'test-token-123';
      const salt = 'test-salt-456';

      const hash1 = TokenService.hashToken(token, salt);
      const hash2 = TokenService.hashToken(token, salt);

      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex string length
    });

    it('should generate different hashes for different salts', () => {
      const token = 'test-token-123';
      const salt1 = 'salt-1';
      const salt2 = 'salt-2';

      const hash1 = TokenService.hashToken(token, salt1);
      const hash2 = TokenService.hashToken(token, salt2);

      expect(hash1).not.toBe(hash2);
    });

    it('should generate different hashes for different tokens', () => {
      const token1 = 'token-1';
      const token2 = 'token-2';
      const salt = 'same-salt';

      const hash1 = TokenService.hashToken(token1, salt);
      const hash2 = TokenService.hashToken(token2, salt);

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyToken', () => {
    it('should verify correct token against hash', () => {
      const token = 'test-token-123';
      const salt = 'test-salt-456';
      const hash = TokenService.hashToken(token, salt);

      const result = TokenService.verifyToken(token, salt, hash);

      expect(result).toBe(true);
    });

    it('should reject incorrect token', () => {
      const correctToken = 'correct-token';
      const incorrectToken = 'incorrect-token';
      const salt = 'test-salt';
      const hash = TokenService.hashToken(correctToken, salt);

      const result = TokenService.verifyToken(incorrectToken, salt, hash);

      expect(result).toBe(false);
    });

    it('should reject incorrect salt', () => {
      const token = 'test-token';
      const correctSalt = 'correct-salt';
      const incorrectSalt = 'incorrect-salt';
      const hash = TokenService.hashToken(token, correctSalt);

      const result = TokenService.verifyToken(token, incorrectSalt, hash);

      expect(result).toBe(false);
    });
  });
});
