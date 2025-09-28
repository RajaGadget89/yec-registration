import { NextRequest, NextResponse } from 'next/server';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Create a test magic link
    const supabase = createClientComponentClient();
    
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/checker/callback`,
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Magic link sent successfully',
      redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/checker/callback`
    });
  } catch (error) {
    console.error('Magic link test error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}