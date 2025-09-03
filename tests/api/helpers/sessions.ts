import { request } from '@playwright/test';

export async function superAdminReq(baseURL: string) {
  return await request.newContext({ 
    baseURL, 
    extraHTTPHeaders: { 
      'admin-email': 'raja.gadgets89@gmail.com',
      'x-e2e-rbac': '1' 
    } 
  });
}

export async function anonReq(baseURL: string) {
  return await request.newContext({ baseURL });
}

export async function adminReq(baseURL: string) {
  return await request.newContext({ 
    baseURL, 
    extraHTTPHeaders: { 
      'admin-email': 'admin@example.com',
      'x-e2e-rbac': '1' 
    } 
  });
}
