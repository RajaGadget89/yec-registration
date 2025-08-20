import { test, expect } from '@playwright/test';
import { getClient, closeClient } from './db';

test.describe('Database Schema Smoke Tests', () => {
  let client: any;

  test.beforeAll(async () => {
    client = await getClient();
  });

  test.afterAll(async () => {
    await closeClient();
  });

  test('should have email_outbox table', async () => {
    const result = await client.query(`
      SELECT to_regclass('public.email_outbox') as table_exists
    `);
    
    expect(result.rows[0].table_exists).toBe('public.email_outbox');
  });

  test('should have required columns in email_outbox table', async () => {
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'email_outbox'
        AND column_name IN ('next_attempt', 'idempotency_key')
      ORDER BY column_name
    `);
    
    const columns = result.rows.map((row: any) => row.column_name);
    
    expect(columns).toContain('next_attempt');
    expect(columns).toContain('idempotency_key');
    
    // Verify next_attempt is NOT next_attempt_at (common migration error)
    const nextAttemptColumn = result.rows.find((row: any) => row.column_name === 'next_attempt');
    expect(nextAttemptColumn).toBeDefined();
    expect(nextAttemptColumn.column_name).toBe('next_attempt');
  });

  test('should have required indexes on email_outbox table', async () => {
    const result = await client.query(`
      SELECT 
        i.relname as index_name,
        a.attname as column_name
      FROM pg_index ix
      JOIN pg_class i ON i.oid = ix.indexrelid
      JOIN pg_class t ON t.oid = ix.indrelid
      JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
      WHERE t.relname = 'email_outbox'
        AND i.relname IN (
          'idx_email_outbox_status_scheduled',
          'idx_email_outbox_next_attempt',
          'email_outbox_idempotency_key_uidx'
        )
      ORDER BY i.relname, a.attnum
    `);
    
    const indexes = result.rows.reduce((acc: any, row: any) => {
      if (!acc[row.index_name]) {
        acc[row.index_name] = [];
      }
      acc[row.index_name].push(row.column_name);
      return acc;
    }, {});
    
    // Check required indexes exist
    expect(indexes['idx_email_outbox_status_scheduled']).toBeDefined();
    expect(indexes['idx_email_outbox_next_attempt']).toBeDefined();
    expect(indexes['email_outbox_idempotency_key_uidx']).toBeDefined();
    
    // Verify next_attempt index is on the correct column
    const nextAttemptIndex = indexes['idx_email_outbox_next_attempt'];
    expect(nextAttemptIndex).toContain('next_attempt');
    
    // Verify idempotency_key unique index is on the correct column
    const idempotencyKeyIndex = indexes['email_outbox_idempotency_key_uidx'];
    expect(idempotencyKeyIndex).toContain('idempotency_key');
  });

  test('should enforce unique constraint on idempotency_key', async () => {
    const testKey = `test-idempotency-${Date.now()}`;
    
    // Insert first row with idempotency_key
    await client.query(`
      INSERT INTO email_outbox (
        template, 
        to_email, 
        subject, 
        payload, 
        idempotency_key
      ) VALUES (
        'tracking',
        'test1@example.com',
        'Test Subject 1',
        '{}'::jsonb,
        $1
      )
    `, [testKey]);
    
    // Try to insert second row with same idempotency_key - should fail
    try {
      await client.query(`
        INSERT INTO email_outbox (
          template, 
          to_email, 
          subject, 
          payload, 
          idempotency_key
        ) VALUES (
          'tracking',
          'test2@example.com',
          'Test Subject 2',
          '{}'::jsonb,
          $1
        )
      `, [testKey]);
      
      // If we get here, the unique constraint is not working
      throw new Error('Unique constraint on idempotency_key is not enforced');
    } catch (error: any) {
      // Expect unique violation error (code 23505)
      expect(error.code).toBe('23505');
      expect(error.message).toContain('duplicate key value violates unique constraint');
    }
    
    // Clean up test data
    await client.query(`
      DELETE FROM email_outbox WHERE idempotency_key = $1
    `, [testKey]);
  });

  test('should allow null idempotency_key values', async () => {
    // Insert row with null idempotency_key - should succeed
    await client.query(`
      INSERT INTO email_outbox (
        template, 
        to_email, 
        subject, 
        payload, 
        idempotency_key
      ) VALUES (
        'tracking',
        'test-null@example.com',
        'Test Subject Null',
        '{}'::jsonb,
        NULL
      )
    `);
    
    // Insert another row with null idempotency_key - should also succeed
    await client.query(`
      INSERT INTO email_outbox (
        template, 
        to_email, 
        subject, 
        payload, 
        idempotency_key
      ) VALUES (
        'tracking',
        'test-null2@example.com',
        'Test Subject Null 2',
        '{}'::jsonb,
        NULL
      )
    `);
    
    // Clean up test data
    await client.query(`
      DELETE FROM email_outbox 
      WHERE to_email IN ('test-null@example.com', 'test-null2@example.com')
    `);
  });

  test('should have correct data types for critical columns', async () => {
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'email_outbox'
        AND column_name IN ('next_attempt', 'idempotency_key', 'status', 'template')
      ORDER BY column_name
    `);
    
    const columns = result.rows.reduce((acc: any, row: any) => {
      acc[row.column_name] = {
        data_type: row.data_type,
        is_nullable: row.is_nullable
      };
      return acc;
    }, {});
    
    // Verify data types
    expect(columns['next_attempt'].data_type).toBe('timestamp with time zone');
    expect(columns['idempotency_key'].data_type).toBe('text');
    expect(columns['status'].data_type).toBe('USER-DEFINED'); // enum type
    expect(columns['template'].data_type).toBe('text');
  });

  test('should have email_status enum type', async () => {
    const result = await client.query(`
      SELECT t.typname, e.enumlabel
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'email_status'
      ORDER BY e.enumsortorder
    `);
    
    const enumValues = result.rows.map((row: any) => row.enumlabel);
    const expectedValues = ['pending', 'processing', 'sent', 'failed', 'blocked'];
    
    expect(enumValues).toEqual(expectedValues);
  });
});
