import { NextRequest, NextResponse } from 'next/server';
import { getServiceRoleClient } from '../../../lib/supabase-server';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  // Security check - only allow in test environment
  const testHelpersEnabled = request.headers.get('X-Test-Helpers-Enabled');
  const authHeader = request.headers.get('Authorization');
  
  if (testHelpersEnabled !== '1' || !authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Test helpers not enabled or unauthorized' }, { status: 403 });
  }

  const token = authHeader.replace('Bearer ', '');
  if (token !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { migrationFile } = body;

    if (!migrationFile) {
      return NextResponse.json({ error: 'migrationFile parameter is required' }, { status: 400 });
    }

    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'migrations', migrationFile);
    
    if (!fs.existsSync(migrationPath)) {
      return NextResponse.json({ 
        error: 'Migration file not found',
        path: migrationPath
      }, { status: 404 });
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log(`[MIGRATION] Applying ${migrationFile}...`);
    
    const supabase = getServiceRoleClient();
    
    // Execute the migration SQL
    const { data, error } = await supabase.rpc('exec_sql', { 
      sql: migrationSQL 
    });

    if (error) {
      console.error(`[MIGRATION] Failed to apply ${migrationFile}:`, error);
      return NextResponse.json({ 
        error: 'Migration failed',
        details: error.message,
        migrationFile
      }, { status: 500 });
    }

    console.log(`[MIGRATION] Successfully applied ${migrationFile}`);
    
    return NextResponse.json({
      success: true,
      migrationFile,
      result: data
    });
    
  } catch (error) {
    console.error('Apply migration error:', error);
    return NextResponse.json({ 
      error: 'Apply migration failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
