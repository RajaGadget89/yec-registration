import 'dotenv/config';
import crypto from 'node:crypto';
import { request } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080';
const ACTORS = {
  super: process.env.SUPER_ADMIN_EMAIL!,
  payment: process.env.PAYMENT_ONLY_EMAIL!,
  tcc: process.env.TCC_ONLY_EMAIL!,
} as const;

function sign(method: string, path: string, ts: string) {
  const secret = process.env.E2E_AUTH_SECRET || '';
  const msg = `${method}:${path}:${ts}`;
  return crypto.createHmac('sha256', secret).update(msg).digest('hex');
}

async function testLogin(ctx: any, email: string) {
  const p = '/api/test/auth/login';
  const ts = String(Date.now());
  const r = await ctx.post(p, {
    data: { email },
    headers: { 
      'X-E2E-EMAIL': email, 
      'X-E2E-TS': ts, 
      'X-E2E-SIGN': sign('POST', p, ts) 
    }
  });
  return r.status() === 200 || r.status() === 204;
}

async function saveStorage(ctx: any, file: string) {
  const storage = await ctx.storageState();
  const out = path.resolve(process.cwd(), 'e2e/.auth', file);
  await writeFile(out, JSON.stringify(storage, null, 2), 'utf8');
}

async function discoverOrSeedRegId(ctx: any) {
  // 1) Try to list registrations (adjust path to your real list endpoint)
  const list = await ctx.get('/api/admin/registrations?limit=1');
  if (list.status() === 200) {
    try {
      const payload = await list.json();
      const id = payload?.data?.[0]?.id || payload?.[0]?.id;
      if (id) return id;
    } catch {}
  }
  
  // 2) Seed via test-only route
  const ins = await ctx.post('/api/test/seed-registration', { 
    data: { email: `smoke_${Date.now()}@test.local` } 
  });
  if (ins.status() === 200) {
    const j = await ins.json();
    return j.id;
  }
  
  throw new Error('REG_ID not found and could not seed');
}

export default async function globalSetup() {
  const baseURL = APP_URL;
  const ctx = await request.newContext({ baseURL });

  // Ensure .auth directory exists
  const authDir = path.resolve(process.cwd(), 'e2e/.auth');
  await writeFile(path.join(authDir, '.gitkeep'), '', 'utf8').catch(() => {});

  // Login 3 actors
  if (!await testLogin(ctx, ACTORS.super)) {
    throw new Error('super_admin login failed');
  }
  await saveStorage(ctx, 'super_admin.json');

  if (!await testLogin(ctx, ACTORS.payment)) {
    throw new Error('payment_only login failed');
  }
  await saveStorage(ctx, 'admin_payment.json');

  if (!await testLogin(ctx, ACTORS.tcc)) {
    throw new Error('tcc_only login failed');
  }
  await saveStorage(ctx, 'admin_tcc.json');

  // Discover or seed a REG_ID and write it to file for the spec to read
  const regId = await discoverOrSeedRegId(ctx);
  await writeFile(
    path.resolve(process.cwd(), 'e2e/.auth/context.json'), 
    JSON.stringify({ regId }, null, 2), 
    'utf8'
  );

  await ctx.dispose();
}