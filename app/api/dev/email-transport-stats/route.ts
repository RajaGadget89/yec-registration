import { NextRequest, NextResponse } from 'next/server';
import { getTransportStats, getTransportSendLog, resetTransportStats } from '../../../lib/emails/dispatcher';
import { getEmailTransportConfig } from '../../../lib/emails/transport';

/**
 * Dev-only API route for email transport statistics
 * GET: Get current transport stats and configuration
 * POST: Reset transport stats (for testing)
 * 
 * This endpoint is for development and testing purposes only
 */

export async function GET(_request: NextRequest) {
  void _request; // used to satisfy lint without changing config
  try {
    // In production, this endpoint should be disabled
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
    }

    const stats = getTransportStats();
    const sendLog = getTransportSendLog();
    const config = getEmailTransportConfig();

    return NextResponse.json({
      ok: true,
      stats,
      sendLog,
      config,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to get transport stats:', error);
    return NextResponse.json({ 
      error: 'Failed to get transport stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // In production, this endpoint should be disabled
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
    }

    // Parse request body
    let body = {};
    try {
      body = await request.json();
    } catch (_e) {
      // If no body, use empty object
      void _e; // used to satisfy lint without changing config
    }

    const { action } = body as { action?: string };

    if (action === 'reset') {
      resetTransportStats();
      return NextResponse.json({
        ok: true,
        message: 'Transport stats reset successfully',
        timestamp: new Date().toISOString()
      });
    }

    return NextResponse.json({
      ok: true,
      message: 'No action taken',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to reset transport stats:', error);
    return NextResponse.json({ 
      error: 'Failed to reset transport stats',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

