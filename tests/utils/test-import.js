require('dotenv').config({ path: '.env.local' });

try {
  console.log('Testing import of audit wrapper...');
  const { withAuditLogging } = require('./app/lib/audit/withAuditAccess');
  console.log('✅ Audit wrapper imported successfully');
  console.log('withAuditLogging type:', typeof withAuditLogging);
} catch (error) {
  console.error('❌ Failed to import audit wrapper:', error);
}

