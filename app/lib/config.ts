/**
 * Centralized configuration utility for environment variables
 * Provides warnings for missing optional variables and validates required ones
 */

export interface AppConfig {
  // Required environment variables
  supabase: {
    url: string;
    serviceRoleKey: string;
  };
  
  // Optional environment variables (with warnings if missing)
  email: {
    resendApiKey: string | null;
    fromEmail: string | null;
    replyToEmail: string | null;
  };
  
  telegram: {
    botToken: string | null;
    chatId: string | null;
  };
  
  app: {
    url: string | null;
  };
}

function getRequiredEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
}

function getOptionalEnvVar(name: string): string | null {
  const value = process.env[name];
  if (!value) {
    console.warn(`Optional environment variable ${name} is not set - some features will be disabled`);
  }
  return value || null;
}

function getAppUrl(): string {
  // For development, default to localhost:8080
  if (process.env.NODE_ENV === 'development') {
    return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080';
  }
  
  // For production, require the environment variable
  const productionUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!productionUrl) {
    console.warn('NEXT_PUBLIC_APP_URL not set in production - using fallback');
    return '';
  }
  
  return productionUrl;
}

export const config: AppConfig = {
  supabase: {
    url: getRequiredEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
    serviceRoleKey: getRequiredEnvVar('SUPABASE_SERVICE_ROLE_KEY'),
  },
  
  email: {
    resendApiKey: getOptionalEnvVar('RESEND_API_KEY'),
    fromEmail: getOptionalEnvVar('FROM_EMAIL'),
    replyToEmail: getOptionalEnvVar('REPLY_TO_EMAIL'),
  },
  
  telegram: {
    botToken: getOptionalEnvVar('TELEGRAM_BOT_TOKEN'),
    chatId: getOptionalEnvVar('TELEGRAM_CHAT_ID'),
  },
  
  app: {
    url: getAppUrl(),
  },
};

// Validation helpers
export const hasEmailConfig = (): boolean => {
  return !!(config.email.resendApiKey && config.email.fromEmail);
};

export const hasTelegramConfig = (): boolean => {
  return !!(config.telegram.botToken && config.telegram.chatId);
};

// Log configuration status on module load
console.log('App configuration loaded:', {
  hasSupabase: !!config.supabase.url,
  hasEmail: hasEmailConfig(),
  hasTelegram: hasTelegramConfig(),
  hasAppUrl: !!config.app.url,
});
