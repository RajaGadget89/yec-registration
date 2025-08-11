import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '../../lib/supabase-server';
import { cookieOptions } from '../../lib/auth-utils';

export async function GET(request: NextRequest) {
  try {
    // Create response object for cookie management
    const response = NextResponse.json({ success: true });
    
    // Get Supabase client with cookie management
    const { supabase } = getServerSupabase(request, response);
    
    // Sign out the user (this will clear the session)
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Sign out error:', error);
    }
    
    // Create redirect response to login page
    const redirectResponse = NextResponse.redirect(new URL('/admin/login', request.url));
    
    // Copy the cleared cookies from the Supabase response
    const setCookieHeaders = response.headers.get('Set-Cookie');
    if (setCookieHeaders) {
      redirectResponse.headers.set('Set-Cookie', setCookieHeaders);
    }
    
    // Clear our custom authentication cookies
    const options = cookieOptions();
    const clearOptions = {
      ...options,
      maxAge: 0, // Expire immediately
      expires: new Date(0) // Set to past date
    };
    
    // Clear all authentication cookies
    redirectResponse.cookies.set('admin-email', '', clearOptions);
    redirectResponse.cookies.set('sb-access-token', '', clearOptions);
    redirectResponse.cookies.set('sb-refresh-token', '', clearOptions);
    redirectResponse.cookies.set('dev-user-email', '', clearOptions); // Also clear dev cookie if exists
    
    return redirectResponse;
  } catch (error) {
    console.error('Admin logout error:', error);
    
    // Even if logout fails, redirect to login page
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }
}

export async function POST(request: NextRequest) {
  // Handle POST requests the same as GET
  return GET(request);
}
