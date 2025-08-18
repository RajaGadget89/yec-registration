import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { assertDbRouting } from '../../../lib/env-guards';

// Validate database routing
assertDbRouting();

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Check if request is authorized with CRON_SECRET
 */
function isAuthorized(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret) {
    console.error('CRON_SECRET environment variable not set');
    return false;
  }
  
  if (!authHeader) {
    return false;
  }
  
  const token = authHeader.replace('Bearer ', '');
  return token === cronSecret;
}

export async function GET(request: NextRequest) {
  try {
    // Check CRON_SECRET authorization
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch all registrations from the database
    const { data: registrations, error } = await supabase
      .from('registrations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch registrations:', error);
      return NextResponse.json(
        { error: "Failed to fetch registrations", message: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(registrations);
  } catch (error) {
    console.error('Failed to get registrations:', error);
    return NextResponse.json(
      {
        error: "Failed to get registrations",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
