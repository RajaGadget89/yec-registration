import { getEmailTransport, EmailTransport } from '../app/lib/emails/transport';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Resend SDK
vi.mock('resend', () => {
  return {
    Resend: vi.fn().mockImplementation(() => ({
      emails: {
        send: vi.fn().mockResolvedValue({ error: null, data: { id: 'test-id' } }),
      },
    })),
  };
});

describe('Email Transport', () => {
  let mockResend: any;
  
  beforeEach(() => {
    // Reset environment variables
    delete process.env.EMAIL_MODE;
    delete process.env.EMAIL_THROTTLE_MS;
    delete process.env.EMAIL_RETRY_ON_429;
    delete process.env.EMAIL_BASE_BACKOFF_MS;
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
    
    // Set default test environment
    process.env.RESEND_API_KEY = 'test-api-key';
    process.env.EMAIL_FROM = 'test@example.com';
    
    // Get mock instance
    const { Resend } = require('resend');
    mockResend = new Resend();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('ResendTransport - Throttle and Retry', () => {
    beforeEach(() => {
      process.env.EMAIL_MODE = 'FULL';
      process.env.EMAIL_THROTTLE_MS = '100';
      process.env.EMAIL_RETRY_ON_429 = '2';
      process.env.EMAIL_BASE_BACKOFF_MS = '50';
    });

    it('should throttle emails with delay between sends', async () => {
      const transport = getEmailTransport();
      mockResend.emails.send.mockResolvedValue({ data: { id: 'test-id' } });

      const startTime = Date.now();
      
      // Send first email
      await transport.send({
        to: 'test1@example.com',
        subject: 'Test 1',
        html: '<div>Test 1</div>'
      });
      
      // Send second email immediately
      await transport.send({
        to: 'test2@example.com',
        subject: 'Test 2',
        html: '<div>Test 2</div>'
      });
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // Should have throttled (at least 100ms delay)
      expect(totalTime).toBeGreaterThanOrEqual(100);
      expect(mockResend.emails.send).toHaveBeenCalledTimes(2);
    });

    it('should retry on 429 rate limit errors', async () => {
      const transport = getEmailTransport();
      
      // Mock 429 on first call, success on second
      mockResend.emails.send
        .mockRejectedValueOnce({ statusCode: 429, message: 'Rate limited' })
        .mockResolvedValueOnce({ data: { id: 'test-id' } });

      const result = await transport.send({
        to: 'test@example.com',
        subject: 'Test',
        html: '<div>Test</div>'
      });

      expect(result.ok).toBe(true);
      expect(result.retries).toBe(1);
      expect(result.rateLimited).toBe(1);
      expect(mockResend.emails.send).toHaveBeenCalledTimes(2);
    });

    it('should retry multiple times with exponential backoff', async () => {
      const transport = getEmailTransport();
      
      // Mock 429 on first two calls, success on third
      mockResend.emails.send
        .mockRejectedValueOnce({ statusCode: 429, message: 'Rate limited' })
        .mockRejectedValueOnce({ statusCode: 429, message: 'Rate limited' })
        .mockResolvedValueOnce({ data: { id: 'test-id' } });

      const startTime = Date.now();
      const result = await transport.send({
        to: 'test@example.com',
        subject: 'Test',
        html: '<div>Test</div>'
      });
      const endTime = Date.now();

      expect(result.ok).toBe(true);
      expect(result.retries).toBe(2);
      expect(result.rateLimited).toBe(2);
      expect(mockResend.emails.send).toHaveBeenCalledTimes(3);
      
      // Should have waited for backoff delays (at least 50ms + 100ms = 150ms)
      expect(endTime - startTime).toBeGreaterThanOrEqual(150);
    });

    it('should fail after max retries exceeded', async () => {
      const transport = getEmailTransport();
      
      // Mock 429 on all calls
      mockResend.emails.send.mockRejectedValue({ statusCode: 429, message: 'Rate limited' });

      const result = await transport.send({
        to: 'test@example.com',
        subject: 'Test',
        html: '<div>Test</div>'
      });

      expect(result.ok).toBe(false);
      expect(result.reason).toBe('rate_limited');
      expect(result.retries).toBe(2); // Max retries
      expect(result.rateLimited).toBe(3); // Initial + 2 retries
      expect(mockResend.emails.send).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should not retry on non-429 errors', async () => {
      const transport = getEmailTransport();
      
      // Mock non-429 error
      mockResend.emails.send.mockRejectedValue({ statusCode: 500, message: 'Server error' });

      const result = await transport.send({
        to: 'test@example.com',
        subject: 'Test',
        html: '<div>Test</div>'
      });

      expect(result.ok).toBe(false);
      expect(result.reason).toBe('provider_error');
      expect(result.retries).toBe(0);
      expect(result.rateLimited).toBe(0);
      expect(mockResend.emails.send).toHaveBeenCalledTimes(1); // No retries
    });

    it('should handle network errors without retry', async () => {
      const transport = getEmailTransport();
      
      // Mock network error
      mockResend.emails.send.mockRejectedValue(new Error('Network error'));

      const result = await transport.send({
        to: 'test@example.com',
        subject: 'Test',
        html: '<div>Test</div>'
      });

      expect(result.ok).toBe(false);
      expect(result.reason).toBe('provider_error');
      expect(result.retries).toBe(0);
      expect(result.rateLimited).toBe(0);
      expect(mockResend.emails.send).toHaveBeenCalledTimes(1); // No retries
    });

    it('should track stats correctly', async () => {
      const transport = getEmailTransport();
      
      // Mock success
      mockResend.emails.send.mockResolvedValue({ data: { id: 'test-id' } });

      await transport.send({
        to: 'test@example.com',
        subject: 'Test',
        html: '<div>Test</div>'
      });

      const stats = transport.getStats();
      expect(stats.sent).toBe(1);
      expect(stats.errors).toBe(0);
      expect(stats.rateLimited).toBe(0);
      expect(stats.retries).toBe(0);
    });

    it('should track rate limiting stats', async () => {
      const transport = getEmailTransport();
      
      // Mock 429 then success
      mockResend.emails.send
        .mockRejectedValueOnce({ statusCode: 429, message: 'Rate limited' })
        .mockResolvedValueOnce({ data: { id: 'test-id' } });

      await transport.send({
        to: 'test@example.com',
        subject: 'Test',
        html: '<div>Test</div>'
      });

      const stats = transport.getStats();
      expect(stats.sent).toBe(1);
      expect(stats.errors).toBe(0);
      expect(stats.rateLimited).toBe(1);
      expect(stats.retries).toBe(1);
    });
  });

  describe('CappedTransport', () => {
    beforeEach(() => {
      process.env.EMAIL_MODE = 'CAPPED';
      process.env.EMAIL_CAP_MAX_PER_RUN = '2';
      process.env.EMAIL_ALLOWLIST = 'test1@example.com,test2@example.com';
      process.env.BLOCK_NON_ALLOWLIST = 'true';
      process.env.EMAIL_SUBJECT_PREFIX = '[TEST]';
    });

    it('should enforce cap limits', async () => {
      const transport = getEmailTransport();
      mockResend.emails.send.mockResolvedValue({ data: { id: 'test-id' } });

      // Send 3 emails (cap is 2)
      const results = await Promise.all([
        transport.send({ to: 'test1@example.com', subject: 'Test 1', html: '<div>1</div>' }),
        transport.send({ to: 'test2@example.com', subject: 'Test 2', html: '<div>2</div>' }),
        transport.send({ to: 'test3@example.com', subject: 'Test 3', html: '<div>3</div>' })
      ]);

      expect(results[0].ok).toBe(true);
      expect(results[1].ok).toBe(true);
      expect(results[2].ok).toBe(false);
      expect(results[2].reason).toBe('capped');

      const stats = transport.getStats();
      expect(stats.sent).toBe(2);
      expect(stats.capped).toBe(1);
    });

    it('should enforce allowlist', async () => {
      const transport = getEmailTransport();
      mockResend.emails.send.mockResolvedValue({ data: { id: 'test-id' } });

      const result = await transport.send({
        to: 'blocked@example.com',
        subject: 'Test',
        html: '<div>Test</div>'
      });

      expect(result.ok).toBe(false);
      expect(result.reason).toBe('blocked');

      const stats = transport.getStats();
      expect(stats.sent).toBe(0);
      expect(stats.blocked).toBe(1);
    });

    it('should apply subject prefix', async () => {
      const transport = getEmailTransport();
      mockResend.emails.send.mockResolvedValue({ data: { id: 'test-id' } });

      await transport.send({
        to: 'test1@example.com',
        subject: 'Test Subject',
        html: '<div>Test</div>'
      });

      expect(mockResend.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: '[TEST] Test Subject'
        })
      );
    });

    it('should aggregate stats from wrapped transport', async () => {
      const transport = getEmailTransport();
      
      // Mock 429 then success
      mockResend.emails.send
        .mockRejectedValueOnce({ statusCode: 429, message: 'Rate limited' })
        .mockResolvedValueOnce({ data: { id: 'test-id' } });

      await transport.send({
        to: 'test1@example.com',
        subject: 'Test',
        html: '<div>Test</div>'
      });

      const stats = transport.getStats();
      expect(stats.sent).toBe(1);
      expect(stats.rateLimited).toBe(1);
      expect(stats.retries).toBe(1);
    });
  });

  describe('DryRunTransport', () => {
    beforeEach(() => {
      process.env.EMAIL_MODE = 'DRY_RUN';
    });

    it('should not call provider', async () => {
      const transport = getEmailTransport();

      const result = await transport.send({
        to: 'test@example.com',
        subject: 'Test',
        html: '<div>Test</div>'
      });

      expect(result.ok).toBe(true);
      expect(result.reason).toBe('dry_run');
      expect(mockResend.emails.send).not.toHaveBeenCalled();

      const stats = transport.getStats();
      expect(stats.sent).toBe(1);
      expect(stats.rateLimited).toBe(0);
      expect(stats.retries).toBe(0);
    });
  });
});
