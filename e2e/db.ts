import { Client } from 'pg';
import { readFileSync, existsSync } from 'fs';

let client: Client | null = null;

export async function getClient(): Promise<Client> {
  if (client) {
    return client;
  }

  // Try to read DATABASE_URL from .e2e-env file first
  let databaseUrl = process.env.E2E_DATABASE_URL || process.env.DATABASE_URL;
  
  if (!databaseUrl && existsSync('.e2e-env')) {
    try {
      const envContent = readFileSync('.e2e-env', 'utf8');
      const match = envContent.match(/DATABASE_URL=(.+)/);
      if (match) {
        databaseUrl = match[1];
      }
    } catch (error) {
      console.warn('Could not read .e2e-env file:', error);
    }
  }

  // Fallback to default local Supabase URL
  if (!databaseUrl) {
    databaseUrl = 'postgres://postgres:postgres@localhost:54322/postgres';
  }

  client = new Client({
    connectionString: databaseUrl,
    ssl: false, // Local Supabase doesn't use SSL
  });

  try {
    await client.connect();
    console.log('✅ Connected to E2E database');
  } catch (error) {
    console.error('❌ Failed to connect to E2E database:', error);
    throw error;
  }

  return client;
}

export async function closeClient(): Promise<void> {
  if (client) {
    await client.end();
    client = null;
    console.log('✅ Disconnected from E2E database');
  }
}

// Auto-close connection on process exit
process.on('exit', () => {
  if (client) {
    client.end();
  }
});

process.on('SIGINT', async () => {
  await closeClient();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeClient();
  process.exit(0);
});
