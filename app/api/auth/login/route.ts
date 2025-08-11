import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAuth } from '../../../lib/auth-client';
import { upsertAdminUser, updateLastLogin } from '../../../lib/auth-utils.server';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAuth();
    
    // Sign in with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Login error:', error);
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    if (!data.user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if user exists in admin_users table
    const { data: adminUser, error: adminError } = await supabase
      .from('admin_users')
      .select('*')
      .eq('id', data.user.id)
      .eq('is_active', true)
      .single();

    if (adminError || !adminUser) {
      // User not found in admin_users table, create them
      const newAdminUser = await upsertAdminUser({
        id: data.user.id,
        email: data.user.email!,
        role: 'admin', // Default to admin role
      });

      if (!newAdminUser) {
        return NextResponse.json(
          { error: 'Failed to create admin user' },
          { status: 500 }
        );
      }
    }

    // Update last login timestamp
    await updateLastLogin(data.user.id);

    // Create response with session data
    const response = NextResponse.json({
      success: true,
      user: {
        id: data.user.id,
        email: data.user.email,
        role: adminUser?.role || 'admin',
      },
    });

    // Set auth cookies if session exists
    if (data.session) {
      response.cookies.set('sb-access-token', data.session.access_token, {
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
      
      response.cookies.set('sb-refresh-token', data.session.refresh_token, {
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    }

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
