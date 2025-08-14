import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServiceClient } from '../../../lib/supabase-server';
import { getAppUrl } from '../../../lib/auth-utils';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  // Disable in production
  if (process.env.NODE_ENV === 'production') {
    return new NextResponse('Not Found', { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  
  // Get email from query, then TEST_ADMIN_EMAIL, then first from ADMIN_EMAILS
  const email = searchParams.get('email') || 
                process.env.TEST_ADMIN_EMAIL || 
                (process.env.ADMIN_EMAILS?.split(',')[0]?.trim() || '');

  if (!email) {
    return NextResponse.json(
      { ok: false, reason: 'MISSING_EMAIL', message: 'Email parameter or TEST_ADMIN_EMAIL/ADMIN_EMAILS is required' },
      { status: 400 }
    );
  }

  // Validate required environment variables
  const requiredEnvs = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_APP_URL'
  ];
  
  const missingEnvs = requiredEnvs.filter(env => !process.env[env]);
  
  if (missingEnvs.length > 0) {
    return NextResponse.json(
      { 
        ok: false, 
        reason: 'MISSING_ENV', 
        missing: missingEnvs,
        message: `Missing required environment variables: ${missingEnvs.join(', ')}`
      },
      { status: 500 }
    );
  }

  const appUrl = getAppUrl();
  const redirectTo = `${appUrl}/auth/callback`;

  console.log('[magic-link] Generating magic link for:', { email, redirectTo });

  try {
    const supabase = getSupabaseServiceClient();
    
    // First, check if the user exists in Supabase auth
    const { data: authUsers, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
      console.error('[magic-link] User lookup error:', userError);
      return NextResponse.json(
        { 
          ok: false, 
          reason: 'USER_LOOKUP_ERROR', 
          message: `Error looking up users: ${userError.message}`,
          hint: 'Check Supabase service role key permissions',
          email
        },
        { status: 500 }
      );
    }

    const authUser = authUsers.users.find(user => user.email === email);
    if (!authUser) {
      console.error('[magic-link] User not found:', email);
      return NextResponse.json(
        { 
          ok: false, 
          reason: 'USER_NOT_FOUND', 
          message: `User with email ${email} not found in Supabase auth`,
          hint: 'Make sure the user exists in your Supabase auth users table',
          email
        },
        { status: 404 }
      );
    }

    console.log('[magic-link] User found:', { userId: authUser.id, email: authUser.email });
    
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo,
      },
    });

    if (error) {
      console.error('[magic-link] Generation error:', error);
      return NextResponse.json(
        { 
          ok: false, 
          reason: 'SUPABASE_ERROR', 
          message: error.message,
          hint: 'Check if the email exists in your Supabase auth users and has admin privileges',
          redirectTo,
          email
        },
        { status: 500 }
      );
    }

    console.log('[magic-link] Successfully generated link:', { 
      actionLink: data.properties.action_link,
      email,
      redirectTo 
    });

    return NextResponse.json({
      ok: true,
      actionLink: data.properties.action_link,
      email,
      redirectTo,
    });
  } catch (error: unknown) {
    console.error('[magic-link] Unexpected error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unexpected error occurred';
    return NextResponse.json(
      { 
        ok: false, 
        reason: 'UNEXPECTED_ERROR', 
        message: errorMessage,
        hint: 'Check Supabase service role key and network connectivity',
        redirectTo,
        email
      },
      { status: 500 }
    );
  }
}
