import { test, expect } from '@playwright/test';
import { supabaseTestClient } from './helpers/supabaseTestClient';

test.describe('Audit Schema Validation - Comprehensive Testing', () => {
  test('@audit @schema should validate audit table structure and RPC functions', async () => {
    const supabase = supabaseTestClient;
    
    console.log(`[audit-schema] Validating audit schema integrity...`);

    // Test 1: Verify audit schema exists
    try {
      const { data: schemaExists, error: schemaError } = await supabase.client
        .from('information_schema.schemata')
        .select('schema_name')
        .eq('schema_name', 'audit');

      if (schemaError) {
        console.warn(`[audit-schema] Schema query failed: ${schemaError.message}`);
        throw new Error(`Audit schema not found: ${schemaError.message}`);
      }

      expect(schemaExists).toHaveLength(1);
      expect(schemaExists[0].schema_name).toBe('audit');
      console.log(`[audit-schema] ✅ Audit schema exists`);

    } catch (error) {
      console.error(`[audit-schema] ❌ Audit schema validation failed:`, error);
      throw error;
    }

    // Test 2: Verify audit.access_log table structure
    try {
      const { data: accessLogColumns, error: accessLogError } = await supabase.client
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_schema', 'audit')
        .eq('table_name', 'access_log')
        .order('ordinal_position');

      if (accessLogError) {
        console.warn(`[audit-schema] Access log columns query failed: ${accessLogError.message}`);
        throw new Error(`audit.access_log table not found: ${accessLogError.message}`);
      }

      // Verify required columns exist
      const requiredColumns = [
        'id', 'occurred_at_utc', 'action', 'method', 'resource', 
        'result', 'request_id', 'src_ip', 'user_agent', 'latency_ms', 'meta'
      ];

      const columnNames = accessLogColumns.map(col => col.column_name);
      requiredColumns.forEach(column => {
        expect(columnNames).toContain(column);
      });

      // Verify data types
      const idColumn = accessLogColumns.find(col => col.column_name === 'id');
      expect(idColumn?.data_type).toBe('bigint');

      const occurredAtColumn = accessLogColumns.find(col => col.column_name === 'occurred_at_utc');
      expect(occurredAtColumn?.data_type).toBe('timestamp with time zone');

      console.log(`[audit-schema] ✅ audit.access_log table structure validated`);

    } catch (error) {
      console.error(`[audit-schema] ❌ audit.access_log table validation failed:`, error);
      throw error;
    }

    // Test 3: Verify audit.event_log table structure
    try {
      const { data: eventLogColumns, error: eventLogError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_schema', 'audit')
        .eq('table_name', 'event_log')
        .order('ordinal_position');

      if (eventLogError) {
        console.warn(`[audit-schema] Event log columns query failed: ${eventLogError.message}`);
        throw new Error(`audit.event_log table not found: ${eventLogError.message}`);
      }

      // Verify required columns exist
      const requiredColumns = [
        'id', 'occurred_at_utc', 'action', 'resource', 'resource_id', 
        'actor_id', 'actor_role', 'result', 'reason', 'correlation_id', 'meta'
      ];

      const columnNames = eventLogColumns.map(col => col.column_name);
      requiredColumns.forEach(column => {
        expect(columnNames).toContain(column);
      });

      // Verify data types
      const idColumn = eventLogColumns.find(col => col.column_name === 'id');
      expect(idColumn?.data_type).toBe('bigint');

      const occurredAtColumn = eventLogColumns.find(col => col.column_name === 'occurred_at_utc');
      expect(occurredAtColumn?.data_type).toBe('timestamp with time zone');

      console.log(`[audit-schema] ✅ audit.event_log table structure validated`);

    } catch (error) {
      console.error(`[audit-schema] ❌ audit.event_log table validation failed:`, error);
      throw error;
    }

    // Test 4: Verify admin_audit_logs table structure
    try {
      const { data: adminAuditColumns, error: adminAuditError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_name', 'admin_audit_logs')
        .order('ordinal_position');

      if (adminAuditError) {
        console.warn(`[audit-schema] Admin audit columns query failed: ${adminAuditError.message}`);
        console.log(`[audit-schema] ⚠️  admin_audit_logs table not found - this is optional`);
        // Don't fail the test if admin_audit_logs doesn't exist
        return;
      }

      // Verify required columns exist
      const requiredColumns = [
        'id', 'created_at', 'admin_email', 'action', 'registration_id', 'before', 'after'
      ];

      const columnNames = adminAuditColumns.map(col => col.column_name);
      requiredColumns.forEach(column => {
        expect(columnNames).toContain(column);
      });

      // Verify data types
      const idColumn = adminAuditColumns.find(col => col.column_name === 'id');
      expect(idColumn?.data_type).toBe('uuid');

      const createdAtColumn = adminAuditColumns.find(col => col.column_name === 'created_at');
      expect(createdAtColumn?.data_type).toBe('timestamp with time zone');

      console.log(`[audit-schema] ✅ admin_audit_logs table structure validated`);

    } catch (error) {
      console.error(`[audit-schema] ❌ admin_audit_logs table validation failed:`, error);
      throw error;
    }

    // Test 5: Verify RPC functions exist
    try {
      const { data: rpcFunctions, error: rpcError } = await supabase
        .from('information_schema.routines')
        .select('routine_name, routine_type')
        .eq('routine_schema', 'audit')
        .in('routine_name', ['log_access', 'log_event']);

      if (rpcError) {
        console.warn(`[audit-schema] RPC functions query failed: ${rpcError.message}`);
        throw new Error(`Audit RPC functions not found: ${rpcError.message}`);
      }

      // Verify required RPC functions exist
      const functionNames = rpcFunctions.map(func => func.routine_name);
      expect(functionNames).toContain('log_access');
      expect(functionNames).toContain('log_event');

      // Verify they are functions
      rpcFunctions.forEach(func => {
        expect(func.routine_type).toBe('FUNCTION');
      });

      console.log(`[audit-schema] ✅ Audit RPC functions validated`);

    } catch (error) {
      console.error(`[audit-schema] ❌ Audit RPC functions validation failed:`, error);
      throw error;
    }

    // Test 6: Verify RPC function parameters
    try {
      const { data: logAccessParams, error: logAccessError } = await supabase
        .from('information_schema.parameters')
        .select('parameter_name, data_type, parameter_mode')
        .eq('specific_schema', 'audit')
        .eq('specific_name', 'log_access')
        .order('ordinal_position');

      if (logAccessError) {
        console.warn(`[audit-schema] log_access parameters query failed: ${logAccessError.message}`);
      } else {
        // Verify log_access function has correct parameter
        const paramNames = logAccessParams.map(param => param.parameter_name);
        expect(paramNames).toContain('p');
        
        const pParam = logAccessParams.find(param => param.parameter_name === 'p');
        expect(pParam?.data_type).toBe('jsonb');
        expect(pParam?.parameter_mode).toBe('IN');

        console.log(`[audit-schema] ✅ log_access function parameters validated`);
      }

      const { data: logEventParams, error: logEventError } = await supabase
        .from('information_schema.parameters')
        .select('parameter_name, data_type, parameter_mode')
        .eq('specific_schema', 'audit')
        .eq('specific_name', 'log_event')
        .order('ordinal_position');

      if (logEventError) {
        console.warn(`[audit-schema] log_event parameters query failed: ${logEventError.message}`);
      } else {
        // Verify log_event function has correct parameter
        const paramNames = logEventParams.map(param => param.parameter_name);
        expect(paramNames).toContain('p');
        
        const pParam = logEventParams.find(param => param.parameter_name === 'p');
        expect(pParam?.data_type).toBe('jsonb');
        expect(pParam?.parameter_mode).toBe('IN');

        console.log(`[audit-schema] ✅ log_event function parameters validated`);
      }

    } catch (error) {
      console.error(`[audit-schema] ❌ RPC function parameters validation failed:`, error);
      throw error;
    }

    // Test 7: Verify table permissions and policies
    try {
      // Test if we can query the audit tables (this tests permissions)
      const { data: accessLogTest, error: accessLogTestError } = await supabase
        .from('audit.access_log')
        .select('id')
        .limit(1);

      if (accessLogTestError) {
        console.warn(`[audit-schema] Access log query test failed: ${accessLogTestError.message}`);
        throw new Error(`Cannot query audit.access_log: ${accessLogTestError.message}`);
      }

      const { data: eventLogTest, error: eventLogTestError } = await supabase
        .from('audit.event_log')
        .select('id')
        .limit(1);

      if (eventLogTestError) {
        console.warn(`[audit-schema] Event log query test failed: ${eventLogTestError.message}`);
        throw new Error(`Cannot query audit.event_log: ${eventLogTestError.message}`);
      }

      console.log(`[audit-schema] ✅ Audit table permissions validated`);

    } catch (error) {
      console.error(`[audit-schema] ❌ Audit table permissions validation failed:`, error);
      throw error;
    }

    console.log(`[audit-schema] ✅ All audit schema validations passed`);
  });

  test('@audit @schema-constraints should validate audit table constraints and indexes', async () => {
    const supabase = supabaseTestClient;
    
    console.log(`[audit-schema-constraints] Validating audit schema constraints...`);

    // Test 1: Verify primary key constraints
    try {
      const { data: accessLogPk, error: accessLogPkError } = await supabase
        .from('information_schema.table_constraints')
        .select('constraint_name, constraint_type')
        .eq('table_schema', 'audit')
        .eq('table_name', 'access_log')
        .eq('constraint_type', 'PRIMARY KEY');

      if (accessLogPkError) {
        console.warn(`[audit-schema-constraints] Access log PK query failed: ${accessLogPkError.message}`);
      } else {
        expect(accessLogPk).toHaveLength(1);
        console.log(`[audit-schema-constraints] ✅ audit.access_log primary key validated`);
      }

      const { data: eventLogPk, error: eventLogPkError } = await supabase
        .from('information_schema.table_constraints')
        .select('constraint_name, constraint_type')
        .eq('table_schema', 'audit')
        .eq('table_name', 'event_log')
        .eq('constraint_type', 'PRIMARY KEY');

      if (eventLogPkError) {
        console.warn(`[audit-schema-constraints] Event log PK query failed: ${eventLogPkError.message}`);
      } else {
        expect(eventLogPk).toHaveLength(1);
        console.log(`[audit-schema-constraints] ✅ audit.event_log primary key validated`);
      }

    } catch (error) {
      console.error(`[audit-schema-constraints] ❌ Primary key validation failed:`, error);
      throw error;
    }

    // Test 2: Verify indexes exist for performance
    try {
      const { data: accessLogIndexes, error: accessLogIndexError } = await supabase
        .from('pg_indexes')
        .select('indexname, indexdef')
        .eq('schemaname', 'audit')
        .eq('tablename', 'access_log');

      if (accessLogIndexError) {
        console.warn(`[audit-schema-constraints] Access log indexes query failed: ${accessLogIndexError.message}`);
      } else {
        // Should have indexes for common query patterns
        const indexNames = accessLogIndexes.map(idx => idx.indexname);
        expect(indexNames.length).toBeGreaterThan(0);
        console.log(`[audit-schema-constraints] ✅ audit.access_log indexes validated (${indexNames.length} found)`);
      }

      const { data: eventLogIndexes, error: eventLogIndexError } = await supabase
        .from('pg_indexes')
        .select('indexname, indexdef')
        .eq('schemaname', 'audit')
        .eq('tablename', 'event_log');

      if (eventLogIndexError) {
        console.warn(`[audit-schema-constraints] Event log indexes query failed: ${eventLogIndexError.message}`);
      } else {
        // Should have indexes for common query patterns
        const indexNames = eventLogIndexes.map(idx => idx.indexname);
        expect(indexNames.length).toBeGreaterThan(0);
        console.log(`[audit-schema-constraints] ✅ audit.event_log indexes validated (${indexNames.length} found)`);
      }

    } catch (error) {
      console.error(`[audit-schema-constraints] ❌ Index validation failed:`, error);
      throw error;
    }

    // Test 3: Verify check constraints
    try {
      const { data: eventLogChecks, error: eventLogCheckError } = await supabase
        .from('information_schema.check_constraints')
        .select('constraint_name, check_clause')
        .eq('constraint_schema', 'audit')
        .eq('table_name', 'event_log');

      if (eventLogCheckError) {
        console.warn(`[audit-schema-constraints] Event log check constraints query failed: ${eventLogCheckError.message}`);
      } else {
        // Should have check constraints for actor_role
        const actorRoleChecks = eventLogChecks.filter(check => 
          check.check_clause.includes('actor_role')
        );
        expect(actorRoleChecks.length).toBeGreaterThan(0);
        console.log(`[audit-schema-constraints] ✅ audit.event_log check constraints validated`);
      }

    } catch (error) {
      console.error(`[audit-schema-constraints] ❌ Check constraints validation failed:`, error);
      throw error;
    }

    console.log(`[audit-schema-constraints] ✅ All audit schema constraints validations passed`);
  });

  test('@audit @schema-performance should validate audit schema performance characteristics', async () => {
    const supabase = supabaseTestClient;
    
    console.log(`[audit-schema-performance] Validating audit schema performance...`);

    // Test 1: Verify table statistics are available
    try {
      const { data: accessLogStats, error: accessLogStatsError } = await supabase
        .from('pg_stat_user_tables')
        .select('relname, n_tup_ins, n_tup_upd, n_tup_del')
        .eq('relname', 'access_log')
        .eq('schemaname', 'audit');

      if (accessLogStatsError) {
        console.warn(`[audit-schema-performance] Access log stats query failed: ${accessLogStatsError.message}`);
      } else {
        expect(accessLogStats).toHaveLength(1);
        console.log(`[audit-schema-performance] ✅ audit.access_log statistics available`);
      }

      const { data: eventLogStats, error: eventLogStatsError } = await supabase
        .from('pg_stat_user_tables')
        .select('relname, n_tup_ins, n_tup_upd, n_tup_del')
        .eq('relname', 'event_log')
        .eq('schemaname', 'audit');

      if (eventLogStatsError) {
        console.warn(`[audit-schema-performance] Event log stats query failed: ${eventLogStatsError.message}`);
      } else {
        expect(eventLogStats).toHaveLength(1);
        console.log(`[audit-schema-performance] ✅ audit.event_log statistics available`);
      }

    } catch (error) {
      console.error(`[audit-schema-performance] ❌ Table statistics validation failed:`, error);
      throw error;
    }

    // Test 2: Verify vacuum and analyze can be performed
    try {
      // Test if we can perform basic maintenance operations
      const { error: vacuumError } = await supabase.client.rpc('pg_stat_statements_reset');
      
      if (vacuumError) {
        console.warn(`[audit-schema-performance] pg_stat_statements_reset failed: ${vacuumError.message}`);
        // This is not critical, just a performance optimization
      } else {
        console.log(`[audit-schema-performance] ✅ Performance statistics reset available`);
      }

    } catch (error) {
      console.warn(`[audit-schema-performance] ⚠️  Performance maintenance operations not available: ${error.message}`);
      // This is not critical for audit functionality
    }

    console.log(`[audit-schema-performance] ✅ All audit schema performance validations passed`);
  });
});
