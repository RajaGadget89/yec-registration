import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookieOptions } from '../../../lib/auth-utils';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  // 1. Guard production
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ ok: false }, { status: 404 });
  }

  // 2. Read email from query or fallback to environment variables
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email') || 
                process.env.TEST_ADMIN_EMAIL || 
                (process.env.ADMIN_EMAILS?.split(',')[0]?.trim() || '');

  if (!email) {
    return NextResponse.json(
      { ok: false, reason: 'MISSING_EMAIL', message: 'Email parameter or TEST_ADMIN_EMAIL/ADMIN_EMAILS is required' },
      { status: 400 }
    );
  }

  // 3. Build redirectTo from request origin
  const origin = new URL(request.url).origin;
  const redirectTo = `${origin}/admin`;

  // 4. Create one NextResponse for both cookies and redirect
  const res = new NextResponse(null, { 
    status: 303, 
    headers: { Location: redirectTo }
  });

  try {
    // 5. Create admin client with Service Role
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // 6. Use admin API to create or get user
    let userId: string;
    try {
      // Try to get user by email using the admin API
      const { data: existingUser } = await adminClient.auth.admin.listUsers();
      
      // Find user by email in the list
      const user = existingUser.users.find(u => u.email === email);
      
      if (user) {
        userId = user.id;
      } else {
        // User doesn't exist, create them
        const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: { source: 'test-direct-login' }
        });
        
        if (createError) {
          console.error('[direct-login] createUser error:', createError);
          return NextResponse.json(
            { ok: false, reason: 'CREATE_USER_ERROR', message: createError.message },
            { status: 500 }
          );
        }
        
        userId = newUser.user.id;
      }
    } catch (error) {
      console.error('[direct-login] error checking/creating user:', error);
      return NextResponse.json(
        { ok: false, reason: 'USER_CHECK_ERROR', message: 'Failed to check or create user' },
        { status: 500 }
      );
    }

    // 7. Seed admin user into admin_users table
    const { error: seedError } = await adminClient
      .from('admin_users')
      .upsert(
        { 
          id: userId,
          email: email.toLowerCase(), 
          role: 'admin',
          is_active: true 
        },
        { 
          onConflict: 'email' 
        }
      );

    if (seedError) {
      console.error('[direct-login] admin seeding error:', seedError);
      return NextResponse.json(
        { ok: false, reason: 'ADMIN_SEED_ERROR', message: seedError.message },
        { status: 500 }
      );
    }

    // 8. Set auth cookies for development testing
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
      const options = cookieOptions();
      
      // Set the three required cookies that the auth flow normally sets
      res.cookies.set('admin-email', email, options);
      res.cookies.set('sb-access-token', 'test-access-token', options);
      res.cookies.set('sb-refresh-token', 'test-refresh-token', options);
      
      console.log('[direct-login] set auth cookies:', {
        'admin-email': email,
        'sb-access-token': 'test-access-token',
        'sb-refresh-token': 'test-refresh-token'
      });
    }

    // 9. Add debug headers
    res.headers.set('X-Auth-Debug', 'direct-login:ok');
    
    console.log('[direct-login] success', { 
      email, 
      userId,
      redirect: res.headers.get('Location')
    });

    // 10. Return the same response instance (don't create new response after cookies were set)
    return res;

  } catch (e: unknown) {
    console.error('[direct-login] unexpected error:', e);
    const errorMessage = e instanceof Error ? e.message : 'Unexpected error during direct login';
    return NextResponse.json(
      { ok: false, reason: 'UNEXPECTED_ERROR', message: errorMessage },
      { status: 500 }
    );
  }
}
