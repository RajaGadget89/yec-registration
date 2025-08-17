import { describe, it, expect, vi } from 'vitest';
import { renderEmail, validateEmailPayload, EmailPayload } from '../app/lib/emails/render';

describe('Email Render Utility', () => {
  describe('renderEmail', () => {
    it('should render valid React element to HTML string', () => {
      const element = (
        <div>
          <h1>Test Email</h1>
          <p>This is a test email content.</p>
        </div>
      );
      
      const html = renderEmail(element);
      
      expect(typeof html).toBe('string');
      expect(html).toContain('<div>');
      expect(html).toContain('<h1>Test Email</h1>');
      expect(html).toContain('<p>This is a test email content.</p>');
      expect(html).toContain('</div>');
    });

    it('should render with pretty option', () => {
      const element = (
        <div>
          <h1>Test</h1>
        </div>
      );
      
      const html = renderEmail(element, { pretty: true });
      
      expect(typeof html).toBe('string');
      expect(html).toContain('<div>');
      expect(html).toContain('<h1>Test</h1>');
    });

    it('should throw error for invalid HTML output', () => {
      // This test would require mocking @react-email/render to return invalid output
      // For now, we test the validation logic
      expect(() => {
        // Simulate invalid HTML output
        const mockRender = vi.fn().mockReturnValue(null);
        vi.doMock('@react-email/render', () => ({ render: mockRender }));
        
        const element = <div>Test</div>;
        renderEmail(element);
      }).toThrow();
    });

    it('should throw error for empty HTML output', () => {
      // This test would require mocking @react-email/render to return empty string
      expect(() => {
        // Simulate empty HTML output
        const mockRender = vi.fn().mockReturnValue('');
        vi.doMock('@react-email/render', () => ({ render: mockRender }));
        
        const element = <div>Test</div>;
        renderEmail(element);
      }).toThrow();
    });
  });

  describe('validateEmailPayload', () => {
    it('should validate correct email payload', () => {
      const payload: EmailPayload = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<div>Test content</div>'
      };
      
      expect(() => validateEmailPayload(payload)).not.toThrow();
    });

    it('should validate email payload with text', () => {
      const payload: EmailPayload = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<div>Test content</div>',
        text: 'Test content'
      };
      
      expect(() => validateEmailPayload(payload)).not.toThrow();
    });

    it('should throw error for invalid email address', () => {
      const payload: EmailPayload = {
        to: 'invalid-email',
        subject: 'Test Subject',
        html: '<div>Test content</div>'
      };
      
      expect(() => validateEmailPayload(payload)).toThrow('EMAIL_PAYLOAD_INVALID_TO');
    });

    it('should throw error for empty email address', () => {
      const payload: EmailPayload = {
        to: '',
        subject: 'Test Subject',
        html: '<div>Test content</div>'
      };
      
      expect(() => validateEmailPayload(payload)).toThrow('EMAIL_PAYLOAD_INVALID_TO');
    });

    it('should throw error for empty subject', () => {
      const payload: EmailPayload = {
        to: 'test@example.com',
        subject: '',
        html: '<div>Test content</div>'
      };
      
      expect(() => validateEmailPayload(payload)).toThrow('EMAIL_PAYLOAD_INVALID_SUBJECT');
    });

    it('should throw error for whitespace-only subject', () => {
      const payload: EmailPayload = {
        to: 'test@example.com',
        subject: '   ',
        html: '<div>Test content</div>'
      };
      
      expect(() => validateEmailPayload(payload)).toThrow('EMAIL_PAYLOAD_INVALID_SUBJECT');
    });

    it('should throw error for empty HTML', () => {
      const payload: EmailPayload = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: ''
      };
      
      expect(() => validateEmailPayload(payload)).toThrow('EMAIL_PAYLOAD_INVALID_HTML');
    });

    it('should throw error for whitespace-only HTML', () => {
      const payload: EmailPayload = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '   '
      };
      
      expect(() => validateEmailPayload(payload)).toThrow('EMAIL_PAYLOAD_INVALID_HTML');
    });

    it('should throw error for non-string HTML', () => {
      const payload = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: 123 // Invalid type
      } as EmailPayload;
      
      expect(() => validateEmailPayload(payload)).toThrow('EMAIL_PAYLOAD_INVALID_HTML_TYPE');
    });

    it('should validate various email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.co.uk',
        'user+tag@example.org',
        '123@numbers.com'
      ];
      
      validEmails.forEach(email => {
        const payload: EmailPayload = {
          to: email,
          subject: 'Test Subject',
          html: '<div>Test content</div>'
        };
        
        expect(() => validateEmailPayload(payload)).not.toThrow();
      });
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'test@',
        '@example.com',
        'test.example.com',
        'test@.com',
        'test@example.',
        ''
      ];
      
      invalidEmails.forEach(email => {
        const payload: EmailPayload = {
          to: email,
          subject: 'Test Subject',
          html: '<div>Test content</div>'
        };
        
        expect(() => validateEmailPayload(payload)).toThrow('EMAIL_PAYLOAD_INVALID_TO');
      });
    });
  });
});
