'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Lock, Mail, AlertCircle, CheckCircle } from 'lucide-react';
import { getSupabaseAuth } from '../../lib/auth-client';

export default function AdminLoginPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Handle magic link redirect with hash tokens - let server handle it
  useEffect(() => {
    // Check for error messages in URL
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    // For security, we only use magic link authentication
    // Password authentication is disabled
    setError('Password authentication is disabled for security. Please use "Send Magic Link" instead.');
    return;
  };

  const handleMagicLink = async () => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const supabase = getSupabaseAuth();
      
      // Get the next parameter from the current URL
      const urlParams = new URLSearchParams(window.location.search);
      const nextParam = urlParams.get('next');
      
      // Build redirect URL with next parameter if present
      const baseRedirectUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:8080';
      const redirectUrl = nextParam 
        ? `${baseRedirectUrl}/auth/callback?next=${encodeURIComponent(nextParam)}`
        : `${baseRedirectUrl}/auth/callback`;
      
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        setError(error.message);
        return;
      }

      setSuccess('Magic link sent! Check your email.');
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yec-primary via-blue-600 to-blue-500 flex items-center justify-center p-4">
      {/* Background decorations */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-blue-300/30 to-yec-accent/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-yec-highlight/30 to-blue-300/20 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-gradient-to-br from-blue-200/10 to-blue-300/10 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link 
            href="/"
            className="inline-flex items-center space-x-2 text-white hover:text-yec-accent transition-all duration-300 hover:scale-105 group mb-4"
          >
            <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm shadow-lg group-hover:shadow-xl transition-all duration-300">
              <Lock className="h-5 w-5" />
            </div>
            <span className="font-bold text-xl">YEC Day</span>
          </Link>
          <h1 className="text-2xl font-bold text-white mb-2">Admin Login</h1>
          <p className="text-blue-100">Sign in to access the admin dashboard</p>
        </div>

        {/* Login Form */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/20">
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yec-primary focus:border-transparent transition-all duration-200"
                  placeholder="admin@your.org"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password Field - Disabled for Security */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password <span className="text-gray-500 text-xs">(Disabled)</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type="password"
                  value="••••••••"
                  className="block w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                  placeholder="Password authentication disabled"
                  disabled={true}
                  readOnly
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">For security, only magic link authentication is enabled.</p>
            </div>

            {/* Error/Success Messages */}
            {error && (
              <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                <span className="text-sm text-red-700">{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                <span className="text-sm text-green-700">{success}</span>
              </div>
            )}

            {/* Login Button - Disabled */}
            <button
              type="submit"
              disabled={true}
              className="w-full bg-gray-300 text-gray-500 py-3 px-4 rounded-lg font-medium cursor-not-allowed"
            >
              Sign In (Disabled)
            </button>

            {/* Magic Link Button - Primary */}
            <button
              type="button"
              onClick={handleMagicLink}
              disabled={isLoading || !email}
              className="w-full bg-gradient-to-r from-yec-primary to-yec-accent text-white py-3 px-4 rounded-lg font-medium hover:from-yec-accent hover:to-yec-primary transition-all duration-300 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {isLoading ? 'Sending...' : 'Send Magic Link'}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Need help? Contact your system administrator
            </p>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-6">
          <Link
            href="/"
            className="text-blue-100 hover:text-white transition-colors duration-200 text-sm"
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
