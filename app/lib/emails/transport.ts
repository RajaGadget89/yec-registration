/**
 * Email Transport Layer
 * Provides safe, local-only capped-send mode for emails with allowlist and per-run cap functionality
 */

export type SendResult = { 
  ok: boolean; 
  id?: string; 
  reason?: 'capped' | 'blocked' | 'provider_error' | 'dry_run';
  sentCount?: number;
};

export interface EmailTransport {
  send(input: { to: string; subject: string; html: string; text?: string }): Promise<SendResult>;
  getStats(): { sent: number; capped: number; blocked: number; errors: number };
  resetStats(): void;
}

/**
 * Dry Run Transport - never calls provider
 */
class DryRunTransport implements EmailTransport {
  private stats = { sent: 0, capped: 0, blocked: 0, errors: 0 };

  async send(input: { to: string; subject: string; html: string; text?: string }): Promise<SendResult> {
    console.log(`[DRY-RUN] Would send email to ${input.to}: ${input.subject}`);
    this.stats.sent++;
    return { ok: true, reason: 'dry_run' };
  }

  getStats() {
    return { ...this.stats };
  }

  resetStats() {
    this.stats = { sent: 0, capped: 0, blocked: 0, errors: 0 };
  }
}

/**
 * Resend Transport - calls real provider
 */
class ResendTransport implements EmailTransport {
  private resend: any;
  private fromEmail: string;
  private stats = { sent: 0, capped: 0, blocked: 0, errors: 0 };
  private sendLog: Array<{ to: string; subject: string; timestamp: string }> = [];

  constructor() {
    const { Resend } = require('resend');
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is required');
    }
    
    this.resend = new Resend(apiKey);
    this.fromEmail = process.env.EMAIL_FROM || 'YEC <info@rajagadget.live>';
  }

  async send(input: { to: string; subject: string; html: string; text?: string }): Promise<SendResult> {
    try {
      const { error, data } = await this.resend.emails.send({
        from: this.fromEmail,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      });

      if (error) {
        console.error('Resend email sending error:', error);
        this.stats.errors++;
        return { ok: false, reason: 'provider_error' };
      }

      console.log('Email sent successfully via Resend to:', input.to);
      this.stats.sent++;
      
      // Log the send for testing purposes
      this.sendLog.push({
        to: input.to,
        subject: input.subject,
        timestamp: new Date().toISOString()
      });

      return { ok: true, id: data?.id };
    } catch (err) {
      console.error('Unexpected error in Resend sendEmail:', err);
      this.stats.errors++;
      return { ok: false, reason: 'provider_error' };
    }
  }

  getStats() {
    return { ...this.stats };
  }

  resetStats() {
    this.stats = { sent: 0, capped: 0, blocked: 0, errors: 0 };
    this.sendLog = [];
  }

  // Dev-only method to get send log for testing
  getSendLog() {
    return [...this.sendLog];
  }
}

/**
 * Capped Transport - wraps a real transport with safety controls
 */
class CappedTransport implements EmailTransport {
  private wrappedTransport: EmailTransport;
  private allowlist: Set<string>;
  private capMaxPerRun: number;
  private blockNonAllowlist: boolean;
  private subjectPrefix: string;
  private sentCount = 0;
  private stats = { sent: 0, capped: 0, blocked: 0, errors: 0 };

  constructor(wrappedTransport: EmailTransport) {
    this.wrappedTransport = wrappedTransport;
    
    // Load configuration from environment
    const allowlistStr = process.env.EMAIL_ALLOWLIST || '';
    this.allowlist = new Set(allowlistStr.split(',').map(email => email.trim().toLowerCase()).filter(Boolean));
    
    this.capMaxPerRun = parseInt(process.env.EMAIL_CAP_MAX_PER_RUN || '2', 10);
    this.blockNonAllowlist = process.env.BLOCK_NON_ALLOWLIST === 'true';
    this.subjectPrefix = process.env.EMAIL_SUBJECT_PREFIX || '[E2E]';
    
    console.log(`[CAPPED] Transport initialized with cap=${this.capMaxPerRun}, allowlist=${Array.from(this.allowlist)}, blockNonAllowlist=${this.blockNonAllowlist}`);
  }

  async send(input: { to: string; subject: string; html: string; text?: string }): Promise<SendResult> {
    const toEmail = input.to.toLowerCase();
    
    // Check allowlist
    if (this.allowlist.size > 0 && !this.allowlist.has(toEmail)) {
      console.log(`[CAPPED] Blocked email to ${input.to} (not in allowlist)`);
      this.stats.blocked++;
      return { ok: false, reason: 'blocked' };
    }
    
    // Check cap
    if (this.sentCount >= this.capMaxPerRun) {
      console.log(`[CAPPED] Capped email to ${input.to} (cap reached: ${this.sentCount}/${this.capMaxPerRun})`);
      this.stats.capped++;
      return { ok: false, reason: 'capped' };
    }
    
    // Apply subject prefix
    const prefixedSubject = `${this.subjectPrefix} ${input.subject}`;
    
    // Send via wrapped transport
    const result = await this.wrappedTransport.send({
      ...input,
      subject: prefixedSubject
    });
    
    if (result.ok) {
      this.sentCount++;
      this.stats.sent++;
    } else {
      this.stats.errors++;
    }
    
    return result;
  }

  getStats() {
    return { ...this.stats };
  }

  resetStats() {
    this.stats = { sent: 0, capped: 0, blocked: 0, errors: 0 };
    this.sentCount = 0;
    if ('resetStats' in this.wrappedTransport) {
      this.wrappedTransport.resetStats();
    }
  }

  // Dev-only method to get send log from wrapped transport
  getSendLog() {
    if ('getSendLog' in this.wrappedTransport) {
      return (this.wrappedTransport as any).getSendLog();
    }
    return [];
  }
}

/**
 * Factory function to create the appropriate email transport based on EMAIL_MODE
 */
export function getEmailTransport(): EmailTransport {
  const emailMode = process.env.EMAIL_MODE || 'DRY_RUN';
  
  console.log(`[EMAIL] Creating transport with mode: ${emailMode}`);
  
  switch (emailMode.toUpperCase()) {
    case 'DRY_RUN':
      return new DryRunTransport();
      
    case 'CAPPED':
      const resendTransport = new ResendTransport();
      return new CappedTransport(resendTransport);
      
    case 'FULL':
      return new ResendTransport();
      
    default:
      console.warn(`[EMAIL] Unknown EMAIL_MODE: ${emailMode}, defaulting to DRY_RUN`);
      return new DryRunTransport();
  }
}

/**
 * Get current email transport configuration
 */
export function getEmailTransportConfig() {
  const emailMode = process.env.EMAIL_MODE || 'DRY_RUN';
  const allowlist = process.env.EMAIL_ALLOWLIST || '';
  const capMaxPerRun = process.env.EMAIL_CAP_MAX_PER_RUN || '2';
  const blockNonAllowlist = process.env.BLOCK_NON_ALLOWLIST === 'true';
  const subjectPrefix = process.env.EMAIL_SUBJECT_PREFIX || '[E2E]';
  
  return {
    mode: emailMode,
    allowlist: allowlist.split(',').map(email => email.trim()).filter(Boolean),
    capMaxPerRun: parseInt(capMaxPerRun, 10),
    blockNonAllowlist,
    subjectPrefix,
    resendConfigured: !!process.env.RESEND_API_KEY
  };
}

