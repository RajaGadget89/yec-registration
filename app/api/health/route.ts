import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '../../lib/supabase-server';
import { isCheckinSystemEnabled } from '../../lib/features';

/**
 * GET /api/health
 * Health check endpoint for connection monitoring
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();

  try {
    // Check feature flag
    const checkinEnabled = isCheckinSystemEnabled();
    
    // Check database connection
    let databaseHealthy = false;
    try {
      const supabase = getSupabaseServiceClient();
      const { error } = await supabase
        .from('event_types')
        .select('id')
        .limit(1);
      
      databaseHealthy = !error;
    } catch (error) {
      console.error('Database health check failed:', error);
    }

    const response = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - startTime,
      services: {
        database: databaseHealthy,
        checkin_system: checkinEnabled
      },
      version: '1.0.0'
    };

    const statusCode = databaseHealthy ? 200 : 503;

    return NextResponse.json(response, { status: statusCode });
  } catch (error) {
    console.error('Health check error:', error);
    
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 503 }
    );
  }
}