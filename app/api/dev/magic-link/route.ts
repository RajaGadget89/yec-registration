import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Only available in development
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const fetchCache = 'force-no-store';

export async function GET(req: NextRequest) {
  // Return 404 in production
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const email = req.nextUrl.searchParams.get('email');
    
    if (!email) {
      return NextResponse.json({
        error: 'Email parameter is required',
        example: '/api/dev/magic-link?email=user@example.com'
      }, { status: 400 });
    }

    return await generateMagicLink(req, email);

  } catch (error) {
    console.error('[dev-magic-link] GET error:', error);
    return NextResponse.json({
      error: 'Failed to generate magic link',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  // Return 404 in production
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const body = await req.json();
    const { email } = body;
    
    if (!email) {
      return NextResponse.json({
        error: 'Email is required in request body',
        example: { email: 'user@example.com' }
      }, { status: 400 });
    }

    return await generateMagicLink(req, email);

  } catch (error) {
    console.error('[dev-magic-link] POST error:', error);
    return NextResponse.json({
      error: 'Failed to generate magic link',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

async function generateMagicLink(req: NextRequest, email: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({
      error: 'Missing Supabase environment variables',
      details: 'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required'
    }, { status: 500 });
  }

  // Create service role client
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  // Derive origin from request headers
  const proto = req.headers.get('x-forwarded-proto') ?? req.nextUrl.protocol.replace(':', '');
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? req.nextUrl.host;
  const origin = `${proto}://${host}`;

  // Generate magic link using admin API
  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { 
      redirectTo: `${origin}/auth/callback` 
    }
  });

  if (error) {
    console.error('[dev-magic-link] generateLink error:', error);
    return NextResponse.json({
      error: 'Failed to generate magic link',
      details: error.message
    }, { status: 500 });
  }

  const loginUrl = data?.properties?.action_link;
  
  if (!loginUrl) {
    return NextResponse.json({
      error: 'No login URL generated',
      details: 'Supabase did not return an action_link'
    }, { status: 500 });
  }

  console.log('[dev-magic-link]', email, loginUrl.slice(0, 80) + '...');

  return NextResponse.json({
    loginUrl
  }, {
    status: 200,
    headers: {
      'Cache-Control': 'no-store'
    }
  });
}
