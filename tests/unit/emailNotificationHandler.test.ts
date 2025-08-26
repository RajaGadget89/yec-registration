import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EmailNotificationHandler } from '../../app/lib/events/handlers/emailNotificationHandler';
import { RegistrationEvent } from '../../app/lib/events/types';

// Mock dependencies
vi.mock('../../app/lib/config', () => ({
  hasEmailConfig: vi.fn(() => true),
  getEmailFromAddress: vi.fn(() => 'test@example.com')
}));

vi.mock('../../app/lib/emails/dispatcher', () => ({
  enqueueEmail: vi.fn(() => Promise.resolve('email-id-123'))
}));

vi.mock('../../app/lib/tokenService', () => ({
  TokenService: {
    getTokenDataForEmail: vi.fn()
  }
}));

describe('EmailNotificationHandler', () => {
  let handler: EmailNotificationHandler;

  beforeEach(() => {
    handler = new EmailNotificationHandler();
    vi.clearAllMocks();
  });

  describe('admin.request_update event', () => {
    it('should handle event with token_id and enqueue email', async () => {
      const event: RegistrationEvent = {
        id: 'event-123',
        type: 'admin.request_update',
        payload: {
          registration: {
            id: 'reg-123',
            registration_id: 'YEC-123',
            first_name: 'John',
            last_name: 'Doe',
            email: 'john@example.com'
          },
          admin_email: 'admin@example.com',
          dimension: 'payment',
          notes: 'Please update payment slip',
          token_id: 'token-id-123'
        },
        timestamp: new Date().toISOString(),
        correlation_id: 'YEC-123'
      };

      await handler.handle(event);

      const { enqueueEmail } = await import('../../app/lib/emails/dispatcher');
      expect(enqueueEmail).toHaveBeenCalledWith(
        'update-payment',
        'john@example.com',
        expect.objectContaining({
          applicantName: 'John Doe',
          trackingCode: 'YEC-123',
          dimension: 'payment',
          notes: 'Please update payment slip',
          token_id: 'token-id-123'
        })
      );
    });

    it('should handle event without token_id gracefully', async () => {
      const event: RegistrationEvent = {
        id: 'event-123',
        type: 'admin.request_update',
        payload: {
          registration: {
            id: 'reg-123',
            registration_id: 'YEC-123',
            first_name: 'John',
            last_name: 'Doe',
            email: 'john@example.com'
          },
          admin_email: 'admin@example.com',
          dimension: 'payment',
          notes: 'Please update payment slip'
          // No token_id
        },
        timestamp: new Date().toISOString(),
        correlation_id: 'YEC-123'
      };

      await handler.handle(event);

      const { enqueueEmail } = await import('../../app/lib/emails/dispatcher');
      expect(enqueueEmail).toHaveBeenCalledWith(
        'update-payment',
        'john@example.com',
        expect.objectContaining({
          applicantName: 'John Doe',
          trackingCode: 'YEC-123',
          dimension: 'payment',
          notes: 'Please update payment slip',
          token_id: undefined
        })
      );
    });

    it('should handle missing admin_email gracefully', async () => {
      const event: RegistrationEvent = {
        id: 'event-123',
        type: 'admin.request_update',
        payload: {
          registration: {
            id: 'reg-123',
            registration_id: 'YEC-123',
            first_name: 'John',
            last_name: 'Doe',
            email: 'john@example.com'
          },
          dimension: 'payment',
          notes: 'Please update payment slip',
          token_id: 'token-id-123'
          // No admin_email
        },
        timestamp: new Date().toISOString(),
        correlation_id: 'YEC-123'
      };

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await handler.handle(event);

      expect(consoleSpy).toHaveBeenCalledWith(
        'admin_email is required for admin.request_update event'
      );

      const { enqueueEmail } = await import('../../app/lib/emails/dispatcher');
      expect(enqueueEmail).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle missing dimension gracefully', async () => {
      const event: RegistrationEvent = {
        id: 'event-123',
        type: 'admin.request_update',
        payload: {
          registration: {
            id: 'reg-123',
            registration_id: 'YEC-123',
            first_name: 'John',
            last_name: 'Doe',
            email: 'john@example.com'
          },
          admin_email: 'admin@example.com',
          notes: 'Please update payment slip',
          token_id: 'token-id-123'
          // No dimension
        },
        timestamp: new Date().toISOString(),
        correlation_id: 'YEC-123'
      };

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await handler.handle(event);

      expect(consoleSpy).toHaveBeenCalledWith(
        'dimension is required for admin.request_update event'
      );

      const { enqueueEmail } = await import('../../app/lib/emails/dispatcher');
      expect(enqueueEmail).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle different dimensions correctly', async () => {
      const dimensions = ['payment', 'profile', 'tcc'] as const;
      const templates = ['update-payment', 'update-info', 'update-tcc'];

      for (let i = 0; i < dimensions.length; i++) {
        const dimension = dimensions[i];
        const template = templates[i];

        const event: RegistrationEvent = {
          id: `event-${i}`,
          type: 'admin.request_update',
          payload: {
            registration: {
              id: 'reg-123',
              registration_id: 'YEC-123',
              first_name: 'John',
              last_name: 'Doe',
              email: 'john@example.com'
            },
            admin_email: 'admin@example.com',
            dimension,
            notes: `Please update ${dimension}`,
            token_id: `token-id-${i}`
          },
          timestamp: new Date().toISOString(),
          correlation_id: 'YEC-123'
        };

        await handler.handle(event);

        const { enqueueEmail } = await import('../../app/lib/emails/dispatcher');
        expect(enqueueEmail).toHaveBeenCalledWith(
          template,
          'john@example.com',
          expect.objectContaining({
            dimension,
            token_id: `token-id-${i}`
          })
        );
      }
    });
  });

  describe('email configuration', () => {
    it('should skip email when email config is not available', async () => {
      const { hasEmailConfig } = await import('../../app/lib/config');
      vi.mocked(hasEmailConfig).mockReturnValue(false);

      const event: RegistrationEvent = {
        id: 'event-123',
        type: 'admin.request_update',
        payload: {
          registration: {
            id: 'reg-123',
            registration_id: 'YEC-123',
            first_name: 'John',
            last_name: 'Doe',
            email: 'john@example.com'
          },
          admin_email: 'admin@example.com',
          dimension: 'payment',
          notes: 'Please update payment slip',
          token_id: 'token-id-123'
        },
        timestamp: new Date().toISOString(),
        correlation_id: 'YEC-123'
      };

      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await handler.handle(event);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Email configuration not available, skipping email notification'
      );

      const { enqueueEmail } = await import('../../app/lib/emails/dispatcher');
      expect(enqueueEmail).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('error handling', () => {
    it('should handle enqueueEmail failure gracefully', async () => {
      const { enqueueEmail } = await import('../../app/lib/emails/dispatcher');
      vi.mocked(enqueueEmail).mockRejectedValue(new Error('Email service unavailable'));

      const event: RegistrationEvent = {
        id: 'event-123',
        type: 'admin.request_update',
        payload: {
          registration: {
            id: 'reg-123',
            registration_id: 'YEC-123',
            first_name: 'John',
            last_name: 'Doe',
            email: 'john@example.com'
          },
          admin_email: 'admin@example.com',
          dimension: 'payment',
          notes: 'Please update payment slip',
          token_id: 'token-id-123'
        },
        timestamp: new Date().toISOString(),
        correlation_id: 'YEC-123'
      };

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Should not throw
      await expect(handler.handle(event)).resolves.not.toThrow();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to enqueue update request email:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should handle missing registration data gracefully', async () => {
      const event: RegistrationEvent = {
        id: 'event-123',
        type: 'admin.request_update',
        payload: {
          registration: {
            id: 'reg-123',
            registration_id: 'YEC-123',
            first_name: '',
            last_name: '',
            email: 'john@example.com'
          },
          admin_email: 'admin@example.com',
          dimension: 'payment',
          notes: 'Please update payment slip',
          token_id: 'token-id-123'
        },
        timestamp: new Date().toISOString(),
        correlation_id: 'YEC-123'
      };

      await handler.handle(event);

      const { enqueueEmail } = await import('../../app/lib/emails/dispatcher');
      expect(enqueueEmail).toHaveBeenCalledWith(
        'update-payment',
        'john@example.com',
        expect.objectContaining({
          applicantName: '', // Should handle empty names gracefully
          trackingCode: 'YEC-123'
        })
      );
    });
  });

  describe('other event types', () => {
    it('should handle registration.submitted event', async () => {
      const event: RegistrationEvent = {
        id: 'event-123',
        type: 'registration.submitted',
        payload: {
          registration: {
            id: 'reg-123',
            registration_id: 'YEC-123',
            first_name: 'John',
            last_name: 'Doe',
            email: 'john@example.com'
          }
        },
        timestamp: new Date().toISOString(),
        correlation_id: 'YEC-123'
      };

      await handler.handle(event);

      const { enqueueEmail } = await import('../../app/lib/emails/dispatcher');
      expect(enqueueEmail).toHaveBeenCalledWith(
        'tracking',
        'john@example.com',
        expect.objectContaining({
          applicantName: 'John Doe',
          trackingCode: 'YEC-123'
        })
      );
    });

    it('should handle admin.approved event', async () => {
      const event: RegistrationEvent = {
        id: 'event-123',
        type: 'admin.approved',
        payload: {
          registration: {
            id: 'reg-123',
            registration_id: 'YEC-123',
            first_name: 'John',
            last_name: 'Doe',
            email: 'john@example.com'
          },
          admin_email: 'admin@example.com'
        },
        timestamp: new Date().toISOString(),
        correlation_id: 'YEC-123'
      };

      await handler.handle(event);

      const { enqueueEmail } = await import('../../app/lib/emails/dispatcher');
      expect(enqueueEmail).toHaveBeenCalledWith(
        'approval-badge',
        'john@example.com',
        expect.objectContaining({
          applicantName: 'John Doe',
          trackingCode: 'YEC-123'
        })
      );
    });
  });
});
