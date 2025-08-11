import { NextResponse } from 'next/server';
import { getSupabaseAuth } from '../../../lib/auth-client';

export async function POST() {
  try {
    const supabase = getSupabaseAuth();
    
    // Sign out from Supabase
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Logout error:', error);
      return NextResponse.json(
        { error: 'Failed to logout' },
        { status: 500 }
      );
    }

    // Create response with cleared cookies
    const response = NextResponse.json({ success: true });
    
    // Clear any existing auth cookies
    response.cookies.set('sb-access-token', '', {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      maxAge: 0,
    });
    
    response.cookies.set('sb-refresh-token', '', {
      httpOnly: true,
      path: '/',
      sameSite: 'lax',
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Redirect GET requests to POST
  return POST();
}
