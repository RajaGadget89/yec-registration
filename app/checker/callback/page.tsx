'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function CheckerCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string>('');
  const supabase = createClientComponentClient();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Get the URL hash which contains the auth tokens
        const hash = window.location.hash;
        const urlParams = new URLSearchParams(hash.substring(1));
        
        const accessToken = urlParams.get('access_token');
        const refreshToken = urlParams.get('refresh_token');
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');

        if (error) {
          console.error('[checker-callback] Auth error:', error, errorDescription);
          setError(`Authentication failed: ${errorDescription || error}`);
          setStatus('error');
          return;
        }

        if (!accessToken || !refreshToken) {
          console.error('[checker-callback] Missing tokens in URL hash');
          setError('Authentication failed: Missing tokens');
          setStatus('error');
          return;
        }

        console.log('[checker-callback] Setting session with tokens');
        
        // Set the session using the tokens from the URL hash
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          console.error('[checker-callback] Session error:', sessionError);
          setError(`Session failed: ${sessionError.message}`);
          setStatus('error');
          return;
        }

        if (!data.session) {
          console.error('[checker-callback] No session established');
          setError('Authentication failed: No session established');
          setStatus('error');
          return;
        }

        console.log('[checker-callback] Session established for:', data.session.user.email);

        // Set checker-email cookie for server-side authentication
        document.cookie = `checker-email=${encodeURIComponent(data.session.user.email)}; path=/; max-age=${60 * 60 * 24 * 7}; secure=${window.location.protocol === 'https:'}; samesite=lax`;

        console.log('[checker-callback] Authentication successful, redirecting to scan page');
        setStatus('success');
        
        // Redirect to the scan page
        setTimeout(() => {
          router.push('/checker/scan');
        }, 1000);

      } catch (error) {
        console.error('[checker-callback] Unexpected error:', error);
        setError('An unexpected error occurred');
        setStatus('error');
      }
    };

    handleAuthCallback();
  }, [router, supabase]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yec-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Completing authentication...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-lg font-semibold mb-4">Authentication Failed</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/checker/login')}
            className="bg-yec-primary text-white px-6 py-2 rounded-md hover:bg-yec-accent"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-green-600 text-lg font-semibold mb-4">Authentication Successful</div>
          <p className="text-gray-600">Redirecting to checker dashboard...</p>
        </div>
      </div>
    );
  }

  return null;
}