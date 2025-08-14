// In-memory storage for test mode Telegram payloads
// Use global variable to persist across module reloads
declare global {
  var telegramOutbox: Array<{
    text: string;
    timestamp: string;
    messageId?: string;
    success: boolean;
  }>;
}

// Initialize global variable if it doesn't exist
if (!global.telegramOutbox) {
  global.telegramOutbox = [];
}

/**
 * Telegram service wrapper that captures outgoing payloads in test mode
 */
export class TelegramService {
  private static instance: TelegramService;
  private isTestMode: boolean;

  private constructor() {
    this.isTestMode = process.env.NODE_ENV === 'test' || process.env.TEST_HELPERS_ENABLED === '1';
    console.log('[TELEGRAM-SERVICE] Constructor called, isTestMode:', this.isTestMode);
    console.log('[TELEGRAM-SERVICE] Environment:', {
      NODE_ENV: process.env.NODE_ENV,
      TEST_HELPERS_ENABLED: process.env.TEST_HELPERS_ENABLED
    });
    console.log('[TELEGRAM-SERVICE] Global telegramOutbox length:', global.telegramOutbox.length);
  }

  static getInstance(): TelegramService {
    if (!TelegramService.instance) {
      TelegramService.instance = new TelegramService();
    }
    return TelegramService.instance;
  }

  /**
   * Send Telegram notification and capture in test mode
   */
  async notifyNewRegistration(payload: {
    fullName: string;
    email: string;
    registrationId: string;
    province: string;
    companyName: string;
    businessType: string;
  }): Promise<boolean> {
    const message = `🆕 New Registration Submitted\n\n` +
      `Name: ${payload.fullName}\n` +
      `Email: ${payload.email}\n` +
      `Registration ID: ${payload.registrationId}\n` +
      `Province: ${payload.province}\n` +
      `Company: ${payload.companyName}\n` +
      `Business Type: ${payload.businessType}`;

    const timestamp = new Date().toISOString();
    let success = false;
    let messageId: string | undefined;

    try {
      // Always attempt real send if credentials are available
      const botToken = process.env.TELEGRAM_BOT_TOKEN;
      const chatId = process.env.TELEGRAM_CHAT_ID;
      
      if (botToken && chatId) {
        const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            chat_id: chatId,
            text: message,
            parse_mode: 'HTML',
          }),
        });

        if (response.ok) {
          const result = await response.json();
          if (result.ok) {
            success = true;
            messageId = result.result?.message_id?.toString();
            console.log('Telegram notification sent successfully');
          } else {
            console.error('Telegram API returned error:', result);
          }
        } else {
          console.error('Telegram API error:', response.status, response.statusText);
        }
      } else {
        console.warn('TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not configured, skipping real send');
      }

      // In test mode, always capture the payload
      console.log('[TELEGRAM-SERVICE] isTestMode check:', this.isTestMode);
      if (this.isTestMode) {
        console.log('[TELEGRAM-SERVICE] Capturing payload in test mode...');
        console.log('[TELEGRAM-SERVICE] Before push - Global telegramOutbox length:', global.telegramOutbox.length);
        global.telegramOutbox.push({
          text: message,
          timestamp,
          messageId,
          success
        });
        console.log('[TELEGRAM-SERVICE] After push - Global telegramOutbox length:', global.telegramOutbox.length);
        console.log('[TELEGRAM-SERVICE] Telegram payload captured in test mode');
      } else {
        console.log('[TELEGRAM-SERVICE] Not in test mode, skipping capture');
      }

      return success;
    } catch (error) {
      console.error('Unexpected error in Telegram notification:', error);
      
      // In test mode, capture failed attempts too
      if (this.isTestMode) {
        global.telegramOutbox.push({
          text: message,
          timestamp,
          success: false
        });
      }
      
      return false;
    }
  }

  /**
   * Get captured Telegram payloads (test mode only)
   */
  getOutbox(): Array<{
    text: string;
    timestamp: string;
    messageId?: string;
    success: boolean;
  }> {
    if (!this.isTestMode) {
      return [];
    }
    console.log('[TELEGRAM-SERVICE] getOutbox called, global telegramOutbox length:', global.telegramOutbox.length);
    return [...global.telegramOutbox];
  }

  /**
   * Clear captured payloads (test mode only)
   */
  clearOutbox(): void {
    if (this.isTestMode) {
      global.telegramOutbox = [];
      console.log('[TELEGRAM-SERVICE] Outbox cleared');
    }
  }

  /**
   * Get the most recent payload (test mode only)
   */
  getLatestPayload(): {
    text: string;
    timestamp: string;
    messageId?: string;
    success: boolean;
  } | null {
    if (!this.isTestMode || global.telegramOutbox.length === 0) {
      return null;
    }
    return global.telegramOutbox[global.telegramOutbox.length - 1];
  }
}
