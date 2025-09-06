export const ACTORS = {
  super: process.env.SUPER_ADMIN_EMAIL || 'raja.gadgets89@gmail.com',
  payment: process.env.PAYMENT_ONLY_EMAIL || 'yecsongkhla.official@gmail.com',
  tcc: process.env.TCC_ONLY_EMAIL || 'dave@yec.dev',
} as const;

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080';
export const REG_ID = process.env.SMOKE_REG_ID || 'REPLACE_WITH_VALID_REG_ID'; // <— adjust
