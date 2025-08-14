import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

export async function POST(request: NextRequest) {
  // Security guards
  const testHelpersEnabled = process.env.TEST_HELPERS_ENABLED === '1';
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (!testHelpersEnabled) {
    return NextResponse.json({ error: 'Test helpers not enabled' }, { status: 403 });
  }
  
  if (!authHeader || !cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Supabase configuration missing' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Read migration SQL
    const migrationPath = path.join(process.cwd(), 'migrations', '006_deep_link_token_fn.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Apply migration using direct SQL execution
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      console.error('Migration error:', error);
      return NextResponse.json({ 
        error: 'Migration failed', 
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      ok: true, 
      message: 'Deep-link token function migration applied successfully' 
    });

  } catch (error) {
    console.error('Migration execution error:', error);
    return NextResponse.json({ 
      error: 'Migration execution failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
